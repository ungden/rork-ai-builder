'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';

interface CreateProjectButtonProps {
  variant?: 'primary' | 'secondary';
}

export function CreateProjectButton({ variant = 'primary' }: CreateProjectButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create project');
        return;
      }
      router.push(`/editor/${data.project.id}`);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          reset();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
          variant === 'primary' ? 'bg-white text-black hover:bg-zinc-200' : 'border border-border bg-secondary text-zinc-200 hover:bg-accent'
        }`}
      >
        <Plus className="h-4 w-4" />
        {variant === 'primary' ? 'New project' : 'Create project'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Create project</h2>
                <p className="text-sm text-muted-foreground">Open a new editor workspace with AI generation enabled.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Habit Tracker Mobile"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500"
                  autoFocus
                  required
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of the app and intended users"
                  className="h-24 w-full resize-none rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500"
                />
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create and open'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
