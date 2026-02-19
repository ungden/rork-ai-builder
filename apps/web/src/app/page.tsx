import Link from 'next/link';
import { ArrowRight, Sparkles, Smartphone, Zap, Github, Code2, Play, GitBranch, ShieldCheck } from 'lucide-react';

const valueProps = [
  {
    icon: <Code2 className="w-5 h-5" />,
    title: 'AI writes production app code',
    desc: 'Generate complete Expo SDK 54 projects with navigation, state, screens, and file-level edits.',
    tone: 'text-sky-300 border-sky-400/30 bg-sky-500/10',
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: 'Preview instantly on web + device',
    desc: 'Run live previews in-browser and scan QR with Expo Go to test on real iOS and Android hardware.',
    tone: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  },
  {
    icon: <GitBranch className="w-5 h-5" />,
    title: 'Ship with GitHub and EAS',
    desc: 'Export ZIP, push to GitHub, and trigger EAS build flows without leaving the workspace.',
    tone: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">Rork</p>
              <p className="text-[11px] text-muted-foreground">AI mobile app builder</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[1180px] gap-10 px-5 pb-14 pt-16 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Connected to Supabase, GitHub, and EAS flows
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Build mobile apps from prompts,
              <span className="block text-zinc-400">then ship them without context switching.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Rork turns plain-English app ideas into working React Native projects, keeps files editable, and lets you publish with real developer workflows.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
                Start building free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                <Play className="h-4 w-4" />
                Try live demo
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/40">
            <div className="flex h-10 items-center gap-2 border-b border-border px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <div className="ml-2 h-6 flex-1 rounded-md border border-border bg-secondary" />
            </div>
            <div className="grid grid-cols-1 border-border md:grid-cols-[250px_1fr]">
              <div className="border-b border-border p-4 md:border-b-0 md:border-r">
                <p className="mb-3 text-[11px] uppercase tracking-wide text-muted-foreground">Prompt</p>
                <div className="rounded-xl border border-border bg-secondary p-3 text-sm leading-relaxed text-zinc-200">
                  Build a fitness habit tracker with streaks, weekly charts, and push reminders.
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2 rounded-full bg-accent" />
                  <div className="h-2 w-4/5 rounded-full bg-accent" />
                  <div className="h-2 w-2/3 rounded-full bg-accent" />
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4 flex items-center gap-4 border-b border-border pb-2 text-xs text-muted-foreground">
                  <span className="border-b border-white pb-1 text-white">app/(tabs)/index.tsx</span>
                  <span>app/(tabs)/progress.tsx</span>
                  <span>components/HabitCard.tsx</span>
                </div>
                <div className="font-mono text-[12px] leading-6 text-zinc-300">
                  <p><span className="text-zinc-500">1</span> import {'{ View, Text }'} from 'react-native';</p>
                  <p><span className="text-zinc-500">2</span> import {'{ WeeklyChart }'} from '@/components/WeeklyChart';</p>
                  <p><span className="text-zinc-500">3</span> import {'{ HabitList }'} from '@/components/HabitList';</p>
                  <p><span className="text-zinc-500">4</span></p>
                  <p><span className="text-zinc-500">5</span> export default function HomeScreen() {'{'}</p>
                  <p><span className="text-zinc-500">6</span>   return &lt;HabitList showStreaks /&gt;;</p>
                  <p><span className="text-zinc-500">7</span> {'}'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1180px] px-5 pb-12 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {valueProps.map((item) => (
              <article key={item.title} className="rounded-2xl border border-border bg-card p-6">
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${item.tone}`}>
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1180px] px-5 pb-20 sm:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Launch faster</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">From idea to installable app in minutes.</h2>
                <p className="mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
                  Use prompts to build features, inspect generated files, and publish through EAS + GitHub with a repeatable workflow your team can trust.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
                  Create workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/demo" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Zap className="h-4 w-4" />
                  Open interactive demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-6 text-sm text-muted-foreground sm:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-black">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            Rork
          </div>
          <a href="https://github.com/ungden/rork-ai-builder" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground">
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
