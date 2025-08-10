import { ReferenceMetadata } from '@/types/workspace';
import { UnifiedAsset } from '@/lib/services/AssetService';

/**
 * Extract metadata from a reference image for exact copy functionality
 */
export const extractReferenceMetadata = (asset: UnifiedAsset): ReferenceMetadata | null => {
  try {
    const metadata = asset.metadata as any;
    
    // Extract enhanced prompt (try multiple sources)
    const originalEnhancedPrompt = 
      metadata?.enhanced_prompt || 
      asset.enhancedPrompt || 
      metadata?.prompt ||
      asset.prompt;
    
    if (!originalEnhancedPrompt) {
      console.warn('No enhanced prompt found in reference asset');
      return null;
    }
    
    return {
      originalEnhancedPrompt,
      originalSeed: metadata?.seed || (asset as any).seed,
      originalGenerationParams: metadata?.generationParams || metadata,
      originalStyle: metadata?.style || '',
      originalCameraAngle: metadata?.camera_angle || 'eye_level',
      originalShotType: metadata?.shot_type || 'wide',
      aspectRatio: metadata?.aspect_ratio || '16:9'
    };
  } catch (error) {
    console.error('Failed to extract reference metadata:', error);
    return null;
  }
};