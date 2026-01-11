import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LocalModelHealth {
  chatWorker: {
    isAvailable: boolean;
    isHealthy: boolean;
    lastChecked: string | null;
    responseTimeMs: number | null;
    error: string | null;
  };
  sdxlWorker: {
    isAvailable: boolean;
    isHealthy: boolean;
    lastChecked: string | null;
    responseTimeMs: number | null;
    error: string | null;
  };
  isLoading: boolean;
  isEnabled: boolean;  // Whether local model health checks are enabled in admin settings
}

/**
 * Hook to check health/availability of local models
 * Uses system_config worker health cache for efficient checking
 */
export const useLocalModelHealth = () => {
  const [health, setHealth] = useState<LocalModelHealth>({
    chatWorker: {
      isAvailable: false,
      isHealthy: false,
      lastChecked: null,
      responseTimeMs: null,
      error: null
    },
    sdxlWorker: {
      isAvailable: false,
      isHealthy: false,
      lastChecked: null,
      responseTimeMs: null,
      error: null
    },
    isLoading: true,
    isEnabled: false  // Default to disabled
  });

  const fetchHealthStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config')
        .eq('id', 1)
        .single();

      if (error || !data) {
        console.error('Failed to fetch worker health:', error);
        setHealth(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const config = data.config as any;

      // Check if local model health checks are enabled
      const isEnabled = config?.enableLocalModelHealthCheck === true;

      // If disabled, return early with unavailable status
      if (!isEnabled) {
        setHealth({
          chatWorker: {
            isAvailable: false,
            isHealthy: false,
            lastChecked: null,
            responseTimeMs: null,
            error: null
          },
          sdxlWorker: {
            isAvailable: false,
            isHealthy: false,
            lastChecked: null,
            responseTimeMs: null,
            error: null
          },
          isLoading: false,
          isEnabled: false
        });
        return;
      }

      const workerHealthCache = config?.workerHealthCache || {};

      // Chat worker health (for local chat models like Qwen)
      const chatWorkerHealth = workerHealthCache.chatWorker || {};
      const chatWorkerAvailable = chatWorkerHealth.isHealthy === true &&
                                   chatWorkerHealth.workerUrl !== null;

      // SDXL worker health (for local image generation)
      const wanWorkerHealth = workerHealthCache.wanWorker || {};
      const sdxlWorkerAvailable = wanWorkerHealth.isHealthy === true &&
                                  wanWorkerHealth.workerUrl !== null;

      setHealth({
        chatWorker: {
          isAvailable: chatWorkerAvailable,
          isHealthy: chatWorkerHealth.isHealthy === true,
          lastChecked: chatWorkerHealth.lastChecked || null,
          responseTimeMs: chatWorkerHealth.responseTimeMs || null,
          error: chatWorkerHealth.healthError || null
        },
        sdxlWorker: {
          isAvailable: sdxlWorkerAvailable,
          isHealthy: wanWorkerHealth.isHealthy === true,
          lastChecked: wanWorkerHealth.lastChecked || null,
          responseTimeMs: wanWorkerHealth.responseTimeMs || null,
          error: wanWorkerHealth.healthError || null
        },
        isLoading: false,
        isEnabled: true
      });
    } catch (error) {
      console.error('Error fetching local model health:', error);
      setHealth(prev => ({ ...prev, isLoading: false }));
    }
  };

  const triggerHealthCheck = async () => {
    // Don't trigger health checks if not enabled
    if (!health.isEnabled) return;

    try {
      // Trigger health check edge function (fire and forget)
      supabase.functions.invoke('health-check-workers').then(() => {
        // Wait a moment for health check to complete, then fetch status
        setTimeout(fetchHealthStatus, 2000);
      }).catch((error) => {
        console.error('Health check invocation failed:', error);
      });
    } catch (error) {
      console.error('Error triggering health check:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let subscriptionAttempts = 0;
    let hasGivenUp = false;
    const MAX_RETRIES = 2; // Reduced retries to avoid spam

    const initialize = async () => {
      // Clean up any existing channel before creating a new one
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // Ignore cleanup errors
        }
        channel = null;
      }

      // Initial fetch to check if health checks are enabled
      if (mounted) {
        await fetchHealthStatus();
      }

      // Set up real-time subscription for system_config updates
      // This runs regardless of isEnabled, so we can detect when toggle changes
      if (mounted && !hasGivenUp) {
        const channelName = `local-model-health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'system_config',
              filter: 'id=eq.1'
            },
            () => {
              if (mounted) {
                fetchHealthStatus();
              }
            }
          );

        // Subscribe with error handling
        newChannel.subscribe((status, err) => {
          if (status === 'SUBSCRIBED' && mounted) {
            channel = newChannel; // Only assign on success
            console.log('✅ Local model health subscription active');
            subscriptionAttempts = 0; // Reset on success
            hasGivenUp = false;
          } else if (status === 'CHANNEL_ERROR' && mounted) {
            // Only log first error to reduce spam
            if (subscriptionAttempts === 0) {
              console.error('❌ Local model health channel error:', err);
            }
            subscriptionAttempts++;
            if (subscriptionAttempts < MAX_RETRIES) {
              const delay = Math.min(2000 * subscriptionAttempts, 10000);
              console.log(`🔄 Retrying local model health subscription in ${delay}ms (attempt ${subscriptionAttempts}/${MAX_RETRIES})`);
              retryTimeout = setTimeout(() => {
                if (mounted && !hasGivenUp) {
                  initialize();
                }
              }, delay);
            } else {
              hasGivenUp = true;
              console.warn('⚠️ Max retries reached for local model health subscription, giving up. Health checks will use polling only.');
              // Clean up failed channel
              try {
                supabase.removeChannel(newChannel);
              } catch (error) {
                // Ignore cleanup errors
              }
            }
          } else if (status === 'TIMED_OUT' && mounted) {
            console.warn('⏱️ Local model health subscription timed out');
            // Don't retry on timeout - just use polling
            hasGivenUp = true;
            // Clean up timed out channel
            try {
              supabase.removeChannel(newChannel);
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        });
      }
    };

    initialize();

    return () => {
      mounted = false;
      hasGivenUp = true; // Prevent retries after cleanup
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (interval) clearInterval(interval);
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Set up polling intervals only when enabled
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    if (health.isEnabled) {
      // Auto-refresh every 30 seconds
      interval = setInterval(() => {
        fetchHealthStatus();
      }, 30000);

      // Run health check every 60 seconds
      healthCheckInterval = setInterval(() => {
        triggerHealthCheck();
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (healthCheckInterval) clearInterval(healthCheckInterval);
    };
  }, [health.isEnabled]);

  return {
    ...health,
    refetch: fetchHealthStatus,
    triggerHealthCheck
  };
};

