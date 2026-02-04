'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, RefreshCw, AlertCircle, FileCode2, Check } from 'lucide-react';
import { Snack, SnackFiles, SnackDependencies } from 'snack-sdk';
import { useProjectStore } from '@/stores/projectStore';

interface PreviewPanelProps {
  projectId: string;
  onExpoURLChange?: (url: string | undefined) => void;
  onDevicesChange?: (count: number) => void;
}

const SDK_VERSION = '54.0.0';

function transformFilesToSnack(files: Record<string, { path: string; content: string }>): SnackFiles {
  const snackFiles: SnackFiles = {};
  Object.values(files).forEach((file) => {
    const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
    if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i)) return;
    snackFiles[path] = { type: 'CODE', contents: file.content };
  });
  return snackFiles;
}

function extractDependencies(files: Record<string, { path: string; content: string }>): SnackDependencies {
  const packageFile = Object.values(files).find(f =>
    f.path === 'package.json' || f.path === '/package.json'
  );
  const deps: SnackDependencies = {
    'expo-router': { version: '*' },
    'expo-status-bar': { version: '*' },
    'expo-linear-gradient': { version: '*' },
    'expo-blur': { version: '*' },
    'expo-haptics': { version: '*' },
    '@expo/vector-icons': { version: '*' },
    'expo-image': { version: '*' },
    'expo-av': { version: '*' },
    'expo-camera': { version: '*' },
    'expo-image-picker': { version: '*' },
    'react-native-safe-area-context': { version: '*' },
    'react-native-reanimated': { version: '*' },
    '@react-native-async-storage/async-storage': { version: '*' },
  };
  if (packageFile) {
    try {
      const pkg = JSON.parse(packageFile.content);
      if (pkg.dependencies) {
        Object.keys(pkg.dependencies).forEach(name => {
          if (!['react', 'react-native', 'expo'].includes(name)) {
            deps[name] = { version: pkg.dependencies[name].replace(/[\^~]/, '') || '*' };
          }
        });
      }
    } catch { /* ignore */ }
  }
  return deps;
}

const DEFAULT_APP = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Rork</Text>
      <Text style={styles.subtitle}>Your app will appear here</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});
`;

export function PreviewPanel({ projectId, onExpoURLChange, onDevicesChange }: PreviewPanelProps) {
  const { files, isGenerating, generatingFiles, streamingContent } = useProjectStore();

  // Ref that the Snack SDK reads lazily via ref.current when posting messages to the iframe.
  const webPreviewRef = useRef<Window | null>(null);
  const snackRef = useRef<Snack | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webPreviewURL, setWebPreviewURL] = useState<string | undefined>(undefined);

  const snackFiles = useMemo(() => {
    const transformed = transformFilesToSnack(files);
    const hasAppJs = Object.keys(transformed).some(p => p === 'App.js' || p === 'App.tsx');
    const hasExpoRouter = Object.keys(transformed).some(p =>
      p.startsWith('app/') && (p.endsWith('index.tsx') || p.endsWith('index.js'))
    );
    if (!hasAppJs && !hasExpoRouter) {
      transformed['App.js'] = { type: 'CODE', contents: DEFAULT_APP };
    }
    return transformed;
  }, [files]);

  const dependencies = useMemo(() => extractDependencies(files), [files]);

  // === SNACK LIFECYCLE ===
  // Following the official snack.expo.dev pattern:
  //   1. Create Snack with disabled: true (no transports start, no code messages sent)
  //   2. webPreviewURL is still computed immediately
  //   3. Render iframe with that URL
  //   4. After iframe mounts and sets webPreviewRef.current, call setDisabled(false)
  //   5. This starts the webplayer transport, which can now communicate with the iframe
  //
  // We do NOT pass online: true - that's only for pubsub (physical device via QR).
  // The web preview works through the 'webplayer' transport alone.

  useEffect(() => {
    if (snackRef.current) {
      snackRef.current.setOnline(false);
      snackRef.current = null;
    }

    const snack = new Snack({
      disabled: true, // Start disabled - enable after iframe mounts
      files: snackFiles,
      dependencies,
      sdkVersion: SDK_VERSION,
      webPreviewRef,
      codeChangesDelay: 500,
    });

    snackRef.current = snack;

    // webPreviewURL is computed in the constructor even when disabled
    const initialState = snack.getState();
    if (initialState.webPreviewURL) {
      setWebPreviewURL(initialState.webPreviewURL);
    }
    if (initialState.url) {
      onExpoURLChange?.(initialState.url);
    }

    const unsubscribe = snack.addStateListener((state, prevState) => {
      if (state.webPreviewURL !== prevState.webPreviewURL) {
        setWebPreviewURL(state.webPreviewURL);
      }
      if (state.url !== prevState.url) {
        onExpoURLChange?.(state.url);
      }
      const clientCount = Object.keys(state.connectedClients || {}).length;
      onDevicesChange?.(clientCount);
    });

    // Timeout fallback
    const timeout = setTimeout(() => setIsLoading(false), 20000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
      snack.setOnline(false);
      snackRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update files reactively
  useEffect(() => {
    if (snackRef.current) {
      snackRef.current.updateFiles(snackFiles);
    }
  }, [snackFiles]);

  useEffect(() => {
    if (snackRef.current) {
      snackRef.current.updateDependencies(dependencies);
    }
  }, [dependencies]);

  // Iframe ref callback: captures contentWindow into webPreviewRef
  const handleIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    webPreviewRef.current = iframe?.contentWindow ?? null;
  }, []);

  // When iframe finishes loading the Snack runtime:
  //   1. Re-capture contentWindow (iframe navigation may have replaced it)
  //   2. Enable the Snack (starts transports, sends code to the iframe runtime)
  //   3. Inject synthetic CONNECT to fix race condition where iframe sent CONNECT before we started listening
  //   4. Also enable online for QR code / physical device support
  const handleIframeLoad = useCallback(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Expo Snack Preview"]');
    if (iframe?.contentWindow) {
      webPreviewRef.current = iframe.contentWindow;
    }

    // Delay enabling to allow the web player inside the iframe to initialize
    // its postMessage listener. Without this, messages from the SDK are lost.
    setTimeout(() => {
      if (snackRef.current) {
        snackRef.current.setDisabled(false);
        snackRef.current.setOnline(true);

        // Fix "Connecting..." forever bug:
        // The iframe may have sent its CONNECT postMessage before setDisabled(false)
        // started the webplayer transport listener. When that happens, connectionsCount
        // stays 0 and sendCodeChanges() is a no-op.
        // We inject a synthetic CONNECT event into the webplayer transport to force
        // connectionsCount to 1, which allows code to be sent to the iframe.
        setTimeout(() => {
          if (snackRef.current) {
            const state = snackRef.current.getState();
            const webplayerTransport = state.transports?.webplayer;
            if (webplayerTransport) {
              webplayerTransport.postMessage({
                type: 'synthetic_event',
                data: JSON.stringify({
                  type: 'CONNECT',
                  device: { id: 'web-synthetic', name: 'Web Player', platform: 'web' },
                }),
              } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            snackRef.current.sendCodeChanges();
          }
        }, 500);
      }
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleRefresh = useCallback(() => {
    if (snackRef.current) {
      setIsLoading(true);
      snackRef.current.sendCodeChanges();
      setTimeout(() => setIsLoading(false), 3000);
    }
  }, []);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#050505]">
        <div className="text-center p-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm mb-2">Preview Error</p>
          <p className="text-gray-500 text-xs">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-4 px-3 py-1.5 bg-white/10 text-white rounded text-xs hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#050505]">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center bg-[#0a0a0a] border border-[#27272a] rounded-lg shadow-xl p-1 gap-1">
          <div className="flex items-center gap-2 px-2 py-1 border-r border-[#27272a] mr-1">
            {isGenerating ? (
              <>
                <Loader2 size={10} className="animate-spin text-blue-400" />
                <span className="text-blue-400 font-medium text-[11px]">Building</span>
              </>
            ) : isLoading ? (
              <>
                <Loader2 size={10} className="animate-spin text-yellow-400" />
                <span className="text-yellow-400 font-medium text-[11px]">Loading</span>
              </>
            ) : (
              <>
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </div>
                <span className="text-gray-200 font-medium text-[11px]">Live</span>
              </>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#27272a] rounded"
            title="Refresh preview"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Phone Frame */}
        <div className="relative w-[375px] h-[812px] bg-black rounded-[50px] border-[6px] border-[#18181b] shadow-[0_0_100px_-30px_rgba(0,0,0,0.7)] overflow-hidden ring-1 ring-white/5 z-10 scale-[0.72] origin-center">
          <div className="absolute top-[11px] left-1/2 transform -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-[20px] z-50" />
          <div className="absolute top-0 w-full h-12 z-40 flex justify-between items-end px-6 pb-2">
            <div className="text-white text-[13px] font-semibold pl-2">9:41</div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-2.5 rounded-[3px] border border-white/30 relative p-[1px]">
                <div className="bg-white w-full h-full rounded-[1px]" />
              </div>
            </div>
          </div>

          <div className="absolute inset-0 pt-12 pb-8 bg-[#0a0a0a] overflow-hidden">
            {/* Always render iframe when URL is available. 
                The Snack starts disabled, iframe loads the runtime,
                then onLoad enables the Snack so transport can communicate. */}
            {webPreviewURL ? (
              <iframe
                ref={handleIframeRef}
                src={webPreviewURL}
                onLoad={handleIframeLoad}
                className="w-full h-full border-0 bg-[#0a0a0a]"
                title="Expo Snack Preview"
                allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking; screen-wake-lock"
                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
              />
            ) : null}

            {/* Building overlay - shown when AI is generating */}
            {isGenerating && (
              <div className="absolute inset-0 z-30 flex flex-col bg-[#0a0a0a]/90 backdrop-blur-sm">
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                  {/* Animated building indicator */}
                  <div className="relative mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                      <FileCode2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 opacity-30 animate-ping" />
                  </div>
                  
                  <p className="text-white font-semibold text-sm mb-1">Building your app</p>
                  <p className="text-gray-500 text-xs mb-5">Rork is writing code...</p>
                  
                  {/* File list being generated */}
                  {generatingFiles.length > 0 && (
                    <div className="w-full max-w-[260px] space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {generatingFiles.map((filePath, i) => (
                        <div 
                          key={filePath}
                          className="flex items-center gap-2 text-xs animate-fade-in"
                        >
                          <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300 truncate font-mono">{filePath}</span>
                        </div>
                      ))}
                      {/* Pulsing indicator for "more coming" */}
                      <div className="flex items-center gap-2 text-xs">
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />
                        <span className="text-gray-500">writing...</span>
                      </div>
                    </div>
                  )}

                  {/* No files yet - show initial state */}
                  {generatingFiles.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Analyzing your request...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(!webPreviewURL || isLoading) && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                <div className="text-center text-gray-500">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p className="text-sm font-medium">
                    {webPreviewURL ? 'Loading preview...' : 'Connecting to Expo...'}
                  </p>
                  <p className="text-xs mt-1">This may take a moment</p>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[130px] h-[5px] bg-white/90 rounded-full z-50" />
        </div>
      </div>
    </div>
  );
}
