'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { FileTree } from '@/components/editor/FileTree';
import { CodePanel } from '@/components/editor/CodePanel';
import { ChatPanel } from '@/components/editor/ChatPanel';
import { QRPanel } from '@/components/editor/QRPanel';
import { Toolbar } from '@/components/editor/Toolbar';
import { CommandPalette } from '@/components/editor/CommandPalette';

const PreviewPanel = dynamic(
  () => import('@/components/editor/PreviewPanel').then(mod => mod.PreviewPanel),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-muted-foreground">Loading preview...</div> }
);
import { useProjectStore, type EditorFile, type UIMessage } from '@/stores/projectStore';
import { useToast } from '@/components/ui/Toast';
import { useAutoSave } from '@/hooks/useAutoSave';

type ViewMode = 'preview' | 'code';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [expoURL, setExpoURL] = useState<string | undefined>(undefined);
  const [connectedDevices, setConnectedDevices] = useState(0);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  
  const { setProject, files, setActiveFile } = useProjectStore();
  const { showToast } = useToast();

  // Auto-save dirty files every 2 seconds after changes
  useAutoSave({ projectId, delay: 2000, enabled: !loading });

  // Pick up pending prompt from landing page
  useEffect(() => {
    if (!loading) {
      const pending = sessionStorage.getItem('rork_pending_prompt');
      if (pending) {
        sessionStorage.removeItem('rork_pending_prompt');
        setInitialPrompt(pending);
      }
    }
  }, [loading]);

  // Keyboard shortcut for command palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save all files handler
  const handleSave = useCallback(async () => {
    const dirtyFiles = Object.values(files).filter(f => f.isDirty);
    if (dirtyFiles.length === 0) {
      showToast('No changes to save', 'info');
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: dirtyFiles.map(f => ({
            path: f.path,
            content: f.content,
            language: f.language,
          })),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save');
      showToast(`Saved ${dirtyFiles.length} file(s)`, 'success');
    } catch (err) {
      showToast('Failed to save files', 'error');
    }
  }, [files, projectId, showToast]);

  // Export handler
  const handleExport = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Project exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export project', 'error');
    }
  }, [projectId, showToast]);

  // Keyboard shortcut for save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);
  
  useEffect(() => {
    const loadProject = async () => {
      try {
        // Load project details
        const projectRes = await fetch(`/api/projects/${projectId}`);
        if (!projectRes.ok) {
          if (projectRes.status === 404) {
            setError('Project not found');
          } else if (projectRes.status === 401) {
            router.push('/login');
            return;
          } else {
            setError('Failed to load project');
          }
          return;
        }
        
        const { project, files: projectFiles, messages: dbMessages } = await projectRes.json();
        
        // Convert files to editor format
        const loadedFiles: Record<string, EditorFile> = {};
        projectFiles.forEach((f: { path: string; content: string; language: string }) => {
          loadedFiles[f.path] = {
            path: f.path,
            content: f.content,
            language: f.language,
          };
        });
        
        // Convert DB messages to UIMessage format
        const messages: UIMessage[] = (dbMessages || []).map((m: {
          id: string;
          role: string;
          content: string;
          files_changed?: string[];
          created_at: string;
        }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          filesChanged: m.files_changed || undefined,
          timestamp: new Date(m.created_at),
        }));
        
        setProject(projectId, project.name, loadedFiles, messages);
        
      } catch (err) {
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    
    loadProject();
  }, [projectId, router, setProject]);

  // Handle "View Code" from chat panel - switch to code view and open file
  const handleViewCode = useCallback((filePath?: string) => {
    setViewMode('code');
    if (filePath) {
      setActiveFile(filePath);
    }
  }, [setActiveFile]);

  // Callback to receive Expo URL from PreviewPanel
  const handleExpoURLChange = useCallback((url: string | undefined) => {
    setExpoURL(url);
  }, []);

  // Callback to receive connected devices count
  const handleDevicesChange = useCallback((count: number) => {
    setConnectedDevices(count);
  }, []);
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Toolbar with view toggle */}
      <Toolbar 
        projectId={projectId} 
        onSave={handleSave} 
        onExport={handleExport}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {/* Main Content - Rork-style layout: Chat | Preview | QR */}
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        <div className="w-[420px] min-w-[360px] border-r border-border bg-card">
          <ChatPanel projectId={projectId} onViewCode={handleViewCode} initialPrompt={initialPrompt} />
        </div>
        
        <div className="relative min-w-0 flex-1">
          {viewMode === 'preview' ? (
            <PreviewPanel 
              projectId={projectId}
              onExpoURLChange={handleExpoURLChange}
              onDevicesChange={handleDevicesChange}
            />
          ) : (
            <div className="flex h-full">
              <div className="w-60 flex-shrink-0 border-r border-border bg-card">
                <FileTree />
              </div>
              <div className="flex-1 min-w-0">
                <CodePanel projectId={projectId} />
              </div>
            </div>
          )}
        </div>
        
        <div className="w-[320px] flex-shrink-0 border-l border-border bg-card">
          <QRPanel 
            expoURL={expoURL}
            connectedDevices={connectedDevices}
            onShowCode={() => setViewMode('code')}
          />
        </div>
      </div>
      
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        projectId={projectId}
        onSave={handleSave}
        onExport={handleExport}
      />
    </div>
  );
}
