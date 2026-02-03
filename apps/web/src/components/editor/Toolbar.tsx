'use client';

import { useState } from 'react';
import { 
  Code, 
  Eye, 
  BarChart2, 
  ChevronRight, 
  Download, 
  GitBranch, 
  Share2, 
  Box,
  Lock,
  ChevronDown,
  Sparkles,
  Save,
  Command,
  Github,
  Smartphone,
  Loader2,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/components/ui/Toast';

interface ToolbarProps {
  projectId: string;
  onSave?: () => void;
  onExport?: () => void;
}

export function Toolbar({ projectId, onSave, onExport }: ToolbarProps) {
  const { projectName, files } = useProjectStore();
  const { showToast } = useToast();
  
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
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
      // Convert files to the format expected by API
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
        <div className="flex items-center gap-3">
          {/* Back to Dashboard */}
          <Link 
            href="/"
            className="flex items-center gap-2 hover:bg-[#27272a] p-1.5 rounded cursor-pointer transition-colors"
          >
            <ChevronRight size={16} className="text-gray-500 rotate-180" />
          </Link>
          
          {/* Project Name */}
          <div className="flex items-center gap-2 hover:bg-[#27272a] p-1.5 rounded cursor-pointer transition-colors max-w-[200px]">
            <span className="font-semibold text-gray-200 truncate text-sm">
              {projectName || 'Untitled Project'}
            </span>
            <Lock size={12} className="text-gray-500 flex-shrink-0" />
            <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
          </div>
          
          <div className="h-4 w-[1px] bg-[#27272a]" />
          
          {/* View Toggle */}
          <div className="flex items-center bg-[#18181b] rounded-md border border-[#27272a] p-0.5">
            <button className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#27272a] rounded">
              <Code size={12} />
            </button>
            <button className="flex items-center gap-2 bg-[#27272a] text-gray-200 px-2 py-1 rounded text-[12px] font-medium shadow-sm">
              <Eye size={12} /> Preview
            </button>
            <button className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#27272a] rounded">
              <BarChart2 size={12} />
            </button>
          </div>
        </div>
        
        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Upgrade Button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1b4b] text-[#c7d2fe] border border-[#312e81] rounded-md text-[12px] font-bold transition-colors hover:bg-[#2e2a5b]">
            <Sparkles size={10} />
            Upgrade
          </button>
          
          {/* Integrations */}
          <Link 
            href="/dashboard/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-gray-200 text-[12px] font-medium border border-[#27272a] rounded-md hover:bg-[#27272a] transition-colors"
          >
            <Box size={12} /> Integrations
          </Link>
          
          {/* Save Button */}
          {onSave && (
            <button 
              onClick={onSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border rounded-md transition-colors ${
                hasDirtyFiles 
                  ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' 
                  : 'border-[#27272a] text-gray-400 hover:bg-[#27272a]'
              }`}
              title="Save all (Cmd+S)"
            >
              <Save size={12} />
              {hasDirtyFiles && 'Save'}
            </button>
          )}
          
          {/* Download & Git & Build */}
          <div className="flex items-center border border-[#27272a] rounded-md bg-[#0a0a0a]">
            <button 
              onClick={handleExport}
              className="p-1.5 hover:bg-[#27272a] text-gray-400 hover:text-gray-200 border-r border-[#27272a]"
              title="Download project as ZIP"
            >
              <Download size={14} />
            </button>
            <button 
              onClick={() => setShowGitHubModal(true)}
              className="p-1.5 hover:bg-[#27272a] text-gray-400 hover:text-gray-200 border-r border-[#27272a]"
              title="Sync to GitHub"
            >
              <Github size={14} />
            </button>
            <button 
              onClick={() => setShowBuildModal(true)}
              className="p-1.5 hover:bg-[#27272a] text-gray-400 hover:text-gray-200 border-r border-[#27272a]"
              title="Build for iOS/Android"
            >
              <Smartphone size={14} />
            </button>
            <button 
              className="p-1.5 hover:bg-[#27272a] text-gray-400 hover:text-gray-200"
              title="Command palette (Cmd+K)"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            >
              <Command size={14} />
            </button>
          </div>
          
          {/* Publish */}
          <button 
            onClick={() => setShowGitHubModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-md text-[12px] font-bold hover:bg-gray-200 transition-colors shadow-sm ml-1"
          >
            <Share2 size={12} /> Publish
          </button>
          
          {/* User Avatar */}
          <Link href="/dashboard/settings">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-orange-500 border border-white/10 ml-1 cursor-pointer hover:ring-2 hover:ring-purple-500/50" />
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
                
                <a
                  href="https://expo.dev/accounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-[#27272a] text-white rounded-lg text-sm font-medium hover:bg-[#3f3f46] transition-colors"
                >
                  Open Expo Dashboard
                  <ExternalLink size={14} />
                </a>
                
                <button
                  onClick={() => { setShowBuildModal(false); setBuildResult(null); }}
                  className="w-full py-2 border border-[#27272a] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#27272a] transition-colors"
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
                
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400">
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
