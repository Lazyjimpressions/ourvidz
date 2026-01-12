import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CharacterImageService } from '@/services/CharacterImageService';

export const useCharacterImageUpdates = () => {
  useEffect(() => {
    let isSubscribed = false;
    let hasGivenUp = false;
    let retryTimeout: NodeJS.Timeout | null = null;
    let subscriptionAttempts = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const MAX_RETRIES = 2; // Limit retries to avoid spam

    const setupSubscription = () => {
      if (hasGivenUp) {
        console.log('⏸️ Character image updates subscription previously failed, skipping');
        return null;
      }

      // Clean up any existing channel before creating a new one
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // Ignore cleanup errors
        }
        channel = null;
      }

      // Subscribe to job updates for character image generation
      channel = supabase
        .channel(`character-image-updates-${Date.now()}`)
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
            subscriptionAttempts = 0; // Reset on success
            hasGivenUp = false;
            console.log('✅ Subscribed to character image updates');
          } else if (status === 'CHANNEL_ERROR') {
            // Only log first error, then be quiet
            if (subscriptionAttempts === 0) {
              console.error('❌ Character image updates channel error:', err);
            }
            isSubscribed = false;
            subscriptionAttempts++;
            if (subscriptionAttempts < MAX_RETRIES) {
              const delay = Math.min(2000 * subscriptionAttempts, 10000);
              console.log(`🔄 Retrying character image updates subscription in ${delay}ms (attempt ${subscriptionAttempts}/${MAX_RETRIES})`);
              retryTimeout = setTimeout(() => {
                if (!hasGivenUp) {
                  setupSubscription();
                }
              }, delay);
            } else {
              hasGivenUp = true;
              console.warn('⚠️ Max retries reached for character image updates subscription, giving up. Image updates will still work via polling.');
            }
          } else if (status === 'TIMED_OUT') {
            console.warn('⏱️ Character image updates subscription timed out');
            isSubscribed = false;
            hasGivenUp = true; // Don't retry on timeout
          }
        });

      return channel;
    };

    // Use a small delay to avoid race conditions during rapid mount/unmount
    const initTimeout = setTimeout(() => {
      if (!hasGivenUp) {
        setupSubscription();
      }
    }, 100);

    return () => {
      hasGivenUp = true; // Prevent retries after cleanup
      clearTimeout(initTimeout);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      // Clean up channel if it exists
      if (channel) {
        try {
          if (isSubscribed) {
            supabase.removeChannel(channel);
            console.log('🧹 Cleaned up character image updates subscription');
          } else {
            // Channel never connected, just unsubscribe to stop connection attempts
            channel.unsubscribe();
          }
        } catch (error) {
          // Ignore cleanup errors
        }
        channel = null;
      }
    };
  }, []);
};
