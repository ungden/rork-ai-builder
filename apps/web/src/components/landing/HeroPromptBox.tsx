'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUp, Sparkles, Loader2, Check, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const EXAMPLE_PROMPTS = [
  'A habit tracker with streaks and daily reminders',
  'A recipe app that generates grocery lists',
  'A workout timer with custom intervals',
  'A mood journal with emoji tags and charts',
  'A flashcard app with spaced repetition',
];

type BuildStep = 'idle' | 'checking' | 'creating' | 'opening' | 'redirecting';

const STEP_LABELS: Record<BuildStep, string> = {
  idle: '',
  checking: 'Checking authentication...',
  creating: 'Creating project workspace...',
  opening: 'Setting up AI agent...',
  redirecting: 'Opening editor — AI will start building...',
};

export function HeroPromptBox() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<BuildStep>('idle');

  const isLoading = step !== 'idle';

  const handleSubmit = async () => {
    const text = prompt.trim();
    if (!text || isLoading) return;

    setStep('checking');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        sessionStorage.setItem('rork_pending_prompt', text);
        router.push('/signup');
        return;
      }

      setStep('creating');

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: text.slice(0, 60),
          description: text,
        }),
      });

      if (!res.ok) {
        sessionStorage.setItem('rork_pending_prompt', text);
        router.push('/dashboard');
        return;
      }

      const { project } = await res.json();

      setStep('opening');
      sessionStorage.setItem('rork_pending_prompt', text);

      // Brief pause so user sees the step
      await new Promise(r => setTimeout(r, 400));
      setStep('redirecting');

      router.push(`/editor/${project.id}`);
    } catch {
      sessionStorage.setItem('rork_pending_prompt', prompt.trim());
      router.push('/signup');
    }
  };

  const fillExample = () => {
    const random = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setPrompt(random);
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-4xl">
      <div className="rounded-[32px] border border-zinc-700/60 bg-zinc-900/70 p-5 shadow-2xl shadow-black/40">
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
          disabled={isLoading}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={fillExample}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700"
              title="Try an example prompt"
              disabled={isLoading}
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
            disabled={!prompt.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500"
            title="Build app"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Build progress steps */}
      {isLoading && (
        <div className="mt-6 animate-fade-in">
          <div className="mx-auto max-w-md space-y-3">
            <BuildStepRow label="Checking authentication" done={step !== 'checking'} active={step === 'checking'} />
            <BuildStepRow label="Creating project workspace" done={step === 'opening' || step === 'redirecting'} active={step === 'creating'} />
            <BuildStepRow label="Setting up AI agent" done={step === 'redirecting'} active={step === 'opening'} />
            <BuildStepRow label="Opening editor — AI will start building" done={false} active={step === 'redirecting'} />
          </div>
        </div>
      )}
    </div>
  );
}

function BuildStepRow({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-opacity ${!done && !active ? 'opacity-30' : 'opacity-100'}`}>
      <div className="flex h-6 w-6 items-center justify-center">
        {done ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : active ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        ) : (
          <Zap className="h-4 w-4 text-zinc-600" />
        )}
      </div>
      <span className={`text-sm ${done ? 'text-emerald-400' : active ? 'text-blue-400' : 'text-zinc-600'}`}>
        {label}
      </span>
    </div>
  );
}
