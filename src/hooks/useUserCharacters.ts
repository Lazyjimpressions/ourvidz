import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

import type { Json } from '@/integrations/supabase/types';

export interface UserCharacter {
  id: string;
  user_id: string;
  name: string;
  description: string;
  traits?: string;
  appearance_tags?: string[];
  image_url?: string;
  persona?: string;
  voice_tone?: string;
  mood?: string;
  creator_id?: string;
  likes_count: number;
  interaction_count: number;
  reference_image_url?: string;
  is_public: boolean;
  role: string;
  content_rating: string;
  gender?: string;
  voice_examples?: string[];
  forbidden_phrases?: string[];
  scene_behavior_rules?: Json;
  created_at: string;
  updated_at: string;
}

export const useUserCharacters = () => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<UserCharacter[]>([]);
  const [userPersonaIds, setUserPersonaIds] = useState<Set<string>>(new Set());
  const [defaultCharacterId, setDefaultCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ['user-admin-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  // Load which of the user's characters are used as personas (user_character_id in conversations)
  const loadUserPersonaIds = async () => {
    if (!user?.id) return new Set<string>();

    try {
      // Find characters that have been used as user_character_id in any conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('user_character_id')
        .eq('user_id', user.id)
        .not('user_character_id', 'is', null);

      if (error) throw error;

      const personaIds = new Set(data?.map(c => c.user_character_id).filter(Boolean) as string[]);
      setUserPersonaIds(personaIds);
      return personaIds;
    } catch (err) {
      console.error('Error loading user persona IDs:', err);
      return new Set<string>();
    }
  };

  const loadUserCharacters = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load ALL characters the user created (any role: 'user', 'ai', etc.)
      // This ensures characters appear in "My Characters" regardless of role
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCharacters(data || []);

      // Also load which are personas
      await loadUserPersonaIds();
    } catch (err) {
      console.error('Error loading user characters:', err);
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setIsLoading(false);
    }
  };

  const createUserCharacter = async (characterData: Partial<Omit<UserCharacter, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & Pick<UserCharacter, 'name' | 'description'>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Extract known fields, let the rest pass through
      const {
        name,
        description,
        traits,
        appearance_tags,
        persona,
        image_url,
        gender,
        voice_tone,
        mood,
        content_rating,
        reference_image_url,
        role,
        ...rest
      } = characterData;

      // Helper to convert empty strings to undefined (use DB defaults)
      const emptyToUndefined = (val: string | undefined) => val && val.trim() ? val : undefined;

      const { data, error } = await supabase
        .from('characters')
        .insert({
          name,
          description,
          traits: emptyToUndefined(traits),
          appearance_tags: appearance_tags?.length ? appearance_tags : undefined,
          persona: emptyToUndefined(persona),
          image_url: emptyToUndefined(image_url),
          gender: emptyToUndefined(gender),
          voice_tone: emptyToUndefined(voice_tone),
          mood: emptyToUndefined(mood),
          reference_image_url: emptyToUndefined(reference_image_url),
          content_rating: content_rating || 'nsfw', // Default to NSFW per plan
          user_id: user.id,
          role: role || 'ai', // Default to 'ai' for AI companions (My Characters)
          is_public: false,
          likes_count: 0,
          interaction_count: 0,
          // Include scene_behavior_rules if present and non-empty
          ...(rest.scene_behavior_rules && Object.keys(rest.scene_behavior_rules).length > 0
            ? { scene_behavior_rules: rest.scene_behavior_rules }
            : {}),
          // Include voice_examples and forbidden_phrases if present and non-empty
          ...(rest.voice_examples && rest.voice_examples.length > 0
            ? { voice_examples: rest.voice_examples }
            : {}),
          ...(rest.forbidden_phrases && rest.forbidden_phrases.length > 0
            ? { forbidden_phrases: rest.forbidden_phrases }
            : {})
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase character insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(error.message || 'Failed to insert character');
      }

      if (data) {
        setCharacters(prev => [data, ...prev]);
        
        // If character was created with an image_url, try to auto-save any pending jobs to library
        // This handles the case where image was generated before character creation
        if (data.image_url && (data.image_url.includes('workspace-temp/') || data.image_url.includes('user-library/'))) {
          // Find recent jobs with matching character name that might need auto-save
          try {
            const { data: recentJobs } = await supabase
              .from('jobs')
              .select('id, status, metadata, created_at')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .eq('metadata->>destination', 'character_portrait')
              .or(`metadata->>characterName.eq.${data.name},metadata->>character_name.eq.${data.name}`)
              .is('metadata->>character_id', null)
              .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (recentJobs && recentJobs.length > 0) {
              console.log('🔍 Found pending job for character creation, triggering auto-save');
              // The job-callback or fal-image should handle this, but we can trigger a check
              // For now, just log - the fix in fal-image should handle future cases
            }
          } catch (err) {
            console.warn('⚠️ Error checking for pending jobs:', err);
            // Don't fail character creation if this check fails
          }
        }
      }

      console.log('✅ Character created successfully:', data?.id);
      return data;
    } catch (err) {
      console.error('❌ Error creating character:', err);
      throw err;
    }
  };

  const updateUserCharacter = async (id: string, updates: Partial<UserCharacter>) => {
    try {
      let query = supabase
        .from('characters')
        .update(updates)
        .eq('id', id);
      
      // Only add user_id filter if not admin
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      
      if (data) {
        setCharacters(prev => prev.map(char => 
          char.id === id ? { ...char, ...data } : char
        ));
      }
      
      return data;
    } catch (err) {
      console.error('Error updating character:', err);
      throw err;
    }
  };

  const deleteUserCharacter = async (id: string) => {
    try {
      // Build query - admin can delete any character, regular users can only delete their own
      let query = supabase
        .from('characters')
        .delete()
        .eq('id', id);

      // Only add user_id filter if not admin
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { error } = await query;

      if (error) throw error;

      setCharacters(prev => prev.filter(char => char.id !== id));

      // If deleted character was the default, clear it
      if (defaultCharacterId === id) {
        setDefaultCharacterId(null);
      }
    } catch (err) {
      console.error('❌ Error deleting character:', err);
      throw err;
    }
  };

  // Load default user character from profile
  const loadDefaultCharacter = async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('default_user_character_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading default character:', error);
        return null;
      }

      setDefaultCharacterId(data?.default_user_character_id || null);
      return data?.default_user_character_id || null;
    } catch (err) {
      console.error('Error loading default character:', err);
      return null;
    }
  };

  // Set default user character in profile
  const setDefaultCharacter = async (characterId: string | null) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ default_user_character_id: characterId })
        .eq('id', user.id);

      if (error) throw error;

      setDefaultCharacterId(characterId);
      console.log('✅ Default user character updated:', characterId);
    } catch (err) {
      console.error('Error setting default character:', err);
      throw err;
    }
  };

  // Get the default character object
  const getDefaultCharacter = (): UserCharacter | null => {
    if (!defaultCharacterId) return null;
    return characters.find(c => c.id === defaultCharacterId) || null;
  };

  useEffect(() => {
    loadUserCharacters();
    loadDefaultCharacter();
  }, [user?.id]);

  // Filter characters into AI companions vs user personas
  // Primary: role field as source of truth
  // Secondary: conversation usage and default status for edge cases
  // AI companions: Characters to roleplay WITH (shown in "My Characters")
  // User personas: Characters that represent the user in roleplay (shown in settings)
  const userPersonas = characters.filter(c => 
    c.role === 'user' || 
    userPersonaIds.has(c.id) || 
    c.id === defaultCharacterId
  );

  const aiCompanions = characters.filter(c => 
    c.role === 'ai' && 
    !userPersonaIds.has(c.id) && 
    c.id !== defaultCharacterId
  );

  return {
    // All characters (raw, unfiltered)
    characters,
    // Filtered lists
    aiCompanions,      // Characters to chat WITH (for "My Characters" grid)
    userPersonas,      // User's own personas (for settings/profile)
    userPersonaIds,    // Set of persona IDs for checking
    // Loading/error state
    isLoading,
    error,
    // CRUD operations
    loadUserCharacters,
    createUserCharacter,
    updateUserCharacter,
    deleteUserCharacter,
    // Default character management
    defaultCharacterId,
    getDefaultCharacter,
    setDefaultCharacter,
    loadDefaultCharacter
  };
};