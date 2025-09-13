import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MediaStatus = 'idle' | 'pending' | 'ready' | 'error';

export interface GeneratedMediaEntry {
  assetId?: string | null;
  imageUrl?: string | null;
  bucket?: string | null;
  status: MediaStatus;
  updatedAt: number;
  jobId?: string | null;
}

interface GeneratedMediaContextType {
  getEntry: (key: string) => GeneratedMediaEntry | undefined;
  setPending: (key: string, jobId?: string) => void;
  setReady: (key: string, payload: { assetId: string; imageUrl?: string | null; bucket?: string | null }) => void;
  setError: (key: string) => void;
  isGenerating: boolean;
  generateContent: (prompt: string, options?: any) => Promise<void>;
  currentJob: any;
}

const GeneratedMediaContext = createContext<GeneratedMediaContextType | undefined>(undefined);

export { GeneratedMediaContext };

const STORAGE_KEY = 'generated-media-map-v1';

export const GeneratedMediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); 
    } catch {}
  }, [map]);

  // Poll job status for pending entries
  useEffect(() => {
    const pendingEntries = Object.entries(map).filter(([_, entry]) => entry.status === 'pending' && entry.jobId);
    
    if (pendingEntries.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const [key, entry] of pendingEntries) {
        if (!entry.jobId) continue;

        try {
          // Check job status
          const { data: jobData, error: jobError } = await supabase
            .from('jobs')
            .select('status, image_id, video_id, error_message')
            .eq('id', entry.jobId)
            .single();

          if (jobError) {
            console.error('Failed to check job status:', jobError);
            continue;
          }

          if (jobData.status === 'completed') {
            const assetId = jobData.image_id || jobData.video_id;
            if (assetId) {
              // Get asset URL from workspace_assets
              const { data: assetData, error: assetError } = await supabase
                .from('workspace_assets')
                .select('temp_storage_path')
                .eq('job_id', entry.jobId)
                .maybeSingle();

              setReady(key, {
                assetId,
                imageUrl: assetData?.temp_storage_path || null,
                bucket: 'workspace-temp'
              });
            } else {
              setError(key);
            }
          } else if (jobData.status === 'failed') {
            setError(key);
          }
        } catch (error) {
          console.error('Error polling job status:', error);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [map]);

  const getEntry = useCallback((key: string) => map[key], [map]);

  const setPending = useCallback((key: string, jobId?: string) => {
    setMap(prev => ({
      ...prev,
      [key]: { 
        status: 'pending', 
        updatedAt: Date.now(), 
        assetId: prev[key]?.assetId ?? null, 
        imageUrl: prev[key]?.imageUrl ?? null, 
        bucket: prev[key]?.bucket ?? null,
        jobId 
      }
    }));
  }, []);

  const setReady = useCallback((key: string, payload: { assetId: string; imageUrl?: string | null; bucket?: string | null }) => {
    setMap(prev => ({ ...prev, [key]: { status: 'ready', updatedAt: Date.now(), ...payload } }));
  }, []);

  const setError = useCallback((key: string) => {
    setMap(prev => ({ ...prev, [key]: { ...(prev[key] || {} as any), status: 'error', updatedAt: Date.now() } }));
  }, []);

  // Mock generation function for roleplay compatibility
  const generateContent = useCallback(async (prompt: string, options?: any) => {
    console.log('🎯 CONTEXT: Starting generation with prompt:', prompt);
    setIsGenerating(true);
    setCurrentJob({ status: 'queued', prompt });
    
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

export const useGeneratedMediaContext = () => {
  const ctx = useContext(GeneratedMediaContext);
  if (!ctx) throw new Error('useGeneratedMediaContext must be used within a GeneratedMediaProvider');
  return ctx;
};