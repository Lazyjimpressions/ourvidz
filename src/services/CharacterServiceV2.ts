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
    /** Optional seed for reproducibility */
    seed?: string;
    /** Optional additional negative prompt from user */
    negativePrompt?: string;
}

export class CharacterServiceV2 {

    /**
     * Generates a preview image or video for a character
     */
    static async generatePreview(params: GeneratePreviewParams) {
        const { character, prompt, consistencyControls, primaryAnchorUrl, anchorRefs, mediaType, seed, negativePrompt: userNegativePrompt } = params;

        // Check if we have anchor references from Column C (preferred for i2i)
        const hasAnchorRefs = anchorRefs && (anchorRefs.face || anchorRefs.body || anchorRefs.style);
        const faceRef = anchorRefs?.face?.signedUrl || anchorRefs?.face?.imageUrl;
        const bodyRef = anchorRefs?.body?.signedUrl || anchorRefs?.body?.imageUrl;
        const styleRef = anchorRefs?.style?.signedUrl || anchorRefs?.style?.imageUrl;

        // Use anchor refs if available, otherwise fall back to primaryAnchorUrl
        const characterReferenceUrl = faceRef || bodyRef || primaryAnchorUrl;

        try {
            // Build style keywords from Style Tab settings
            const styleKeywords: string[] = [];

            // Add style preset (realistic, anime, cinematic, 3d, sketch)
            if (character.style_preset) {
                const stylePresetMap: Record<string, string> = {
                    'realistic': 'photorealistic, hyperrealistic',
                    'anime': 'anime style, cel shaded, japanese animation',
                    'cinematic': 'cinematic lighting, film still, movie quality',
                    '3d': '3D render, octane render, unreal engine',
                    'sketch': 'pencil sketch, hand drawn, illustration'
                };
                if (stylePresetMap[character.style_preset]) {
                    styleKeywords.push(stylePresetMap[character.style_preset]);
                }
            }

            // Add lighting preset
            if (character.lighting) {
                const lightingMap: Record<string, string> = {
                    'dramatic': 'dramatic lighting, high contrast, chiaroscuro',
                    'soft': 'soft lighting, diffused light, gentle shadows',
                    'studio': 'studio lighting, professional lighting setup',
                    'natural': 'natural lighting, daylight',
                    'golden_hour': 'golden hour lighting, warm sunlight, sunset tones',
                    'neon': 'neon lighting, cyberpunk, colorful neon glow'
                };
                if (lightingMap[character.lighting]) {
                    styleKeywords.push(lightingMap[character.lighting]);
                }
            }

            // Add mood
            if (character.mood) {
                styleKeywords.push(`${character.mood} mood`);
            }

            const stylePromptSuffix = styleKeywords.length > 0 ? `. ${styleKeywords.join(', ')}` : '';

            // Build the generation prompt using canon spec when consistency mode is enabled
            let basePrompt: string;
            let negativePrompt = "blurry, low quality, distortion, disfigured";

            if (consistencyControls.consistency_mode) {
                // Use structured canon spec for consistent character identity
                const { canonSpec, negativePrompt: avoidTraits } = buildCanonSpec(character);
                basePrompt = combinePromptWithCanon(prompt, canonSpec, { position: 'before' }) + stylePromptSuffix;

                // Append avoid_traits to negative prompt
                if (avoidTraits) {
                    negativePrompt = `${negativePrompt}, ${avoidTraits}`;
                }
            } else {
                // Fallback to basic prompt construction with style
                basePrompt = `(character: ${character.name}), ${character.description}. ${prompt}${stylePromptSuffix}`;
            }

            // Append user's custom negative prompt if provided
            if (userNegativePrompt) {
                negativePrompt = `${negativePrompt}, ${userNegativePrompt}`;
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
                // Add seed if provided (for reproducibility)
                ...(seed && { seed: parseInt(seed, 10) || undefined }),
                metadata: {
                    character_id: character.id,
                    character_name: character.name,
                    source: 'character-studio-v2',
                    media_type: mediaType,
                    modality: mediaType,
                    destination: 'character_scene', // Tell fal-image to update this scene
                    scene_id: sceneId,
                    // Style tab settings for reference/debugging
                    style_preset: character.style_preset,
                    lighting: character.lighting,
                    mood: character.mood,
                    rendering_rules: character.rendering_rules,
                    seed: seed || undefined
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
