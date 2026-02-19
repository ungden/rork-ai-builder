import Link from 'next/link';
import { Circle, Mic, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Circle className="h-3.5 w-3.5 fill-current" />
            <span className="text-[38px] leading-none sm:text-[34px]">Rork</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#" className="transition-colors hover:text-zinc-100">FAQ</a>
            <a href="#" className="transition-colors hover:text-zinc-100">Docs</a>
            <a href="#" className="transition-colors hover:text-zinc-100">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-accent hover:text-white">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
              Start
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <section className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-100 sm:text-6xl">
            Build real mobile apps, fast.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-xl text-zinc-400 sm:text-3xl">
            Create native mobile apps by chatting with AI. Idea to phone in minutes, to App Store in hours.
          </p>

          <div className="mx-auto mt-10 w-full max-w-4xl rounded-[32px] border border-zinc-700/60 bg-zinc-900/70 p-5 shadow-2xl shadow-black/40">
            <div className="mb-5 min-h-[92px] rounded-2xl bg-zinc-800/45 px-5 py-4 text-left text-2xl text-zinc-400">
              Describe the mobile app you want to build...
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
                  <Sparkles className="h-4 w-4" />
                </button>
                <Link href="/demo" className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700">
                  Try live demo
                </Link>
              </div>

              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-zinc-100">
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-20">
            <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Coming Soon</p>
            <h2 className="mt-3 text-6xl font-semibold tracking-tight sm:text-7xl">
              <span className="text-zinc-100">Rork</span>{' '}
              <span className="text-amber-400">Max</span>
            </h2>
          </div>
        </section>
      </main>
    </div>
  );
}
