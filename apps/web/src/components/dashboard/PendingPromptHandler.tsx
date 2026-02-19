'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, Zap, Sparkles } from 'lucide-react';

type Step = 'creating' | 'scaffolding' | 'opening';

export function PendingPromptHandler() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [step, setStep] = useState<Step>('creating');

  useEffect(() => {
    const pending = sessionStorage.getItem('rork_pending_prompt');
    if (!pending) return;

    setPromptText(pending);
    setActive(true);
    setStep('creating');

    (async () => {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pending.slice(0, 60),
            description: pending,
          }),
        });

        if (res.ok) {
          const { project } = await res.json();
          setStep('scaffolding');
          await new Promise(r => setTimeout(r, 600));
          setStep('opening');
          await new Promise(r => setTimeout(r, 400));
          // Keep prompt — editor will pick it up and auto-send to AI
          router.push(`/editor/${project.id}`);
        } else {
          sessionStorage.removeItem('rork_pending_prompt');
          setActive(false);
        }
      } catch {
        sessionStorage.removeItem('rork_pending_prompt');
        setActive(false);
      }
    })();
  }, [router]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-lg px-6 text-center">
        {/* Animated icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
          <Sparkles className="h-8 w-8 text-violet-400 animate-pulse" />
        </div>

        <h2 className="text-2xl font-semibold text-white">Building your app</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-sm mx-auto">
          &quot;{promptText.slice(0, 120)}{promptText.length > 120 ? '...' : ''}&quot;
        </p>

        {/* Steps */}
        <div className="mt-8 space-y-4 text-left max-w-xs mx-auto">
          <StepRow
            label="Creating project workspace"
            done={step === 'scaffolding' || step === 'opening'}
            active={step === 'creating'}
          />
          <StepRow
            label="Scaffolding Expo template files"
            done={step === 'opening'}
            active={step === 'scaffolding'}
          />
          <StepRow
            label="Opening editor with AI agent"
            done={false}
            active={step === 'opening'}
          />
        </div>
      </div>
    </div>
  );
}

function StepRow({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-300 ${!done && !active ? 'opacity-30' : 'opacity-100'}`}>
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/50">
        {done ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : active ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
        ) : (
          <Zap className="h-3.5 w-3.5 text-zinc-600" />
        )}
      </div>
      <span className={`text-sm ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-zinc-600'}`}>
        {label}
      </span>
    </div>
  );
}
