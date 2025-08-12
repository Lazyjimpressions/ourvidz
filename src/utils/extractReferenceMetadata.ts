import { ReferenceMetadata } from '@/types/workspace';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Extract metadata from a reference image for exact copy functionality
 * ENHANCED VERSION: Better fallback logic, validation, and error handling
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
    let originalEnhancedPrompt: string | null = null;
    let extractionSource = '';
    
    // ENHANCED EXTRACTION: Multiple fallback paths with validation
    
    // PATH 1: Direct asset enhanced prompt (camelCase)
    if (asset.enhancedPrompt && typeof asset.enhancedPrompt === 'string' && asset.enhancedPrompt.trim().length > 0) {
      originalEnhancedPrompt = asset.enhancedPrompt.trim();
      extractionSource = 'asset.enhancedPrompt';
    }
    
    // PATH 2: Metadata enhanced prompt (snake_case from DB)
    if (!originalEnhancedPrompt && metadata?.enhanced_prompt && typeof metadata.enhanced_prompt === 'string' && metadata.enhanced_prompt.trim().length > 0) {
      originalEnhancedPrompt = metadata.enhanced_prompt.trim();
      extractionSource = 'metadata.enhanced_prompt';
    }
    
    // PATH 3: Direct asset prompt
    if (!originalEnhancedPrompt && asset.prompt && typeof asset.prompt === 'string' && asset.prompt.trim().length > 0) {
      originalEnhancedPrompt = asset.prompt.trim();
      extractionSource = 'asset.prompt';
    }
    
    // PATH 4: Metadata prompt
    if (!originalEnhancedPrompt && metadata?.prompt && typeof metadata.prompt === 'string' && metadata.prompt.trim().length > 0) {
      originalEnhancedPrompt = metadata.prompt.trim();
      extractionSource = 'metadata.prompt';
    }
    
    // PATH 5: Job table lookup with comprehensive search
    const jobId = (asset as any).job_id || metadata?.job_id || metadata?.job_metadata?.id || asset.id;
    
    if (!originalEnhancedPrompt && jobId) {
      console.log('🎯 FALLBACK: Checking job table for enhanced prompt, job ID:', jobId);
      
      try {
        // Try images table first (might be faster)
        const { data: imageData } = await supabase
          .from('images')
          .select('enhanced_prompt, prompt, metadata')
          .eq('id', asset.id)
          .maybeSingle();
        
        if (imageData) {
          if (imageData.enhanced_prompt && typeof imageData.enhanced_prompt === 'string' && imageData.enhanced_prompt.trim().length > 0) {
            originalEnhancedPrompt = imageData.enhanced_prompt.trim();
            extractionSource = 'images.enhanced_prompt';
          } else if (imageData.prompt && typeof imageData.prompt === 'string' && imageData.prompt.trim().length > 0) {
            originalEnhancedPrompt = imageData.prompt.trim();
            extractionSource = 'images.prompt';
          } else if ((imageData.metadata as any)?.enhanced_prompt) {
            originalEnhancedPrompt = (imageData.metadata as any).enhanced_prompt.trim();
            extractionSource = 'images.metadata.enhanced_prompt';
          }
        }
        
        // If still not found, try jobs table
        if (!originalEnhancedPrompt) {
          const { data: jobData } = await supabase
            .from('jobs')
            .select('enhanced_prompt, metadata, original_prompt')
            .eq('id', jobId)
            .maybeSingle();
          
          if (jobData) {
            if (jobData.enhanced_prompt && typeof jobData.enhanced_prompt === 'string' && jobData.enhanced_prompt.trim().length > 0) {
              originalEnhancedPrompt = jobData.enhanced_prompt.trim();
              extractionSource = 'jobs.enhanced_prompt';
            } else if (jobData.original_prompt && typeof jobData.original_prompt === 'string' && jobData.original_prompt.trim().length > 0) {
              originalEnhancedPrompt = jobData.original_prompt.trim();
              extractionSource = 'jobs.original_prompt';
            } else if ((jobData.metadata as any)?.enhanced_prompt) {
              originalEnhancedPrompt = (jobData.metadata as any).enhanced_prompt.trim();
              extractionSource = 'jobs.metadata.enhanced_prompt';
            } else if ((jobData.metadata as any)?.prompt) {
              originalEnhancedPrompt = (jobData.metadata as any).prompt.trim();
              extractionSource = 'jobs.metadata.prompt';
            }
          }
        }
        
        console.log('🎯 DATABASE LOOKUP RESULT:', {
          jobId,
          imageDataFound: !!imageData,
          extractedPrompt: originalEnhancedPrompt,
          extractionSource
        });
        
      } catch (error) {
        console.error('🎯 DATABASE LOOKUP FAILED:', error);
      }
    }
    
    console.log('🎯 ENHANCED PROMPT EXTRACTION COMPLETE:', {
      extractionSource,
      finalOriginalEnhancedPrompt: originalEnhancedPrompt,
      extractionSuccess: !!originalEnhancedPrompt,
      promptLength: originalEnhancedPrompt?.length || 0,
      isValidPrompt: !!(originalEnhancedPrompt && originalEnhancedPrompt.length >= 10) // Minimum viable prompt length
    });
    
    // VALIDATION: Ensure we have a meaningful prompt
    if (!originalEnhancedPrompt || originalEnhancedPrompt.length < 10) {
      console.warn('⚠️ VALIDATION FAILED: Enhanced prompt too short or missing', {
        promptLength: originalEnhancedPrompt?.length || 0,
        extractionSource
      });
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