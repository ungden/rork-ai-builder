'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Mic, ChevronDown, ChevronRight, Sparkles, Image as ImageIcon, X, Zap, Bot, FileCode, RotateCcw, Code } from 'lucide-react';
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
}

interface ImageAttachment {
  id: string;
  preview: string; // data URL for preview
  data: string; // base64 data without prefix
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  name: string;
}

export function ChatPanel({ projectId, onViewCode }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [agentMode, setAgentMode] = useState(false); // Agent mode toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    messages, 
    addMessage, 
    updateLastMessage,
    isGenerating, 
    setGenerating,
    selectedModel,
    setSelectedModel,
    files,
    applyGeneratedFiles,
    streamingContent,
    appendStreamingContent,
    setStreamingContent,
  } = useProjectStore();
  
  const {
    isRunning: isAgentRunning,
    phase: agentPhase,
    startAgent,
    stopAgent,
    processEvent,
    reset: resetAgent,
  } = useAgentStore();
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);
  
  // Process file to base64
  const processFile = useCallback((file: File): Promise<ImageAttachment | null> => {
    return new Promise((resolve) => {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        console.warn('Invalid file type:', file.type);
        resolve(null);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.warn('File too large:', file.size);
        resolve(null);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Extract base64 data without the data URL prefix
        const base64Data = dataUrl.split(',')[1];
        
        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preview: dataUrl,
          data: base64Data,
          mediaType: file.type as ImageAttachment['mediaType'],
          name: file.name,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, []);
  
  // Handle file input change
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: ImageAttachment[] = [];
    for (const file of Array.from(files)) {
      const processed = await processFile(file);
      if (processed) {
        newImages.push(processed);
      }
    }
    
    setAttachedImages(prev => [...prev, ...newImages].slice(0, 4)); // Max 4 images
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);
  
  // Handle paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const processed = await processFile(file);
            if (processed) {
              setAttachedImages(prev => [...prev, processed].slice(0, 4));
            }
          }
          break;
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFile]);
  
  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    const newImages: ImageAttachment[] = [];
    
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const processed = await processFile(file);
        if (processed) {
          newImages.push(processed);
        }
      }
    }
    
    setAttachedImages(prev => [...prev, ...newImages].slice(0, 4));
  }, [processFile]);
  
  // Remove image
  const removeImage = useCallback((id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  }, []);
  
  // Run Agent mode
  const handleAgentRun = async () => {
    if (!input.trim() || isAgentRunning) return;
    
    const prompt = input.trim();
    setInput('');
    setAttachedImages([]);
    
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
        }),
      });
      
      if (!response.ok) {
        throw new Error('Agent run failed');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let summaryContent = 'Building app...';
      const generatedFiles: Array<{ path: string; content: string; language: string }> = [];
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
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
                  }
                } else if (data.type === 'agent_complete') {
                  summaryContent = data.summary || 'App built successfully!';
                  if (data.files && data.files.length > 0) {
                    generatedFiles.push(...data.files);
                  }
                } else if (data.type === 'error') {
                  summaryContent = `Error: ${data.error}`;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
      
      // Update final message with file list
      const changedPaths = generatedFiles.map(f => f.path);
      updateLastMessage(summaryContent, changedPaths);
      
      // Apply generated files
      if (generatedFiles.length > 0) {
        applyGeneratedFiles(generatedFiles);
      }
      
    } catch (error) {
      console.error('Agent error:', error);
      updateLastMessage('Sorry, an error occurred during agent run. Please try again.');
      processEvent({ type: 'error', error: 'Agent run failed' });
    } finally {
      stopAgent();
    }
  };
  
  // Regular chat send
  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isGenerating) return;
    
    // If agent mode, use agent handler
    if (agentMode) {
      handleAgentRun();
      return;
    }
    
    const prompt = input.trim();
    const images = attachedImages.map(img => ({
      type: 'base64' as const,
      mediaType: img.mediaType,
      data: img.data,
    }));
    
    setInput('');
    setAttachedImages([]);
    setGenerating(true);
    setStreamingContent('');
    
    // Add user message (with image indicator)
    const userContent = images.length > 0 
      ? `${prompt}${prompt ? '\n' : ''}[${images.length} image${images.length > 1 ? 's' : ''} attached]`
      : prompt;
    addMessage({ role: 'user', content: userContent });
    
    // Add placeholder for assistant
    addMessage({ role: 'assistant', content: '', isStreaming: true });
    
    try {
      // Build current files context
      const currentFiles: Record<string, string> = {};
      Object.values(files).forEach(f => {
        currentFiles[f.path] = f.content;
      });
      
      // Build conversation history (last 10 messages)
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      // Stream the response
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          prompt,
          model: selectedModel,
          currentFiles,
          conversationHistory,
          images: images.length > 0 ? images : undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Generation failed');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let fullContent = '';
      const generatedFiles: Array<{ path: string; content: string; language: string }> = [];
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'text') {
                  fullContent += data.content;
                  appendStreamingContent(data.content);
                } else if (data.type === 'file' && data.file) {
                  generatedFiles.push(data.file);
                } else if (data.type === 'error') {
                  console.error('Stream error:', data.error);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
      
      // Strip file blocks from message text, pass changed file paths
      const cleanContent = stripFileBlocks(fullContent);
      const changedPaths = generatedFiles.map(f => f.path);
      updateLastMessage(
        cleanContent || 'Project settings updated successfully',
        changedPaths
      );
      
      // Apply generated files
      if (generatedFiles.length > 0) {
        applyGeneratedFiles(generatedFiles);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      updateLastMessage('Sorry, an error occurred. Please try again.');
    } finally {
      setGenerating(false);
      setStreamingContent('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const isLoading = isGenerating || isAgentRunning;
  
  return (
    <div 
      className="h-full flex flex-col bg-[#0a0a0a]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/90 border-2 border-dashed border-blue-500 rounded-lg">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-blue-400" />
            <p className="text-blue-400 font-medium">Drop images here</p>
            <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF, WebP (max 5MB)</p>
          </div>
        </div>
      )}
      
      {/* Agent Status */}
      {(isAgentRunning || agentPhase !== 'idle') && (
        <div className="p-2 border-b border-[#27272a]">
          <AgentStatus />
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-gray-600" />
              <p className="font-medium">Start building your app</p>
              <p className="text-sm mt-1">Describe what you want to create</p>
              <p className="text-xs mt-3 text-gray-600">
                Tip: Enable Agent Mode for autonomous full-app generation
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="animate-fade-in">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-[#27272a] text-gray-200 px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%] leading-relaxed border border-[#3f3f46]">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="font-bold text-gray-100 text-sm">Rork</span>
                    {msg.content.startsWith('[Agent') && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                        Agent
                      </span>
                    )}
                  </div>
                  <div className="pl-4">
                    {/* Message text - strip file blocks */}
                    {msg.isStreaming && isLoading ? (
                      <div className="text-gray-300 leading-relaxed text-[13px] whitespace-pre-wrap">
                        {stripFileBlocks(streamingContent) || (
                          <span className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isAgentRunning ? 'Agent is building...' : 'Generating...'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-300 leading-relaxed text-[13px] whitespace-pre-wrap">
                        {stripFileBlocks(msg.content) || (msg.filesChanged && msg.filesChanged.length > 0 ? 'Project settings updated successfully' : msg.content)}
                      </div>
                    )}
                    
                    {/* Per-message edited files - Rork style collapsible */}
                    {msg.filesChanged && msg.filesChanged.length > 0 && (
                      <div className="mt-3 bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden">
                        {/* File list header */}
                        <div className="px-3 py-2 flex items-center gap-2 text-xs text-gray-400 border-b border-[#27272a]">
                          <FileCode size={12} />
                          <span className="font-medium text-gray-300">
                            {msg.filesChanged.length === 1 ? 'Edited' : `Edited ${msg.filesChanged.length} files`}
                          </span>
                        </div>
                        
                        {/* File entries */}
                        {msg.filesChanged.map(filePath => (
                          <button 
                            key={filePath}
                            onClick={() => onViewCode?.(filePath)}
                            className="w-full px-3 py-1.5 flex items-center gap-2 text-xs border-b border-[#27272a] last:border-b-0 hover:bg-[#27272a]/50 text-left"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="text-gray-400 truncate flex-1">
                              Edited {filePath.startsWith('/') ? filePath.slice(1) : filePath}
                            </span>
                            <Code size={10} className="text-gray-600 flex-shrink-0" />
                          </button>
                        ))}
                        
                        {/* Action buttons - Code / Restore */}
                        <div className="px-3 py-2 flex items-center gap-3 border-t border-[#27272a]">
                          <button 
                            onClick={() => onViewCode?.(msg.filesChanged?.[0])}
                            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            <Code size={11} />
                            Code
                          </button>
                          <button className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors opacity-50 cursor-not-allowed">
                            <RotateCcw size={11} />
                            Restore
                          </button>
                        </div>
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
      
      {/* Input */}
      <div className="p-3 border-t border-[#27272a]">
        {/* Image previews */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachedImages.map(img => (
              <div 
                key={img.id} 
                className="relative group w-16 h-16 rounded-lg overflow-hidden border border-[#3f3f46] bg-[#18181b]"
              >
                <img 
                  src={img.preview} 
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="relative bg-[#18181b] rounded-xl border border-[#27272a] p-2 focus-within:border-gray-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              agentMode 
                ? "Describe the app you want to build... (Agent will create a complete app)"
                : attachedImages.length > 0 
                  ? "Describe what you want to build from this image..." 
                  : "Describe what you want to build..."
            }
            className="w-full bg-transparent outline-none text-[13px] text-gray-200 resize-none h-10 placeholder-gray-500 leading-relaxed custom-scrollbar py-1"
            disabled={isLoading}
          />
          
          <div className="flex justify-between items-center mt-1 px-0.5">
            <div className="flex gap-2 items-center">
              {/* Agent Mode Toggle */}
              <button
                onClick={() => setAgentMode(!agentMode)}
                className={`flex items-center gap-1.5 pl-2 pr-2.5 py-0.5 rounded-full border transition-colors ${
                  agentMode 
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                    : 'bg-[#27272a] border-[#3f3f46] text-gray-400 hover:border-gray-500'
                }`}
                title={agentMode ? 'Agent Mode: ON - Will build complete app' : 'Agent Mode: OFF - Single response'}
              >
                <Bot className="w-3 h-3" />
                <span className="font-semibold text-[11px]">Agent</span>
              </button>
              
              {/* Model Selector - only show when not in agent mode */}
              {!agentMode && (
                <button
                  onClick={() => setSelectedModel(selectedModel === 'claude' ? 'gemini' : 'claude')}
                  className="flex items-center gap-1.5 bg-[#27272a] pl-2 pr-2.5 py-0.5 rounded-full text-gray-300 border border-[#3f3f46] hover:border-gray-500 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span className="font-semibold text-[11px]">
                    {selectedModel === 'claude' ? 'Claude' : 'Gemini'}
                  </span>
                  <ChevronDown size={10} className="text-gray-500" />
                </button>
              )}
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Image upload button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || attachedImages.length >= 4}
                className={`p-1 transition-colors ${
                  attachedImages.length >= 4 
                    ? 'text-gray-600 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                title={attachedImages.length >= 4 ? 'Max 4 images' : 'Attach image (or paste/drag)'}
              >
                <ImageIcon size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
                <Mic size={16} />
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
                className={`p-1.5 rounded-md transition-all ${
                  (input.trim() || attachedImages.length > 0) && !isLoading
                    ? agentMode 
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-white text-black hover:bg-gray-200'
                    : 'text-gray-600'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : agentMode ? (
                  <Zap size={16} />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Agent mode hint */}
        {agentMode && (
          <p className="text-[10px] text-blue-400/70 mt-2 text-center">
            Agent will autonomously plan, code, test, and debug your app
          </p>
        )}
      </div>
    </div>
  );
}
