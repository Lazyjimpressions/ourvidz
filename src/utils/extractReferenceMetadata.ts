import { ReferenceMetadata } from '@/types/workspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Extract metadata from a reference image for exact copy functionality
 */
export const extractReferenceMetadata = async (asset: UnifiedAsset): Promise<ReferenceMetadata | null> => {
  try {
    console.log('🎯 METADATA EXTRACTION START:', {
      assetId: asset.id,
      assetType: asset.type,
      hasMetadata: !!asset.metadata,
      metadataKeys: asset.metadata ? Object.keys(asset.metadata) : 'none',
      hasEnhancedPrompt: !!asset.enhancedPrompt,
      hasPrompt: !!asset.prompt,
      jobIdLocation: (asset as any).job_id ? 'direct' : (asset.metadata?.job_id ? 'metadata' : 'none'),
      rawAsset: JSON.stringify(asset, null, 2)
    });
    
    const metadata = asset.metadata as any;
    
    // PRIORITY 1: Look for enhanced prompt in asset first (proper camelCase)
    let originalEnhancedPrompt = asset.enhancedPrompt;
    
    // PRIORITY 2: Check metadata for enhanced_prompt (snake_case from DB)
    if (!originalEnhancedPrompt) {
      originalEnhancedPrompt = metadata?.enhanced_prompt;
    }
    
    // PRIORITY 3: Fallback to regular prompt if no enhanced prompt
    if (!originalEnhancedPrompt) {
      originalEnhancedPrompt = asset.prompt || metadata?.prompt;
    }
    
    // PRIORITY 4: Job table fallback - check all possible job_id locations
    const jobId = (asset as any).job_id || metadata?.job_id || metadata?.job_metadata?.id;
    
    if (!originalEnhancedPrompt && jobId) {
      console.log('🎯 No enhanced prompt found in asset, checking job data with ID:', jobId);
      
      try {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('enhanced_prompt, metadata, original_prompt')
          .eq('id', jobId)
          .single();
        
        if (jobData) {
          // Try direct fields first, then metadata
          originalEnhancedPrompt = 
            jobData.enhanced_prompt ||
            (jobData.metadata as any)?.enhanced_prompt ||
            jobData.original_prompt ||
            (jobData.metadata as any)?.prompt;
          
          console.log('🎯 Found enhanced prompt from job table:', {
            jobId,
            directEnhanced: jobData.enhanced_prompt,
            metadataEnhanced: (jobData.metadata as any)?.enhanced_prompt,
            directOriginal: jobData.original_prompt,
            metadataPrompt: (jobData.metadata as any)?.prompt,
            finalEnhancedPrompt: originalEnhancedPrompt
          });
        } else {
          console.warn('🎯 No job data found for ID:', jobId);
        }
      } catch (error) {
        console.warn('🎯 Failed to fetch job data for ID:', jobId, error);
      }
    }
    
    console.log('🎯 ENHANCED PROMPT EXTRACTION COMPLETE:', {
      fromMetadataEnhancedPrompt: metadata?.enhanced_prompt,
      fromAssetEnhancedPrompt: asset.enhancedPrompt,
      fromMetadataPrompt: metadata?.prompt,
      fromAssetPrompt: asset.prompt,
      finalOriginalEnhancedPrompt: originalEnhancedPrompt,
      extractionSuccess: !!originalEnhancedPrompt,
      promptLength: originalEnhancedPrompt?.length || 0
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