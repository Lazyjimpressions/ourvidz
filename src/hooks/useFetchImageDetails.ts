
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImageDetails {
  originalPrompt?: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  seed?: number;
  generationTime?: number;
  referenceStrength?: number;
  templateName?: string;
  jobType?: string;
  quality?: string;
  // i2i settings
  denoiseStrength?: number;
  guidanceScale?: number;
  steps?: number;
  lockHair?: boolean;
  exactCopyMode?: boolean;
  referenceMode?: string;
  // control box settings
  aspectRatio?: string;
  cameraAngle?: string;
  shotType?: string;
  style?: string;
}

export const useFetchImageDetails = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [details, setDetails] = useState<ImageDetails | null>(null);

  const fetchDetails = useCallback(async (imageId: string, assetType: 'image' | 'video' = 'image') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Fetching details for image: ${imageId}`);
      
      // Fetch workspace asset details
      const { data: workspaceAsset, error: workspaceError } = await supabase
        .from('workspace_assets')
        .select('*')
        .eq('id', imageId)
        .single();

      if (workspaceError && workspaceError.code !== 'PGRST116') {
        console.error('Error fetching workspace asset:', workspaceError);
        throw workspaceError;
      }

      if (workspaceAsset) {
        console.log('✅ Found workspace asset:', workspaceAsset);
        const settings = workspaceAsset.generation_settings as any;
        
        let enhancedPrompt = settings?.enhancedPrompt;
        let templateName = settings?.templateName;
        
        let jobType = settings?.jobType;
        let quality = settings?.quality;
        
        // If enhanced prompt or template name is missing and we have a job_id, try to backfill from jobs table
        if ((!enhancedPrompt || !templateName || !jobType) && workspaceAsset.job_id) {
          console.log('🔍 Backfilling data from jobs table for job:', workspaceAsset.job_id);
          const { data: jobData } = await supabase
            .from('jobs')
            .select('enhanced_prompt, template_name, format, metadata')
            .eq('id', workspaceAsset.job_id)
            .single();
          
          if (jobData) {
            enhancedPrompt = enhancedPrompt || jobData.enhanced_prompt;
            templateName = templateName || jobData.template_name;
            jobType = jobType || jobData.format;
            
            // Detect quality from job format
            if (!quality && jobData.format) {
              quality = jobData.format.toLowerCase().includes('high') ? 'high' : 'fast';
            }
            
            // Merge job metadata into settings for i2i params
            if (jobData.metadata) {
              Object.assign(settings, jobData.metadata);
            }
            
            console.log('✅ Backfilled from jobs table:', { 
              enhancedPrompt: !!enhancedPrompt, 
              templateName: !!templateName,
              jobType,
              hasJobMetadata: !!jobData.metadata
            });
          }
        }
        
        // Calculate denoise strength from reference strength if available
        let denoiseStrength = settings?.denoise_strength || settings?.denoiseStrength;
        if (!denoiseStrength && settings?.reference_strength) {
          denoiseStrength = 1 - settings.reference_strength;
        } else if (!denoiseStrength && settings?.referenceStrength) {
          denoiseStrength = 1 - settings.referenceStrength;
        }

        setDetails({
          originalPrompt: workspaceAsset.original_prompt,
          enhancedPrompt,
          negativePrompt: settings?.negativePrompt,
          seed: settings?.seed,
          generationTime: settings?.generationTime,
          referenceStrength: settings?.referenceStrength || settings?.reference_strength,
          templateName,
          jobType,
          quality,
          // i2i settings
          denoiseStrength,
          guidanceScale: settings?.guidance_scale || settings?.guidanceScale,
          steps: settings?.steps || settings?.num_inference_steps,
          lockHair: settings?.lock_hair || settings?.lockHair,
          exactCopyMode: settings?.exact_copy_mode || settings?.exactCopyMode,
          referenceMode: settings?.reference_mode || settings?.referenceMode,
          // control box settings
          aspectRatio: settings?.aspect_ratio || settings?.aspectRatio,
          cameraAngle: settings?.camera_angle || settings?.cameraAngle,
          shotType: settings?.shot_type || settings?.shotType,
          style: settings?.style
        });
        return;
      }

      // If not found in workspace, try user library
      const { data: libraryAsset, error: libraryError } = await supabase
        .from('user_library')
        .select('*')
        .eq('id', imageId)
        .single();

      if (libraryError && libraryError.code !== 'PGRST116') {
        console.error('Error fetching library asset:', libraryError);
        throw libraryError;
      }

      if (libraryAsset) {
        console.log('✅ Found library asset:', libraryAsset);
        
        // Extract template name from tags (format: tmpl:<template_name>)
        const templateTag = libraryAsset.tags?.find((tag: string) => tag.startsWith('tmpl:'));
        const templateName = templateTag ? templateTag.replace('tmpl:', '') : undefined;
        
        setDetails({
          originalPrompt: libraryAsset.original_prompt,
          enhancedPrompt: undefined, // Library doesn't store enhanced prompt
          negativePrompt: undefined, // Library doesn't store negative prompt
          seed: libraryAsset.generation_seed,
          generationTime: undefined, // Library doesn't store generation time  
          referenceStrength: undefined, // Library doesn't store reference strength
          templateName,
          jobType: undefined // Library doesn't store job type
        });
        return;
      }

      console.warn(`⚠️ Asset not found in either workspace or library: ${imageId}`);
      setDetails(null);
      
    } catch (error) {
      console.error('Failed to fetch image details:', error);
      setError(error as Error);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchDetails, loading, error, details };
};
