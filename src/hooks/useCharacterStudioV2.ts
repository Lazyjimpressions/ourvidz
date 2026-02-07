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
            'style_preset', 'locked_traits', 'media_defaults', 'personality_traits', 'physical_traits', 'outfit_defaults'
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
                    .insert([{ ...payload, user_id: userId }])
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

    const updateField = useCallback((field: keyof CharacterV2, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);


    // Anchor Management
    const uploadAnchor = async (file: File) => {
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

            const { error: dbError } = await supabase
                .from('character_anchors')
                .insert({
                    character_id: id,
                    image_url: publicUrl,
                    is_primary: false
                });

            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: ['character-studio', id] });
            toast({ title: "Anchor Uploaded", description: "Image added to character anchors." });
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

    // Generation Logic
    const generatePreview = async () => {
        if (!id || !formData) return;
        setIsGenerating(true);

        try {
            const primaryAnchor = formData.character_anchors?.find(a => a.is_primary);

            const result = await CharacterServiceV2.generatePreview({
                character: formData as CharacterV2, // Cast is safe as we check id
                prompt,
                consistencyControls,
                primaryAnchorUrl: primaryAnchor?.image_url,
                mediaType
            });

            if (result.success) {
                toast({
                    title: "Generation Started",
                    description: "Your preview is being generated..."
                });
                // Invalidate history to show the new "loading" item immediately
                queryClient.invalidateQueries({ queryKey: ['character-history', id] });
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
    const pinAsAnchor = async (imageUrl: string) => {
        if (!id) return;
        try {
            // Need to download and re-upload to characters bucket to make it a proper anchor?
            // Or just link the URL? Ideally we copy it to storage to ensure it persists if scene is deleted.
            // For now, let's just insert the URL record.

            const { error } = await supabase
                .from('character_anchors')
                .insert({
                    character_id: id,
                    image_url: imageUrl,
                    is_primary: false
                });

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['character-studio', id] });
            toast({ title: "Pinned as Anchor", description: "Image added to character anchors." });
        } catch (error: any) {
            toast({
                title: "Pin Failed",
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
        pinAsAnchor,
        useAsMain
    };
}
