import { CharacterImageService } from '@/services/CharacterImageService';
import { supabase } from '@/integrations/supabase/client';
import { extractReferenceMetadata } from './extractReferenceMetadata';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  preview_image_url?: string;
  appearance_tags?: string[];
  traits?: string;
  persona?: string;
  consistency_method?: string;
  gender?: string;
  reference_image_url?: string;
  seed_locked?: number;
}

interface CharacterImageGenerationResult {
  success: boolean;
  jobId?: string;
  error?: string;
  prompt?: string;
}

interface GenerationOptions {
  apiModelId?: string; // Optional: Use specific image model from settings
}

/**
 * Generate a character portrait using optimized prompt building and service
 */
export const generateCharacterPortrait = async (
  character: Character,
  userId: string,
  options?: GenerationOptions
): Promise<CharacterImageGenerationResult> => {
  try {
    console.log('🎨 Generating character portrait for:', character.name, options?.apiModelId ? `using model: ${options.apiModelId}` : '');

    // Use the CharacterImageService for consistent generation
    const result = await CharacterImageService.generateCharacterPortrait({
      characterId: character.id,
      characterName: character.name,
      description: character.description || '',
      appearanceTags: character.appearance_tags,
      traits: character.traits,
      persona: character.persona,
      gender: character.gender,
      referenceImageUrl: character.reference_image_url,
      seedLocked: character.seed_locked,
      consistencyMethod: character.consistency_method || 'i2i_reference',
      apiModelId: options?.apiModelId
    });

    return result;
  } catch (error) {
    console.error('❌ Character portrait generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Extract reference metadata from a character's existing image for consistency
 */
export const getCharacterReferenceMetadata = async (
  characterImageId: string
): Promise<any> => {
  try {
    const metadata = await extractReferenceMetadata(characterImageId);
    
    if (metadata) {
      console.log('🔍 Found character reference metadata:', {
        hasSeed: !!metadata.originalSeed,
        hasStyle: !!metadata.originalStyle,
        promptLength: metadata.originalEnhancedPrompt?.length || 0
      });
    }

    return metadata;
  } catch (error) {
    console.error('❌ Error extracting character reference metadata:', error);
    return null;
  }
};

/**
 * Update character record with generated image URL
 * This is called by the job-callback edge function
 */
export const updateCharacterImage = async (
  characterId: string,
  imageUrl: string,
  seed?: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('characters')
      .update({
        image_url: imageUrl,
        reference_image_url: imageUrl,
        seed_locked: seed,
        updated_at: new Date().toISOString()
      })
      .eq('id', characterId);

    if (error) {
      console.error('❌ Failed to update character image:', error);
      return false;
    }

    console.log('✅ Character image updated successfully:', characterId);
    return true;
  } catch (error) {
    console.error('❌ Error updating character image:', error);
    return false;
  }
};

/**
 * Get character images from user library
 */
export const getCharacterImagesFromLibrary = async (
  userId: string,
  characterId?: string
): Promise<any[]> => {
  try {
    let query = supabase
      .from('user_library')
      .select('*')
      .eq('user_id', userId)
      .eq('asset_type', 'image')
      .order('created_at', { ascending: false });

    if (characterId) {
      query = query.eq('roleplay_metadata->>character_id', characterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching character images from library:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error getting character images from library:', error);
    return [];
  }
};

/**
 * Save generated character image to user library
 */
export const saveCharacterImageToLibrary = async (
  userId: string,
  characterId: string,
  imageUrl: string,
  prompt: string,
  metadata: any = {}
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_library')
      .insert({
        user_id: userId,
        asset_type: 'image',
        original_prompt: prompt,
        storage_path: imageUrl,
        file_size_bytes: 0, // Will be updated when actual file is processed
        mime_type: 'image/png', // Default for generated images
        model_used: 'fal',
      });

    if (error) {
      console.error('❌ Failed to save character image to library:', error);
      return false;
    }

    console.log('✅ Character image saved to library:', characterId);
    return true;
  } catch (error) {
    console.error('❌ Error saving character image to library:', error);
    return false;
  }
};
