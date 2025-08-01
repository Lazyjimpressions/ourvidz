import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkerStatus {
  isHealthy: boolean;
  lastChecked: string | null;
  responseTimeMs: number | null;
}

interface WorkerStatusState {
  chatWorker: WorkerStatus;
  wanWorker: WorkerStatus;
  isLoading: boolean;
  lastUpdated: string | null;
}

export const useWorkerStatus = () => {
  const [status, setStatus] = useState<WorkerStatusState>({
    chatWorker: { isHealthy: false, lastChecked: null, responseTimeMs: null },
    wanWorker: { isHealthy: false, lastChecked: null, responseTimeMs: null },
    isLoading: true,
    lastUpdated: null
  });

  const fetchWorkerStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config')
        .eq('id', 1)
        .single();

      if (error || !data) {
        console.error('Failed to fetch worker status:', error);
        return;
      }

      const config = data.config as any;
      const workerHealthCache = config?.workerHealthCache || {};

      setStatus({
        chatWorker: workerHealthCache.chatWorker || { 
          isHealthy: false, 
          lastChecked: null, 
          responseTimeMs: null 
        },
        wanWorker: workerHealthCache.wanWorker || { 
          isHealthy: false, 
          lastChecked: null, 
          responseTimeMs: null 
        },
        isLoading: false,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching worker status:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const refreshWorkerStatus = async (workerType: 'chat' | 'wan') => {
    try {
      const response = await supabase.functions.invoke(
        workerType === 'chat' ? 'register-chat-worker' : 'get-active-worker-url'
      );

      if (response.error) {
        console.error(`Failed to refresh ${workerType} worker status:`, response.error);
        return;
      }

      // Refresh the status after update
      await fetchWorkerStatus();
    } catch (error) {
      console.error(`Error refreshing ${workerType} worker status:`, error);
    }
  };

  useEffect(() => {
    fetchWorkerStatus();

    // Set up real-time updates for system_config changes
    const channel = supabase
      .channel('worker-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config'
        },
        () => {
          fetchWorkerStatus();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchWorkerStatus, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return {
    ...status,
    refreshWorkerStatus,
    refetch: fetchWorkerStatus
  };
};