'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUp, Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const EXAMPLE_PROMPTS = [
  'A habit tracker with streaks and daily reminders',
  'A recipe app that generates grocery lists',
  'A workout timer with custom intervals',
  'A mood journal with emoji tags and charts',
  'A flashcard app with spaced repetition',
];

export function HeroPromptBox() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    setLoading(true);

    try {
      // Check if user is logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in — save prompt and redirect to signup
        sessionStorage.setItem('rork_pending_prompt', text);
        router.push('/signup');
        return;
      }

      // Logged in — create project and redirect to editor
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: text.slice(0, 60),
          description: text,
        }),
      });

      if (!res.ok) {
        // Fallback: go to dashboard
        router.push('/dashboard');
        return;
      }

      const { project } = await res.json();

      // Save the prompt so the editor can auto-send it to the AI
      sessionStorage.setItem('rork_pending_prompt', text);
      router.push(`/editor/${project.id}`);
    } catch {
      // Fallback
      sessionStorage.setItem('rork_pending_prompt', prompt.trim());
      router.push('/signup');
    } finally {
      setLoading(false);
    }
  };

  const fillExample = () => {
    const random = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setPrompt(random);
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-4xl rounded-[32px] border border-zinc-700/60 bg-zinc-900/70 p-5 shadow-2xl shadow-black/40">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Describe the mobile app you want to build..."
        rows={3}
        className="mb-5 w-full resize-none rounded-2xl bg-zinc-800/45 px-5 py-4 text-left text-lg text-zinc-100 outline-none placeholder:text-zinc-500 sm:text-xl"
        disabled={loading}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={fillExample}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700"
            title="Try an example prompt"
            disabled={loading}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <Link
            href="/demo"
            className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Try live demo
          </Link>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500"
          title="Build app"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
