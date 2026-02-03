import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Ensure user_settings exists for this user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Upsert user_settings - create if not exists, ignore if exists
        await supabase
          .from('user_settings')
          .upsert(
            { 
              user_id: user.id, 
              preferred_model: 'claude', 
              theme: 'dark' 
            },
            { 
              onConflict: 'user_id',
              ignoreDuplicates: true 
            }
          );
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
