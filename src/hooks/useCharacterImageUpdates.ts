import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CharacterImageService } from '@/services/CharacterImageService';

export const useCharacterImageUpdates = () => {
  useEffect(() => {
    let isSubscribed = false;

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
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          console.log('✅ Subscribed to character image updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Character image updates channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Character image updates subscription timed out');
        }
      });

    return () => {
      // Only remove channel if it was successfully subscribed
      if (isSubscribed) {
        try {
          supabase.removeChannel(channel);
          console.log('🧹 Cleaned up character image updates subscription');
        } catch (error) {
          console.error('Error removing character image updates channel:', error);
        }
      } else {
        // Channel never connected, just unsubscribe to stop connection attempts
        try {
          channel.unsubscribe();
        } catch (error) {
          // Ignore errors during unsubscribe of non-connected channels
        }
      }
    };
  }, []);
};
