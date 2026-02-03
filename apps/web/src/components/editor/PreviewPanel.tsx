'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Zap, 
  AlertCircle, 
  Play,
  Square,
  Loader2,
  WifiOff,
  ExternalLink,
  Globe,
  Code2
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { usePreviewServer } from '@/hooks/usePreviewServer';

// Lazy load Sandpack for better initial load
const SandpackPreview = lazy(() => import('./SandpackPreview'));

// Custom Icons
const AppleIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.844 1.35914C16.5297 1.45934 15.2492 2.21415 14.7397 3.39955C14.2882 4.45095 14.509 5.86435 15.3117 6.84675C16.1444 7.86974 17.5833 8.35094 18.7371 8.04015C19.349 7.87975 19.8608 7.48875 20.2119 6.94695C20.9344 5.82415 20.6736 4.19035 19.6601 3.23795C19.1484 2.75675 18.5161 2.45595 17.844 1.35914ZM16.3276 8.52135C14.7136 8.52135 13.911 9.61415 12.6371 9.64415C11.3332 9.66415 10.4601 8.50135 9.07659 8.53135C7.29023 8.57154 5.21319 10.3259 5.21319 13.9317C5.21319 17.0657 7.07971 21.657 9.11671 21.657C9.77872 21.657 10.1596 21.1657 11.4536 21.1657C12.7576 21.1657 13.0684 21.677 13.9009 21.6469C16.1472 21.5667 17.6535 17.6673 17.6535 17.6673C17.6134 17.6473 14.86 16.5947 14.8801 13.3903C14.9001 10.7471 16.3276 8.52135 16.3276 8.52135Z" />
  </svg>
);

const AndroidIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.523 15.3414C17.523 16.3298 16.7118 17.1309 15.711 17.1309C14.7102 17.1309 13.899 16.3298 13.899 15.3414C13.899 14.3529 14.7102 13.5518 15.711 13.5518C16.7118 13.5518 17.523 14.3529 17.523 15.3414ZM10.101 15.3414C10.101 16.3298 9.2898 17.1309 8.28905 17.1309C7.2883 17.1309 6.47705 16.3298 6.47705 15.3414C6.47705 14.3529 7.2883 13.5518 8.28905 13.5518C9.2898 13.5518 10.101 14.3529 10.101 15.3414Z" />
  </svg>
);

type PreviewMode = 'web' | 'sandpack' | 'expo';

interface PreviewPanelProps {
  projectId: string;
}

export function PreviewPanel({ projectId }: PreviewPanelProps) {
  const isDev = typeof window !== 'undefined' ? window.location.hostname === 'localhost' : false;
  const [mode, setMode] = useState<PreviewMode>('sandpack');
  const [iframeKey, setIframeKey] = useState(0);
  const { projectName, files } = useProjectStore();
  
  const previewServer = isDev ? usePreviewServer(projectId) : null;
  const {
    isConnected = false,
    isStarting = false,
    webUrl = null,
    expoUrl = null,
    error = null,
    startPreview = async () => {},
    stopPreview = async () => {},
    syncFiles = async () => {},
  } = previewServer || {};
  
  // Sync files to preview server when they change
  const handleSyncFiles = useCallback(async () => {
    const filesMap: Record<string, string> = {};
    Object.values(files).forEach(file => {
      filesMap[file.path] = file.content;
    });
    await syncFiles(filesMap);
  }, [files, syncFiles]);
  
  // Auto-sync files when code changes (debounced)
  useEffect(() => {
    if (!webUrl) return;
    
    const timeout = setTimeout(() => {
      handleSyncFiles();
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [files, handleSyncFiles, webUrl]);
  
  // Listen for refresh event from command palette
  useEffect(() => {
    const handleRefresh = () => setIframeKey(k => k + 1);
    window.addEventListener('refresh-preview', handleRefresh);
    return () => window.removeEventListener('refresh-preview', handleRefresh);
  }, []);
  
  const handleRefresh = () => {
    setIframeKey(k => k + 1);
    handleSyncFiles();
  };
  
  const isRunning = isDev ? (!!webUrl || !!expoUrl) : true; // Always "running" in sandpack mode
  
  return (
    <div className="h-full flex flex-col bg-[#050505]">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center bg-[#0a0a0a] border border-[#27272a] rounded-lg shadow-xl p-1 gap-1">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-2 py-1 hover:bg-[#27272a] rounded cursor-pointer border-r border-[#27272a] mr-1">
            {isStarting ? (
              <>
                <Loader2 size={10} className="animate-spin text-yellow-400" />
                <span className="text-yellow-400 font-medium text-[11px]">Starting</span>
              </>
            ) : isRunning ? (
              <>
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </div>
                <span className="text-gray-200 font-medium text-[11px]">Live</span>
              </>
            ) : isConnected ? (
              <>
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                <span className="text-gray-400 font-medium text-[11px]">Ready</span>
              </>
            ) : (
              <>
                <WifiOff size={10} className="text-red-400" />
                <span className="text-red-400 font-medium text-[11px]">Offline</span>
              </>
            )}
          </div>
          
          {/* Start/Stop */}
          {!isRunning ? (
            <button 
              onClick={startPreview}
              disabled={isStarting || !isConnected}
              className="p-1.5 text-green-500 hover:text-green-400 hover:bg-[#27272a] rounded disabled:opacity-50"
              title="Start preview"
            >
              <Play size={12} fill="currentColor" />
            </button>
          ) : (
            <button 
              onClick={stopPreview}
              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-[#27272a] rounded"
              title="Stop preview"
            >
              <Square size={12} fill="currentColor" />
            </button>
          )}
          
          {/* Refresh */}
          <button 
            onClick={handleRefresh}
            disabled={!isRunning}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#27272a] rounded disabled:opacity-50"
            title="Refresh preview"
          >
            <RefreshCw size={12} />
          </button>
          
          {/* Platform toggles */}
          <div className="border-l border-[#27272a] pl-1 flex items-center">
            <button className="p-1 text-yellow-500/40 hover:text-yellow-500 hover:bg-[#27272a] rounded">
              <Zap size={12} fill="currentColor" />
            </button>
            <button className="p-1 text-gray-400 hover:text-white hover:bg-[#27272a] rounded">
              <AppleIcon size={12} />
            </button>
            <button className="p-1 text-gray-400 hover:text-green-400 hover:bg-[#27272a] rounded">
              <AndroidIcon size={12} />
            </button>
            <button className="p-1 text-gray-400 hover:text-blue-400 hover:bg-[#27272a] rounded">
              <Monitor size={12} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Error Message */}
        {error && (
          <div className="absolute top-4 left-4 right-20 z-10">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          </div>
        )}
        
        {mode === 'sandpack' ? (
          /* Sandpack Instant Preview */
          <div className="relative w-[375px] h-[812px] bg-black rounded-[50px] border-[6px] border-[#18181b] shadow-[0_0_100px_-30px_rgba(0,0,0,0.7)] overflow-hidden ring-1 ring-white/5 z-10 scale-[0.65] origin-center">
            {/* Dynamic Island */}
            <div className="absolute top-[11px] left-1/2 transform -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-[20px] z-50" />
            
            {/* Status Bar */}
            <div className="absolute top-0 w-full h-12 z-40 flex justify-between items-end px-6 pb-2">
              <div className="text-white text-[13px] font-semibold pl-2">9:41</div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-4">
                  <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z" />
                  </svg>
                </div>
                <div className="w-6 h-2.5 rounded-[3px] border border-white/30 relative p-[1px]">
                  <div className="bg-white w-full h-full rounded-[1px]" />
                </div>
              </div>
            </div>
            
            {/* Sandpack Preview Content */}
            <div className="absolute inset-0 pt-12 pb-8 bg-[#0a0a0a] overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                    <p className="text-sm font-medium">Loading preview...</p>
                  </div>
                </div>
              }>
                <SandpackPreview />
              </Suspense>
            </div>
            
            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[130px] h-[5px] bg-white/90 rounded-full z-50" />
          </div>
        ) : mode === 'web' ? (
          /* Mobile Device Frame with Preview Server */
          <div className="relative w-[375px] h-[812px] bg-black rounded-[50px] border-[6px] border-[#18181b] shadow-[0_0_100px_-30px_rgba(0,0,0,0.7)] overflow-hidden ring-1 ring-white/5 z-10 scale-[0.65] origin-center">
            {/* Dynamic Island */}
            <div className="absolute top-[11px] left-1/2 transform -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-[20px] z-50" />
            
            {/* Status Bar */}
            <div className="absolute top-0 w-full h-12 z-40 flex justify-between items-end px-6 pb-2">
              <div className="text-white text-[13px] font-semibold pl-2">9:41</div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-4">
                  <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z" />
                  </svg>
                </div>
                <div className="w-6 h-2.5 rounded-[3px] border border-white/30 relative p-[1px]">
                  <div className="bg-white w-full h-full rounded-[1px]" />
                </div>
              </div>
            </div>
            
            {/* App Content */}
            <div className="absolute inset-0 pt-12 pb-8 bg-[#0a0a0a] overflow-hidden">
              {webUrl ? (
                <iframe
                  key={iframeKey}
                  src={webUrl}
                  className="w-full h-full bg-white"
                  title="App Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    {isStarting ? (
                      <>
                        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                        <p className="text-sm font-medium">Starting preview...</p>
                        <p className="text-xs mt-1">This may take a moment</p>
                      </>
                    ) : isConnected ? (
                      <>
                        <Play className="w-10 h-10 mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-medium">Preview Ready</p>
                        <p className="text-xs mt-1 mb-4">Click Start to run your app</p>
                        <button
                          onClick={startPreview}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          Start Preview
                        </button>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-10 h-10 mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-medium">Preview Server Offline</p>
                        <p className="text-xs mt-1">Start the preview server to see live changes</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[130px] h-[5px] bg-white/90 rounded-full z-50" />
          </div>
        ) : (
          /* QR Code View */
          <div className="text-center p-8">
            {expoUrl ? (
              <>
                <div className="bg-white p-4 rounded-xl mb-6 inline-block">
                  <QRCodeSVG
                    value={expoUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                <h3 className="text-white font-semibold mb-2">Scan to preview</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Open Expo Go on your device and scan this QR code
                </p>
                
                <a
                  href={expoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 text-sm hover:underline"
                >
                  <ExternalLink size={14} />
                  Open in Expo Go
                </a>
              </>
            ) : (
              <>
                <div className="w-[200px] h-[200px] bg-[#18181b] rounded-xl mb-6 inline-flex items-center justify-center">
                  {isStarting ? (
                    <Loader2 className="w-12 h-12 text-gray-500 animate-spin" />
                  ) : (
                    <Smartphone className="w-12 h-12 text-gray-500" />
                  )}
                </div>
                
                <h3 className="text-white font-semibold mb-2">
                  {isStarting ? 'Starting Expo...' : 'Start Preview'}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {isStarting 
                    ? 'Waiting for Expo server to start'
                    : 'Start the preview to get a QR code for Expo Go'
                  }
                </p>
                
                {!isStarting && (
                  <button
                    onClick={startPreview}
                    disabled={!isConnected}
                    className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    Start Preview
                  </button>
                )}
              </>
            )}
            
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 max-w-xs mx-auto flex gap-2.5 mt-6">
              <AlertCircle size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-400 leading-relaxed text-left">
                Browser preview lacks native functions. Test on device for the best results.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Mode Toggle */}
      <div className="p-4 flex justify-center">
        <div className="flex items-center bg-[#18181b] rounded-lg border border-[#27272a] p-1">
          <button
            onClick={() => setMode('sandpack')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              mode === 'sandpack' 
                ? 'bg-[#27272a] text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Instant preview (no server needed)"
          >
            <Code2 size={14} />
            Instant
          </button>
          <button
            onClick={() => setMode('web')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              mode === 'web' 
                ? 'bg-[#27272a] text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Full Expo preview (requires server)"
          >
            <Globe size={14} />
            Full
          </button>
          <button
            onClick={() => setMode('expo')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              mode === 'expo' 
                ? 'bg-[#27272a] text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Scan QR code with Expo Go"
          >
            <Smartphone size={14} />
            Device
          </button>
        </div>
      </div>
    </div>
  );
}
