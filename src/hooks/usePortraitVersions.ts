import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface CharacterPortrait {
  id: string;
  character_id: string;
  image_url: string;
  thumbnail_url: string | null;
  prompt: string | null;
  enhanced_prompt: string | null;
  generation_metadata: Json;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Runtime-only: signed URL for display */
  signedUrl?: string;
}

interface UsePortraitVersionsOptions {
  characterId?: string;
  enabled?: boolean;
}

export function usePortraitVersions({ characterId, enabled = true }: UsePortraitVersionsOptions) {
  const [portraits, setPortraits] = useState<CharacterPortrait[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Fetch portraits for this character (accepts optional override for freshly-saved characters)
  const fetchPortraits = useCallback(async (overrideCharacterId?: string) => {
    const targetId = overrideCharacterId || characterId;
    if (!targetId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('character_portraits')
        .select('*')
        .eq('character_id', targetId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setPortraits(data || []);
    } catch (err) {
      console.error('Error fetching portraits:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch portraits'));
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  // Set a portrait as primary
  const setPrimaryPortrait = useCallback(async (portraitId: string) => {
    if (!characterId) return;
    
    try {
      // First, unset any existing primary
      await supabase
        .from('character_portraits')
        .update({ is_primary: false })
        .eq('character_id', characterId)
        .eq('is_primary', true);
      
      // Then set the new primary
      const { error: updateError } = await supabase
        .from('character_portraits')
        .update({ is_primary: true })
        .eq('id', portraitId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setPortraits(prev => prev.map(p => ({
        ...p,
        is_primary: p.id === portraitId
      })));
      
      // Also update the character's main image_url AND reference_image_url for scene generation
      const portrait = portraits.find(p => p.id === portraitId);
      if (portrait) {
        await supabase
          .from('characters')
          .update({
            image_url: portrait.image_url,
            reference_image_url: portrait.image_url  // Also set reference for scene generation
          })
          .eq('id', characterId);
      }
      
      toast({
        title: "Primary portrait updated",
        description: "This portrait is now the main character image."
      });
    } catch (err) {
      console.error('Error setting primary portrait:', err);
      toast({
        title: "Error",
        description: "Failed to set primary portrait",
        variant: "destructive"
      });
    }
  }, [characterId, portraits, toast]);

  // Delete a portrait and its corresponding library entry
  const deletePortrait = useCallback(async (portraitId: string) => {
    try {
      // Find the portrait first so we can match it in user_library
      const portrait = portraits.find(p => p.id === portraitId);
      
      const { error: deleteError } = await supabase
        .from('character_portraits')
        .delete()
        .eq('id', portraitId);
      
      if (deleteError) throw deleteError;
      
      // Also delete from user_library if the image_url matches a storage_path
      if (portrait?.image_url) {
        const { error: libError } = await supabase
          .from('user_library')
          .delete()
          .eq('storage_path', portrait.image_url);
        
        if (libError) {
          console.warn('⚠️ Could not delete library entry:', libError);
        }
      }
      
      setPortraits(prev => prev.filter(p => p.id !== portraitId));
      
      toast({
        title: "Portrait deleted",
        description: "The portrait has been removed."
      });
    } catch (err) {
      console.error('Error deleting portrait:', err);
      toast({
        title: "Error",
        description: "Failed to delete portrait",
        variant: "destructive"
      });
    }
  }, [portraits, toast]);

  // Add a new portrait
  const addPortrait = useCallback(async (portrait: Omit<CharacterPortrait, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('character_portraits')
        .insert(portrait)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setPortraits(prev => [data, ...prev]);
      
      return data;
    } catch (err) {
      console.error('Error adding portrait:', err);
      toast({
        title: "Error",
        description: "Failed to add portrait",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Reorder portraits
  const reorderPortraits = useCallback(async (newOrder: string[]) => {
    try {
      const updates = newOrder.map((id, index) => ({
        id,
        sort_order: index
      }));
      
      for (const update of updates) {
        await supabase
          .from('character_portraits')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
      
      // Update local state
      setPortraits(prev => {
        const sorted = [...prev].sort((a, b) => {
          const aIndex = newOrder.indexOf(a.id);
          const bIndex = newOrder.indexOf(b.id);
          return aIndex - bIndex;
        });
        return sorted.map((p, i) => ({ ...p, sort_order: i }));
      });
    } catch (err) {
      console.error('Error reordering portraits:', err);
      toast({
        title: "Error",
        description: "Failed to reorder portraits",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!characterId || !enabled) return;
    
    fetchPortraits();
    
    const channel = supabase
      .channel(`character_portraits:${characterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'character_portraits',
          filter: `character_id=eq.${characterId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPortraits(prev => [payload.new as CharacterPortrait, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPortraits(prev => prev.map(p => 
              p.id === payload.new.id ? payload.new as CharacterPortrait : p
            ));
          } else if (payload.eventType === 'DELETE') {
            setPortraits(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [characterId, enabled, fetchPortraits]);

  // Get the primary portrait
  const primaryPortrait = portraits.find(p => p.is_primary) || portraits[0] || null;

  return {
    portraits,
    primaryPortrait,
    isLoading,
    error,
    fetchPortraits,
    setPrimaryPortrait,
    deletePortrait,
    addPortrait,
    reorderPortraits
  };
}
