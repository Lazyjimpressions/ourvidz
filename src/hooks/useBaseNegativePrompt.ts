import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseBaseNegativePromptReturn {
  baseNegativePrompt: string;
  isLoading: boolean;
  error: string | null;
  fetchBaseNegativePrompt: () => Promise<void>;
}

export const useBaseNegativePrompt = (
  modelType: string = 'sdxl',
  contentMode: 'sfw' | 'nsfw' = 'sfw'
): UseBaseNegativePromptReturn => {
  const [baseNegativePrompt, setBaseNegativePrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBaseNegativePrompt = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('get-negative-prompt', {
        body: { modelType, contentMode }
      });

      if (error) throw error;

      setBaseNegativePrompt(data.baseNegativePrompt || '');
    } catch (err) {
      console.error('Error fetching base negative prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch base negative prompt');
      setBaseNegativePrompt('');
    } finally {
      setIsLoading(false);
    }
  }, [modelType, contentMode, isLoading]);

  return {
    baseNegativePrompt,
    isLoading,
    error,
    fetchBaseNegativePrompt
  };
};