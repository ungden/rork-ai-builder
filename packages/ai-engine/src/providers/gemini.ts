import { GoogleGenAI, type Chat, type Content, type Part, Type } from '@google/genai';
import type { 
  AIProvider, 
  GenerateParams, 
  GenerateResult, 
  StreamChunk,
  ConversationMessage 
} from '../types';
import { getLanguageFromPath } from '../tools';
import { FULL_SYSTEM_PROMPT } from '../prompts';

const GEMINI_MODEL = 'gemini-3-pro-preview';

// Tool declaration using the new @google/genai SDK format
const WRITE_FILE_DECLARATION = {
  name: 'write_file',
  description:
    'Write or create a file in the project. Always provide COMPLETE file content with all imports and exports. Call this tool for EVERY file you want to create or modify.',
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

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  displayName = 'Gemini 3 Pro';

  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateCode(params: GenerateParams): Promise<GenerateResult> {
    const {
      prompt,
      systemPrompt,
      currentFiles,
      conversationHistory = [],
      maxTokens = 65536,
    } = params;

    const fullSystemPrompt = systemPrompt || FULL_SYSTEM_PROMPT;

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

    // Use chat API - it automatically handles thoughtSignature for Gemini 3 thinking models
    const chat = this.ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        tools: [{ functionDeclarations: [WRITE_FILE_DECLARATION] }],
        systemInstruction: fullSystemPrompt,
        maxOutputTokens: maxTokens,
        temperature: 1.0,
      },
      history: this.formatHistory(conversationHistory),
    });

    let fullText = '';
    const files: Array<{ path: string; content: string; language: string }> = [];

    // Multi-turn tool loop: send message, process function calls, send results, repeat
    let response = await chat.sendMessage({ message: userContent });

    for (let round = 0; round < 20; round++) {
      // Collect text
      if (response.text) {
        fullText += response.text;
      }

      // Collect function calls
      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) break;

      for (const fc of functionCalls) {
        if (fc.name === 'write_file' && fc.args) {
          const args = fc.args as { path: string; content: string };
          if (args.path && args.content) {
            files.push({
              path: args.path.trim(),
              content: args.content,
              language: getLanguageFromPath(args.path),
            });
          }
        }
      }

      // Build function response parts
      const functionResponseParts: Part[] = functionCalls.map((fc) => ({
        functionResponse: {
          name: fc.name!,
          response: { success: true },
        },
      }));

      // Send function responses back - chat handles thoughtSignature automatically
      response = await chat.sendMessage({ message: functionResponseParts });
    }

    const inputTokens =
      response.usageMetadata?.promptTokenCount ||
      Math.ceil(userContent.length / 4);
    const outputTokens =
      response.usageMetadata?.candidatesTokenCount ||
      Math.ceil(fullText.length / 4);

    return {
      text: fullText,
      files,
      usage: { inputTokens, outputTokens },
    };
  }

  async *streamCode(params: GenerateParams): AsyncGenerator<StreamChunk> {
    const {
      prompt,
      systemPrompt,
      currentFiles,
      conversationHistory = [],
      maxTokens = 65536,
    } = params;

    const fullSystemPrompt = systemPrompt || FULL_SYSTEM_PROMPT;

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

    // Use chat API with NON-STREAMING sendMessage (not sendMessageStream)
    // This ensures thoughtSignature is handled correctly by the SDK.
    // We yield SSE events as each tool call completes (files appear incrementally).
    // At the end, we yield the text explanation.
    const chat = this.ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        tools: [{ functionDeclarations: [WRITE_FILE_DECLARATION] }],
        systemInstruction: fullSystemPrompt,
        maxOutputTokens: maxTokens,
        temperature: 1.0,
      },
      history: this.formatHistory(conversationHistory),
    });

    let fullText = '';

    try {
      let response = await chat.sendMessage({ message: userContent });

      for (let round = 0; round < 20; round++) {
        // Collect text from this response
        if (response.text) {
          fullText += response.text;
        }

        // Check for function calls
        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
          // No more function calls - we're done with the tool loop
          break;
        }

        // Process each function call and yield file events immediately
        for (const fc of functionCalls) {
          if (fc.name === 'write_file' && fc.args) {
            const args = fc.args as { path: string; content: string };
            if (args.path && args.content) {
              yield {
                type: 'file',
                file: {
                  path: args.path.trim(),
                  content: args.content,
                  language: getLanguageFromPath(args.path),
                },
              };
            }
          }
        }

        // Build function response parts
        const functionResponseParts: Part[] = functionCalls.map((fc) => ({
          functionResponse: {
            name: fc.name!,
            response: { success: true },
          },
        }));

        // Send function responses back
        response = await chat.sendMessage({ message: functionResponseParts });
      }

      // Now yield the accumulated text in chunks to simulate streaming
      if (fullText) {
        // Split into ~50 char chunks to give a streaming feel
        const chunkSize = 50;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          const textChunk = fullText.slice(i, i + chunkSize);
          yield { type: 'text', content: textChunk };
        }
      }

      // Usage from the last response
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
