import { supabase } from '@/integrations/supabase/client';
import { CharacterV2, ConsistencyControls } from '@/types/character-hub-v2';

interface GeneratePreviewParams {
    character: CharacterV2;
    prompt: string;
    consistencyControls: ConsistencyControls;
    primaryAnchorUrl?: string | null;
    mediaType: 'image' | 'video';
}

export class CharacterServiceV2 {

    /**
     * Generates a preview image or video for a character
     */
    static async generatePreview(params: GeneratePreviewParams) {
        const { character, prompt, consistencyControls, primaryAnchorUrl, mediaType } = params;

        try {
            // optimized prompt construction
            // TODO: Use a more sophisticated prompt builder taking traits into account
            const basePrompt = `(character: ${character.name}), ${character.description}. ${prompt}`;
            const negativePrompt = "blurry, low quality, distortion, disfigured";

            // 1. Create a placeholder record in character_scenes to track this generation
            // This ensures we have a stable ID and the user sees a "loading" state in history immediately
            const { data: sceneData, error: sceneError } = await supabase
                .from('character_scenes')
                .insert({
                    character_id: character.id,
                    scene_prompt: basePrompt,
                    image_url: null, // Loading state
                    generation_metadata: {
                        source: 'character-studio-v2',
                        consistency_mode: consistencyControls.consistency_mode,
                        media_type: mediaType
                    }
                })
                .select()
                .single();

            if (sceneError) throw sceneError;

            const sceneId = sceneData.id;

            let requestBody: any = {
                prompt: basePrompt,
                quality: 'high',
                modality: mediaType, // Explicitly set modality for fal-image function
                metadata: {
                    character_id: character.id,
                    character_name: character.name,
                    source: 'character-studio-v2',
                    media_type: mediaType,
                    modality: mediaType,
                    destination: 'character_scene', // Tell fal-image to update this scene
                    scene_id: sceneId
                }
            };

            // Configure Edge Function based on Consistency
            if (consistencyControls.consistency_mode && primaryAnchorUrl) {
                // Consistency Mode: Subject Reference / Image-to-Image
                requestBody.input = {
                    image_url: primaryAnchorUrl,
                    strength: (100 - consistencyControls.variation) / 100, // Convert variation (0-100) to strength (1.0-0.0)
                    // Note: 'strength' meaning varies by model. 
                    // For img2img: higher strength = more change from original. 
                    // So variation 30 => Strength 0.3 (Mostly keep original)?
                    // Usually: Strength 0 = exact original, Strength 1 = full noise.
                    // If variation is "how much it changes", then Variation 30% => Strength 0.3.
                };
            }

            // Use unified fal-image function which handles both image and video
            const edgeFunction = 'fal-image';

            console.log(`🚀 Generating ${mediaType} for ${character.name} via ${edgeFunction}`);

            const { data, error } = await supabase.functions.invoke(edgeFunction, {
                body: requestBody
            });

            if (error) throw error;

            return {
                success: true,
                jobId: data?.jobId,
                sceneId: sceneId,
                imageUrl: data?.imageUrl, // Some immediate returns
                message: "Generation started"
            };

        } catch (error: any) {
            console.error('Generation Error:', error);
            throw error;
        }
    }

    /**
     * Save a generated output to history/canon
     */
    static async saveToHistory(characterId: string, imageUrl: string, prompt: string) {
        // Implementation for saving to character_scenes or character_canon
        const { data, error } = await supabase
            .from('character_scenes')
            .insert({
                character_id: characterId,
                scene_prompt: prompt,
                image_url: imageUrl,
                generation_metadata: { source: 'studio-v2' }
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
