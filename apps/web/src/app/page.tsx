import Link from 'next/link';
import { Circle } from 'lucide-react';
import { HeroPromptBox } from '@/components/landing/HeroPromptBox';

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
            <Link href="/demo" className="transition-colors hover:text-zinc-100">Demo</Link>
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

          <HeroPromptBox />

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
