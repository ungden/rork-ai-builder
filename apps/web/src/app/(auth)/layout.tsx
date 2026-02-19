import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Rork</p>
            <p className="text-[11px] text-muted-foreground">AI app builder</p>
          </div>
        </Link>
      </div>

      <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="hidden rounded-3xl border border-border bg-card p-10 lg:block">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Build faster</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Turn prompts into working mobile apps.</h1>
          <p className="mt-4 max-w-lg text-base text-zinc-300">
            Generate Expo code with Claude or Gemini, preview instantly, and ship through GitHub + EAS pipelines.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-zinc-200">
            <div className="rounded-xl border border-border bg-secondary px-4 py-3">Autonomous file edits across your full project</div>
            <div className="rounded-xl border border-border bg-secondary px-4 py-3">Live preview and QR testing on real devices</div>
            <div className="rounded-xl border border-border bg-secondary px-4 py-3">Versioned workflows with GitHub and exports</div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-7 shadow-2xl shadow-black/30 sm:p-8">
          {children}
        </section>
      </div>
    </div>
  );
}
