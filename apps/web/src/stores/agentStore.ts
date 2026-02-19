import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AgentPhase, AgentEvent, AppPlan, PlanProgress } from '@ai-engine/core';
import { getLanguageFromPath } from '@/lib/language';

export interface AgentFile {
  path: string;
  content: string;
  language: string;
  status: 'pending' | 'created' | 'updated' | 'error';
}

export interface AgentMessage {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'file' | 'error' | 'complete' | 'step' | 'system';
  content: string;
  timestamp: Date;
  tool?: string;
  file?: { path: string; content: string };
}

interface AgentState {
  // State
  isRunning: boolean;
  phase: AgentPhase;
  plan: AppPlan | null;
  planProgress: PlanProgress | null;
  files: Record<string, AgentFile>;
  messages: AgentMessage[];
  progress: number; // 0-100
  currentTool: string | null;
  error: string | null;
  iterations: number;
  
  // Summary after completion
  summary: string | null;
  filesCreated: string[];
  
  // Actions
  startAgent: () => void;
  stopAgent: () => void;
  setPhase: (phase: AgentPhase) => void;
  setPlan: (plan: AppPlan) => void;
  addFile: (path: string, content: string, language: string) => void;
  updateFile: (path: string, content: string) => void;
  setFileStatus: (path: string, status: AgentFile['status']) => void;
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  setCurrentTool: (tool: string | null) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  incrementIteration: () => void;
  setComplete: (summary: string, filesCreated: string[]) => void;
  processEvent: (event: AgentEvent) => void;
  reset: () => void;
}

const initialState = {
  isRunning: false,
  phase: 'idle' as AgentPhase,
  plan: null,
  planProgress: null as PlanProgress | null,
  files: {},
  messages: [],
  progress: 0,
  currentTool: null,
  error: null,
  iterations: 0,
  summary: null,
  filesCreated: [],
};

// Phase to progress mapping
const PHASE_PROGRESS: Record<AgentPhase, number> = {
  idle: 0,
  planning: 10,
  coding: 30,
  testing: 70,
  debugging: 80,
  complete: 100,
  error: 0,
};

export const useAgentStore = create<AgentState>()(
  immer((set) => ({
    ...initialState,
    
    startAgent: () => set((state) => {
      state.isRunning = true;
      state.phase = 'planning';
      state.error = null;
      state.progress = 5;
      state.messages = [];
      state.files = {};
      state.plan = null;
      state.planProgress = null;
      state.iterations = 0;
      state.summary = null;
      state.filesCreated = [];
    }),
    
    stopAgent: () => set((state) => {
      state.isRunning = false;
    }),
    
    setPhase: (phase) => set((state) => {
      state.phase = phase;
      state.progress = PHASE_PROGRESS[phase];
    }),
    
    setPlan: (plan) => set((state) => {
      state.plan = plan;
      // Pre-populate files as pending
      for (const filePath of plan.fileTree) {
        if (!state.files[filePath]) {
          state.files[filePath] = {
            path: filePath,
            content: '',
            language: getLanguageFromPath(filePath),
            status: 'pending',
          };
        }
      }
    }),
    
    addFile: (path, content, language) => set((state) => {
      state.files[path] = {
        path,
        content,
        language,
        status: 'created',
      };
      // Update progress based on files created
      if (state.plan) {
        const totalFiles = state.plan.fileTree.length;
        const createdFiles = Object.values(state.files).filter(f => 
          f.status === 'created' || f.status === 'updated'
        ).length;
        state.progress = Math.min(70, 30 + (createdFiles / totalFiles) * 40);
      }
    }),
    
    updateFile: (path, content) => set((state) => {
      if (state.files[path]) {
        state.files[path].content = content;
        state.files[path].status = 'updated';
      } else {
        state.files[path] = {
          path,
          content,
          language: getLanguageFromPath(path),
          status: 'created',
        };
      }
    }),
    
    setFileStatus: (path, status) => set((state) => {
      if (state.files[path]) {
        state.files[path].status = status;
      }
    }),
    
    addMessage: (message) => set((state) => {
      state.messages.push({
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      });
      // Keep last 100 messages
      if (state.messages.length > 100) {
        state.messages = state.messages.slice(-100);
      }
    }),
    
    setCurrentTool: (tool) => set((state) => {
      state.currentTool = tool;
    }),
    
    setError: (error) => set((state) => {
      state.error = error;
      if (error) {
        state.phase = 'error';
        state.isRunning = false;
      }
    }),
    
    setProgress: (progress) => set((state) => {
      state.progress = Math.min(100, Math.max(0, progress));
    }),
    
    incrementIteration: () => set((state) => {
      state.iterations += 1;
    }),
    
    setComplete: (summary, filesCreated) => set((state) => {
      state.phase = 'complete';
      state.isRunning = false;
      state.progress = 100;
      state.summary = summary;
      state.filesCreated = filesCreated;
      state.currentTool = null;
    }),
    
    processEvent: (event) => set((state) => {
      switch (event.type) {
        case 'phase_change':
          if (event.phase) {
            state.phase = event.phase;
            state.progress = PHASE_PROGRESS[event.phase];
          }
          break;
          
        case 'thinking':
          state.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'thinking',
            content: event.message || 'Thinking...',
            timestamp: new Date(),
          });
          break;

        case 'text_delta':
          if (event.message) {
            state.messages.push({
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'thinking',
              content: event.message,
              timestamp: new Date(),
            });
          }
          break;

        case 'run_start':
          state.isRunning = true;
          state.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'system',
            content: event.message || 'Agent started',
            timestamp: new Date(),
          });
          break;

        case 'run_finish':
          state.isRunning = false;
          state.currentTool = null;
          break;

        case 'iteration':
          state.iterations = event.iteration || state.iterations;
          break;

        case 'plan_created':
          if (event.plan) {
            state.plan = event.plan;
            for (const filePath of event.plan.fileTree) {
              if (!state.files[filePath]) {
                state.files[filePath] = {
                  path: filePath,
                  content: '',
                  language: getLanguageFromPath(filePath),
                  status: 'pending',
                };
              }
            }
          }
          state.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'step',
            content: event.message || 'Plan created',
            timestamp: new Date(),
          });
          break;

        case 'plan_progress':
          if (event.progress) {
            state.planProgress = event.progress;
            // Update progress bar: plan phase = 10-30, coding = 30-90
            if (event.progress.totalFiles > 0) {
              const ratio = event.progress.completedFiles / event.progress.totalFiles;
              state.progress = Math.min(90, 30 + Math.round(ratio * 60));
            }
          }
          break;

        case 'step_start':
          state.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'step',
            content: event.message || `Starting ${event.step || 'step'}`,
            timestamp: new Date(),
          });
          break;

        case 'step_finish':
          if (event.message) {
            state.messages.push({
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'step',
              content: event.message,
              timestamp: new Date(),
            });
          }
          break;
          
        case 'tool_call':
          state.currentTool = event.tool || null;
          state.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'tool_call',
            content: `Calling ${event.tool}...`,
            timestamp: new Date(),
            tool: event.tool,
          });
          break;
          
        case 'tool_result':
          state.currentTool = null;
          if (event.result && !event.result.success) {
            state.messages.push({
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'error',
              content: event.result.error || 'Tool failed',
              timestamp: new Date(),
            });
          }
          break;
          
        case 'file_created':
        case 'file_updated':
          if (event.file) {
            state.files[event.file.path] = {
              path: event.file.path,
              content: event.file.content,
              language: event.file.language,
              status: event.type === 'file_created' ? 'created' : 'updated',
            };
            state.messages.push({
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'file',
              content: `${event.type === 'file_created' ? 'Created' : 'Updated'} ${event.file.path}`,
              timestamp: new Date(),
              file: { path: event.file.path, content: event.file.content },
            });
            // Update progress
            if (state.plan) {
              const totalFiles = state.plan.fileTree.length;
              const createdFiles = Object.values(state.files).filter(f => 
                f.status === 'created' || f.status === 'updated'
              ).length;
              state.progress = Math.min(70, 30 + (createdFiles / totalFiles) * 40);
            }
          }
          break;
          
        case 'error':
          state.error = event.error || 'Unknown error';
          state.phase = 'error';
          state.isRunning = false;
          state.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'error',
            content: event.error || 'An error occurred',
            timestamp: new Date(),
          });
          break;
          
        case 'complete':
          state.phase = 'complete';
          state.isRunning = false;
          state.progress = 100;
          state.summary = event.summary || null;
          state.filesCreated = event.filesCreated || [];
          state.currentTool = null;
          state.messages.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'complete',
            content: event.summary || 'App built successfully!',
            timestamp: new Date(),
          });
          break;
      }
    }),
    
    reset: () => set(initialState),
  }))
);
