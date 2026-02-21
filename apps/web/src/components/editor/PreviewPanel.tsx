'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, RefreshCw, AlertCircle, FileCode2, Check, Smartphone, Tablet, Sparkles } from 'lucide-react';
import { Snack, SnackFiles, SnackDependencies, type SDKVersion } from 'snack-sdk';
import { useProjectStore } from '@/stores/projectStore';
import { useAgentStore } from '@/stores/agentStore';

interface PreviewPanelProps {
  projectId: string;
  onExpoURLChange?: (url: string | undefined) => void;
  onDevicesChange?: (count: number) => void;
}

// Preferred SDK version. Falls back to 53.0.0 if the web player for 54 is unavailable.
const PREFERRED_SDK_VERSION: SDKVersion = '54.0.0';
const FALLBACK_SDK_VERSION: SDKVersion = '53.0.0';

// Probe the S3 web player to see if it actually exists for the given SDK major version.
async function resolveSDKVersion(): Promise<SDKVersion> {
  const majorVersion = PREFERRED_SDK_VERSION.split('.')[0];
  const probeURL = `https://snack-web-player.s3.us-west-1.amazonaws.com/v2/${majorVersion}/index.html`;
  try {
    await fetch(probeURL, { method: 'HEAD', mode: 'no-cors' });
    // mode: 'no-cors' returns opaque response — treat as available if no network error
    return PREFERRED_SDK_VERSION;
  } catch {
    console.warn(`Snack web player v${majorVersion} unavailable, falling back to ${FALLBACK_SDK_VERSION}`);
    return FALLBACK_SDK_VERSION;
  }
}

function transformFilesToSnack(files: Record<string, { path: string; content: string }>): SnackFiles {
  const snackFiles: SnackFiles = {};
  Object.values(files).forEach((file) => {
    const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
    if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i)) return;
    
    // EXTREMELY IMPORTANT: Never send configuration files to Snack Web Player.
    // Snack already provides its own babel, typescript, and metro configurations.
    // If we send custom ones, it breaks the entire Preview with Babel/Flow errors.
    if (['package.json', 'babel.config.js', 'tsconfig.json', 'app.json', 'metro.config.js'].includes(path)) {
      return;
    }
    
    snackFiles[path] = { type: 'CODE', contents: file.content };
  });
  return snackFiles;
}

// Only declare dependencies that are preloaded/bundled in the Snack web player for SDK 54.
// Non-preloaded deps (expo-image, expo-blur, expo-av, expo-camera, expo-haptics, etc.)
// cause State.isBusy() to remain true while the snackager resolver fetches their bundles.
// isBusy() blocks ALL code pushes to the web player — resulting in a permanent
// "Connecting..." state if any dep fails to resolve.
// Non-preloaded deps will be added dynamically from the AI-generated package.json.
const PRELOADED_DEPS: SnackDependencies = {
  'expo-router': { version: '*' },
  '@expo/vector-icons': { version: '*' },
  'react-native-safe-area-context': { version: '*' },
  'react-native-reanimated': { version: '*' },
  '@react-native-async-storage/async-storage': { version: '*' },
};

function extractDependencies(files: Record<string, { path: string; content: string }>): SnackDependencies {
  const packageFile = Object.values(files).find(f =>
    f.path === 'package.json' || f.path === '/package.json'
  );
  // Start with only preloaded deps — avoids isBusy() blocking the initial connection
  const deps: SnackDependencies = { ...PRELOADED_DEPS };
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
  const { files, generatingFiles } = useProjectStore();
  const { isRunning: isAgentRunning } = useAgentStore();

  // Derive building state from the agent store
  const isGenerating = isAgentRunning;

  // Determine if the project has real files (not just the default fallback)
  const hasRealFiles = Object.keys(files).length > 0;

  const webPreviewRef = useRef<Window | null>(null);
  const snackRef = useRef<Snack | null>(null);
  const iframeElRef = useRef<HTMLIFrameElement | null>(null);

  // Buffer to capture CONNECT messages from iframe that arrive before
  // the Snack transport starts listening.
  const earlyMessagesRef = useRef<MessageEvent[]>([]);
  const transportStartedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webPreviewURL, setWebPreviewURL] = useState<string | undefined>(undefined);
  const [deviceSize, setDeviceSize] = useState<'phone' | 'tablet'>('phone');

  // The S3 origin the web player iframe will postMessage from.
  const webPlayerOriginRef = useRef<string | null>(null);

  const snackFiles = useMemo(() => {
    const transformed = transformFilesToSnack(files);
    const hasAppJs = Object.keys(transformed).some(p => p === 'App.js' || p === 'App.tsx');
    const hasExpoRouter = Object.keys(transformed).some(p =>
      p.startsWith('app/') && (p.endsWith('.tsx') || p.endsWith('.js'))
    );

    if (hasExpoRouter && !hasAppJs) {
      // Expo Router projects need App.js as the entry point for Snack web player.
      // The web player doesn't read package.json "main" — it always loads App.js.
      // This re-exports from expo-router/entry which bootstraps the file-based router.
      transformed['App.js'] = {
        type: 'CODE',
        contents: `// @info This file is the entry point for the Snack web player.
// It re-exports expo-router/entry which bootstraps file-based routing.
import 'expo-router/entry';
`,
      };
    } else if (!hasAppJs && !hasExpoRouter) {
      transformed['App.js'] = { type: 'CODE', contents: DEFAULT_APP };
    }

    return transformed;
  }, [files]);

  const packageJsonContent = useMemo(() => {
    const file = Object.values(files).find(f => f.path === 'package.json' || f.path === '/package.json');
    return file?.content || '{}';
  }, [files]);

  const dependencies = useMemo(() => extractDependencies({
    'package.json': { path: 'package.json', content: packageJsonContent }
  }), [packageJsonContent]);

  // === SNACK LIFECYCLE ===
  //
  // The web player iframe (from S3) sends a CONNECT postMessage as soon as it
  // boots. The Snack SDK's webplayer transport only listens for this message
  // AFTER setDisabled(false) calls transport.start() -> addEventListener.
  //
  // Race condition: iframe sends CONNECT before we call setDisabled(false).
  // The CONNECT is lost, connectionsCount stays 0, and sendCodeChanges is a no-op.
  //
  // Fix: We install our OWN early listener on the window BEFORE the iframe loads.
  // This captures any CONNECT from the S3 origin. After transport starts, we
  // replay the captured message by re-dispatching it so the transport picks it up.

  useEffect(() => {
    let cancelled = false;

    if (snackRef.current) {
      snackRef.current.setOnline(false);
      snackRef.current = null;
    }
    earlyMessagesRef.current = [];
    transportStartedRef.current = false;
    hadRealFilesRef.current = false;

    // Early listener: capture CONNECT messages from the web player iframe
    // before the Snack transport is ready.
    const earlyListener = (event: MessageEvent) => {
      if (transportStartedRef.current) return; // Transport already handles it
      // Capture messages from S3 origins (web player) or same origin
      const origin = event.origin || '';
      const isSnackOrigin = origin.includes('snack-web-player') || 
        (webPlayerOriginRef.current && origin === webPlayerOriginRef.current);
      if (isSnackOrigin) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.type === 'CONNECT' || data.type === 'MESSAGE') {
            console.log('[Snack] Early capture:', data.type, 'from', origin);
            earlyMessagesRef.current.push(event);
          }
        } catch { /* not JSON, ignore */ }
      }
    };
    window.addEventListener('message', earlyListener, false);

    async function initSnack() {
      const sdkVersion = await resolveSDKVersion();
      if (cancelled) return;

      const snack = new Snack({
        disabled: true,
        files: snackFiles,
        dependencies,
        sdkVersion,
        webPreviewRef,
        codeChangesDelay: 500,
      });

      snackRef.current = snack;

      const initialState = snack.getState();
      if (initialState.webPreviewURL) {
        setWebPreviewURL(initialState.webPreviewURL);
        console.log('[Snack] Web preview URL:', initialState.webPreviewURL);
        // Extract the S3 origin so we can filter early messages
        try {
          webPlayerOriginRef.current = new URL(initialState.webPreviewURL).origin;
          console.log('[Snack] Web player origin:', webPlayerOriginRef.current);
        } catch { /* ignore */ }
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

      return unsubscribe;
    }

    let unsubscribe: (() => void) | undefined;
    initSnack().then((unsub) => { unsubscribe = unsub; });

    const timeout = setTimeout(() => setIsLoading(false), 20000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      window.removeEventListener('message', earlyListener, false);
      unsubscribe?.();
      if (snackRef.current) {
        snackRef.current.setOnline(false);
        snackRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track whether snackFiles had real content on previous render.
  // Used to detect the transition from empty → has files (e.g. page reload after generation).
  const hadRealFilesRef = useRef(false);

  // Update files reactively — also force a code-push if transport is already up
  useEffect(() => {
    if (!snackRef.current) return;
    snackRef.current.updateFiles(snackFiles);

    const hasExpoRouterFiles = Object.keys(snackFiles).some(
      (p) => p.startsWith('app/') && (p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.ts'))
    );

    // Transition: empty → has real files while transport already running.
    // (Happens on page reload: files load from DB after iframe is already connected.)
    // Reload the iframe so Expo Router re-bootstraps with the new file tree.
    // Do NOT set transportStartedRef = false here — that would cause all subsequent
    // sendCodeChanges() calls to be skipped (the ref gates the push below).
    if (hasExpoRouterFiles && !hadRealFilesRef.current && transportStartedRef.current) {
      hadRealFilesRef.current = true;
      if (iframeElRef.current?.contentWindow) {
        try { iframeElRef.current.contentWindow.location.reload(); } catch { /* cross-origin */ }
      }
      // Fall through — still push code changes so the web player gets the latest files
    }

    if (hasExpoRouterFiles) hadRealFilesRef.current = true;

    // If transport is already started and files updated, push code changes
    if (transportStartedRef.current) {
      try {
        // @ts-ignore — sendCodeChanges is public but not in type stubs
        snackRef.current.sendCodeChanges?.();
      } catch { /* ignore */ }
    }
  }, [snackFiles]);

  useEffect(() => {
    if (!snackRef.current) return;
    snackRef.current.updateDependencies(dependencies);
    if (transportStartedRef.current) {
      try {
        // @ts-ignore
        snackRef.current.sendCodeChanges?.();
      } catch { /* ignore */ }
    }
  }, [dependencies]);

  const handleIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeElRef.current = iframe;
    webPreviewRef.current = iframe?.contentWindow ?? null;
  }, []);

  // When the iframe finishes loading the Snack web player runtime:
  //   1. Re-capture contentWindow
  //   2. Enable the Snack (starts the webplayer transport's event listener)
  //   3. Replay any CONNECT messages captured by our early listener
  //   4. If still no connection after a grace period, force-reload the iframe
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeElRef.current;
    if (iframe?.contentWindow) {
      webPreviewRef.current = iframe.contentWindow;
    }

    if (!snackRef.current) return;

    console.log('[Snack] iframe loaded, enabling transport...');

    // Enable transport immediately (no artificial delay).
    // The transport calls window.addEventListener('message', handler).
    snackRef.current.setDisabled(false);
    snackRef.current.setOnline(true);
    transportStartedRef.current = true;

    // Replay any CONNECT messages that arrived before the transport started.
    // We re-dispatch them on the window so the transport's own listener picks them up.
    if (earlyMessagesRef.current.length > 0) {
      console.log('[Snack] Replaying', earlyMessagesRef.current.length, 'early messages');
      for (const captured of earlyMessagesRef.current) {
        window.dispatchEvent(new MessageEvent('message', {
          data: captured.data,
          origin: captured.origin,
          source: captured.source,
        }));
      }
      earlyMessagesRef.current = [];
    }

    // Force a code push after the transport connects (or reconnects after a reload).
    // This ensures the web player always receives the latest files after each iframe load,
    // including the case where isBusy() was previously blocking code delivery.
    setTimeout(() => {
      if (!snackRef.current) return;
      try {
        // @ts-ignore — sendCodeChanges is public but not in type stubs
        snackRef.current.sendCodeChanges?.();
        console.log('[Snack] Post-load code push triggered');
      } catch { /* ignore */ }
    }, 500);

    // Grace period: if no connected clients after 2.5s, the web player may
    // have sent CONNECT even before our early listener was ready (very fast load).
    // In that case, reload the iframe to force a fresh CONNECT.
    setTimeout(() => {
      if (!snackRef.current) return;
      const state = snackRef.current.getState();
      const hasClients = Object.keys(state.connectedClients || {}).length > 0;
      console.log('[Snack] Grace check: hasClients =', hasClients);

      if (!hasClients && iframeElRef.current?.contentWindow) {
        console.log('[Snack] No clients after grace period, reloading iframe');
        try { iframeElRef.current.contentWindow.location.reload(); } catch { /* cross-origin, ignore */ }
      }
    }, 2500);

    setIsLoading(false);
  }, []);

  const handleRefresh = useCallback(() => {
    if (snackRef.current) {
      setIsLoading(true);
      transportStartedRef.current = false;
      earlyMessagesRef.current = [];
      // Reload iframe to get a fresh CONNECT + code push cycle
      if (iframeElRef.current?.contentWindow) {
        try { iframeElRef.current.contentWindow.location.reload(); } catch { /* cross-origin */ }
      }
      setTimeout(() => setIsLoading(false), 3000);
    }
  }, []);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#242428]">
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
    <div className="h-full w-full flex flex-col bg-[#1a1a1d]">
      {/* Top bar with status + controls */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[#27272a] bg-[#0f0f11] flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Status */}
          {isGenerating ? (
            <div className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-blue-400" />
              <span className="text-blue-400 font-medium text-xs">Building</span>
            </div>
          ) : !hasRealFiles ? (
            <div className="flex items-center gap-1.5">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500" />
              <span className="text-gray-500 font-medium text-xs">Waiting</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-yellow-400" />
              <span className="text-yellow-400 font-medium text-xs">Loading</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </div>
              <span className="text-green-400 font-medium text-xs">Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-md hover:bg-white/5"
            title="Refresh preview"
          >
            <RefreshCw size={13} />
          </button>
          {/* Device type icons */}
          <button
            onClick={() => setDeviceSize('phone')}
            className={`p-1.5 rounded-md transition-colors ${deviceSize === 'phone' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            title="Phone"
          >
            <Smartphone size={13} />
          </button>
          <button
            onClick={() => setDeviceSize('tablet')}
            className={`p-1.5 rounded-md transition-colors ${deviceSize === 'tablet' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            title="Tablet"
          >
            <Tablet size={13} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Device Frame - phone or tablet */}
        <div className={`relative bg-black border-[3px] border-[#333] shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-10 ${
          deviceSize === 'tablet'
            ? 'w-[580px] h-[760px] rounded-[24px]'
            : 'w-[320px] h-[693px] rounded-[40px]'
        }`}>
          <div className={`absolute inset-0 bg-[#0a0a0a] overflow-hidden ${deviceSize === 'tablet' ? 'rounded-[21px]' : 'rounded-[37px]'}`}>
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

            {/* Building overlay */}
            {isGenerating && (
              <div className="absolute inset-0 z-30 flex flex-col bg-[#0a0a0a]/90 backdrop-blur-sm">
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                  <div className="relative mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                      <FileCode2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 opacity-30 animate-ping" />
                  </div>
                  
                  <p className="text-white font-semibold text-sm mb-1">Building your app</p>
                  <p className="text-gray-500 text-xs mb-5">Rork is writing code...</p>
                  
                  {generatingFiles.length > 0 && (
                    <div className="w-full max-w-[240px] space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar">
                      {generatingFiles.map((filePath) => (
                        <div 
                          key={filePath}
                          className="flex items-center gap-2 text-xs animate-fade-in"
                        >
                          <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300 truncate font-mono">{filePath}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-xs">
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />
                        <span className="text-gray-500">writing...</span>
                      </div>
                    </div>
                  )}

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
                <div className="text-center text-gray-500 px-6">
                  {!hasRealFiles ? (
                    // No files yet — show "waiting for AI" state
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 flex items-center justify-center mx-auto mb-4 border border-white/5">
                        <Sparkles className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-300">No app yet</p>
                      <p className="text-xs mt-2 text-gray-500 leading-relaxed max-w-[200px] mx-auto">
                        Describe what you want to build in the chat and Rork will generate it here.
                      </p>
                    </>
                  ) : (
                    // Has files but Snack SDK still loading
                    <>
                      <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                      <p className="text-sm font-medium">
                        {webPreviewURL ? 'Loading preview...' : 'Connecting to Expo...'}
                      </p>
                      <p className="text-xs mt-1">This may take a moment</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
