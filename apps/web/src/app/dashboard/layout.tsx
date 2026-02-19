import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const initials =
    (user.user_metadata?.full_name as string | undefined)
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || user.email?.[0].toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">Rork Workspace</p>
              <p className="text-[11px] text-muted-foreground">Build and ship mobile apps</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Settings">
              <Settings className="h-4 w-4" />
            </Link>

            <div className="mx-1 h-6 w-px bg-border" />

            <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {initials}
              </div>
              <span className="max-w-[170px] truncate text-xs text-muted-foreground">{user.email}</span>
            </div>

            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
