'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface PreviewUrls {
  webUrl: string | null;
  expoUrl: string | null;
}

interface UsePreviewServerReturn {
  isConnected: boolean;
  isStarting: boolean;
  webUrl: string | null;
  expoUrl: string | null;
  error: string | null;
  startPreview: () => Promise<void>;
  stopPreview: () => Promise<void>;
  syncFiles: (files: Record<string, string>) => Promise<void>;
}

const PREVIEW_SERVER_URL = process.env.NEXT_PUBLIC_PREVIEW_SERVER_URL || 'http://localhost:3001';

const isDev = typeof window !== 'undefined' ? window.location.hostname === 'localhost' : false;

export function usePreviewServer(projectId: string | null): UsePreviewServerReturn {
  if (!isDev) {
    // Return no-op state for production
    return {
      isConnected: false,
      isStarting: false,
      webUrl: null,
      expoUrl: null,
      error: 'Preview server only available in development',
      startPreview: async () => {},
      stopPreview: async () => {},
      syncFiles: async () => {},
    };
  }
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const [expoUrl, setExpoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!projectId) return;
    
    const socket = io(PREVIEW_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[Preview] Connected to preview server');
      setIsConnected(true);
      setError(null);
      
      // Join project room
      socket.emit('join-project', projectId);
    });
    
    socket.on('disconnect', () => {
      console.log('[Preview] Disconnected from preview server');
      setIsConnected(false);
    });
    
    socket.on('connect_error', (err) => {
      console.error('[Preview] Connection error:', err);
      setError('Failed to connect to preview server');
      setIsConnected(false);
    });
    
    socket.on('preview-ready', (urls: PreviewUrls) => {
      console.log('[Preview] Preview ready:', urls);
      if (urls.webUrl) setWebUrl(urls.webUrl);
      if (urls.expoUrl) setExpoUrl(urls.expoUrl);
      setIsStarting(false);
      setError(null);
    });
    
    socket.on('files-updated', (data: { files: string[] }) => {
      console.log('[Preview] Files updated:', data.files);
    });
    
    socket.on('error', (data: { message: string }) => {
      console.error('[Preview] Error:', data.message);
      setError(data.message);
    });
    
    // Fetch current status
    fetchPreviewStatus();
    
    return () => {
      socket.emit('leave-project', projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);
  
  const fetchPreviewStatus = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`${PREVIEW_SERVER_URL}/api/projects/${projectId}/preview`);
      if (response.ok) {
        const data = await response.json();
        if (data.webUrl) setWebUrl(data.webUrl);
        if (data.expoUrl) setExpoUrl(data.expoUrl);
        setIsStarting(data.status === 'starting');
      }
    } catch (err) {
      console.error('[Preview] Failed to fetch status:', err);
    }
  }, [projectId]);
  
  const startPreview = useCallback(async () => {
    if (!projectId) return;
    
    setIsStarting(true);
    setError(null);
    
    try {
      const response = await fetch(`${PREVIEW_SERVER_URL}/api/projects/${projectId}/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start preview');
      setIsStarting(false);
    }
  }, [projectId]);
  
  const stopPreview = useCallback(async () => {
    if (!projectId) return;
    
    try {
      await fetch(`${PREVIEW_SERVER_URL}/api/projects/${projectId}/stop`, {
        method: 'POST',
      });
      
      setWebUrl(null);
      setExpoUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop preview');
    }
  }, [projectId]);
  
  const syncFiles = useCallback(async (files: Record<string, string>) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`${PREVIEW_SERVER_URL}/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync files');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync files');
    }
  }, [projectId]);
  
  return {
    isConnected,
    isStarting,
    webUrl,
    expoUrl,
    error,
    startPreview,
    stopPreview,
    syncFiles,
  };
}
