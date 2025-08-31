import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CharacterImageService } from '@/services/CharacterImageService';

export const useCharacterImageUpdates = () => {
  useEffect(() => {
    // Subscribe to job updates for character image generation
    const channel = supabase
      .channel('character-image-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: 'metadata->>destination=eq.character_portrait'
        },
        async (payload) => {
          const job = payload.new;
          
          // Check if job is completed and has image URL
          if (job.status === 'completed' && job.result?.image_url) {
            const metadata = job.metadata;
            const characterId = metadata?.character_id;
            
            if (characterId) {
              // Update character record with generated image
              await CharacterImageService.updateCharacterImage(
                characterId,
                job.result.image_url,
                job.result.seed
              );
              
              console.log(`Character image updated for character ${characterId}`);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: 'metadata->>destination=eq.character_scene'
        },
        async (payload) => {
          const job = payload.new;
          
          // Check if job is completed and has image URL
          if (job.status === 'completed' && job.result?.image_url) {
            const metadata = job.metadata;
            const sceneId = metadata?.scene_id;
            
            if (sceneId) {
              // Update character scene record with generated image
              await CharacterImageService.updateCharacterScene(
                sceneId,
                job.result.image_url
              );
              
              console.log(`Character scene image updated for scene ${sceneId}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
