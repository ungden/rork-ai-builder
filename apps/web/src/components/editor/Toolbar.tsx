'use client';

import { useState } from 'react';
import { 
  Code, 
  Eye, 
  Download, 
  Share2, 
  Lock,
  ChevronDown,
  Save,
  Github,
  Smartphone,
  Loader2,
  ExternalLink,
  Check,
  X,
  ChevronLeft,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/components/ui/Toast';

type ViewMode = 'preview' | 'code';

interface ToolbarProps {
  projectId: string;
  onSave?: () => void;
  onExport?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Toolbar({ projectId, onSave, onExport, viewMode = 'preview', onViewModeChange }: ToolbarProps) {
  const { projectName, files } = useProjectStore();
  const { showToast } = useToast();
  
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isGitHubSyncing, setIsGitHubSyncing] = useState(false);
  const [isBuildTriggering, setIsBuildTriggering] = useState(false);
  const [gitHubResult, setGitHubResult] = useState<{ repoUrl?: string; commitUrl?: string } | null>(null);
  const [buildResult, setBuildResult] = useState<{ buildCommand?: string; instructions?: string[] } | null>(null);
  
  const hasDirtyFiles = Object.values(files).some(f => f.isDirty);
  
  const handleExport = async () => {
    if (onExport) {
      onExport();
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Project exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export project', 'error');
    }
  };
  
  const handleGitHubSync = async () => {
    setIsGitHubSyncing(true);
    setGitHubResult(null);
    
    try {
      const filesMap: Record<string, string> = {};
      Object.values(files).forEach(file => {
        filesMap[file.path] = file.content;
      });
      
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectName || 'rork-app',
          files: filesMap,
          commitMessage: `Update from Rork AI - ${new Date().toISOString()}`,
          isPrivate: true,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync to GitHub');
      }
      
      setGitHubResult({ repoUrl: data.repoUrl, commitUrl: data.commitUrl });
      showToast('Synced to GitHub successfully', 'success');
      
    } catch (error) {
      console.error('GitHub sync error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to sync to GitHub', 'error');
    } finally {
      setIsGitHubSyncing(false);
    }
  };
  
  const handleBuild = async (platform: 'ios' | 'android' | 'all') => {
    setIsBuildTriggering(true);
    setBuildResult(null);
    
    try {
      const response = await fetch('/api/eas/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName: projectName || 'rork-app',
          platform,
          profile: 'preview',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger build');
      }
      
      setBuildResult({ buildCommand: data.buildCommand, instructions: data.instructions });
      showToast('Build configuration generated', 'success');
      
    } catch (error) {
      console.error('Build error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to trigger build', 'error');
    } finally {
      setIsBuildTriggering(false);
    }
  };
  
  return (
    <>
      <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-3 bg-[#0a0a0a]">
        {/* Left Side */}
        <div className="flex items-center gap-2">
          {/* Back arrow */}
          <Link 
            href="/dashboard"
            className="p-1.5 hover:bg-[#27272a] rounded-md text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          
          {/* Project Name + Lock + Dropdown */}
          <button className="flex items-center gap-1.5 hover:bg-[#27272a] px-2 py-1.5 rounded-md transition-colors max-w-[200px]">
            <span className="font-semibold text-white truncate text-sm">
              {projectName || 'Untitled Project'}
            </span>
            <Lock size={11} className="text-gray-500 flex-shrink-0" />
            <ChevronDown size={12} className="text-gray-500 flex-shrink-0" />
          </button>
          
          <div className="h-5 w-px bg-[#27272a]" />
          
          {/* Code / Preview pill toggle -- giống rork.app */}
          <div className="flex items-center bg-[#18181b] rounded-lg p-0.5 border border-[#27272a]">
            <button 
              onClick={() => onViewModeChange?.('code')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'code' 
                  ? 'bg-[#27272a] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Code size={13} />
              Code
            </button>
            <button 
              onClick={() => onViewModeChange?.('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'preview' 
                  ? 'bg-[#27272a] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Eye size={13} />
              Preview
            </button>
          </div>
        </div>
        
        {/* Right Side -- tinh gọn giống rork.app */}
        <div className="flex items-center gap-2">
          {/* Save (chỉ hiện khi có thay đổi) */}
          {onSave && hasDirtyFiles && (
            <button 
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-green-500/40 text-green-400 rounded-md hover:bg-green-500/10 transition-colors"
              title="Save all (Cmd+S)"
            >
              <Save size={12} />
              Save
            </button>
          )}
          
          {/* Publish */}
          <button 
            onClick={() => setShowGitHubModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black rounded-md text-xs font-bold hover:bg-gray-100 transition-colors"
          >
            <Share2 size={12} /> Publish
          </button>
          
          {/* More menu (3 chấm) */}
          <div className="relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 hover:bg-[#27272a] rounded-md text-gray-400 hover:text-white transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
            
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={() => { handleExport(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#27272a] transition-colors"
                  >
                    <Download size={14} /> Download ZIP
                  </button>
                  <button
                    onClick={() => { setShowGitHubModal(true); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#27272a] transition-colors"
                  >
                    <Github size={14} /> Push to GitHub
                  </button>
                  <button
                    onClick={() => { setShowBuildModal(true); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#27272a] transition-colors"
                  >
                    <Smartphone size={14} /> Build for Mobile
                  </button>
                  <div className="h-px bg-[#27272a] my-1" />
                  <Link
                    href="/dashboard/settings"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#27272a] transition-colors"
                    onClick={() => setShowMoreMenu(false)}
                  >
                    Settings
                  </Link>
                </div>
              </>
            )}
          </div>
          
          {/* User Avatar */}
          <Link href="/dashboard/settings">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-orange-500 border border-white/10 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all" />
          </Link>
        </div>
      </div>
      
      {/* GitHub Modal */}
      {showGitHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[#27272a] rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Github size={20} />
                Push to GitHub
              </h2>
              <button 
                onClick={() => { setShowGitHubModal(false); setGitHubResult(null); }}
                className="p-1 hover:bg-[#27272a] rounded"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            
            {gitHubResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check size={20} className="text-green-400" />
                  <span className="text-green-400 font-medium">Successfully pushed to GitHub!</span>
                </div>
                
                <div className="space-y-2">
                  <a 
                    href={gitHubResult.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-[#18181b] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-colors"
                  >
                    <span className="text-sm text-gray-300">View Repository</span>
                    <ExternalLink size={14} className="text-gray-500" />
                  </a>
                  
                  {gitHubResult.commitUrl && (
                    <a 
                      href={gitHubResult.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#18181b] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-colors"
                    >
                      <span className="text-sm text-gray-300">View Commit</span>
                      <ExternalLink size={14} className="text-gray-500" />
                    </a>
                  )}
                </div>
                
                <button
                  onClick={() => { setShowGitHubModal(false); setGitHubResult(null); }}
                  className="w-full py-2 bg-[#27272a] text-white rounded-lg text-sm font-medium hover:bg-[#3f3f46] transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  This will create or update a GitHub repository with your project files.
                </p>
                
                <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg">
                  <p className="text-sm text-gray-300">
                    <span className="text-gray-500">Repository:</span> {projectName || 'rork-app'}
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    <span className="text-gray-500">Files:</span> {Object.keys(files).length} files
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGitHubModal(false)}
                    className="flex-1 py-2 border border-[#27272a] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#27272a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGitHubSync}
                    disabled={isGitHubSyncing}
                    className="flex-1 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGitHubSyncing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Github size={14} />
                        Push to GitHub
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Build Modal */}
      {showBuildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[#27272a] rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Smartphone size={20} />
                Build for Mobile
              </h2>
              <button 
                onClick={() => { setShowBuildModal(false); setBuildResult(null); }}
                className="p-1 hover:bg-[#27272a] rounded"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            
            {buildResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check size={20} className="text-green-400" />
                  <span className="text-green-400 font-medium">Build configuration generated!</span>
                </div>
                
                <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Run this command:</p>
                  <code className="text-sm text-green-400 font-mono">{buildResult.buildCommand}</code>
                </div>
                
                {buildResult.instructions && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-300">Instructions:</p>
                    <ol className="text-sm text-gray-400 space-y-1">
                      {buildResult.instructions.map((instruction, i) => (
                        <li key={i}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                )}
                
                <button
                  onClick={() => { setShowBuildModal(false); setBuildResult(null); }}
                  className="w-full py-2 bg-[#27272a] text-white rounded-lg text-sm font-medium hover:bg-[#3f3f46] transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Generate a build for iOS, Android, or both platforms using Expo EAS.
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleBuild('ios')}
                    disabled={isBuildTriggering}
                    className="p-4 bg-[#18181b] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-colors disabled:opacity-50"
                  >
                    <div className="text-2xl mb-2">🍎</div>
                    <p className="text-sm font-medium text-white">iOS</p>
                    <p className="text-xs text-gray-500">iPhone & iPad</p>
                  </button>
                  
                  <button
                    onClick={() => handleBuild('android')}
                    disabled={isBuildTriggering}
                    className="p-4 bg-[#18181b] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-colors disabled:opacity-50"
                  >
                    <div className="text-2xl mb-2">🤖</div>
                    <p className="text-sm font-medium text-white">Android</p>
                    <p className="text-xs text-gray-500">Phone & Tablet</p>
                  </button>
                  
                  <button
                    onClick={() => handleBuild('all')}
                    disabled={isBuildTriggering}
                    className="p-4 bg-[#18181b] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-colors disabled:opacity-50"
                  >
                    <div className="text-2xl mb-2">📱</div>
                    <p className="text-sm font-medium text-white">Both</p>
                    <p className="text-xs text-gray-500">iOS & Android</p>
                  </button>
                </div>
                
                {isBuildTriggering && (
                  <div className="flex items-center justify-center gap-2 p-4">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                    <span className="text-sm text-gray-400">Generating build configuration...</span>
                  </div>
                )}
                
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-400">
                    Note: You need an Expo account and EAS CLI installed. Add your Expo token in Settings.
                  </p>
                </div>
                
                <button
                  onClick={() => setShowBuildModal(false)}
                  className="w-full py-2 border border-[#27272a] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#27272a] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
