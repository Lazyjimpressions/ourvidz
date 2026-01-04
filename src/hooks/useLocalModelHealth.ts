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

    const initialize = async () => {
      // Initial fetch to check if health checks are enabled
      if (mounted) {
        await fetchHealthStatus();
      }

      // Set up real-time subscription for system_config updates
      // This runs regardless of isEnabled, so we can detect when toggle changes
      if (mounted) {
        const channelName = `local-model-health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        channel = supabase
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

        // Subscribe only once
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED' && mounted) {
            console.log('✅ Local model health subscription active');
          }
        });
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      if (channel) {
        supabase.removeChannel(channel);
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

