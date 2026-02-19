/**
 * Rork AI Agent - Autonomous App Builder
 * 
 * This agent orchestrates the full app building process:
 * 1. Plan - Analyze request, create file tree and feature plan
 * 2. Code - Generate all files according to plan
 * 3. Test - Check for TypeScript/build errors
 * 4. Debug - Fix any errors found
 * 5. Complete - Finalize and report
 * 
 * The agent uses Claude's tool_use capability to call functions
 * that manipulate the project files.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ParsedFile, TokenUsage } from './types';
import { FULL_SYSTEM_PROMPT } from './prompts';
import { parseGeneratedFiles } from './parser';
import {
  AGENT_TOOLS,
  type ToolDefinition,
  type ToolResult,
  type ToolExecutor,
  type ToolName,
  type ToolInput,
  type CreatePlanInput,
  type WriteFileInput,
  type PatchFileInput,
  type CompleteInput,
  executeTool,
  getLanguageFromPath,
} from './tools';

// Agent state phases
export type AgentPhase = 
  | 'idle'
  | 'planning'
  | 'coding'
  | 'testing'
  | 'debugging'
  | 'complete'
  | 'error';

// Agent event types for streaming
export type AgentEventType = 
  | 'run_start'
  | 'run_finish'
  | 'iteration'
  | 'plan_created'
  | 'plan_progress'
  | 'step_start'
  | 'step_finish'
  | 'text_delta'
  | 'phase_change'
  | 'tool_call'
  | 'tool_result'
  | 'thinking'
  | 'file_created'
  | 'file_updated'
  | 'error'
  | 'complete';

export interface PlanProgress {
  currentFile: string;
  completedFiles: number;
  totalFiles: number;
}

export interface AgentEvent {
  type: AgentEventType;
  iteration?: number;
  step?: string;
  phase?: AgentPhase;
  message?: string;
  plan?: AppPlan;
  progress?: PlanProgress;
  tool?: string;
  input?: unknown;
  result?: ToolResult;
  file?: ParsedFile;
  summary?: string;
  filesCreated?: string[];
  error?: string;
}

export interface AgentConfig {
  apiKey: string;
  maxIterations?: number;
  maxTokens?: number;
  onEvent?: (event: AgentEvent) => void;
}

export interface AgentResult {
  success: boolean;
  phase: AgentPhase;
  files: ParsedFile[];
  summary?: string;
  error?: string;
  usage: TokenUsage;
  iterations: number;
}

// Plan structure
export interface AppPlan {
  appName: string;
  appType: string;
  features: string[];
  screens: string[];
  fileTree: string[];
  dependencies: string[];
  planSteps?: string[];
}

/**
 * The Rork AI Agent
 * Autonomously builds Expo apps from natural language descriptions
 */
export class RorkAgent {
  private client: Anthropic;
  private config: AgentConfig;
  private phase: AgentPhase = 'idle';
  private plan: AppPlan | null = null;
  private files: Map<string, ParsedFile> = new Map();
  private errors: string[] = [];
  private iterations: number = 0;
  private totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  constructor(config: AgentConfig) {
    this.config = {
      maxIterations: 10,
      maxTokens: 16384,
      ...config,
    };
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  /**
   * Run the agent to build an app from a user prompt
   */
  async run(
    prompt: string,
    executor: ToolExecutor,
    existingFiles?: Record<string, string>
  ): Promise<AgentResult> {
    this.reset();
    
    // Initialize with existing files if any
    if (existingFiles) {
      for (const [path, content] of Object.entries(existingFiles)) {
        this.files.set(path, {
          path,
          content,
          language: getLanguageFromPath(path),
        });
      }
    }

    try {
      this.phase = 'planning';
      this.emit({
        type: 'run_start',
        phase: 'planning',
        message: 'Agent run started',
      });

      // Build the agent system prompt
      const systemPrompt = this.buildSystemPrompt();
      
      // Start the agent loop
      let messages: Anthropic.MessageParam[] = [
        { role: 'user', content: this.buildInitialPrompt(prompt) },
      ];

      while (this.iterations < this.config.maxIterations! && this.shouldContinue()) {
        this.iterations++;
        this.emit({
          type: 'iteration',
          iteration: this.iterations,
          message: `Starting iteration ${this.iterations}`,
        });
        
        this.emit({
          type: 'thinking',
          phase: this.phase,
          message: `Iteration ${this.iterations}: Agent is thinking...`,
        });

        // Call Claude with tools
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: this.config.maxTokens!,
          system: systemPrompt,
          tools: AGENT_TOOLS as Anthropic.Tool[],
          messages,
        });

        // Track usage
        this.totalUsage.inputTokens += response.usage.input_tokens;
        this.totalUsage.outputTokens += response.usage.output_tokens;

        // Process response
        const assistantContent: Anthropic.ContentBlock[] = [];
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          assistantContent.push(block);

          if (block.type === 'text') {
            this.emit({
              type: 'text_delta',
              message: block.text,
            });
          } else if (block.type === 'tool_use') {
            // Execute the tool
            const toolName = block.name as ToolName;
            const toolInput = block.input as ToolInput;

            this.emit({
              type: 'tool_call',
              iteration: this.iterations,
              tool: toolName,
              input: toolInput,
            });
            this.emit({
              type: 'step_start',
              iteration: this.iterations,
              step: `${toolName}`,
              message: `Running ${toolName}`,
            });

            // Update phase based on tool
            this.updatePhaseFromTool(toolName);

            // Execute tool
            const result = await executeTool(executor, toolName, toolInput);

            this.emit({
              type: 'tool_result',
              iteration: this.iterations,
              tool: toolName,
              result,
            });
            this.emit({
              type: 'step_finish',
              iteration: this.iterations,
              step: `${toolName}`,
              message: result.success ? `${toolName} completed` : `${toolName} failed`,
            });

            // Handle special tools
            if (toolName === 'create_plan') {
              const planInput = toolInput as CreatePlanInput;
              this.plan = {
                appName: planInput.app_name,
                appType: planInput.app_type,
                features: planInput.features,
                screens: planInput.screens,
                fileTree: planInput.file_tree,
                dependencies: planInput.dependencies || [],
                planSteps: planInput.plan_steps || [],
              };
              // NOTE: plan_created SSE is emitted by the executor (route.ts createPlan).
              // Do NOT emit plan_created here to avoid sending the event twice.
            } else if (toolName === 'write_file') {
              const writeInput = toolInput as WriteFileInput;
              const fileExists = this.files.has(writeInput.path);
              const file: ParsedFile = {
                path: writeInput.path,
                content: writeInput.content,
                language: getLanguageFromPath(writeInput.path),
              };
              this.files.set(file.path, file);
              this.emit({
                type: fileExists ? 'file_updated' : 'file_created',
                file,
              });
            } else if (toolName === 'patch_file') {
              const patchInput = toolInput as PatchFileInput;
              const existing = this.files.get(patchInput.path);
              if (existing) {
                this.files.set(patchInput.path, {
                  ...existing,
                  content: existing.content.replace(patchInput.find, patchInput.replace),
                });
              }
            } else if (toolName === 'complete') {
              const completeInput = toolInput as CompleteInput;
              this.phase = 'complete';
              this.emit({
                type: 'complete',
                summary: completeInput.summary,
                filesCreated: completeInput.files_created,
              });
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result.success 
                ? (result.output || 'Success') 
                : `Error: ${result.error}`,
            });
          }
        }

        // Add assistant message and tool results to conversation
        messages.push({ role: 'assistant', content: assistantContent });
        
        if (toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults });
        }

        // Check if we should stop
        if (response.stop_reason === 'end_turn' && toolResults.length === 0) {
          // No more tool calls, agent is done thinking
          if (this.phase !== 'complete') {
            this.phase = 'complete';
          }
          break;
        }
      }

      return {
        success: this.phase === 'complete',
        phase: this.phase,
        files: Array.from(this.files.values()),
        summary: this.plan ? `Built ${this.plan.appName} (${this.plan.appType})` : 'App built',
        usage: this.totalUsage,
        iterations: this.iterations,
      };

    } catch (error) {
      this.phase = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit({
        type: 'error',
        error: errorMessage,
      });

      return {
        success: false,
        phase: 'error',
        files: Array.from(this.files.values()),
        error: errorMessage,
        usage: this.totalUsage,
        iterations: this.iterations,
      };
    } finally {
      this.emit({
        type: 'run_finish',
        phase: this.phase,
        message: `Agent finished in phase ${this.phase}`,
      });
    }
  }

  /**
   * Build the system prompt for the agent
   */
  private buildSystemPrompt(): string {
    return `${FULL_SYSTEM_PROMPT}

## Agent Instructions

You are an AUTONOMOUS AI agent that builds complete Expo mobile apps.
You have access to tools that let you plan, create files, patch files, verify, and fix errors.

### Your Process
1. **PLAN FIRST**: Always start by calling create_plan to define the app structure
2. **CODE**: Use write_file to create all files in your plan
3. **PATCH PRECISELY**: Use patch_file for targeted changes instead of rewriting large files
4. **VERIFY**: Call verify_project (or run_test) to check for type/lint/build issues
5. **DEBUG**: If errors found, use fix_error plus patch_file/write_file to resolve them
6. **COMPLETE**: When everything works, call complete

### Rules
- Create a COMPLETE, working app - not a skeleton
- Generate ALL files needed for the app to run
- Always start with app/_layout.tsx 
- Include proper navigation (NativeTabs or Stack)
- Add realistic sample data where needed
- Use modern Expo SDK 54+ patterns
- Handle loading and error states
- Use search_files before risky refactors
- NEVER leave placeholder comments like "// TODO" or "// rest of code"

### File Generation Order
1. app/_layout.tsx (root layout with navigation)
2. app/(tabs)/_layout.tsx or app/(home)/_layout.tsx
3. Screen files (index.tsx, [id].tsx, etc.)
4. Components (in components/ folder)
5. Hooks and utilities
6. Constants and types

When you're done building, call the complete tool with a summary.`;
  }

  /**
   * Build the initial prompt with context
   */
  private buildInitialPrompt(userPrompt: string): string {
    const existingFilesContext = this.files.size > 0
      ? `\n\nExisting project files:\n${Array.from(this.files.values())
          .map(f => `- ${f.path}`)
          .join('\n')}`
      : '';

    return `Build me a mobile app with the following requirements:

${userPrompt}

${existingFilesContext}

Start by creating a plan, then implement all the files needed for a complete, working app.`;
  }

  /**
   * Update phase based on tool being called
   */
  private updatePhaseFromTool(tool: ToolName): void {
    const oldPhase = this.phase;
    
    switch (tool) {
      case 'create_plan':
        this.phase = 'planning';
        break;
      case 'write_file':
      case 'patch_file':
      case 'delete_file':
        this.phase = 'coding';
        break;
      case 'search_files':
        this.phase = 'planning';
        break;
      case 'verify_project':
      case 'run_test':
        this.phase = 'testing';
        break;
      case 'fix_error':
        this.phase = 'debugging';
        break;
      case 'complete':
        this.phase = 'complete';
        break;
    }

    if (oldPhase !== this.phase) {
      this.emit({
        type: 'phase_change',
        phase: this.phase,
        message: `Phase changed to: ${this.phase}`,
      });
    }
  }

  /**
   * Emit an event
   */
  private emit(event: AgentEvent): void {
    if (this.config.onEvent) {
      this.config.onEvent(event);
    }
  }

  /**
   * Reset agent state
   */
  private reset(): void {
    this.phase = 'idle';
    this.plan = null;
    this.files.clear();
    this.errors = [];
    this.iterations = 0;
    this.totalUsage = { inputTokens: 0, outputTokens: 0 };
  }

  private shouldContinue(): boolean {
    return this.phase !== 'complete' && this.phase !== 'error';
  }

  /**
   * Get current phase
   */
  getPhase(): AgentPhase {
    return this.phase;
  }

  /**
   * Get current plan
   */
  getPlan(): AppPlan | null {
    return this.plan;
  }

  /**
   * Get generated files
   */
  getFiles(): ParsedFile[] {
    return Array.from(this.files.values());
  }
}

/**
 * Create a streaming agent that yields events
 */
export async function* runAgentStream(
  apiKey: string,
  prompt: string,
  executor: ToolExecutor,
  existingFiles?: Record<string, string>,
  options?: Partial<AgentConfig>
): AsyncGenerator<AgentEvent> {
  const events: AgentEvent[] = [];
  let resolveNext: ((event: AgentEvent) => void) | null = null;

  const agent = new RorkAgent({
    apiKey,
    ...options,
    onEvent: (event) => {
      if (resolveNext) {
        resolveNext(event);
        resolveNext = null;
      } else {
        events.push(event);
      }
    },
  });

  // Start agent in background
  const resultPromise = agent.run(prompt, executor, existingFiles);

  // Yield events as they come
  while (true) {
    if (events.length > 0) {
      yield events.shift()!;
    } else {
      // Wait for next event or completion
      const event = await Promise.race([
        new Promise<AgentEvent>((resolve) => {
          resolveNext = resolve;
        }),
        resultPromise.then(() => null as AgentEvent | null),
      ]);

      if (event === null) {
        // Agent completed, yield any remaining events
        while (events.length > 0) {
          yield events.shift()!;
        }
        break;
      }
      
      yield event;
    }
  }
}

export { AGENT_TOOLS, executeTool };
export type { ToolExecutor, ToolResult, ToolDefinition };
