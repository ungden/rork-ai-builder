'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Settings, Key, Github, Smartphone, Check, X, Loader2, Sparkles, AlertCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface UserSettings {
  preferred_model: 'claude' | 'gemini';
  theme: 'dark';
  github_connected: boolean;
  expo_connected: boolean;
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [expoToken, setExpoToken] = useState('');
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [showExpoInput, setShowExpoInput] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.settings) setSettings(data.settings);
      } catch {
        showToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [showToast]);

  const updateSettings = async (updates: Partial<UserSettings & { github_token?: string; expo_token?: string }>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSettings(data.settings);
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disconnectIntegration = async (integration: 'github' | 'expo') => {
    setSaving(true);
    try {
      const response = await fetch(`/api/settings?integration=${integration}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to disconnect');
      setSettings((prev) => (prev ? { ...prev, [`${integration}_connected`]: false } as UserSettings : null));
      showToast(`${integration === 'github' ? 'GitHub' : 'Expo'} disconnected`, 'success');
    } catch {
      showToast('Failed to disconnect', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGithubConnect = async () => {
    if (!githubToken.trim()) {
      showToast('Please enter a token', 'error');
      return;
    }
    await updateSettings({ github_token: githubToken });
    setGithubToken('');
    setShowGithubInput(false);
  };

  const handleExpoConnect = async () => {
    if (!expoToken.trim()) {
      showToast('Please enter a token', 'error');
      return;
    }
    await updateSettings({ expo_token: expoToken });
    setExpoToken('');
    setShowExpoInput(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Configure model preferences and integrations for your workspace.</p>
      </div>

      <Section title="AI Model" icon={<Sparkles className="h-5 w-5 text-violet-300" />}>
        <p className="mb-4 text-sm text-muted-foreground">Choose which model the code agent should use by default.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => updateSettings({ preferred_model: 'claude' })}
            disabled={saving}
            className={`rounded-xl border px-4 py-4 text-left transition-colors ${
              settings?.preferred_model === 'claude' ? 'border-violet-400 bg-violet-500/10' : 'border-border bg-secondary hover:bg-accent'
            }`}
          >
            <p className="font-semibold">Claude</p>
            <p className="text-sm text-muted-foreground">Anthropic</p>
          </button>
          <button
            onClick={() => updateSettings({ preferred_model: 'gemini' })}
            disabled={saving}
            className={`rounded-xl border px-4 py-4 text-left transition-colors ${
              settings?.preferred_model === 'gemini' ? 'border-sky-400 bg-sky-500/10' : 'border-border bg-secondary hover:bg-accent'
            }`}
          >
            <p className="font-semibold">Gemini</p>
            <p className="text-sm text-muted-foreground">Google</p>
          </button>
        </div>
      </Section>

      <Section title="GitHub" icon={<Github className="h-5 w-5" />}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Sync project files and commits to repositories.</p>
          <div className={`inline-flex items-center gap-1.5 text-sm ${settings?.github_connected ? 'text-emerald-300' : 'text-muted-foreground'}`}>
            {settings?.github_connected ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {settings?.github_connected ? 'Connected' : 'Not connected'}
          </div>
        </div>

        {showGithubInput ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="GitHub personal access token"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
              <button onClick={handleGithubConnect} disabled={saving} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => { setShowGithubInput(false); setGithubToken(''); }} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">
                Cancel
              </button>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
              GitHub Settings &gt; Developer settings &gt; Personal access tokens (repo scope)
            </p>
          </div>
        ) : settings?.github_connected ? (
          <button onClick={() => disconnectIntegration('github')} disabled={saving} className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-60">
            Disconnect
          </button>
        ) : (
          <button onClick={() => setShowGithubInput(true)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
            Connect GitHub
          </button>
        )}
      </Section>

      <Section title="Expo" icon={<Smartphone className="h-5 w-5 text-sky-300" />}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Enable EAS build and publish actions.</p>
          <div className={`inline-flex items-center gap-1.5 text-sm ${settings?.expo_connected ? 'text-emerald-300' : 'text-muted-foreground'}`}>
            {settings?.expo_connected ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {settings?.expo_connected ? 'Connected' : 'Not connected'}
          </div>
        </div>

        {showExpoInput ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={expoToken}
                onChange={(e) => setExpoToken(e.target.value)}
                placeholder="Expo access token"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
              <button onClick={handleExpoConnect} disabled={saving} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => { setShowExpoInput(false); setExpoToken(''); }} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">
                Cancel
              </button>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
              expo.dev &gt; Account Settings &gt; Access Tokens
            </p>
          </div>
        ) : settings?.expo_connected ? (
          <button onClick={() => disconnectIntegration('expo')} disabled={saving} className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-60">
            Disconnect
          </button>
        ) : (
          <button onClick={() => setShowExpoInput(true)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
            Connect Expo
          </button>
        )}
      </Section>

      <Section title="API Keys" icon={<Key className="h-5 w-5 text-amber-300" />}>
        <p className="rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
          Model provider keys are configured server-side. Update environment variables in Vercel to rotate API keys.
        </p>
      </Section>
    </div>
  );
}
