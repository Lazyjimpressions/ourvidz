
import { useState, useCallback } from 'react';
import { useGeneration } from '@/hooks/useGeneration';
import { GenerationRequest } from '@/types/generation';
import { MediaTile } from '@/types/workspace';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';

interface RegenerationState {
  positivePrompt: string;
  negativePrompt: string;
  keepSeed: boolean;
  referenceStrength: number;
  isModified: boolean;
}

export const useImageRegeneration = (currentTile: MediaTile, originalDetails?: { seed?: number; negativePrompt?: string }) => {
  const { generateContent, isGenerating } = useGeneration();
  const { getRegenerationSignedUrl } = useSignedImageUrls();
  
  const [state, setState] = useState<RegenerationState>({
    positivePrompt: currentTile.prompt,
    negativePrompt: originalDetails?.negativePrompt || '',
    keepSeed: true,
    referenceStrength: 0.7,
    isModified: false
  });

  const updatePrompts = useCallback((updates: Partial<Pick<RegenerationState, 'positivePrompt' | 'negativePrompt'>>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      isModified: updates.positivePrompt !== currentTile.prompt || 
                 updates.negativePrompt !== (originalDetails?.negativePrompt || '') ||
                 prev.isModified
    }));
  }, [currentTile.prompt, originalDetails?.negativePrompt]);

  const updateSettings = useCallback((updates: Partial<Pick<RegenerationState, 'keepSeed' | 'referenceStrength'>>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetToOriginal = useCallback(() => {
    setState({
      positivePrompt: currentTile.prompt,
      negativePrompt: originalDetails?.negativePrompt || '',
      keepSeed: true,
      referenceStrength: 0.7,
      isModified: false
    });
  }, [currentTile.prompt, originalDetails?.negativePrompt]);

  // Helper function to get or create a valid project ID
  const getValidProjectId = useCallback(async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Try to find an existing project for this user
    const { data: existingProjects, error: fetchError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError);
    }

    // If we have an existing project, use it
    if (existingProjects && existingProjects.length > 0) {
      console.log('✅ Using existing project for regeneration:', existingProjects[0].id);
      return existingProjects[0].id;
    }

    // Otherwise, create a new default project
    console.log('🆕 Creating new default project for regeneration');
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: 'Default Regeneration Project',
        original_prompt: 'Auto-created for image regeneration',
        media_type: 'image'
      })
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Error creating project:', createError);
      throw new Error('Failed to create project for regeneration');
    }

    console.log('✅ Created new project for regeneration:', newProject.id);
    return newProject.id;
  }, []);

  const regenerateImage = useCallback(async () => {
    if (!state.positivePrompt.trim()) {
      toast.error('Positive prompt cannot be empty');
      return;
    }

    if (!currentTile.url) {
      toast.error('Current image URL not available for regeneration');
      return;
    }

    try {
      // Get a valid project ID (existing or create new one)
      const projectId = await getValidProjectId();
      
      // Generate and validate a signed URL for the reference image
      console.log('🔄 Preparing reference image for regeneration:', currentTile.url);
      const validatedReferenceUrl = await getRegenerationSignedUrl(currentTile.url, currentTile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast');
      
      if (!validatedReferenceUrl) {
        toast.error('Failed to prepare reference image for regeneration');
        return;
      }

      console.log('✅ Reference image validated for regeneration:', validatedReferenceUrl);
      
      const format = currentTile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      
      const generationRequest: GenerationRequest = {
        format,
        prompt: state.positivePrompt.trim(),
        referenceImageUrl: validatedReferenceUrl,
        projectId,
        metadata: {
          reference_image: true,
          reference_strength: state.referenceStrength,
          reference_type: 'composition',
          negative_prompt: state.negativePrompt.trim() || undefined,
          ...(state.keepSeed && originalDetails?.seed && { seed: originalDetails.seed }),
          credits: currentTile.quality === 'high' ? 2 : 1,
          num_images: 1,
          // Enhanced regeneration metadata
          regeneration_source: 'workspace',
          original_image_url: currentTile.url,
          original_prompt: currentTile.prompt,
          prompt_modified: state.isModified,
          reference_validation: 'passed'
        }
      };

      console.log('🎨 Starting enhanced image regeneration:', {
        originalImageId: currentTile.id,
        projectId,
        keepSeed: state.keepSeed,
        seed: state.keepSeed ? originalDetails?.seed : 'random',
        referenceStrength: state.referenceStrength,
        negativePrompt: state.negativePrompt.trim() || 'none',
        promptModified: state.isModified,
        validatedReferenceUrl: validatedReferenceUrl.substring(0, 100) + '...'
      });

      await generateContent(generationRequest);
      toast.success('Image regeneration started! New image will appear in workspace when ready.');
    } catch (error) {
      console.error('❌ Enhanced regeneration failed:', error);
      toast.error(`Failed to start regeneration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [state, currentTile, originalDetails, generateContent, getValidProjectId, getRegenerationSignedUrl]);

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
