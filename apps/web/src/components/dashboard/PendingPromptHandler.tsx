'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function PendingPromptHandler() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    const pending = sessionStorage.getItem('rork_pending_prompt');
    if (!pending) return;

    setPromptText(pending);
    setCreating(true);

    // Auto-create project from the landing page prompt
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
          // Keep the prompt in sessionStorage — editor will pick it up
          router.push(`/editor/${project.id}`);
        } else {
          // Failed to create — clear and stay on dashboard
          sessionStorage.removeItem('rork_pending_prompt');
          setCreating(false);
        }
      } catch {
        sessionStorage.removeItem('rork_pending_prompt');
        setCreating(false);
      }
    })();
  }, [router]);

  if (!creating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-white" />
        <p className="text-lg font-medium text-white">Creating your project...</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">&quot;{promptText.slice(0, 100)}{promptText.length > 100 ? '...' : ''}&quot;</p>
      </div>
    </div>
  );
}
