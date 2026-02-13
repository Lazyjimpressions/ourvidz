import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CharacterServiceV2 } from '@/services/CharacterServiceV2';
import { CharacterV2, CharacterStudioState, ConsistencyControls } from '@/types/character-hub-v2';
import { CharacterScene } from '@/types/roleplay';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function useCharacterStudioV2(id?: string, mode: 'edit' | 'create' = 'edit') {
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('identity');
    const [prompt, setPrompt] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);

    // Consistency State
    const [consistencyControls, setConsistencyControls] = useState<ConsistencyControls>({
        consistency_mode: true,
        use_pinned_canon: false,
        variation: 30 // Low variation default
    });

    // Initial empty state (role and content_rating must match DB constraints: ai|user|narrator, sfw|nsfw)
    const [formData, setFormData] = useState<Partial<CharacterV2>>({
        name: '',
        description: '',
        role: 'ai',
        content_rating: 'sfw',
        style_preset: 'realistic',
        locked_traits: [],
        media_defaults: {},
        personality_traits: {},
        physical_traits: {},
        appearance_tags: []
    });

    // Fetch character data if editing
    const { data: character, isLoading } = useQuery({
        queryKey: ['character-studio', id],
        queryFn: async () => {
            if (!id || mode === 'create') return null;

            const { data, error } = await supabase
                .from('characters')
                .select('*, character_anchors(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as unknown as CharacterV2;
        },
        enabled: !!id && mode === 'edit'
    });

    // Fetch History (Character Scenes)
    const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
        queryKey: ['character-history', id],
        queryFn: async () => {
            if (!id) return [];

            const { data, error } = await supabase
                .from('character_scenes')
                .select('*')
                .eq('character_id', id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data as CharacterScene[];
        },
        enabled: !!id
    });

    // Update form data when character loads
    useEffect(() => {
        if (character) {
            setFormData(character);
        }
    }, [character]);

    // Real-time subscription for character_scenes updates
    // This ensures history updates immediately when generation completes
    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`character_scenes:${id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'character_scenes',
                filter: `character_id=eq.${id}`
            }, (payload) => {
                console.log('📡 Character scene update:', payload.eventType);
                queryClient.invalidateQueries({ queryKey: ['character-history', id] });
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Subscribed to character_scenes updates for:', id);
                }
            });

        return () => {
            console.log('🔌 Unsubscribing from character_scenes updates');
            supabase.removeChannel(channel);
        };
    }, [id, queryClient]);

    /**
     * Build payload for characters table. Strips relation keys (e.g. character_anchors)
     * and ensures required fields for create. role must be one of ai | user | narrator (DB CHECK).
     */
    const buildCharactersPayload = useCallback((data: Partial<CharacterV2>, isCreate: boolean) => {
        const allowedKeys = new Set([
            'name', 'description', 'traits', 'appearance_tags', 'image_url', 'persona', 'system_prompt',
            'voice_tone', 'mood', 'creator_id', 'likes_count', 'interaction_count', 'reference_image_url',
            'is_public', 'gender', 'content_rating', 'role', 'consistency_method', 'seed_locked', 'base_prompt',
            'preview_image_url', 'quick_start', 'voice_examples', 'scene_behavior_rules', 'forbidden_phrases',
            'first_message', 'alternate_greetings', 'default_presets', 'portrait_count', 'scene_count',
            'style_preset', 'locked_traits', 'media_defaults', 'personality_traits', 'physical_traits', 'outfit_defaults',
            // New PRD fields
            'avoid_traits', 'signature_items', 'lighting', 'rendering_rules'
        ] as const);
        const raw = data as Record<string, unknown>;
        const payload: Record<string, unknown> = {};
        for (const key of Object.keys(raw)) {
            if (key === 'character_anchors' || key === 'id' || key === 'user_id' || key === 'created_at' || key === 'updated_at') continue;
            if (allowedKeys.has(key as any)) payload[key] = raw[key];
        }
        if (isCreate) {
            payload.content_rating = payload.content_rating ?? 'sfw';
            payload.role = payload.role ?? 'ai';
        }
        return payload;
    }, []);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async (data: Partial<CharacterV2>) => {
            const payload = buildCharactersPayload(data, mode === 'create');

            if (mode === 'create') {
                const { data: userData } = await supabase.auth.getUser();
                const userId = userData.user?.id;
                const { data: newChar, error } = await supabase
                    .from('characters')
                    .insert([{ ...payload, user_id: userId } as any])
                    .select()
                    .single();
                if (error) throw error;
                return newChar;
            } else {
                if (!id) throw new Error("No ID for update");
                const { data: updatedChar, error } = await supabase
                    .from('characters')
                    .update(payload)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) throw error;
                return updatedChar;
            }
        },
        onSuccess: (data) => {
            toast({ title: "Character Saved", description: `${data.name} has been saved successfully.` });
            queryClient.invalidateQueries({ queryKey: ['character-hub-v2'] });

            if (mode === 'create') {
                navigate(`/character-studio-v2/${data.id}`, { replace: true });
            }
        },
        onError: (error) => {
            toast({
                title: "Save Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleSave = useCallback(() => {
        saveMutation.mutate(formData);
    }, [formData, saveMutation]);

    /**
     * Ensures the character is saved (for create mode).
     * Returns the character ID if successful, null otherwise.
     * Navigates to edit mode after saving.
     */
    const ensureCharacterSaved = useCallback(async (): Promise<string | null> => {
        // If already in edit mode with ID, we're good
        if (mode === 'edit' && id) {
            return id;
        }

        // In create mode, need to save first
        try {
            const payload = buildCharactersPayload(formData, true);
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;

            const { data: newChar, error } = await supabase
                .from('characters')
                .insert([{ ...payload, user_id: userId } as any])
                .select()
                .single();

            if (error) throw error;

            // Update local state with new character data
            setFormData(prev => ({ ...prev, ...newChar, id: newChar.id } as unknown as Partial<CharacterV2>));

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['character-hub-v2'] });

            // Navigate to edit mode (replace URL)
            navigate(`/character-studio-v2/${newChar.id}`, { replace: true });

            console.log('✅ Character auto-saved:', newChar.id);
            return newChar.id;
        } catch (error: any) {
            console.error('Auto-save failed:', error);
            toast({
                title: "Save Failed",
                description: error.message || "Could not save character before generating.",
                variant: "destructive"
            });
            return null;
        }
    }, [mode, id, formData, buildCharactersPayload, queryClient, navigate, toast]);

    const updateField = useCallback((field: keyof CharacterV2, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);


    // Anchor Management
    const uploadAnchor = async (file: File, anchorType?: 'face' | 'body' | 'style') => {
        if (!id) return;

        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${id}/anchors/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('characters')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('characters')
                .getPublicUrl(filePath);

            // If anchor type is specified, check if one already exists and delete it
            if (anchorType) {
                const existingAnchor = formData.character_anchors?.find(
                    (a: any) => a.anchor_type === anchorType
                );
                if (existingAnchor) {
                    await supabase
                        .from('character_anchors')
                        .delete()
                        .eq('id', existingAnchor.id);
                }
            }

            const { error: dbError } = await supabase
                .from('character_anchors')
                .insert({
                    character_id: id,
                    image_url: publicUrl,
                    is_primary: anchorType === 'face', // Face anchor is primary by default
                    anchor_type: anchorType || 'face'
                });

            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: ['character-studio', id] });
            toast({
                title: "Anchor Uploaded",
                description: anchorType
                    ? `${anchorType.charAt(0).toUpperCase() + anchorType.slice(1)} anchor set.`
                    : "Image added to character anchors."
            });
        } catch (error: any) {
            toast({
                title: "Upload Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const deleteAnchor = async (anchorId: string) => {
        try {
            const { error } = await supabase
                .from('character_anchors')
                .delete()
                .eq('id', anchorId);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['character-studio', id] });
            toast({ title: "Anchor Deleted", description: "Image removed from anchors." });
        } catch (error: any) {
            toast({
                title: "Delete Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const setPrimaryAnchor = async (anchorId: string) => {
        if (!id) return;

        try {
            // Get anchor URL
            const { data: anchor } = await supabase
                .from('character_anchors')
                .select('image_url')
                .eq('id', anchorId)
                .single() as any;

            if (!anchor) throw new Error("Anchor not found");

            // 1. Reset all anchors for this character
            await supabase
                .from('character_anchors')
                .update({ is_primary: false })
                .eq('character_id', id);

            // 2. Set new primary
            await supabase
                .from('character_anchors')
                .update({ is_primary: true })
                .eq('id', anchorId);

            // 3. Update character main image
            await supabase
                .from('characters')
                .update({ image_url: anchor.image_url })
                .eq('id', id);

            queryClient.invalidateQueries({ queryKey: ['character-studio', id] });
            // Also invalidate hub list to show new image
            queryClient.invalidateQueries({ queryKey: ['character-hub-v2'] });

            toast({ title: "Primary Updated", description: "Main character image updated." });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    // Generation Logic - accepts optional anchor refs from Column C for i2i generation
    const generatePreview = async (
        anchorRefs?: {
            face: { imageUrl: string; signedUrl?: string; source: string } | null;
            body: { imageUrl: string; signedUrl?: string; source: string } | null;
            style: { imageUrl: string; signedUrl?: string; source: string } | null;
        },
        options?: {
            batchSize?: number;
            seed?: string;
            negativePrompt?: string;
        }
    ) => {
        if (!formData) return;

        // If in create mode, auto-save first to get character ID
        let characterId = id;
        if (!characterId) {
            console.log('🔄 Auto-saving character before generation...');
            const savedId = await ensureCharacterSaved();
            if (!savedId) {
                // Save failed, toast already shown
                return;
            }
            characterId = savedId;
        }

        setIsGenerating(true);

        const batchSize = options?.batchSize || 1;
        const generateCount = Math.min(batchSize, 9); // Cap at 9

        try {
            const primaryAnchor = formData.character_anchors?.find(a => a.is_primary);

            // For batch generation, we generate sequentially
            // TODO: Check model capabilities and use native batch if supported
            for (let i = 0; i < generateCount; i++) {
                const result = await CharacterServiceV2.generatePreview({
                    character: formData as CharacterV2,
                    prompt,
                    consistencyControls,
                    primaryAnchorUrl: primaryAnchor?.image_url,
                    anchorRefs: anchorRefs as any,
                    mediaType,
                    // Pass generation options
                    seed: options?.seed ? `${options.seed}-${i}` : undefined, // Vary seed for batch
                    negativePrompt: options?.negativePrompt
                });

                if (i === 0 && result.success) {
                    toast({
                        title: generateCount > 1 ? `Generating ${generateCount} images...` : "Generation Started",
                        description: "Your preview is being generated..."
                    });
                    // Invalidate history to show the new "loading" item immediately
                    queryClient.invalidateQueries({ queryKey: ['character-history', characterId] });
                }
            }

        } catch (error: any) {
            toast({
                title: "Generation Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Output Management Actions
    /**
     * Save an image as a reusable reference (not character-specific).
     * These are generic pose/style/look references for i2i generation.
     */
    const saveAsReference = async (imageUrl: string, anchorType: 'face' | 'body' | 'style') => {
        if (!id) return;
        try {
            const { error } = await supabase
                .from('character_anchors')
                .insert({
                    character_id: id,
                    image_url: imageUrl,
                    is_primary: false,
                    anchor_type: anchorType
                });

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['character-studio', id] });
            const typeLabel = anchorType.charAt(0).toUpperCase() + anchorType.slice(1);
            toast({ title: "Reference Saved", description: `${typeLabel} reference added to saved references.` });
        } catch (error: any) {
            toast({
                title: "Save Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const useAsMain = async (imageUrl: string) => {
        if (!id) return;
        try {
            const { error } = await supabase
                .from('characters')
                .update({
                    image_url: imageUrl,
                    // Also update reference image for consistency
                    reference_image_url: imageUrl
                })
                .eq('id', id);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['character-studio', id] });
            queryClient.invalidateQueries({ queryKey: ['character-hub-v2'] }); // refresh hub

            toast({ title: "Updated Main Image", description: "Character profile image updated." });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const deleteFromHistory = async (sceneId: string) => {
        try {
            const { error } = await supabase
                .from('character_scenes')
                .delete()
                .eq('id', sceneId);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['character-history', id] });
            toast({ title: "Deleted", description: "Image removed from history." });
        } catch (error: any) {
            toast({
                title: "Delete Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    /**
     * Generate character fields from description using AI.
     * Populates personality, appearance, style, and other fields automatically.
     */
    const generateCharacterFromDescription = async () => {
        if (!formData.description?.trim()) {
            toast({
                title: "Description Required",
                description: "Enter a description first to generate character details.",
                variant: "destructive"
            });
            return;
        }

        setIsGeneratingCharacter(true);

        try {
            const { data, error } = await supabase.functions.invoke('character-suggestions', {
                body: {
                    type: 'all',
                    characterName: formData.name || 'Unnamed Character',
                    existingDescription: formData.description,
                    existingTraits: formData.appearance_tags || [],
                    contentRating: formData.content_rating || 'sfw'
                }
            });

            if (error) throw error;

            if (data?.success && data?.suggestions) {
                const suggestions = data.suggestions;

                // Build updates object
                const updates: Partial<CharacterV2> = {};

                // Backstory/Bio
                if (suggestions.suggestedBackstory?.length > 0) {
                    updates.traits = suggestions.suggestedBackstory.join('\n\n');
                }

                // Voice tone
                if (suggestions.suggestedVoiceTone) {
                    updates.voice_tone = suggestions.suggestedVoiceTone;
                }

                // Appearance tags
                if (suggestions.suggestedAppearance?.length > 0) {
                    const currentTags = formData.appearance_tags || [];
                    const newTags = [...new Set([...currentTags, ...suggestions.suggestedAppearance])];
                    updates.appearance_tags = newTags;
                }

                // Parse physical traits from appearance suggestions
                if (suggestions.suggestedAppearance?.length > 0) {
                    const physicalTraits: Record<string, string | string[]> = { ...(formData.physical_traits || {}) };

                    for (const trait of suggestions.suggestedAppearance) {
                        const lowerTrait = trait.toLowerCase();
                        // Hair detection
                        if (lowerTrait.includes('hair') || lowerTrait.includes('blonde') || lowerTrait.includes('brunette') || lowerTrait.includes('redhead')) {
                            if (!physicalTraits.hair) physicalTraits.hair = trait;
                        }
                        // Eyes detection
                        else if (lowerTrait.includes('eyes') || lowerTrait.includes('eye')) {
                            if (!physicalTraits.eyes) physicalTraits.eyes = trait;
                        }
                        // Body type detection
                        else if (lowerTrait.includes('athletic') || lowerTrait.includes('slim') || lowerTrait.includes('muscular') || lowerTrait.includes('curvy') || lowerTrait.includes('petite')) {
                            if (!physicalTraits.body_type) physicalTraits.body_type = trait;
                        }
                        // Ethnicity detection
                        else if (lowerTrait.includes('asian') || lowerTrait.includes('caucasian') || lowerTrait.includes('african') || lowerTrait.includes('latina') || lowerTrait.includes('middle eastern')) {
                            if (!physicalTraits.ethnicity) physicalTraits.ethnicity = trait;
                        }
                        // Age detection
                        else if (lowerTrait.includes('young') || lowerTrait.includes('mature') || lowerTrait.includes('elderly') || /\d{2}s?/.test(lowerTrait)) {
                            if (!physicalTraits.age) physicalTraits.age = trait;
                        }
                    }

                    if (Object.keys(physicalTraits).length > 0) {
                        updates.physical_traits = physicalTraits;
                    }
                }

                // Personality traits (if provided as structured data)
                if (suggestions.suggestedTraits?.length > 0) {
                    // Try to parse personality from traits
                    const personalityTraits: Record<string, number> = { ...(formData.personality_traits || {}) };
                    for (const trait of suggestions.suggestedTraits) {
                        const lowerTrait = trait.toLowerCase();
                        if (lowerTrait.includes('confident') || lowerTrait.includes('bold')) {
                            personalityTraits.confident = 60;
                        }
                        if (lowerTrait.includes('friendly') || lowerTrait.includes('warm')) {
                            personalityTraits.friendly = 50;
                        }
                        if (lowerTrait.includes('mysterious') || lowerTrait.includes('reserved')) {
                            personalityTraits.mysterious = 40;
                        }
                        if (lowerTrait.includes('playful') || lowerTrait.includes('witty')) {
                            personalityTraits.playful = 50;
                        }
                        if (lowerTrait.includes('dominant') || lowerTrait.includes('assertive')) {
                            personalityTraits.dominant = 40;
                        }
                    }
                    if (Object.keys(personalityTraits).length > 0) {
                        updates.personality_traits = personalityTraits;
                    }
                }

                // Locked traits (must include)
                if (suggestions.suggestedTraits?.length > 0 && (!formData.locked_traits || formData.locked_traits.length === 0)) {
                    // Take first 2-3 key traits as locked
                    updates.locked_traits = suggestions.suggestedTraits.slice(0, 3);
                }

                // Avoid traits
                if (suggestions.suggestedForbiddenPhrases?.length > 0) {
                    updates.avoid_traits = suggestions.suggestedForbiddenPhrases;
                }

                // Apply all updates
                setFormData(prev => ({ ...prev, ...updates }));

                toast({
                    title: "Character Generated",
                    description: "AI has populated personality, appearance, and traits. Review and adjust as needed."
                });
            } else {
                throw new Error(data?.error || 'Failed to generate character suggestions');
            }
        } catch (error: any) {
            console.error('Generate character error:', error);
            toast({
                title: "Generation Failed",
                description: error.message || 'Failed to generate character details.',
                variant: "destructive"
            });
        } finally {
            setIsGeneratingCharacter(false);
        }
    };

    return {
        character,
        formData,
        isLoading,
        isSaving: saveMutation.isPending,
        activeTab,
        setActiveTab,
        updateField,
        handleSave,
        setFormData,
        // Anchor actions
        uploadAnchor,
        deleteAnchor,
        setPrimaryAnchor,

        // Generation state
        prompt,
        setPrompt,
        mediaType,
        setMediaType,
        isGenerating,
        consistencyControls,
        setConsistencyControls,
        generatePreview,
        // History & Output actions
        history,
        isLoadingHistory,
        saveAsReference,
        useAsMain,
        deleteFromHistory,
        // Character generation
        isGeneratingCharacter,
        generateCharacterFromDescription
    };
}
