export interface AIProvider {
  name: string;
  displayName: string;
  
  generateCode(params: GenerateParams): Promise<GenerateResult>;
  streamCode(params: GenerateParams): AsyncGenerator<StreamChunk>;
}

export interface GenerateParams {
  prompt: string;
  systemPrompt?: string;
  currentFiles?: Record<string, string>;
  conversationHistory?: ConversationMessage[];
  maxTokens?: number;
  images?: ImageAttachment[];
}

export interface ImageAttachment {
  type: 'base64';
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  data: string; // base64 encoded image data
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: ImageAttachment[];
}



export interface GenerateResult {
  text: string;
  files: ParsedFile[];
  usage: TokenUsage;
}

export interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StreamChunk {
  type: 'text' | 'file' | 'done' | 'error' | 'plan' | 'progress' | 'phase';
  content?: string;
  file?: ParsedFile;
  error?: string;
  usage?: TokenUsage;
  plan?: {
    appName: string;
    appType: string;
    features: string[];
    screens: string[];
    fileTree: string[];
    dependencies: string[];
    planSteps: string[];
  };
  progress?: {
    currentFile: string;
    completedFiles: number;
    totalFiles: number;
  };
  phase?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
