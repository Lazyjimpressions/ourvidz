import { supabase } from '@/integrations/supabase/client';

export interface ReferenceMetadata {
  originalEnhancedPrompt: string;
  originalSeed?: number;
  originalGenerationParams?: any;
  originalStyle?: string;
  originalCameraAngle?: string;
  originalShotType?: string;
  aspectRatio?: string;
}

export async function extractReferenceMetadata(imageId: string): Promise<ReferenceMetadata | null> {
  console.log('🔍 Extracting reference metadata for imageId:', imageId);
  
  try {
    // Try workspace_assets first, then user_library as fallback
    const { data, error } = await supabase
      .from('workspace_assets')
      .select('generation_settings, original_prompt')
      .eq('id', imageId)
      .maybeSingle();

    let metadata = null;
    let enhancedPrompt = null;
    let originalPrompt = null;

    if (data) {
      // Found in workspace_assets
      metadata = data.generation_settings as any;
      originalPrompt = data.original_prompt;
      enhancedPrompt = originalPrompt; // In new schema, we store the enhanced prompt as original_prompt
    } else {
      // Try user_library as fallback
      const { data: libraryData, error: libraryError } = await supabase
        .from('user_library')
        .select('original_prompt')
        .eq('id', imageId)
        .maybeSingle();

      if (libraryData) {
        originalPrompt = libraryData.original_prompt;
        enhancedPrompt = originalPrompt;
        metadata = {};
      }
    }

    if (!originalPrompt) {
      console.log('⚠️ No metadata found for imageId:', imageId);
      return null;
    }

    console.log('✅ Extracted metadata:', {
      enhancedPrompt: enhancedPrompt?.substring(0, 100) + '...',
      hasMetadata: !!metadata,
      originalPrompt: originalPrompt?.substring(0, 100) + '...'
    });

    const result: ReferenceMetadata = {
      originalEnhancedPrompt: enhancedPrompt || originalPrompt,
      originalSeed: metadata?.seed ? Number(metadata.seed) : undefined,
      originalGenerationParams: metadata || {},
      originalStyle: metadata?.style || undefined,
      originalCameraAngle: metadata?.camera_angle || undefined,
      originalShotType: metadata?.shot_type || undefined,
      aspectRatio: metadata?.aspect_ratio || undefined,
    };

    return result;
  } catch (error) {
    console.error('❌ Error extracting reference metadata:', error);
    return null;
  }
}

export async function extractReferencePaths(
  asset: { 
    id: string; 
    type: 'image' | 'video'; 
    imageUrls?: string[]; 
    referenceImageUrl?: string; 
  }
): Promise<{ 
  originalEnhancedPrompt?: string;
  referenceImagePaths?: string[];
  enhancedPrompt?: string;
  extractionSource?: string;
}> {
  console.log('🔍 EXTRACT REFERENCE METADATA: Starting extraction for asset:', {
    id: asset.id,
    type: asset.type,
    hasImageUrls: !!asset.imageUrls?.length,
    hasReferenceImageUrl: !!asset.referenceImageUrl
  });

  let originalEnhancedPrompt: string | undefined;
  let extractionSource = '';

  // Try to extract metadata from the new schema
  const metadata = await extractReferenceMetadata(asset.id);
  if (metadata) {
    originalEnhancedPrompt = metadata.originalEnhancedPrompt;
    extractionSource = 'new_schema';
  }

  console.log('✅ EXTRACT REFERENCE METADATA: Extraction completed:', {
    found: !!originalEnhancedPrompt,
    source: extractionSource,
    promptLength: originalEnhancedPrompt?.length || 0
  });

  return {
    originalEnhancedPrompt,
    referenceImagePaths: asset.imageUrls || [],
    enhancedPrompt: originalEnhancedPrompt,
    extractionSource
  };
}