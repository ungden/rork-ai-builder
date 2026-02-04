import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface EditorFile {
  path: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  filesChanged?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface ProjectState {
  // State
  projectId: string | null;
  projectName: string;
  files: Record<string, EditorFile>;
  activeFile: string | null;
  messages: UIMessage[];
  isGenerating: boolean;
  selectedModel: 'claude' | 'gemini';
  streamingContent: string;
  
  // Actions
  setProject: (id: string, name: string, files: Record<string, EditorFile>) => void;
  setFiles: (files: Record<string, EditorFile>) => void;
  updateFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  createFile: (path: string, content: string, language?: string) => void;
  setActiveFile: (path: string | null) => void;
  addMessage: (message: Omit<UIMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string, filesChanged?: string[]) => void;
  setMessages: (messages: UIMessage[]) => void;
  setGenerating: (value: boolean) => void;
  setSelectedModel: (model: 'claude' | 'gemini') => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  applyGeneratedFiles: (files: Array<{ path: string; content: string; language?: string }>) => void;
  reset: () => void;
}

const initialState = {
  projectId: null,
  projectName: '',
  files: {},
  activeFile: null,
  messages: [],
  isGenerating: false,
  selectedModel: 'gemini' as const,
  streamingContent: '',
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript';
    case 'jsx':
    case 'js':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    ...initialState,
    
    setProject: (id, name, files) => set((state) => {
      state.projectId = id;
      state.projectName = name;
      state.files = files;
      state.activeFile = Object.keys(files)[0] || null;
      state.messages = [];
    }),
    
    setFiles: (files) => set((state) => {
      state.files = files;
    }),
    
    updateFile: (path, content) => set((state) => {
      if (state.files[path]) {
        state.files[path].content = content;
        state.files[path].isDirty = true;
      }
    }),
    
    deleteFile: (path) => set((state) => {
      delete state.files[path];
      if (state.activeFile === path) {
        state.activeFile = Object.keys(state.files)[0] || null;
      }
    }),
    
    createFile: (path, content, language) => set((state) => {
      state.files[path] = {
        path,
        content,
        language: language || getLanguageFromPath(path),
        isDirty: true,
      };
    }),
    
    setActiveFile: (path) => set((state) => {
      state.activeFile = path;
    }),
    
    addMessage: (message) => set((state) => {
      state.messages.push({
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      });
    }),
    
    updateLastMessage: (content, filesChanged) => set((state) => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = content;
        lastMessage.isStreaming = false;
        if (filesChanged && filesChanged.length > 0) {
          lastMessage.filesChanged = filesChanged;
        }
      }
    }),
    
    setMessages: (messages) => set((state) => {
      state.messages = messages;
    }),
    
    setGenerating: (value) => set((state) => {
      state.isGenerating = value;
      if (!value) {
        state.streamingContent = '';
      }
    }),
    
    setSelectedModel: (model) => set((state) => {
      state.selectedModel = model;
    }),
    
    setStreamingContent: (content) => set((state) => {
      state.streamingContent = content;
    }),
    
    appendStreamingContent: (content) => set((state) => {
      state.streamingContent += content;
    }),
    
    applyGeneratedFiles: (files) => set((state) => {
      for (const file of files) {
        state.files[file.path] = {
          path: file.path,
          content: file.content,
          language: file.language || getLanguageFromPath(file.path),
          isDirty: false,
        };
      }
    }),
    
    reset: () => set(initialState),
  }))
);
