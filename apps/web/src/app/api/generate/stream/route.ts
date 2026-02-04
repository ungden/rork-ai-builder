import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { createAIProvider, enhancePromptWithContext } from '@ai-engine/core';

export const maxDuration = 300; // 5 min - Gemini needs time with large system prompts

interface ImageAttachment {
  type: 'base64';
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  data: string;
}

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
          model = 'claude',
          currentFiles = {},
          conversationHistory = [],
          images = [] as ImageAttachment[],
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
          .select('id')
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
        
        // Get API key (support both GEMINI_API_KEY and GOOGLE_AI_API_KEY)
        const apiKey = model === 'claude' 
          ? process.env.ANTHROPIC_API_KEY 
          : (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
        
        if (!apiKey) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: `API key not configured for ${model}` })}\n\n`
          ));
          controller.close();
          return;
        }
        
        // Create provider and stream
        const provider = createAIProvider(model, apiKey);
        
        let fullText = '';
        const files: Array<{ path: string; content: string; language: string }> = [];
        let usage = { inputTokens: 0, outputTokens: 0 };
        
        // Enhance prompt with context injection based on keywords
        const enhancedPrompt = enhancePromptWithContext(prompt);
        
        // Save user message (without image data for storage efficiency)
        const messageContent = images.length > 0 
          ? `${prompt}\n[${images.length} image${images.length > 1 ? 's' : ''} attached]`
          : prompt;
          
        await supabase.from('messages').insert({
          project_id: projectId,
          role: 'user',
          content: messageContent,
          model,
        });
        
        // Stream with images support
        for await (const chunk of provider.streamCode({
          prompt: enhancedPrompt,
          currentFiles,
          conversationHistory,
          images: images.length > 0 ? images : undefined,
        })) {
          if (chunk.type === 'text') {
            fullText += chunk.content;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          } else if (chunk.type === 'file') {
            if (chunk.file) {
              files.push(chunk.file);
            }
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          } else if (chunk.type === 'done') {
            usage = chunk.usage || usage;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          } else if (chunk.type === 'error') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          }
        }
        
        // Save assistant message
        await supabase.from('messages').insert({
          project_id: projectId,
          role: 'assistant',
          content: fullText,
          model,
          files_changed: files.map(f => f.path),
          tokens_used: usage.inputTokens + usage.outputTokens,
        });
        
        // Update project files
        if (files.length > 0) {
          for (const file of files) {
            await supabase
              .from('project_files')
              .upsert({
                project_id: projectId,
                path: file.path,
                content: file.content,
                language: file.language,
              }, {
                onConflict: 'project_id,path',
              });
          }
          
          await supabase
            .from('projects')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', projectId);
        }
        
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
