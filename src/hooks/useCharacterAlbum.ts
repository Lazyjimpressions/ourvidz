import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';

export interface CharacterAlbumImage {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_prompt: string | null;
  model_used: string | null;
  created_at: string;
  roleplay_metadata: {
    type?: string;
    character_id?: string;
    character_name?: string;
  } | null;
}

interface UseCharacterAlbumOptions {
  characterId?: string;
  enabled?: boolean;
}

export function useCharacterAlbum({ characterId, enabled = true }: UseCharacterAlbumOptions) {
  const [albumImages, setAlbumImages] = useState<CharacterAlbumImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Fetch album images for this character
  const fetchAlbumImages = useCallback(async () => {
    if (!characterId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Query user_library where roleplay_metadata contains this character_id
      const { data, error: fetchError } = await supabase
        .from('user_library')
        .select('id, storage_path, thumbnail_path, original_prompt, model_used, created_at, roleplay_metadata')
        .filter('roleplay_metadata->character_id', 'eq', characterId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAlbumImages((data || []) as CharacterAlbumImage[]);
    } catch (err) {
      console.error('Error fetching character album:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch album'));
    } finally {
      setIsLoading(false);
    }
  }, [characterId, enabled]);

  // Save a scene to the album (using save-to-library flow)
  const saveToAlbum = useCallback(async (
    sceneImageUrl: string,
    scenePrompt: string,
    characterName?: string
  ) => {
    if (!characterId) {
      toast({
        title: 'Error',
        description: 'No character selected',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse the storage path to get bucket and path
      const knownBuckets = ['workspace-temp', 'user-library', 'characters', 'reference_images'];
      const parts = sceneImageUrl.split('/');
      let sourceBucket = 'workspace-temp';
      let sourcePath = sceneImageUrl;

      if (knownBuckets.includes(parts[0])) {
        sourceBucket = parts[0];
        sourcePath = parts.slice(1).join('/');
      }

      // Generate destination path in user-library
      const ext = sourcePath.split('.').pop() || 'png';
      const destPath = `${user.id}/album-${Date.now()}.${ext}`;

      // Download from source bucket
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(sourceBucket)
        .download(sourcePath);

      if (downloadError) throw downloadError;

      // Upload to user-library bucket
      const { error: uploadError } = await supabase.storage
        .from('user-library')
        .upload(destPath, downloadData, {
          contentType: downloadData.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create user_library record with character metadata
      const { data: libraryRecord, error: insertError } = await supabase
        .from('user_library')
        .insert({
          storage_path: `user-library/${destPath}`,
          asset_type: 'image',
          mime_type: downloadData.type || 'image/png',
          original_prompt: scenePrompt,
          content_category: 'character',
          file_size_bytes: downloadData.size || 0,
          roleplay_metadata: {
            type: 'character_portrait',
            character_id: characterId,
            character_name: characterName,
            source: 'character-studio-v2',
          } as any,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setAlbumImages(prev => [libraryRecord as CharacterAlbumImage, ...prev]);

      toast({
        title: 'Saved to Album',
        description: 'Image saved to your character album.',
      });

      return libraryRecord;
    } catch (err) {
      console.error('Error saving to album:', err);
      toast({
        title: 'Error',
        description: 'Failed to save to album',
        variant: 'destructive',
      });
      return null;
    }
  }, [characterId, toast]);

  // Remove an image from the album
  const removeFromAlbum = useCallback(async (libraryId: string) => {
    try {
      // Get the record first to get the storage path
      const { data: record, error: fetchError } = await supabase
        .from('user_library')
        .select('storage_path')
        .eq('id', libraryId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('user_library')
        .delete()
        .eq('id', libraryId);

      if (deleteError) throw deleteError;

      // Optionally delete from storage (uncomment if you want to also delete the file)
      // if (record?.storage_path) {
      //   const path = record.storage_path.replace('user-library/', '');
      //   await supabase.storage.from('user-library').remove([path]);
      // }

      // Update local state
      setAlbumImages(prev => prev.filter(img => img.id !== libraryId));

      toast({
        title: 'Removed from Album',
        description: 'Image removed from your album.',
      });
    } catch (err) {
      console.error('Error removing from album:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove from album',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!characterId || !enabled) return;

    fetchAlbumImages();

    // Note: Realtime subscription for user_library filtered by JSONB is not straightforward
    // We'll rely on manual refresh after saveToAlbum instead
  }, [characterId, enabled, fetchAlbumImages]);

  return {
    albumImages,
    isLoading,
    error,
    fetchAlbumImages,
    saveToAlbum,
    removeFromAlbum,
  };
}
