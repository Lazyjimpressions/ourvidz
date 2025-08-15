import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook for advanced workspace cleanup operations
 * Handles orphaned jobs, failed jobs, and stuck workspace items
 */
export const useWorkspaceCleanup = () => {
  // Force clear all workspace items regardless of status
  const forceClearWorkspace = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔥 Force clearing workspace for user:', user.id);

      // Use workspace_assets approach - clear workspace by deleting assets
      const { data: workspaceAssets } = await supabase
        .from('workspace_assets')
        .select('id')
        .eq('user_id', user.id);

      if (workspaceAssets && workspaceAssets.length > 0) {
        const { error: deleteError } = await supabase
          .from('workspace_assets')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      }

      // Clean up failed jobs specifically
      const { error: jobsError } = await supabase
        .from('jobs')
        .delete()
        .eq('user_id', user.id)
        .in('status', ['failed', 'processing', 'queued']);

      if (jobsError) {
        console.warn('⚠️ Failed to clean up orphaned jobs:', jobsError);
      }

      const totalCleared = workspaceAssets?.length || 0;
      toast.success(`Workspace force cleared - ${totalCleared} items removed`);
      
      // Invalidate queries to refresh UI
      window.dispatchEvent(new CustomEvent('workspace-force-cleared'));
      
    } catch (error) {
      console.error('❌ Force clear failed:', error);
      toast.error('Failed to force clear workspace');
    }
  }, []);

  // Clean up failed jobs specifically
  const cleanupFailedJobs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete failed jobs older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: failedJobs, error: fetchError } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'failed')
        .lt('created_at', oneHourAgo);

      if (fetchError) throw fetchError;

      if (failedJobs && failedJobs.length > 0) {
        const { error: deleteError } = await supabase
          .from('jobs')
          .delete()
          .in('id', failedJobs.map(job => job.id));

        if (deleteError) throw deleteError;

        toast.success(`Cleaned up ${failedJobs.length} failed jobs`);
      } else {
        toast.info('No failed jobs to clean up');
      }

    } catch (error) {
      console.error('❌ Failed job cleanup failed:', error);
      toast.error('Failed to clean up failed jobs');
    }
  }, []);

  // Remove orphaned workspace items (items without valid asset references)
  const cleanupOrphanedItems = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current active session
      const { data: activeSession } = await supabase
        .from('workspace_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!activeSession) return;

      // Find workspace assets that have invalid job references
      const { data: workspaceAssets } = await supabase
        .from('workspace_assets')
        .select('id, job_id')
        .eq('user_id', user.id);

      if (!workspaceAssets || workspaceAssets.length === 0) return;

      const orphanedItems: string[] = [];

      // Check each asset for valid job reference
      for (const asset of workspaceAssets) {
        if (asset.job_id) {
          // Check if job still exists and is valid
          const { data: job } = await supabase
            .from('jobs')
            .select('id, status')
            .eq('id', asset.job_id)
            .maybeSingle();
          
          if (!job || job.status === 'failed') {
            orphanedItems.push(asset.id);
          }
        }
      }

      if (orphanedItems.length > 0) {
        const { error } = await supabase
          .from('workspace_assets')
          .delete()
          .in('id', orphanedItems);

        if (error) throw error;

        toast.success(`Removed ${orphanedItems.length} orphaned items`);
      } else {
        toast.info('No orphaned items found');
      }

    } catch (error) {
      console.error('❌ Orphaned item cleanup failed:', error);
      toast.error('Failed to clean up orphaned items');
    }
  }, []);

  return {
    forceClearWorkspace,
    cleanupFailedJobs,
    cleanupOrphanedItems
  };
};