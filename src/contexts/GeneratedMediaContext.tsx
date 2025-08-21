
import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';

export type MediaStatus = 'idle' | 'pending' | 'ready' | 'error';

export interface GeneratedMediaEntry {
  assetId?: string | null;
  imageUrl?: string | null;
  bucket?: string | null;
  status: MediaStatus;
  updatedAt: number;
}

interface GeneratedMediaContextType {
  getEntry: (key: string) => GeneratedMediaEntry | undefined;
  setPending: (key: string) => void;
  setReady: (key: string, payload: { assetId: string; imageUrl?: string | null; bucket?: string | null }) => void;
  setError: (key: string) => void;
  // Generation-related properties
  isGenerating: boolean;
  generateContent: (prompt: string, options?: any) => Promise<void>;
  currentJob: any;
}

const GeneratedMediaContext = createContext<GeneratedMediaContextType | undefined>(undefined);

// Export the context so it can be used elsewhere if needed
export { GeneratedMediaContext };

const STORAGE_KEY = 'generated-media-map-v1';

export const GeneratedMediaProvider: React.FC<{ children: React.ReactNode }>= ({ children }) => {
  const [map, setMap] = useState<Record<string, GeneratedMediaEntry>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, GeneratedMediaEntry>;
      return parsed || {};
    } catch {
      return {};
    }
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);

  // Persist to localStorage debounced with setTimeout to avoid type issues
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
    }, 150);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [map]);

  const getEntry = useCallback((key: string) => map[key], [map]);

  const setPending = useCallback((key: string) => {
    setMap(prev => ({
      ...prev,
      [key]: { status: 'pending', updatedAt: Date.now(), assetId: prev[key]?.assetId ?? null, imageUrl: prev[key]?.imageUrl ?? null, bucket: prev[key]?.bucket ?? null }
    }));
  }, []);

  const setReady = useCallback((key: string, payload: { assetId: string; imageUrl?: string | null; bucket?: string | null }) => {
    setMap(prev => ({ ...prev, [key]: { status: 'ready', updatedAt: Date.now(), ...payload } }));
  }, []);

  const setError = useCallback((key: string) => {
    setMap(prev => ({ ...prev, [key]: { ...(prev[key] || {} as any), status: 'error', updatedAt: Date.now() } }));
  }, []);

  // Mock generation function for now
  const generateContent = useCallback(async (prompt: string, options?: any) => {
    console.log('🎯 CONTEXT: Starting generation with prompt:', prompt);
    setIsGenerating(true);
    setCurrentJob({ status: 'queued', prompt });
    
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      setCurrentJob(null);
    }, 3000);
  }, []);

  const value = useMemo(() => ({ 
    getEntry, 
    setPending, 
    setReady, 
    setError,
    isGenerating,
    generateContent,
    currentJob
  }), [getEntry, setPending, setReady, setError, isGenerating, generateContent, currentJob]);

  return (
    <GeneratedMediaContext.Provider value={value}>{children}</GeneratedMediaContext.Provider>
  );
};

export const useGeneratedMedia = () => {
  const ctx = useContext(GeneratedMediaContext);
  if (!ctx) throw new Error('useGeneratedMedia must be used within a GeneratedMediaProvider');
  return ctx;
};

// Export the hook that useGenerationWorkspace is trying to import
export const useGeneratedMediaContext = () => {
  const ctx = useContext(GeneratedMediaContext);
  if (!ctx) throw new Error('useGeneratedMediaContext must be used within a GeneratedMediaProvider');
  return ctx;
};
