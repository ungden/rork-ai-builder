'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock3, MoreHorizontal, Trash2, ExternalLink, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  created_at: string;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 6) return new Date(date).toLocaleDateString();
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function projectGradient(id: string) {
  const gradients = [
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-indigo-600',
    'from-orange-500 to-rose-600',
    'from-fuchsia-500 to-violet-600',
  ];
  return gradients[id.charCodeAt(0) % gradients.length];
}

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setShowMenu(false);
    }
  };

  const gradient = projectGradient(project.id);

  return (
    <>
      <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:bg-accent">
        <Link href={`/editor/${project.id}`} className="block p-5">
          <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-semibold text-white`}>
            {project.name.charAt(0).toUpperCase()}
          </div>

          <h3 className="truncate text-base font-semibold">{project.name}</h3>
          <p className="mt-2 min-h-[42px] text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {project.description || 'No description provided yet.'}
          </p>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Updated {timeAgo(project.updated_at)}
          </div>
        </Link>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
          aria-label="Open project menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-3 top-11 z-20 min-w-[160px] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-2xl">
              <Link
                href={`/editor/${project.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setShowMenu(false)}
              >
                <ExternalLink className="h-4 w-4" />
                Open editor
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </button>
            </div>
          </>
        )}
      </article>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Delete project?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              “{project.name}” and all generated files will be permanently removed.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
