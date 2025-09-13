
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
  denoiseStrength: number;
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
    keepSeed: false, // Default to off to avoid exact copies
    referenceStrength: 0.35, // Lower reference strength for more variation
    denoiseStrength: 0.75, // Higher denoise for more changes
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

  const updateSettings = useCallback((updates: Partial<Pick<RegenerationState, 'keepSeed' | 'referenceStrength' | 'denoiseStrength'>>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetToOriginal = useCallback(() => {
    setState({
      positivePrompt: basePrompt,
      negativePrompt: defaultNegativePrompt,
      keepSeed: false, // Default to off 
      referenceStrength: 0.35,
      denoiseStrength: 0.75,
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

    const format = currentTile.quality === 'high' ? 'rv51_high' : 'rv51_fast';
    
    const generationRequest: GenerationRequest = {
      format,
      prompt: state.positivePrompt.trim(),
      referenceImageUrl: currentTile.url,
      projectId: '00000000-0000-0000-0000-000000000000', // Default project
      metadata: {
        reference_image: true,
        reference_strength: state.referenceStrength,
        denoise_strength: state.denoiseStrength, // CRITICAL: Pass complete denoise value
        reference_type: 'composition',
        negative_prompt: state.negativePrompt.trim() || undefined,
        credits: currentTile.quality === 'high' ? 2 : 1,
        num_images: 1,
        // Mark as regeneration to enable cache-busting and variations
        regeneration: true,
        cache_bust: Date.now().toString(),
        // CRITICAL: Pass complete top-level settings for SDXL worker
        steps: 20,
        guidance_scale: 6, // Reduced from 7.5 to allow more variation
        width: 1024,
        height: 1024,
        scheduler: 'K_EULER',
        exact_copy_mode: false, // Always false for i2i modify
        seed: state.keepSeed && originalDetails?.seed ? originalDetails.seed : undefined
      }
    };

    // 🐛 DEBUG: Log the complete payload before submission
    console.log('🔍 REGENERATION DEBUG - Complete payload:', {
      format,
      prompt: state.positivePrompt.trim(),
      referenceImageUrl: currentTile.url ? 'PRESENT' : 'MISSING',
      metadata: {
        reference_strength: state.referenceStrength,
        denoise_strength: state.denoiseStrength,
        keep_seed: state.keepSeed,
        seed: state.keepSeed ? originalDetails?.seed : undefined,
        guidance_scale: 6,
        exact_copy_mode: false, // Always false for i2i modify
        reference_type: 'composition'
      }
    });

    console.log('🎨 Starting image regeneration:', {
      originalImageId: currentTile.id,
      keepSeed: state.keepSeed,
      seed: state.keepSeed ? originalDetails?.seed : 'random',
      referenceStrength: state.referenceStrength,
      denoiseStrength: state.denoiseStrength,
      format: format,
      expectedChange: state.denoiseStrength >= 0.7 ? 'HIGH' : state.denoiseStrength >= 0.5 ? 'MEDIUM' : 'LOW'
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
