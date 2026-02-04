'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Snack, SnackFiles, SnackDependencies } from 'snack-sdk';
import { useProjectStore } from '@/stores/projectStore';

interface PreviewPanelProps {
  projectId: string;
  onExpoURLChange?: (url: string | undefined) => void;
  onDevicesChange?: (count: number) => void;
}

// Default SDK version
const SDK_VERSION = '52.0.0';

// Transform project files to Snack format
function transformFilesToSnack(files: Record<string, { path: string; content: string }>): SnackFiles {
  const snackFiles: SnackFiles = {};
  
  Object.values(files).forEach((file) => {
    const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
    
    if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i)) {
      return;
    }
    
    snackFiles[path] = {
      type: 'CODE',
      contents: file.content,
    };
  });
  
  return snackFiles;
}

// Extract dependencies from package.json
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
    } catch {
      // Ignore parse errors
    }
  }
  
  return deps;
}

// Default App.js content
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
  const { files } = useProjectStore();
  const webPreviewRef = useRef<Window | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const snackRef = useRef<Snack | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webPreviewURL, setWebPreviewURL] = useState<string | undefined>(undefined);
  
  // Transform files to Snack format
  const snackFiles = useMemo(() => {
    const transformed = transformFilesToSnack(files);
    
    const hasAppJs = Object.keys(transformed).some(path => 
      path === 'App.js' || path === 'App.tsx'
    );
    
    const hasExpoRouter = Object.keys(transformed).some(path => 
      path.startsWith('app/') && (path.endsWith('index.tsx') || path.endsWith('index.js'))
    );
    
    if (!hasAppJs && !hasExpoRouter) {
      transformed['App.js'] = {
        type: 'CODE',
        contents: DEFAULT_APP,
      };
    }
    
    return transformed;
  }, [files]);
  
  const dependencies = useMemo(() => extractDependencies(files), [files]);
  
  // Initialize Snack
  useEffect(() => {
    const snack = new Snack({
      files: snackFiles,
      dependencies,
      sdkVersion: SDK_VERSION,
      webPreviewRef,
      online: true,
      codeChangesDelay: 1000,
    });
    
    snackRef.current = snack;
    
    const unsubscribe = snack.addStateListener((state, prevState) => {
      if (state.webPreviewURL !== prevState.webPreviewURL) {
        setWebPreviewURL(state.webPreviewURL);
        if (state.webPreviewURL) {
          setIsLoading(false);
        }
      }
      
      // Pass Expo URL to parent for QR panel
      if (state.url !== prevState.url) {
        onExpoURLChange?.(state.url);
      }
      
      // Track connected clients
      const clientCount = Object.keys(state.connectedClients || {}).length;
      onDevicesChange?.(clientCount);
    });
    
    // Initial state
    const initialState = snack.getState();
    setWebPreviewURL(initialState.webPreviewURL);
    onExpoURLChange?.(initialState.url);
    
    const timeout = setTimeout(() => {
      if (!webPreviewURL) {
        setIsLoading(false);
      }
    }, 5000);
    
    return () => {
      clearTimeout(timeout);
      unsubscribe();
      snack.setOnline(false);
      snackRef.current = null;
    };
  }, []);
  
  // Update files when they change
  useEffect(() => {
    if (snackRef.current) {
      snackRef.current.updateFiles(snackFiles);
    }
  }, [snackFiles]);
  
  // Update dependencies when they change
  useEffect(() => {
    if (snackRef.current) {
      snackRef.current.updateDependencies(dependencies);
    }
  }, [dependencies]);
  
  const handleIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = iframe;
    (webPreviewRef as React.MutableRefObject<Window | null>).current = iframe?.contentWindow ?? null;
  }, []);
  
  const handleRefresh = useCallback(() => {
    if (snackRef.current) {
      setIsLoading(true);
      snackRef.current.sendCodeChanges();
      setTimeout(() => setIsLoading(false), 1000);
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
      {/* Controls - top right corner */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center bg-[#0a0a0a] border border-[#27272a] rounded-lg shadow-xl p-1 gap-1">
          <div className="flex items-center gap-2 px-2 py-1 border-r border-[#27272a] mr-1">
            {isLoading ? (
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
      
      {/* Preview Area - Centered Phone Frame */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Phone Frame - Larger for center focus */}
        <div className="relative w-[375px] h-[812px] bg-black rounded-[50px] border-[6px] border-[#18181b] shadow-[0_0_100px_-30px_rgba(0,0,0,0.7)] overflow-hidden ring-1 ring-white/5 z-10 scale-[0.72] origin-center">
          {/* Dynamic Island */}
          <div className="absolute top-[11px] left-1/2 transform -translate-x-1/2 w-[100px] h-[30px] bg-black rounded-[20px] z-50" />
          
          {/* Status Bar */}
          <div className="absolute top-0 w-full h-12 z-40 flex justify-between items-end px-6 pb-2">
            <div className="text-white text-[13px] font-semibold pl-2">9:41</div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-2.5 rounded-[3px] border border-white/30 relative p-[1px]">
                <div className="bg-white w-full h-full rounded-[1px]" />
              </div>
            </div>
          </div>
          
          {/* Preview Content */}
          <div className="absolute inset-0 pt-12 pb-8 bg-[#0a0a0a] overflow-hidden">
            {/* Always render iframe so Snack can connect via webPreviewRef */}
            <iframe
              ref={handleIframeRef}
              src={webPreviewURL || 'about:blank'}
              className={`w-full h-full border-0 bg-[#0a0a0a] ${!webPreviewURL ? 'invisible' : ''}`}
              title="Expo Snack Preview"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            />
            
            {/* Loading overlay */}
            {(!webPreviewURL || isLoading) && (
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
          
          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[130px] h-[5px] bg-white/90 rounded-full z-50" />
        </div>
      </div>
    </div>
  );
}
