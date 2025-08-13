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

      // Use library-first approach - clear workspace by setting dismissed flags
      const { data: images } = await supabase
        .from('images')
        .select('id, metadata')
        .eq('user_id', user.id)
        .is('metadata->workspace_dismissed', null);

      const { data: videos } = await supabase
        .from('videos')
        .select('id, metadata')  
        .eq('user_id', user.id)
        .is('metadata->workspace_dismissed', null);

      // Clear images from workspace
      if (images && images.length > 0) {
        const { error: imageError } = await supabase
          .from('images')
          .update({ 
            metadata: {
              workspace_dismissed: true,
              dismissed_at: new Date().toISOString()
            }
          })
          .in('id', images.map(img => img.id))
          .eq('user_id', user.id);

        if (imageError) throw imageError;
      }

      // Clear videos from workspace
      if (videos && videos.length > 0) {
        const { error: videoError } = await supabase
          .from('videos')
          .update({
            metadata: {
              workspace_dismissed: true,
              dismissed_at: new Date().toISOString()
            }
          })
          .in('id', videos.map(vid => vid.id))
          .eq('user_id', user.id);

        if (videoError) throw videoError;
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

      const totalCleared = (images?.length || 0) + (videos?.length || 0);
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

      // Find workspace items that have invalid job references or are in failed state
      const { data: workspaceItems } = await supabase
        .from('workspace_items')
        .select(`
          id,
          job_id,
          content_type,
          status
        `)
        .eq('session_id', activeSession.id);

      if (!workspaceItems || workspaceItems.length === 0) return;

      const orphanedItems: string[] = [];

      // Check each item for valid job reference and status
      for (const item of workspaceItems) {
        // Remove items with failed status or invalid job references
        if (item.status === 'failed' || item.status === 'error') {
          orphanedItems.push(item.id);
        } else if (item.job_id) {
          // Check if job still exists and is valid
          const { data: job } = await supabase
            .from('jobs')
            .select('id, status')
            .eq('id', item.job_id)
            .maybeSingle();
          
          if (!job || job.status === 'failed') {
            orphanedItems.push(item.id);
          }
        }
      }

      if (orphanedItems.length > 0) {
        const { error } = await supabase
          .from('workspace_items')
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