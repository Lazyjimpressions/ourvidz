import { ReferenceMetadata } from '@/types/workspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Extract metadata from a reference image for exact copy functionality
 */
export const extractReferenceMetadata = async (asset: UnifiedAsset): Promise<ReferenceMetadata | null> => {
  try {
    console.log('🎯 EXTRACTING REFERENCE METADATA:', {
      assetId: asset.id,
      assetType: asset.type,
      hasMetadata: !!asset.metadata,
      metadataKeys: asset.metadata ? Object.keys(asset.metadata) : 'none',
      hasEnhancedPrompt: !!asset.enhancedPrompt,
      hasPrompt: !!asset.prompt
    });
    
    const metadata = asset.metadata as any;
    
    // Extract enhanced prompt (try multiple sources and check job data)
    let originalEnhancedPrompt = 
      metadata?.enhanced_prompt || 
      asset.enhancedPrompt || 
      metadata?.prompt ||
      asset.prompt;
    
    // If we have a job_id but no enhanced prompt, try to get it from the job
    if (!originalEnhancedPrompt && (asset as any).job_id) {
      console.log('🎯 No enhanced prompt found in asset, checking job data...');
      
      try {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('metadata')
          .eq('id', (asset as any).job_id)
          .single();
        
        if (jobData?.metadata) {
          const jobMetadata = jobData.metadata as any;
          originalEnhancedPrompt = 
            jobMetadata?.enhanced_prompt ||
            jobMetadata?.prompt ||
            jobMetadata?.original_prompt;
          
          console.log('🎯 Found enhanced prompt from job metadata:', {
            jobId: (asset as any).job_id,
            enhancedPrompt: jobMetadata?.enhanced_prompt,
            prompt: jobMetadata?.prompt,
            originalPrompt: jobMetadata?.original_prompt,
            finalEnhancedPrompt: originalEnhancedPrompt
          });
        }
      } catch (error) {
        console.warn('🎯 Failed to fetch job data:', error);
      }
    }
    
    console.log('🎯 ENHANCED PROMPT EXTRACTION:', {
      fromMetadataEnhancedPrompt: metadata?.enhanced_prompt,
      fromAssetEnhancedPrompt: asset.enhancedPrompt,
      fromMetadataPrompt: metadata?.prompt,
      fromAssetPrompt: asset.prompt,
      finalOriginalEnhancedPrompt: originalEnhancedPrompt
    });
    
    if (!originalEnhancedPrompt) {
      console.warn('⚠️ No enhanced prompt found in reference asset');
      return null;
    }
    
    const result = {
      originalEnhancedPrompt,
      originalSeed: metadata?.seed || (asset as any).seed,
      originalGenerationParams: metadata?.generationParams || metadata,
      originalStyle: metadata?.style || '',
      originalCameraAngle: metadata?.camera_angle || 'eye_level',
      originalShotType: metadata?.shot_type || 'wide',
      aspectRatio: metadata?.aspect_ratio || '16:9'
    };
    
    console.log('🎯 METADATA EXTRACTION RESULT:', {
      originalEnhancedPrompt: result.originalEnhancedPrompt,
      originalSeed: result.originalSeed,
      originalStyle: result.originalStyle,
      originalCameraAngle: result.originalCameraAngle,
      originalShotType: result.originalShotType,
      aspectRatio: result.aspectRatio
    });
    
    return result;
  } catch (error) {
    console.error('❌ Failed to extract reference metadata:', error);
    return null;
  }
};