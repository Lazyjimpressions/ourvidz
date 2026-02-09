import { supabase } from '@/integrations/supabase/client';
import { CharacterV2, ConsistencyControls } from '@/types/character-hub-v2';
import { buildCanonSpec, combinePromptWithCanon } from '@/lib/utils/canonSpecBuilder';

// Anchor reference type from Column C panel
interface AnchorReference {
    imageUrl: string;
    signedUrl?: string;
    source: 'file' | 'library' | 'references' | 'canon';
    sourceId?: string;
    sourceName?: string;
}

interface GeneratePreviewParams {
    character: CharacterV2;
    prompt: string;
    consistencyControls: ConsistencyControls;
    primaryAnchorUrl?: string | null;
    /** Session-based anchor references from Column C for i2i generation */
    anchorRefs?: {
        face: AnchorReference | null;
        body: AnchorReference | null;
        style: AnchorReference | null;
    };
    mediaType: 'image' | 'video';
}

export class CharacterServiceV2 {

    /**
     * Generates a preview image or video for a character
     */
    static async generatePreview(params: GeneratePreviewParams) {
        const { character, prompt, consistencyControls, primaryAnchorUrl, anchorRefs, mediaType } = params;

        // Check if we have anchor references from Column C (preferred for i2i)
        const hasAnchorRefs = anchorRefs && (anchorRefs.face || anchorRefs.body || anchorRefs.style);
        const faceRef = anchorRefs?.face?.signedUrl || anchorRefs?.face?.imageUrl;
        const bodyRef = anchorRefs?.body?.signedUrl || anchorRefs?.body?.imageUrl;
        const styleRef = anchorRefs?.style?.signedUrl || anchorRefs?.style?.imageUrl;

        // Use anchor refs if available, otherwise fall back to primaryAnchorUrl
        const characterReferenceUrl = faceRef || bodyRef || primaryAnchorUrl;

        try {
            // Build the generation prompt using canon spec when consistency mode is enabled
            let basePrompt: string;
            let negativePrompt = "blurry, low quality, distortion, disfigured";

            if (consistencyControls.consistency_mode) {
                // Use structured canon spec for consistent character identity
                const { canonSpec, negativePrompt: avoidTraits } = buildCanonSpec(character);
                basePrompt = combinePromptWithCanon(prompt, canonSpec, { position: 'before' });

                // Append avoid_traits to negative prompt
                if (avoidTraits) {
                    negativePrompt = `${negativePrompt}, ${avoidTraits}`;
                }
            } else {
                // Fallback to basic prompt construction
                basePrompt = `(character: ${character.name}), ${character.description}. ${prompt}`;
            }

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
                negative_prompt: negativePrompt,
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

            // Configure Edge Function based on anchor references or consistency mode
            // Priority: Anchor refs from Column C > Primary anchor > No reference
            if (hasAnchorRefs || (consistencyControls.consistency_mode && characterReferenceUrl)) {
                // i2i Mode: Use character reference for consistency
                requestBody.input = {
                    image_url: characterReferenceUrl,
                    strength: (100 - consistencyControls.variation) / 100, // Convert variation (0-100) to strength (1.0-0.0)
                };

                // Add style reference if available (separate from character reference)
                if (styleRef && styleRef !== characterReferenceUrl) {
                    requestBody.input.style_reference_url = styleRef;
                }

                // Mark as i2i for tracking
                requestBody.metadata.is_i2i = true;
                requestBody.metadata.anchor_sources = {
                    face: anchorRefs?.face?.source || null,
                    body: anchorRefs?.body?.source || null,
                    style: anchorRefs?.style?.source || null,
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
