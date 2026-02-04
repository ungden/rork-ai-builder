import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createAIProvider, parseGeneratedFiles } from '@ai-engine/core';

export const maxDuration = 300; // 5 min for generation

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      projectId, 
      prompt, 
      model = 'claude',
      currentFiles = {},
      conversationHistory = []
    } = body;
    
    if (!projectId || !prompt) {
      return NextResponse.json(
        { error: 'projectId and prompt are required' }, 
        { status: 400 }
      );
    }
    
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Get API key based on model
    const apiKey = model === 'claude' 
      ? process.env.ANTHROPIC_API_KEY 
      : process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not configured for ${model}` }, 
        { status: 500 }
      );
    }
    
    // Create AI provider and generate
    const provider = createAIProvider(model, apiKey);
    
    const result = await provider.generateCode({
      prompt,
      currentFiles,
      conversationHistory,
    });
    
    // Save message to database
    await supabase.from('messages').insert({
      project_id: projectId,
      role: 'user',
      content: prompt,
      model,
    });
    
    await supabase.from('messages').insert({
      project_id: projectId,
      role: 'assistant',
      content: result.text,
      model,
      files_changed: result.files.map(f => f.path),
      tokens_used: result.usage.inputTokens + result.usage.outputTokens,
    });
    
    // Update project files if any were generated
    if (result.files.length > 0) {
      for (const file of result.files) {
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
      
      // Update project timestamp
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);
    }
    
    return NextResponse.json({
      message: result.text,
      files: result.files,
      usage: result.usage,
    });
    
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' }, 
      { status: 500 }
    );
  }
}
