
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook for real-time workspace updates
 */
export function useRealtimeWorkspace() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔄 Setting up real-time workspace updates');

    // Listen to workspace_assets table changes
    const channel = supabase
      .channel('workspace-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_assets'
        },
        (payload) => {
          console.log('🔄 New workspace asset detected:', payload.new);
          
          // Invalidate workspace assets query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
          
          // Show success notification
          const asset = payload.new as any;
          if (asset.asset_type === 'image') {
            toast.success('New images generated!', {
              description: 'Your SDXL images are now available in the workspace'
            });
          } else {
            toast.success('New video generated!', {
              description: 'Your video is now available in the workspace'
            });
          }

          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('generation-completed', {
            detail: {
              assetId: asset.id,
              type: asset.asset_type,
              jobId: asset.job_id
            }
          }));
        }
      )
      .subscribe();

    // Listen for job status updates
    const jobChannel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          const job = payload.new as any;
          console.log('🔄 Job status update:', job.status, job.id);
          
          if (job.status === 'failed') {
            toast.error('Generation failed', {
              description: job.error_message || 'Unknown error occurred'
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time workspace subscriptions');
      supabase.removeChannel(channel);
      supabase.removeChannel(jobChannel);
    };
  }, [queryClient]);
}
