import Link from 'next/link';
import { Sparkles, Zap, Folder, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CreateProjectButton } from '@/components/dashboard/CreateProjectButton';
import { ProjectCard } from '@/components/dashboard/ProjectCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });

  const hasProjects = Boolean(projects && projects.length > 0);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your mobile app projects</h1>
            <p className="mt-2 text-sm text-zinc-300">
              {hasProjects
                ? `${projects!.length} project${projects!.length === 1 ? '' : 's'} in this workspace`
                : 'Create your first app and start generating production-ready code.'}
            </p>
          </div>
          <CreateProjectButton />
        </div>
      </section>

      {!hasProjects && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Link href="/demo" className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-accent">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-500/10 text-violet-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Try demo first</h3>
            <p className="mt-2 text-sm text-muted-foreground">See the full app builder workflow without creating a project.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-violet-300">
              Open demo <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/10 text-emerald-300">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Start from a prompt</h3>
            <p className="mt-2 text-sm text-muted-foreground">Describe the app in plain English, then iterate by editing files or prompting again.</p>
            <div className="mt-4">
              <CreateProjectButton variant="secondary" />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-secondary p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/35 bg-sky-500/10 text-sky-300">
              <Folder className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">Template packs</h3>
            <p className="mt-2 text-sm text-muted-foreground">Starter kits for e-commerce, social, fitness, and productivity apps.</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Coming soon</p>
          </div>
        </section>
      )}

      {hasProjects ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects!.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary">
            <Folder className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No projects yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create your first project to open the editor and start generating code.</p>
          <div className="mt-6">
            <CreateProjectButton />
          </div>
        </section>
      )}
    </div>
  );
}
