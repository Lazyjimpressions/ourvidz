import { supabase } from '@/integrations/supabase/client';
import { buildCharacterPortraitPrompt } from './characterPromptBuilder';
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
}

interface CharacterImageGenerationResult {
  success: boolean;
  jobId?: string;
  error?: string;
  prompt?: string;
}

/**
 * Generate a character portrait using optimized prompt building
 */
export const generateCharacterPortrait = async (
  character: Character,
  userId: string
): Promise<CharacterImageGenerationResult> => {
  try {
    // Use optimized prompt builder
    const characterPrompt = buildCharacterPortraitPrompt({
      name: character.name,
      description: character.description,
      persona: character.persona,
      traits: character.traits,
      appearance_tags: character.appearance_tags || []
    });

    console.log('🎨 Generating character portrait for:', character.name);
    console.log('📝 Optimized prompt:', characterPrompt);

    // Queue the job for SDXL generation
    const { data, error } = await supabase.functions.invoke('queue-job', {
      body: {
        prompt: characterPrompt,
        job_type: 'sdxl_image_fast',
        metadata: {
          destination: 'character_portrait',
          character_id: character.id,
          character_name: character.name,
          update_character_image: true,
          user_id: userId,
          save_to_library: true, // Save to user_library instead of avatars
          collection_name: 'Character Portraits'
        }
      }
    });

    if (error) {
      console.error('❌ Character portrait generation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate character portrait'
      };
    }

    console.log('✅ Character portrait job queued:', data);
    return {
      success: true,
      jobId: data.job_id,
      prompt: characterPrompt
    };

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
      query = query.eq('metadata->character_id', characterId);
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
        temp_storage_path: imageUrl,
        metadata: {
          ...metadata,
          character_id: characterId,
          destination: 'character_portrait',
          source: 'roleplay_system'
        },
        visibility: 'private'
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
