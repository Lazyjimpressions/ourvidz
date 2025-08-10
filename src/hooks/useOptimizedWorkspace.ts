import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Optimized workspace hook with proper loading states and error handling
 * Implements optimistic updates for better UX
 */
export const useOptimizedWorkspace = () => {
  const queryClient = useQueryClient();
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());

  // Optimistic UI helper
  const withOptimisticUpdate = useCallback(async <T>(
    itemId: string,
    operation: () => Promise<T>,
    errorMessage: string,
    setDeleting: React.Dispatch<React.SetStateAction<Set<string>>>
  ): Promise<T | null> => {
    // Start loading state
    setDeleting(prev => new Set(prev).add(itemId));
    
    try {
      const result = await operation();
      
      // Invalidate workspace queries
      queryClient.invalidateQueries({ queryKey: ['workspace-items-all'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      queryClient.invalidateQueries({ queryKey: ['media-grid-workspace-assets'] });
      
      return result;
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
      return null;
    } finally {
      // Clear loading state
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [queryClient]);

  // Hide item from workspace (soft delete)
  const hideFromWorkspace = useCallback(async (itemId: string, itemType: 'image' | 'video') => {
    return withOptimisticUpdate(
      itemId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('workspace_items')
          .update({ status: 'hidden' })
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success('Item hidden from workspace');
        return true;
      },
      'Failed to hide item from workspace',
      setDeletingItems
    );
  }, [withOptimisticUpdate]);

  // Delete item permanently
  const deleteItemPermanently = useCallback(async (itemId: string, itemType: 'image' | 'video') => {
    return withOptimisticUpdate(
      itemId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Delete from workspace_items table
        const { error: workspaceError } = await supabase
          .from('workspace_items')
          .delete()
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (workspaceError) throw workspaceError;

        // Delete from respective content table
        const table = itemType === 'video' ? 'videos' : 'images';
        const { error: contentError } = await supabase
          .from(table)
          .delete()
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (contentError) throw contentError;

        toast.success('Item deleted permanently');
        return true;
      },
      'Failed to delete item permanently',
      setDeletingItems
    );
  }, [withOptimisticUpdate]);

  // Hide entire job from workspace
  const hideJobFromWorkspace = useCallback(async (jobId: string) => {
    return withOptimisticUpdate(
      jobId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('workspace_items')
          .update({ status: 'hidden' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success('Job hidden from workspace');
        return true;
      },
      'Failed to hide job from workspace',
      setDeletingJobs
    );
  }, [withOptimisticUpdate]);

  // Delete entire job permanently
  const deleteJobPermanently = useCallback(async (jobId: string) => {
    return withOptimisticUpdate(
      jobId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get all workspace items for this job
        const { data: workspaceItems, error: fetchError } = await supabase
          .from('workspace_items')
          .select('id, content_type')
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        // Delete workspace items
        const { error: workspaceError } = await supabase
          .from('workspace_items')
          .delete()
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        if (workspaceError) throw workspaceError;

        // Delete from content tables
        for (const item of workspaceItems || []) {
          const table = item.content_type === 'video' ? 'videos' : 'images';
          await supabase
            .from(table)
            .delete()
            .eq('id', item.id)
            .eq('user_id', user.id);
        }

        // Delete job record
        const { error: jobError } = await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId)
          .eq('user_id', user.id);

        if (jobError) throw jobError;

        toast.success('Job deleted permanently');
        return true;
      },
      'Failed to delete job permanently',
      setDeletingJobs
    );
  }, [withOptimisticUpdate]);

  // Clear all workspace (hide all items)
  const clearWorkspace = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('workspace_items')
        .update({ status: 'hidden' })
        .eq('user_id', user.id)
        .eq('status', 'generated');

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['workspace-items-all'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      queryClient.invalidateQueries({ queryKey: ['media-grid-workspace-assets'] });

      toast.success('Workspace cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear workspace:', error);
      toast.error('Failed to clear workspace');
      return false;
    }
  }, [queryClient]);

  return {
    deletingItems,
    deletingJobs,
    hideFromWorkspace,
    deleteItemPermanently,
    hideJobFromWorkspace,
    deleteJobPermanently,
    clearWorkspace,
  };
};