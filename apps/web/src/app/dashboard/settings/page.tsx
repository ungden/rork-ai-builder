'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Github, 
  Smartphone, 
  Check, 
  X, 
  Loader2,
  Moon,
  Sun,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface UserSettings {
  preferred_model: 'claude' | 'gemini';
  theme: 'dark' | 'light';
  github_connected: boolean;
  expo_connected: boolean;
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
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings & { github_token?: string; expo_token?: string }>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSettings(data.settings);
      showToast('Settings saved', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disconnectIntegration = async (integration: 'github' | 'expo') => {
    setSaving(true);
    try {
      const response = await fetch(`/api/settings?integration=${integration}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }
      
      setSettings(prev => prev ? {
        ...prev,
        [`${integration}_connected`]: false
      } : null);
      showToast(`${integration === 'github' ? 'GitHub' : 'Expo'} disconnected`, 'success');
    } catch (error) {
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your preferences and integrations</p>
      </div>

      {/* AI Model Preference */}
      <section className="bg-muted border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">AI Model</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose your preferred AI model for code generation
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={() => updateSettings({ preferred_model: 'claude' })}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              settings?.preferred_model === 'claude'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-border hover:border-accent'
            }`}
            disabled={saving}
          >
            <div className="font-medium">Claude</div>
            <div className="text-sm text-muted-foreground">by Anthropic</div>
          </button>
          
          <button
            onClick={() => updateSettings({ preferred_model: 'gemini' })}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              settings?.preferred_model === 'gemini'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-border hover:border-accent'
            }`}
            disabled={saving}
          >
            <div className="font-medium">Gemini</div>
            <div className="text-sm text-muted-foreground">by Google</div>
          </button>
        </div>
      </section>

      {/* Theme Preference */}
      <section className="bg-muted border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Appearance</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Customize how the app looks
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              settings?.theme === 'dark'
                ? 'border-white bg-white/10'
                : 'border-border hover:border-accent'
            }`}
            disabled={saving}
          >
            <Moon className="w-5 h-5 mb-2" />
            <div className="font-medium">Dark</div>
          </button>
          
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              settings?.theme === 'light'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-border hover:border-accent'
            }`}
            disabled={saving}
          >
            <Sun className="w-5 h-5 mb-2" />
            <div className="font-medium">Light</div>
          </button>
        </div>
      </section>

      {/* GitHub Integration */}
      <section className="bg-muted border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            <h2 className="text-lg font-semibold">GitHub</h2>
          </div>
          {settings?.github_connected ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <X className="w-4 h-4" />
              Not connected
            </div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">
          Connect your GitHub account to sync projects to repositories
        </p>
        
        {showGithubInput ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="Enter your GitHub personal access token"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={handleGithubConnect}
                disabled={saving}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
              <button
                onClick={() => { setShowGithubInput(false); setGithubToken(''); }}
                className="px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Create a token at GitHub Settings &gt; Developer settings &gt; Personal access tokens with repo scope
            </p>
          </div>
        ) : settings?.github_connected ? (
          <button
            onClick={() => disconnectIntegration('github')}
            disabled={saving}
            className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg text-sm hover:bg-red-500/10 disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => setShowGithubInput(true)}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            Connect GitHub
          </button>
        )}
      </section>

      {/* Expo Integration */}
      <section className="bg-muted border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Expo</h2>
          </div>
          {settings?.expo_connected ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <X className="w-4 h-4" />
              Not connected
            </div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">
          Connect your Expo account to build and publish apps
        </p>
        
        {showExpoInput ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="password"
                value={expoToken}
                onChange={(e) => setExpoToken(e.target.value)}
                placeholder="Enter your Expo access token"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={handleExpoConnect}
                disabled={saving}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
              <button
                onClick={() => { setShowExpoInput(false); setExpoToken(''); }}
                className="px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Get your access token at expo.dev &gt; Account Settings &gt; Access Tokens
            </p>
          </div>
        ) : settings?.expo_connected ? (
          <button
            onClick={() => disconnectIntegration('expo')}
            disabled={saving}
            className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg text-sm hover:bg-red-500/10 disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => setShowExpoInput(true)}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            Connect Expo
          </button>
        )}
      </section>

      {/* API Keys Info */}
      <section className="bg-muted border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold">API Keys</h2>
        </div>
        
        <div className="bg-background/50 p-4 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            AI model API keys (Claude, Gemini) are configured on the server side. 
            Contact your administrator if you need to update them.
          </p>
        </div>
      </section>
    </div>
  );
}
