import { ReferenceMetadata } from '@/types/workspace';
import { UnifiedAsset } from '@/lib/services/AssetService';

/**
 * Extract metadata from a reference image for exact copy functionality
 */
export const extractReferenceMetadata = (asset: UnifiedAsset): ReferenceMetadata | null => {
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
    
    // Extract enhanced prompt (try multiple sources)
    const originalEnhancedPrompt = 
      metadata?.enhanced_prompt || 
      asset.enhancedPrompt || 
      metadata?.prompt ||
      asset.prompt;
    
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