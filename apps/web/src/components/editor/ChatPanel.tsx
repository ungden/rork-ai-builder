'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ChevronDown, ChevronRight, Sparkles, FileCode, Code, AlertCircle, Mic, NotebookPen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useProjectStore } from '@/stores/projectStore';
import { useAgentStore } from '@/stores/agentStore';
import { AgentStatus } from './AgentStatus';

// Strip <file path="...">...</file> blocks from AI response text
// Also handles partial blocks during streaming (no closing tag yet)
function stripFileBlocks(text: string): string {
  return text
    .replace(/<file path="[^"]*">[\s\S]*?<\/file>/g, '')  // Complete blocks
    .replace(/<file path="[^"]*">[\s\S]*$/g, '')           // Partial block at end (streaming)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface ChatPanelProps {
  projectId: string;
  onViewCode?: (filePath?: string) => void;
  initialPrompt?: string;
}

export function ChatPanel({ projectId, onViewCode, initialPrompt }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({}); // Per-message file list collapse
  const [showErrorDetails, setShowErrorDetails] = useState(false); // Error details expand
  const initialPromptConsumedRef = useRef(false);
  const handleAgentRunRef = useRef<(prompt?: string) => Promise<void>>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    messages, 
    addMessage, 
    updateLastMessage,
    files,
    addGeneratingFile,
    applyGeneratedFiles,
    streamingContent,
    appendStreamingContent,
    setStreamingContent,
    runtimeErrors,
    clearRuntimeErrors,
    selectedModel,
  } = useProjectStore();
  
  const {
    isRunning: isAgentRunning,
    phase: agentPhase,
    planProgress,
    startAgent,
    stopAgent,
    processEvent,
  } = useAgentStore();
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Run Agent mode
  const handleAgentRun = async (overridePrompt?: string) => {
    const promptText = overridePrompt || input.trim();
    if (!promptText || isAgentRunning) return;
    
    const prompt = promptText;
    setInput('');
    setStreamingContent('');
    
    // Start agent tracking
    startAgent();
    
    // Add user message
    addMessage({ role: 'user', content: `[Agent Mode] ${prompt}` });
    addMessage({ role: 'assistant', content: 'Starting autonomous build...', isStreaming: true });
    
    try {
      // Build current files context
      const existingFiles: Record<string, string> = {};
      Object.values(files).forEach(f => {
        existingFiles[f.path] = f.content;
      });
      
      // Call agent API
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          prompt,
          existingFiles,
          model: selectedModel,
        }),
      });
      
      if (!response.ok) {
        // Try to read the error from the response body
        let errorMsg = `Agent run failed (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch { /* body not JSON */ }
        throw new Error(errorMsg);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let summaryContent = 'Building app...';
      const generatedFiles: Array<{ path: string; content: string; language: string }> = [];
      const progressLines: string[] = [];
      
      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // Keep incomplete last line for next chunk
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                // Process agent event
                processEvent(data);
                
                // Handle specific events
                if (data.type === 'file_created' || data.type === 'file_updated') {
                  if (data.file) {
                    generatedFiles.push(data.file);
                    // Apply file immediately so Snack preview updates in real-time
                    addGeneratingFile(data.file);
                    progressLines.push(`${data.type === 'file_created' ? 'Created' : 'Updated'} ${data.file.path}`);
                    appendStreamingContent(`- ${progressLines[progressLines.length - 1]}\n`);
                  }
                } else if (data.type === 'text_delta' && data.message) {
                  appendStreamingContent(data.message);
                } else if (data.type === 'plan_progress' && data.message) {
                  // Don't flood chat — just update the last progress line
                  // The AgentStatus component shows the real-time progress
                } else if ((data.type === 'step_start' || data.type === 'step_finish' || data.type === 'plan_created') && data.message) {
                  appendStreamingContent(`\n${data.message}\n`);
                } else if (data.type === 'agent_complete') {
                  summaryContent = data.summary || 'App built successfully!';
                  if (data.files && data.files.length > 0) {
                    generatedFiles.push(...data.files);
                  }
                } else if (data.type === 'error') {
                  summaryContent = `Error: ${data.error}`;
                }
              } catch (e) {
                console.warn('SSE parse error (agent):', e);
              }
            }
          }
        }
      }
      
      // Update final message with file list
      const changedPaths = generatedFiles.map(f => f.path);
      if (summaryContent === 'Building app...' && progressLines.length > 0) {
        summaryContent = `Done. ${progressLines.length} changes applied.`;
      }
      updateLastMessage(summaryContent, changedPaths);
      
      // Apply generated files
      if (generatedFiles.length > 0) {
        applyGeneratedFiles(generatedFiles);
      }
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Agent error:', errMsg);
      updateLastMessage(`Error: ${errMsg}\n\nPlease check your API key configuration and try again.`);
      processEvent({ type: 'error', error: errMsg });
    } finally {
      stopAgent();
      setStreamingContent('');
    }
  };

  // Keep ref always pointing to latest handleAgentRun (avoids stale closures in effects)
  handleAgentRunRef.current = handleAgentRun;

  // Auto-send initial prompt from landing page.
  // Uses a ref so the timeout is never cancelled by handleAgentRun reference changes.
  useEffect(() => {
    if (initialPrompt && !initialPromptConsumedRef.current) {
      initialPromptConsumedRef.current = true;
      const timer = setTimeout(() => {
        handleAgentRunRef.current?.(initialPrompt);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt]);

  const handleSend = async () => {
    await handleAgentRun();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const isLoading = isAgentRunning;
  
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Agent Status */}
      {(isAgentRunning || agentPhase !== 'idle') && (
        <div className="p-2 border-b border-[#27272a]">
          <AgentStatus />
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center max-w-[280px]">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-gray-200 text-sm">What do you want to build?</p>
              <p className="text-xs mt-2 text-gray-500 leading-relaxed">
                Describe your mobile app idea and Rork will generate the code for you.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="animate-fade-in">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-[#27272a] text-gray-200 px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed border border-[#3f3f46] text-[13px]">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-black" />
                    </div>
                    <span className="font-bold text-gray-100 text-sm">Rork</span>
                    {msg.content.startsWith('[Agent') && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                        Agent
                      </span>
                    )}
                  </div>
                  <div className="pl-8">
                    {/* Message text */}
                    {msg.isStreaming && isLoading ? (
                      <div className="text-gray-300 leading-relaxed text-[13px]">
                        {stripFileBlocks(streamingContent) ? (
                          <div className="chat-markdown"><ReactMarkdown>{stripFileBlocks(streamingContent)}</ReactMarkdown></div>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isAgentRunning 
                              ? planProgress && planProgress.totalFiles > 0
                                ? `Writing file ${planProgress.completedFiles}/${planProgress.totalFiles}...`
                                : agentPhase === 'planning' 
                                  ? 'Planning app structure...' 
                                  : 'Agent is building...'
                              : 'Generating...'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-300 leading-relaxed text-[13px]">
                        <div className="chat-markdown"><ReactMarkdown>
                          {stripFileBlocks(msg.content) || (msg.filesChanged && msg.filesChanged.length > 0 ? 'Done' : msg.content)}
                        </ReactMarkdown></div>
                      </div>
                    )}
                    
                    {/* File list - collapsible box */}
                    {msg.filesChanged && msg.filesChanged.length > 0 && (
                      <button
                        onClick={() => setExpandedFiles(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                        className="mt-3 w-full bg-[#18181b] border border-[#3f3f46] rounded-xl hover:bg-[#1e1e21] transition-colors overflow-hidden"
                      >
                        {/* Header - always visible */}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-sm text-gray-300">
                            <FileCode size={16} className="text-gray-400" />
                            <span className="font-semibold">
                              Edited {msg.filesChanged.length} file{msg.filesChanged.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          {expandedFiles[msg.id] ? (
                            <ChevronDown size={18} className="text-gray-500" />
                          ) : (
                            <ChevronRight size={18} className="text-gray-500" />
                          )}
                        </div>
                        
                        {/* Expanded file entries */}
                        {expandedFiles[msg.id] && (
                          <div className="px-4 pb-3 border-t border-[#27272a]">
                            {msg.filesChanged.map(filePath => (
                              <div 
                                key={filePath}
                                onClick={(e) => { e.stopPropagation(); onViewCode?.(filePath); }}
                                className="flex items-center gap-2.5 px-2 py-2 text-left rounded hover:bg-[#27272a]/60 transition-colors cursor-pointer"
                              >
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                <span className="text-gray-300 truncate flex-1 font-mono text-xs">
                                  Edited {filePath.startsWith('/') ? filePath.slice(1) : filePath}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    )}
                    
                    {/* Action buttons - OUTSIDE file list, below message */}
                    {msg.filesChanged && msg.filesChanged.length > 0 && !msg.isStreaming && (
                      <div className="flex items-center gap-5 mt-3">
                        <button 
                          onClick={() => onViewCode?.(msg.filesChanged?.[0])}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors"
                        >
                          <Code size={13} />
                          <span>View Code</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Runtime Errors */}
      {runtimeErrors.length > 0 && (
        <div className="mx-3 mb-2 bg-red-500/10 border border-red-500/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400 font-medium flex-1">
              {runtimeErrors.length} error{runtimeErrors.length > 1 ? 's' : ''} while running the app
            </span>
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="text-[11px] text-gray-400 hover:text-gray-200 transition-colors px-2 py-0.5"
            >
              Details
            </button>
            <button
              onClick={() => {
                // Send a "fix all" prompt to the AI
                const errorMessages = runtimeErrors.map(e => e.message).join('\n');
                setInput(`Fix these runtime errors:\n${errorMessages}`);
                clearRuntimeErrors();
              }}
              className="text-[11px] font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded-md transition-colors"
            >
              Fix all
            </button>
          </div>
          {showErrorDetails && (
            <div className="px-3 pb-2.5 border-t border-red-500/20">
              {runtimeErrors.map(err => (
                <div key={err.id} className="mt-2 text-xs text-red-300/80 font-mono break-all">
                  {err.message}
                  {err.details && (
                    <div className="mt-1 text-red-300/50 text-[10px]">{err.details}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Input */}
      <div className="p-3 border-t border-[#27272a]">
        <div className="relative bg-[#18181b] rounded-xl border border-[#27272a] p-3 focus-within:border-gray-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the mobile app you want to build..."
            className="w-full bg-transparent outline-none text-[13px] text-gray-200 resize-none h-12 placeholder-gray-500 leading-relaxed custom-scrollbar py-1"
            disabled={isLoading}
          />
          
          <div className="flex justify-between items-center mt-2 px-1">
            {/* Left: Note button */}
            <div className="flex items-center gap-3">
              <button
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                title="Notes (coming soon)"
              >
                <NotebookPen size={18} />
              </button>
            </div>

            <div className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-[#3f3f46] bg-[#27272a]">
              Agent Mode
            </div>

            {/* Right: Mic + Send */}
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors opacity-50 cursor-not-allowed"
                title="Voice input (coming soon)"
              >
                <Mic size={18} />
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={`p-2 rounded-lg transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-white text-black hover:bg-gray-200 shadow-md'
                    : 'text-gray-600 bg-[#27272a]'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
