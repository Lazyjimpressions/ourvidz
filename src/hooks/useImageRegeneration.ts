
import { useState, useCallback, useMemo } from 'react';
import { useGeneration } from '@/hooks/useGeneration';
import { GenerationRequest } from '@/types/generation';
import { MediaTile } from '@/types/workspace';
import { toast } from 'sonner';

interface RegenerationState {
  positivePrompt: string;
  negativePrompt: string;
  keepSeed: boolean;
  referenceStrength: number;
  isModified: boolean;
}

export const useImageRegeneration = (currentTile: MediaTile, originalDetails?: { seed?: number; negativePrompt?: string; originalPrompt?: string }) => {
  const { generateContent, isGenerating, cancelGeneration } = useGeneration();
  
  // Memoize values to prevent unnecessary re-renders
  const basePrompt = useMemo(() => 
    originalDetails?.originalPrompt || currentTile.prompt, 
    [originalDetails?.originalPrompt, currentTile.prompt]
  );
  
  const defaultNegativePrompt = useMemo(() => 
    originalDetails?.negativePrompt || '', 
    [originalDetails?.negativePrompt]
  );
  
  const [state, setState] = useState<RegenerationState>(() => ({
    positivePrompt: basePrompt,
    negativePrompt: defaultNegativePrompt,
    keepSeed: true,
    referenceStrength: 0.7,
    isModified: false
  }));

  const updatePrompts = useCallback((updates: Partial<Pick<RegenerationState, 'positivePrompt' | 'negativePrompt'>>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      isModified: updates.positivePrompt !== basePrompt || 
                 updates.negativePrompt !== defaultNegativePrompt ||
                 prev.isModified
    }));
  }, [basePrompt, defaultNegativePrompt]);

  const updateSettings = useCallback((updates: Partial<Pick<RegenerationState, 'keepSeed' | 'referenceStrength'>>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetToOriginal = useCallback(() => {
    setState({
      positivePrompt: basePrompt,
      negativePrompt: defaultNegativePrompt,
      keepSeed: true,
      referenceStrength: 0.7,
      isModified: false
    });
  }, [basePrompt, defaultNegativePrompt]);

  const regenerateImage = useCallback(async () => {
    if (!state.positivePrompt.trim()) {
      toast.error('Positive prompt cannot be empty');
      return;
    }

    if (!currentTile.url) {
      toast.error('Current image URL not available for regeneration');
      return;
    }

    const format = currentTile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    
    const generationRequest: GenerationRequest = {
      format,
      prompt: state.positivePrompt.trim(),
      referenceImageUrl: currentTile.url,
      projectId: '00000000-0000-0000-0000-000000000000', // Default project
      metadata: {
        reference_image: true,
        reference_strength: state.referenceStrength,
        reference_type: 'composition',
        negative_prompt: state.negativePrompt.trim() || undefined,
        ...(state.keepSeed && originalDetails?.seed && { seed: originalDetails.seed }),
        credits: currentTile.quality === 'high' ? 2 : 1,
        num_images: 1,
        // Mark as regeneration to enable cache-busting and variations
        regeneration: true,
        cache_bust: Date.now().toString()
      }
    };

    console.log('🎨 Starting image regeneration:', {
      originalImageId: currentTile.id,
      keepSeed: state.keepSeed,
      seed: state.keepSeed ? originalDetails?.seed : 'random',
      referenceStrength: state.referenceStrength
    });

    try {
      await generateContent(generationRequest);
      toast.success('Image regeneration started! New image will appear in workspace when ready.');
    } catch (error) {
      console.error('❌ Regeneration failed:', error);
      toast.error('Failed to start regeneration');
    }
  }, [state, currentTile, originalDetails, generateContent]);

  return {
    state,
    updatePrompts,
    updateSettings,
    resetToOriginal,
    regenerateImage,
    isGenerating,
    canRegenerate: state.positivePrompt.trim().length > 0 && currentTile.url
  };
};
