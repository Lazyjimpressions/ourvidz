import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePortraitVersions, CharacterPortrait } from './usePortraitVersions';
import { Json } from '@/integrations/supabase/types';

export interface CharacterData {
  id?: string;
  name: string;
  description: string;
  gender: string;
  content_rating: 'sfw' | 'nsfw';
  is_public: boolean;
  traits: string;
  persona: string;
  first_message: string;
  system_prompt: string;
  image_url: string | null;
  reference_image_url: string | null;
  appearance_tags: string[];
  clothing_tags: string[];
  voice_tone: string;
  mood: string;
  alternate_greetings: string[];
  forbidden_phrases: string[];
  voice_examples: string[];
  default_presets: Json;
}

export interface CharacterScene {
  id: string;
  character_id: string;
  scene_name: string | null;
  scene_description: string | null;
  scene_prompt: string;
  image_url: string | null;
  scene_type: string;
  scene_starters: string[];
  system_prompt: string | null;
  priority: number;
  created_at: string;
}

export interface CharacterCanon {
  id: string;
  character_id: string;
  output_type: string;
  output_url: string;
  is_pinned: boolean;
  is_primary: boolean;
  tags: string[];
  label: string | null;
  metadata: Record<string, unknown> | null | any;
  created_at: string;
}

interface UseCharacterStudioOptions {
  characterId?: string;
  /** Default role for new characters: 'user' for persona, 'ai' for companion */
  defaultRole?: 'user' | 'ai';
}

const defaultCharacterData: CharacterData = {
  name: '',
  description: '',
  gender: 'female',
  content_rating: 'nsfw',
  is_public: false,
  traits: '',
  persona: '',
  first_message: '',
  system_prompt: '',
  image_url: null,
  reference_image_url: null,
  appearance_tags: [],
  clothing_tags: [],
  voice_tone: 'warm',
  mood: 'friendly',
  alternate_greetings: [],
  forbidden_phrases: [],
  voice_examples: [],
  default_presets: {} as Json
};

export function useCharacterStudio({ characterId, defaultRole = 'ai' }: UseCharacterStudioOptions = {}) {
  const [character, setCharacter] = useState<CharacterData>(defaultCharacterData);
  const [scenes, setScenes] = useState<CharacterScene[]>([]);
  const [canonImages, setCanonImages] = useState<CharacterCanon[]>([]);
  const [isCanonUploading, setIsCanonUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCharacterId, setSavedCharacterId] = useState<string | undefined>(characterId);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Portrait versions management
  const {
    portraits,
    primaryPortrait,
    isLoading: portraitsLoading,
    setPrimaryPortrait,
    deletePortrait,
    addPortrait,
    fetchPortraits
  } = usePortraitVersions({ 
    characterId: savedCharacterId, 
    enabled: !!savedCharacterId 
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{
    percent: number;
    estimatedTimeRemaining: number;
    stage: 'queued' | 'processing' | 'finalizing';
  } | null>(null);

  // Selection state for gallery
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'portrait' | 'scene' | null>(null);

  // Load existing character data
  const loadCharacter = useCallback(async () => {
    if (!characterId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCharacter({
          id: data.id,
          name: data.name || '',
          description: data.description || '',
          gender: data.gender || 'female',
          content_rating: (data.content_rating as 'sfw' | 'nsfw') || 'nsfw',
          is_public: data.is_public ?? false,
          traits: data.traits || '',
          persona: data.persona || '',
          first_message: data.first_message || '',
          system_prompt: data.system_prompt || '',
          image_url: data.image_url,
          reference_image_url: data.reference_image_url,
          appearance_tags: data.appearance_tags || [],
          clothing_tags: (data as any).clothing_tags || [],
          voice_tone: data.voice_tone || 'warm',
          mood: data.mood || 'friendly',
          alternate_greetings: Array.isArray(data.alternate_greetings) ? data.alternate_greetings as string[] : [],
          forbidden_phrases: data.forbidden_phrases || [],
          voice_examples: data.voice_examples || [],
          default_presets: data.default_presets || ({} as Json)
        });
        setSavedCharacterId(data.id);
      }
    } catch (err) {
      console.error('Error loading character:', err);
      toast({
        title: "Error",
        description: "Failed to load character data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [characterId, toast]);

  // Load character scenes
  const loadScenes = useCallback(async () => {
    if (!savedCharacterId) return;
    
    try {
      const { data, error } = await supabase
        .from('character_scenes')
        .select('*')
        .eq('character_id', savedCharacterId)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      
      setScenes(data || []);
    } catch (err) {
      console.error('Error loading scenes:', err);
    }
  }, [savedCharacterId]);

  // Update character field
  const updateCharacter = useCallback((updates: Partial<CharacterData>) => {
    setCharacter(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // Clear AI suggestion fields
  const clearSuggestions = useCallback(() => {
    setCharacter(prev => ({
      ...prev,
      traits: '',
      persona: '',
      voice_tone: 'warm',
      mood: 'friendly',
      appearance_tags: [],
      clothing_tags: [],
      description: '',
    }));
    setIsDirty(true);
  }, []);

  // Save character
  // Options: { silent?: boolean } - when true, suppresses success toast (useful for auto-save during generation)
  const saveCharacter = useCallback(async (options?: { silent?: boolean }): Promise<string | null> => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save a character",
        variant: "destructive"
      });
      return null;
    }

    if (!character.name.trim()) {
      toast({
        title: "Error",
        description: "Character name is required",
        variant: "destructive"
      });
      return null;
    }

    setIsSaving(true);
    try {
      const characterPayload = {
        name: character.name,
        description: character.description,
        gender: character.gender,
        content_rating: character.content_rating,
        is_public: character.is_public,
        traits: character.traits,
        persona: character.persona,
        first_message: character.first_message,
        system_prompt: character.system_prompt,
        image_url: character.image_url,
        reference_image_url: character.reference_image_url,
        appearance_tags: character.appearance_tags,
        clothing_tags: character.clothing_tags,
        voice_tone: character.voice_tone,
        mood: character.mood,
        alternate_greetings: character.alternate_greetings,
        forbidden_phrases: character.forbidden_phrases,
        voice_examples: character.voice_examples,
        default_presets: character.default_presets,
        user_id: user.id,
        role: defaultRole
      };

      let result;
      
      if (savedCharacterId) {
        // Update existing
        const { data, error } = await supabase
          .from('characters')
          .update(characterPayload)
          .eq('id', savedCharacterId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('characters')
          .insert(characterPayload)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        setSavedCharacterId(result.id);
      }

      setIsDirty(false);
      
      // Only show toast if not silent (e.g., during manual save, not auto-save for generation)
      if (!options?.silent) {
        toast({
          title: savedCharacterId ? "Character updated" : "Character created",
          description: `${character.name} has been saved successfully.`
        });
      }
      
      return result.id;
    } catch (err) {
      console.error('Error saving character:', err);
      toast({
        title: "Error",
        description: "Failed to save character",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, character, savedCharacterId, toast]);

  // Publish character (make public)
  const publishCharacter = useCallback(async () => {
    const id = await saveCharacter();
    if (!id) return false;
    
    try {
      const { error } = await supabase
        .from('characters')
        .update({ is_public: true })
        .eq('id', id);
      
      if (error) throw error;
      
      updateCharacter({ is_public: true });
      toast({
        title: "Character published",
        description: "Your character is now visible to others."
      });
      return true;
    } catch (err) {
      console.error('Error publishing character:', err);
      toast({
        title: "Error",
        description: "Failed to publish character",
        variant: "destructive"
      });
      return false;
    }
  }, [saveCharacter, updateCharacter, toast]);

  // Generate portrait using character-portrait edge function
  // Model is dynamically selected from api_models table
  // prompt: User-typed prompt from Character Studio prompt bar (promptOverride)
  const generatePortrait = useCallback(async (prompt: string, options?: {
    referenceImageUrl?: string;
    model?: string; // This is the api_models.id from database
    referenceStrength?: number; // 0.1–1.0, controls how much the reference image influences output
    numImages?: number; // 1-4, batch generation count
  }) => {
    // Auto-save if new character or dirty state
    let charId = savedCharacterId;
    if (!charId || isDirty) {
      // Validate required fields before saving
      if (!character.name?.trim() || !character.description?.trim()) {
        const isNewCharacter = !savedCharacterId;

        toast({
          title: 'Missing Required Fields',
          description: isNewCharacter
            ? 'New characters need a name and description before generating portraits'
            : 'Please add a character name and description to continue',
          variant: 'destructive'
        });
        return null;
      }

      // Silent auto-save
      charId = await saveCharacter({ silent: true });
      if (!charId) return null;

      // Notify user of auto-save on first generation
      if (!savedCharacterId) {
        toast({
          title: 'Character Auto-Saved',
          description: 'Generating your first portrait...',
          duration: 2000
        });
      }
    }

    setIsGenerating(true);

    // Estimate generation time (default to 20s for API models, 6s for local)
    const estimatedDuration = 20; // seconds (will be improved with model metadata)
    const startTime = Date.now();

    // Initialize progress
    setGenerationProgress({
      percent: 0,
      estimatedTimeRemaining: estimatedDuration,
      stage: 'queued'
    });

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const progress = Math.min(95, (elapsed / estimatedDuration) * 100); // Cap at 95% until complete
      const remaining = Math.max(0, estimatedDuration - elapsed);

      setGenerationProgress({
        percent: Math.round(progress),
        estimatedTimeRemaining: Math.round(remaining),
        stage: progress < 30 ? 'queued' : progress < 80 ? 'processing' : 'finalizing'
      });
    }, 500); // Update every 500ms

    // Show generation started toast
    toast({
      title: "Generating portrait...",
      description: "This may take a moment."
    });
    
    try {
      // Use reference image from options, fall back to character's reference image
      const effectiveReferenceUrl = options?.referenceImageUrl || character.reference_image_url || undefined;
      
      console.log('🎨 Generating portrait:', {
        characterId: charId,
        promptOverride: prompt?.substring(0, 50),
        hasReferenceImage: !!effectiveReferenceUrl,
        modelId: options?.model,
        contentRating: character.content_rating
      });

      // Use character-portrait edge function which handles model routing dynamically
      const { data, error } = await supabase.functions.invoke('character-portrait', {
        body: {
          characterId: charId,
          referenceImageUrl: effectiveReferenceUrl,
          contentRating: character.content_rating,
          apiModelId: options?.model || undefined,
          presets: {},
          characterData: null,
          promptOverride: prompt || undefined,
          referenceStrength: options?.referenceStrength || undefined,
          numImages: options?.numImages || undefined
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Edge function failed');
      }
      
      console.log('🎨 Portrait generation response:', data);
      
      // The character-portrait function returns imageUrl directly (sync mode)
      if (data?.success && data?.imageUrl) {
        // Clear progress interval
        clearInterval(progressInterval);
        setGenerationProgress({ percent: 100, estimatedTimeRemaining: 0, stage: 'finalizing' });

        // The edge function inserts into character_portraits table
        // Refresh portraits to show the new one
        await fetchPortraits(charId);

        // Update local character state to show the new image immediately in profile holder
        updateCharacter({ image_url: data.imageUrl });

        toast({
          title: "Portrait generated",
          description: `Completed in ${Math.round((data.generationTimeMs || 0) / 1000)}s`
        });
        setIsGenerating(false);
        setGenerationProgress(null);
        return data.imageUrl;
      } else if (data?.error) {
        clearInterval(progressInterval);
        setGenerationProgress(null);
        throw new Error(data.error);
      }

      // Unexpected response structure
      clearInterval(progressInterval);
      setGenerationProgress(null);
      throw new Error('Unexpected response from generation service');
    } catch (err) {
      console.error('Error generating portrait:', err);
      clearInterval(progressInterval);
      setGenerationProgress(null);
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Failed to generate portrait",
        variant: "destructive"
      });
      setIsGenerating(false);
      return null;
    }
  }, [savedCharacterId, saveCharacter, character, toast, fetchPortraits, updateCharacter]);

  // Select item in gallery
  const selectItem = useCallback((id: string | null, type: 'portrait' | 'scene' | null) => {
    setSelectedItemId(id);
    setSelectedItemType(type);
  }, []);

  // Get selected item
  const getSelectedItem = useCallback((): CharacterPortrait | CharacterScene | null => {
    if (!selectedItemId || !selectedItemType) return null;
    
    if (selectedItemType === 'portrait') {
      return portraits.find(p => p.id === selectedItemId) || null;
    } else {
      return scenes.find(s => s.id === selectedItemId) || null;
    }
  }, [selectedItemId, selectedItemType, portraits, scenes]);

  // === Canon (Positions) CRUD ===
  const loadCanon = useCallback(async () => {
    if (!savedCharacterId) return;
    try {
      const { data, error } = await supabase
        .from('character_canon')
        .select('*')
        .eq('character_id', savedCharacterId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCanonImages((data || []).map(d => ({
        ...d,
        is_primary: (d as any).is_primary ?? false,
        tags: (d as any).tags ?? [],
        label: (d as any).label ?? null,
      })));
    } catch (err) {
      console.error('❌ Error loading canon:', err);
    }
  }, [savedCharacterId]);

  const uploadCanon = useCallback(async (file: File, outputType: string, tags: string[], label?: string) => {
    if (!savedCharacterId || !user?.id) return;
    setIsCanonUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/${savedCharacterId}/canon/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('reference_images').upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('character_canon')
        .insert({
          character_id: savedCharacterId,
          output_type: outputType,
          output_url: path,
          tags,
          label: label || null,
        });
      if (insertError) throw insertError;
      await loadCanon();
      toast({ title: 'Position added', description: label || outputType });
    } catch (err) {
      console.error('❌ Error uploading canon:', err);
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setIsCanonUploading(false);
    }
  }, [savedCharacterId, user, loadCanon, toast]);

  const deleteCanon = useCallback(async (canonId: string) => {
    try {
      const { error } = await supabase.from('character_canon').delete().eq('id', canonId);
      if (error) throw error;
      setCanonImages(prev => prev.filter(c => c.id !== canonId));
    } catch (err) {
      console.error('❌ Error deleting canon:', err);
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  }, [toast]);

  const updateCanonTags = useCallback(async (canonId: string, tags: string[]) => {
    try {
      const { error } = await supabase.from('character_canon').update({ tags }).eq('id', canonId);
      if (error) throw error;
      setCanonImages(prev => prev.map(c => c.id === canonId ? { ...c, tags } : c));
    } catch (err) {
      console.error('❌ Error updating canon tags:', err);
    }
  }, []);

  const setCanonPrimary = useCallback(async (canonId: string) => {
    if (!savedCharacterId) return;
    try {
      // Reset all, then set target
      await supabase.from('character_canon').update({ is_primary: false }).eq('character_id', savedCharacterId);
      const { error } = await supabase.from('character_canon').update({ is_primary: true }).eq('id', canonId);
      if (error) throw error;
      setCanonImages(prev => prev.map(c => ({ ...c, is_primary: c.id === canonId })));
    } catch (err) {
      console.error('❌ Error setting canon primary:', err);
    }
  }, [savedCharacterId]);

  // Initialize
  useEffect(() => {
    if (characterId) {
      loadCharacter();
    }
  }, [characterId, loadCharacter]);

  useEffect(() => {
    if (savedCharacterId) {
      loadScenes();
      loadCanon();
    }
  }, [savedCharacterId, loadScenes, loadCanon]);

  // Check if this is a new character (not yet saved)
  const isNewCharacter = !savedCharacterId;

    return {
    // Character data
    character,
    updateCharacter,
    isNewCharacter,
    isDirty,
    isLoading,
    isSaving,
    savedCharacterId,
    
    // Actions
    saveCharacter,
    clearSuggestions,
    publishCharacter,
    loadCharacter,
    
    // Portraits
    portraits,
    primaryPortrait,
    portraitsLoading,
    setPrimaryPortrait,
    deletePortrait,
    addPortrait,
    fetchPortraits,
    
    // Scenes
    scenes,
    loadScenes,
    
    // Canon (Positions)
    canonImages,
    isCanonUploading,
    loadCanon,
    uploadCanon,
    deleteCanon,
    updateCanonTags,
    setCanonPrimary,
    
    // Generation
    isGenerating,
    activeJobId,
    generationProgress,
    generatePortrait,
    setIsGenerating,
    setActiveJobId,
    
    // Selection
    selectedItemId,
    selectedItemType,
    selectItem,
    getSelectedItem
  };
}
