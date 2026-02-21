import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { getLanguageFromPath } from '@/lib/language';
import { 
  RorkAgent,
  GeminiProvider,
  type ToolExecutor, 
  type ToolResult,
  type CreatePlanInput,
  type WriteFileInput,
  type PatchFileInput,
  type SearchFilesInput,
  type VerifyProjectInput,
  type DeleteFileInput,
  type ReadFileInput,
  type ListFilesInput,
  type RunTestInput,
  type FixErrorInput,
  type CompleteInput,
  type AgentEvent,
} from '@ai-engine/core';

export const maxDuration = 300; // 5 minutes for agent runs

/**
 * Agent API endpoint
 * Runs the autonomous agent to build a complete app
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient();
        
        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: 'Unauthorized' })}\n\n`
          ));
          controller.close();
          return;
        }
        
        const body = await request.json();
        const { 
          projectId, 
          prompt,
          existingFiles = {},
          model = 'claude',
          agentMode = 'build',
        } = body;
        
        if (!projectId || !prompt) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: 'Missing required fields' })}\n\n`
          ));
          controller.close();
          return;
        }
        
        // Verify project ownership
        const { data: project } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single();
        
        if (!project) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: 'Project not found' })}\n\n`
          ));
          controller.close();
          return;
        }
        
        // Get API key for the chosen model
        const isGemini = model === 'gemini';
        const apiKey = isGemini
          ? process.env.GEMINI_API_KEY
          : process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: isGemini ? 'Gemini API key not configured' : 'Claude API key not configured' })}\n\n`
          ));
          controller.close();
          return;
        }
        
        // Track all files created/updated
        const projectFiles: Record<string, { path: string; content: string; language: string }> = {};
        
        // Create tool executor that operates on project files
        const executor: ToolExecutor = {
          async createPlan(input: CreatePlanInput): Promise<ToolResult> {
            // Send plan event
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'plan_created', 
                plan: {
                  appName: input.app_name,
                  appType: input.app_type,
                  features: input.features,
                  screens: input.screens,
                  fileTree: input.file_tree,
                  dependencies: input.dependencies || [],
                  planSteps: input.plan_steps || [],
                }
              })}\n\n`
            ));
            
            return {
              success: true,
              output: `Plan created for ${input.app_name} (${input.app_type}) with ${input.file_tree.length} files`,
            };
          },
          
          async writeFile(input: WriteFileInput): Promise<ToolResult> {
            const language = getLanguageFromPath(input.path);
            projectFiles[input.path] = {
              path: input.path,
              content: input.content,
              language,
            };
            
            return {
              success: true,
              output: `File written: ${input.path}`,
            };
          },

          async patchFile(input: PatchFileInput): Promise<ToolResult> {
            const current = projectFiles[input.path]?.content ?? existingFiles[input.path];

            if (!current) {
              return {
                success: false,
                error: `Cannot patch missing file: ${input.path}`,
              };
            }

            if (!current.includes(input.find)) {
              return {
                success: false,
                error: `Patch target not found in ${input.path}`,
              };
            }

            const next = current.replace(input.find, input.replace);
            projectFiles[input.path] = {
              path: input.path,
              content: next,
              language: getLanguageFromPath(input.path),
            };

            return {
              success: true,
              output: `Patched ${input.path}`,
            };
          },

          async searchFiles(input: SearchFilesInput): Promise<ToolResult> {
            const all = collectAllFiles(projectFiles, existingFiles);
            const matches: Array<{ path: string; line: number; snippet: string }> = [];

            for (const [path, content] of Object.entries(all)) {
              if (input.path_prefix && !path.startsWith(input.path_prefix)) continue;
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(input.query)) {
                  matches.push({
                    path,
                    line: i + 1,
                    snippet: lines[i].trim().slice(0, 180),
                  });
                }
              }
            }

            if (matches.length === 0) {
              return {
                success: true,
                output: 'No matches found',
                data: { matches: [] },
              };
            }

            return {
              success: true,
              output: matches.slice(0, 50).map((m) => `${m.path}:${m.line} ${m.snippet}`).join('\n'),
              data: { matches: matches.slice(0, 200) },
            };
          },

          async verifyProject(input: VerifyProjectInput): Promise<ToolResult> {
            return runChecks(projectFiles, existingFiles, input.checks);
          },
          
          async deleteFile(input: DeleteFileInput): Promise<ToolResult> {
            delete projectFiles[input.path];
            
            return {
              success: true,
              output: `File deleted: ${input.path}`,
            };
          },
          
          async readFile(input: ReadFileInput): Promise<ToolResult> {
            const file = projectFiles[input.path] || existingFiles[input.path];
            
            if (file) {
              return {
                success: true,
                output: typeof file === 'string' ? file : file.content,
              };
            }
            
            return {
              success: false,
              error: `File not found: ${input.path}`,
            };
          },
          
          async listFiles(input: ListFilesInput): Promise<ToolResult> {
            const allFiles = [
              ...Object.keys(projectFiles),
              ...Object.keys(existingFiles),
            ];
            const uniqueFiles = [...new Set(allFiles)];
            
            if (input.directory) {
              const filtered = uniqueFiles.filter(f => f.startsWith(input.directory!));
              return {
                success: true,
                output: filtered.join('\n'),
              };
            }
            
            return {
              success: true,
              output: uniqueFiles.join('\n'),
            };
          },
          
          async runTest(input: RunTestInput): Promise<ToolResult> {
            const check =
              input.check_type === 'typescript'
                ? 'typecheck'
                : input.check_type === 'runtime'
                ? 'build'
                : input.check_type;
            return runChecks(projectFiles, existingFiles, [check]);
          },
          
          async fixError(input: FixErrorInput): Promise<ToolResult> {
            // Validate the file exists so the agent knows what it's working with
            const fileContent =
              projectFiles[input.file_path]?.content ?? existingFiles[input.file_path];

            if (!fileContent) {
              return {
                success: false,
                error: `Cannot fix error: file not found: ${input.file_path}`,
              };
            }

            // Return the current file content so the agent can patch it precisely
            return {
              success: true,
              output: [
                `Error in ${input.file_path}: ${input.error_message}`,
                `Planned fix: ${input.fix_description}`,
                `Current file content (${fileContent.split('\n').length} lines):`,
                '---',
                fileContent.slice(0, 3000), // cap to avoid huge context
                fileContent.length > 3000 ? '... (truncated)' : '',
                '---',
                'Use patch_file or write_file to apply the fix.',
              ]
                .filter(Boolean)
                .join('\n'),
            };
          },
          
          async complete(input: CompleteInput): Promise<ToolResult> {
            return {
              success: true,
              output: input.summary,
              data: {
                summary: input.summary,
                filesCreated: input.files_created,
                nextSteps: input.next_steps,
              },
            };
          },
        };
        
        // Save user message
        const { error: userMsgErr } = await supabase.from('messages').insert({
          project_id: projectId,
          role: 'user',
          content: `[${agentMode === 'plan' ? 'Plan' : 'Agent'} Mode] ${prompt}`,
          model,
        });
        if (userMsgErr) console.error('Failed to save user message:', userMsgErr);

        let summaryContent: string;
        let totalTokens = 0;

        if (isGemini) {
          // ── Gemini path: agentic Plan → Write → Complete loop ──
          const geminiProvider = new GeminiProvider(apiKey);
          let fullText = '';

          for await (const chunk of geminiProvider.streamCode({
            prompt,
            currentFiles: existingFiles,
            agentMode,
          })) {
            if (chunk.type === 'text') {
              fullText += chunk.content;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'text_delta', message: chunk.content })}\n\n`
              ));
            } else if (chunk.type === 'plan' && chunk.plan) {
              // Plan created — forward to agentStore
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'plan_created', 
                  plan: {
                    appName: chunk.plan.appName,
                    appType: chunk.plan.appType,
                    features: chunk.plan.features,
                    screens: chunk.plan.screens,
                    fileTree: chunk.plan.fileTree,
                    dependencies: chunk.plan.dependencies || [],
                    planSteps: chunk.plan.planSteps || [],
                  },
                  message: `Plan: ${chunk.plan.appName} — ${chunk.plan.fileTree.length} files`,
                })}\n\n`
              ));
            } else if (chunk.type === 'file' && chunk.file) {
              const { path, content, language } = chunk.file;
              projectFiles[path] = { path, content, language };
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'file_created', file: chunk.file })}\n\n`
              ));
            } else if (chunk.type === 'progress' && chunk.progress) {
              // Progress update: "Writing file 3/8: components/Button.tsx"
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'plan_progress',
                  progress: chunk.progress,
                  message: `Writing file ${chunk.progress.completedFiles}/${chunk.progress.totalFiles}: ${chunk.progress.currentFile}`,
                })}\n\n`
              ));
            } else if (chunk.type === 'phase' && chunk.phase) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'phase_change', phase: chunk.phase })}\n\n`
              ));
            } else if (chunk.type === 'done') {
              totalTokens = (chunk.usage?.inputTokens ?? 0) + (chunk.usage?.outputTokens ?? 0);
            } else if (chunk.type === 'error') {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`
              ));
            }
          }

          summaryContent = fullText || `Generated ${Object.keys(projectFiles).length} files.`;
        } else {
          // ── Claude path: full RorkAgent with 11-tool agentic loop ──
          const agent = new RorkAgent({
            apiKey,
            maxIterations: 15,
            maxTokens: 16384,
            onEvent: (event: AgentEvent) => {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify(event)}\n\n`
              ));
            },
          });

          const result = await agent.run(prompt, executor, existingFiles, agentMode);
          totalTokens = result.usage.inputTokens + result.usage.outputTokens;
          summaryContent = result.success
            ? `Built ${result.files.length} files in ${result.iterations} iterations.\n\n${result.summary || ''}`
            : `Agent failed: ${result.error}`;
        }

        // Send final result FIRST so UI updates immediately
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ 
            type: 'agent_complete',
            success: true,
            files: Object.values(projectFiles),
            summary: summaryContent,
          })}\n\n`
        ));

        // Save all generated files to database AFTER sending the event in a single batch
        if (Object.keys(projectFiles).length > 0) {
          const upsertData = Object.values(projectFiles).map(file => ({
            project_id: projectId,
            path: file.path,
            content: file.content,
            language: file.language,
          }));
          
          const { error: filesErr } = await supabase
            .from('project_files')
            .upsert(upsertData, {
              onConflict: 'project_id,path',
            });
            
          if (filesErr) console.error('Failed to save project files:', filesErr);
          
          await supabase
            .from('projects')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', projectId);
        }
        
        // Save assistant summary message
        const { error: asstMsgErr } = await supabase.from('messages').insert({
          project_id: projectId,
          role: 'assistant',
          content: summaryContent,
          model,
          files_changed: Object.keys(projectFiles),
          tokens_used: totalTokens,
        });
        if (asstMsgErr) console.error('Failed to save assistant message:', asstMsgErr);
        
        controller.close();
        
      } catch (error) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`
        ));
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function collectAllFiles(
  projectFiles: Record<string, { path: string; content: string; language: string }>,
  existingFiles: Record<string, string>
): Record<string, string> {
  const merged: Record<string, string> = { ...existingFiles };
  for (const [path, file] of Object.entries(projectFiles)) {
    merged[path] = file.content;
  }
  return merged;
}

function runChecks(
  projectFiles: Record<string, { path: string; content: string; language: string }>,
  existingFiles: Record<string, string>,
  checks: Array<'typecheck' | 'lint' | 'build'>
): ToolResult {
  const files = collectAllFiles(projectFiles, existingFiles);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [path, content] of Object.entries(files)) {
    if (checks.includes('typecheck')) {
      if ((content.includes('useState') || content.includes('useEffect')) && !content.includes("from 'react'") && !content.includes('from "react"')) {
        errors.push(`${path}: missing React import for hooks`);
      }

      if (path.endsWith('.tsx') && content.includes('export default') && content.includes('any')) {
        warnings.push(`${path}: contains any type in exported component`);
      }
    }

    if (checks.includes('lint')) {
      if (/TODO|FIXME/.test(content)) {
        warnings.push(`${path}: contains TODO/FIXME markers`);
      }
      if (path.endsWith('.tsx') && (content.includes('<div') || content.includes('<span') || content.includes('<p>') || content.includes('<a '))) {
        errors.push(`${path}: uses web HTML tags (div, span, p, a) which are invalid in React Native code. Use View, Text, etc.`);
      }
    }

    if (checks.includes('build')) {
      if ((path.endsWith('.tsx') || path.endsWith('.ts')) && !content.includes('export')) {
        warnings.push(`${path}: file has no export`);
      }
      if (path.endsWith('.tsx') && !/\breturn\s*\(/.test(content) && !content.includes('export default function')) {
        warnings.push(`${path}: component may not return JSX`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join('\n'),
      data: { errors, warnings, checks },
    };
  }

  return {
    success: true,
    output: `${checks.join(', ')} checks passed`,
    data: { warnings, checks },
  };
}
