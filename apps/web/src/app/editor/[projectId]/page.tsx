'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FileTree } from '@/components/editor/FileTree';
import { CodePanel } from '@/components/editor/CodePanel';
import { ChatPanel } from '@/components/editor/ChatPanel';
import { PreviewPanel } from '@/components/editor/PreviewPanel';
import { QRPanel } from '@/components/editor/QRPanel';
import { Toolbar } from '@/components/editor/Toolbar';
import { CommandPalette } from '@/components/editor/CommandPalette';
import { useProjectStore, type EditorFile } from '@/stores/projectStore';
import { useToast } from '@/components/ui/Toast';

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
  
  const { setProject, files } = useProjectStore();
  const { showToast } = useToast();

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
        
        const { project, files: projectFiles } = await projectRes.json();
        
        // Convert files to editor format
        const files: Record<string, EditorFile> = {};
        projectFiles.forEach((f: { path: string; content: string; language: string }) => {
          files[f.path] = {
            path: f.path,
            content: f.content,
            language: f.language,
          };
        });
        
        setProject(projectId, project.name, files);
        
      } catch (err) {
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    
    loadProject();
  }, [projectId, router, setProject]);

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
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
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
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Toolbar with view toggle */}
      <Toolbar 
        projectId={projectId} 
        onSave={handleSave} 
        onExport={handleExport}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {/* Main Content - Rork-style layout: Chat | Preview | QR */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Chat Panel (~35%) */}
        <div className="w-[420px] border-r border-border flex-shrink-0">
          <ChatPanel projectId={projectId} />
        </div>
        
        {/* Center - Preview OR Code (toggle, ~40%) */}
        <div className="flex-1 min-w-0 relative">
          {viewMode === 'preview' ? (
            <PreviewPanel 
              projectId={projectId}
              onExpoURLChange={handleExpoURLChange}
              onDevicesChange={handleDevicesChange}
            />
          ) : (
            <div className="h-full flex">
              <div className="w-56 border-r border-border flex-shrink-0">
                <FileTree />
              </div>
              <div className="flex-1 min-w-0">
                <CodePanel projectId={projectId} />
              </div>
            </div>
          )}
        </div>
        
        {/* Right - QR Panel (~25%, max 300px) */}
        <div className="w-[300px] flex-shrink-0">
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
