import { GoogleGenAI, ThinkingLevel, type Content, type Part, Type } from '@google/genai';
import type { 
  AIProvider, 
  GenerateParams, 
  GenerateResult, 
  StreamChunk,
  ConversationMessage 
} from '../types';
import { getLanguageFromPath } from '../tools';
import { FULL_SYSTEM_PROMPT } from '../prompts';

const GEMINI_MODEL = 'gemini-2.5-pro';

// Maximum number of API calls to prevent infinite loops / runaway costs
const MAX_API_CALLS = 100;

// ── Tool Declarations ──────────────────────────────────────────────────────

const CREATE_PLAN_DECLARATION = {
  name: 'create_plan',
  description:
    'Create a structured plan for the app. You MUST call this tool FIRST before writing any files. Define every file the app needs.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      app_name: {
        type: Type.STRING,
        description: 'Short name for the app (e.g., "FitTracker", "RecipeApp")',
      },
      app_type: {
        type: Type.STRING,
        description: 'Category of the app (e.g., "fitness", "social", "productivity")',
      },
      features: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of features the app will have',
      },
      screens: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of screens / pages in the app',
      },
      file_tree: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          'Complete list of file paths to create (e.g., "app/_layout.tsx", "components/Button.tsx"). Include EVERY file the app needs.',
      },
      dependencies: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'npm packages required (only Expo Snack SDK 54 compatible)',
      },
      plan_steps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Step-by-step implementation plan',
      },
    },
    required: ['app_name', 'app_type', 'features', 'screens', 'file_tree', 'plan_steps'],
  },
};

const WRITE_FILE_DECLARATION = {
  name: 'write_file',
  description:
    'Write or create a file in the project. Always provide COMPLETE file content with all imports and exports. Call this tool for EVERY file in the plan.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description:
          'File path relative to project root (e.g., app/_layout.tsx, components/Button.tsx)',
      },
      content: {
        type: Type.STRING,
        description: 'Complete file content including all imports and exports',
      },
    },
    required: ['path', 'content'],
  },
};

const COMPLETE_DECLARATION = {
  name: 'complete',
  description:
    'Signal that you have finished writing ALL files in the plan. Call this ONLY after every file in the plan has been written.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: 'Brief summary of what was built',
      },
      files_created: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of all file paths that were created/updated',
      },
      next_steps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Optional suggestions for what the user could do next',
      },
    },
    required: ['summary', 'files_created'],
  },
};

const ALL_TOOLS = [
  { functionDeclarations: [CREATE_PLAN_DECLARATION, WRITE_FILE_DECLARATION, COMPLETE_DECLARATION] },
];

// ── Helper: build a continuation prompt when the model stops early ──────

function buildContinuationPrompt(remainingFiles: string[]): string {
  return [
    `You have NOT finished writing all files yet. The following ${remainingFiles.length} file(s) from the plan have NOT been written:`,
    '',
    ...remainingFiles.map((f) => `- ${f}`),
    '',
    'Continue by calling write_file for 1-3 of these files. We will loop until all files are written. Do NOT try to write all of them at once.',
    'Do NOT stop or explain — just call write_file immediately.',
  ].join('\n');
}

// ── GeminiProvider ──────────────────────────────────────────────────────

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  displayName = 'Gemini 3 Pro';

  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateCode(params: GenerateParams): Promise<GenerateResult> {
    // Delegate to streamCode and collect results
    const files: Array<{ path: string; content: string; language: string }> = [];
    let fullText = '';
    let usage = { inputTokens: 0, outputTokens: 0 };

    for await (const chunk of this.streamCode(params)) {
      if (chunk.type === 'text' && chunk.content) fullText += chunk.content;
      if (chunk.type === 'file' && chunk.file) files.push(chunk.file);
      if (chunk.type === 'done' && chunk.usage) usage = chunk.usage;
    }

    return { text: fullText, files, usage };
  }

  /**
   * Agentic streaming code generation with Plan → Write → Complete loop.
   *
   * Modeled after opencode's approach:
   * - No fixed round limit — loop runs until `complete` tool is called or all plan files are written
   * - If the model stops without completing, a continuation prompt is injected and the loop resumes
   * - Safety cap at MAX_API_CALLS to avoid runaway costs
   */
  async *streamCode(params: GenerateParams): AsyncGenerator<StreamChunk> {
    const {
      prompt,
      systemPrompt,
      currentFiles,
      conversationHistory = [],
      maxTokens = 65536,
      agentMode = 'build',
    } = params;

    let fullSystemPrompt = systemPrompt || FULL_SYSTEM_PROMPT;

    if (agentMode === 'plan') {
      fullSystemPrompt += '\n\nIMPORTANT: You are currently in PLAN MODE. You MUST ONLY use the `create_plan` tool to define the app structure and then immediately use the `complete` tool. Do NOT use the `write_file` tool to write any code in this mode. Your job is ONLY to plan.';
    }

    let userContent = prompt;
    if (currentFiles && Object.keys(currentFiles).length > 0) {
      const fileContext = Object.entries(currentFiles)
        .map(
          ([path, content]) =>
            `<current_file path="${path}">\n${content}\n</current_file>`,
        )
        .join('\n\n');
      userContent = `Current project files:\n${fileContext}\n\nUser request: ${prompt}`;
    }

    // Create chat session with all 3 tools
    // We removed thinkingConfig because gemini-2.5-pro does not support it
    const chat = this.ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        tools: ALL_TOOLS,
        systemInstruction: fullSystemPrompt,
        maxOutputTokens: maxTokens,
        temperature: 1.0,
      },
      history: this.formatHistory(conversationHistory),
    });

    let fullText = '';
    const writtenFiles = new Set<string>();
    let planFileTree: string[] = [];
    let planData: StreamChunk['plan'] | null = null;
    let isComplete = false;
    let apiCallCount = 0;

    try {
      // ── Phase: initial send ──
      yield { type: 'phase', phase: 'planning' };
      let response = await chat.sendMessage({ message: userContent });
      apiCallCount++;

      // ── Main agentic loop ──
      while (!isComplete && apiCallCount < MAX_API_CALLS) {
        // Collect text
        if (response.text) {
          fullText += response.text;
        }

        // Process function calls
        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
          // Model stopped without calling any tool
          // Check if there are remaining files to write
          if (agentMode === 'build') {
            const remainingFiles = planFileTree.filter((f) => !writtenFiles.has(f));

            if (remainingFiles.length > 0) {
              // Inject continuation prompt and resume
              const continuationMsg = buildContinuationPrompt(remainingFiles);
              yield { type: 'text', content: `\n[Continuing: ${remainingFiles.length} files remaining...]\n` };
              response = await chat.sendMessage({ message: continuationMsg });
              apiCallCount++;
              continue;
            }
          }

          // No plan or all files written but complete not called — auto-complete
          break;
        }

        // Build function responses
        const functionResponseParts: Part[] = [];

        for (const fc of functionCalls) {
          if (fc.name === 'create_plan' && fc.args) {
            const args = fc.args as {
              app_name: string;
              app_type: string;
              features: string[];
              screens: string[];
              file_tree: string[];
              dependencies?: string[];
              plan_steps?: string[];
            };

            planFileTree = (args.file_tree || []).map((f) => f.trim().replace(/^\/+/, ''));
            planData = {
              appName: args.app_name || 'App',
              appType: args.app_type || 'general',
              features: args.features || [],
              screens: args.screens || [],
              fileTree: planFileTree,
              dependencies: args.dependencies || [],
              planSteps: args.plan_steps || [],
            };

            yield { type: 'plan', plan: planData };
            
            if (agentMode === 'plan') {
              // Just finish planning
              functionResponseParts.push({
                functionResponse: {
                  name: 'create_plan',
                  response: {
                    success: true,
                    message: `Plan created successfully. Now call the complete tool with a summary.`,
                  },
                },
              });
            } else {
              yield { type: 'phase', phase: 'coding' };

              functionResponseParts.push({
                functionResponse: {
                  name: 'create_plan',
                  response: {
                    success: true,
                    message: `Plan created for ${args.app_name} with ${planFileTree.length} files. Now call write_file for EACH file in the plan, then call complete when done.`,
                  },
                },
              });
            }
          } else if (fc.name === 'write_file' && fc.args) {
            const args = fc.args as { path: string; content: string };
            if (args.path && args.content) {
              const filePath = args.path.trim().replace(/^\/+/, '');
              writtenFiles.add(filePath);

              yield {
                type: 'file',
                file: {
                  path: filePath,
                  content: args.content,
                  language: getLanguageFromPath(filePath),
                },
              };

              // Yield progress so the UI can show "Writing file 3/8"
              yield {
                type: 'progress',
                progress: {
                  currentFile: filePath,
                  completedFiles: writtenFiles.size,
                  totalFiles: Math.max(planFileTree.length, writtenFiles.size),
                },
              };

              functionResponseParts.push({
                functionResponse: {
                  name: 'write_file',
                  response: { success: true, message: `File written: ${filePath}` },
                },
              });
            }
          } else if (fc.name === 'complete' && fc.args) {
            // Check if there are still files to write
            const remainingFiles = planFileTree.filter((f) => !writtenFiles.has(f));
            
            if (agentMode === 'build' && remainingFiles.length > 0) {
              // REJECT the complete call if files are missing
              functionResponseParts.push({
                functionResponse: {
                  name: 'complete',
                  response: { 
                    success: false, 
                    error: `You cannot call complete yet. You have ${remainingFiles.length} files left to write from your plan: ${remainingFiles.join(', ')}. Call write_file for these remaining files immediately.` 
                  },
                },
              });
              // Do NOT set isComplete = true, force it to continue the loop
            } else {
              isComplete = true;
              yield { type: 'phase', phase: 'complete' };

              functionResponseParts.push({
                functionResponse: {
                  name: 'complete',
                  response: { success: true },
                },
              });
              // Don't send function response — we're done
              break;
            }
          }
        }

        // If complete was called, exit
        if (isComplete) break;

        // After processing all calls in this batch, check if plan is fulfilled
        if (agentMode === 'build' && planFileTree.length > 0) {
          const remainingFiles = planFileTree.filter((f) => !writtenFiles.has(f));
          if (remainingFiles.length === 0 && !isComplete) {
            // All plan files written — auto-complete
            isComplete = true;
            yield { type: 'phase', phase: 'complete' };
            break;
          }
        } else if (agentMode === 'plan' && planFileTree.length > 0 && !isComplete) {
           // We just wanted a plan, so we can auto-complete now
           isComplete = true;
           yield { type: 'phase', phase: 'complete' };
           break;
        }

        // Send function responses and continue loop
        if (functionResponseParts.length > 0) {
          response = await chat.sendMessage({ message: functionResponseParts });
          apiCallCount++;
        } else {
          // No valid function calls to respond to — break
          break;
        }
      }

      // Yield accumulated text
      if (fullText) {
        const chunkSize = 50;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          yield { type: 'text', content: fullText.slice(i, i + chunkSize) };
        }
      }

      // Usage from last response
      const inputTokens =
        response.usageMetadata?.promptTokenCount ||
        Math.ceil(userContent.length / 4);
      const outputTokens =
        response.usageMetadata?.candidatesTokenCount ||
        Math.ceil(fullText.length / 4);

      yield { type: 'done', usage: { inputTokens, outputTokens } };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatHistory(history: ConversationMessage[]): Content[] {
    return history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }
}
