
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeWorkspace } from '@/hooks/useRealtimeWorkspace';

/**
 * Optimized workspace hook with proper loading states and error handling
 * Implements optimistic updates for better UX
 */
export const useOptimizedWorkspace = () => {
  const queryClient = useQueryClient();
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());

  // Use the realtime workspace for actual data
  const {
    tiles: assets,
    isLoading,
    deleteTile,
    addToWorkspace,
    clearWorkspace: clearWorkspaceRealtime
  } = useRealtimeWorkspace();

  // Convert tiles to assets format for compatibility
  const formattedAssets = assets.map(tile => ({
    id: tile.id,
    url: tile.url || '',
    type: tile.type,
    prompt: tile.prompt,
    created_at: tile.timestamp.toISOString(),
    metadata: tile.metadata
  }));

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

  // Simple delete asset function
  const deleteAsset = useCallback(async (itemId: string) => {
    const tile = assets.find(t => t.id === itemId);
    if (tile) {
      await deleteTile(tile);
    }
  }, [assets, deleteTile]);

  // Delete multiple assets
  const deleteMultipleAssets = useCallback(async (itemIds: string[]) => {
    for (const itemId of itemIds) {
      await deleteAsset(itemId);
    }
  }, [deleteAsset]);

  // Mock functions for compatibility
  const loadMore = useCallback(() => {
    // This would be implemented with pagination
    console.log('LoadMore not implemented yet');
  }, []);

  const refreshAssets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
  }, [queryClient]);

  // Clear item from workspace (library-first approach)
  const clearFromWorkspace = useCallback(async (itemId: string, itemType: 'image' | 'video') => {
    return withOptimisticUpdate(
      itemId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Update the correct workspace asset with dismissed flag
        const { data: currentItem } = await supabase
          .from('workspace_assets')
          .select('generation_settings')
          .eq('id', itemId)
          .eq('user_id', user.id)
          .maybeSingle();

        const currentSettings = (currentItem?.generation_settings as Record<string, any>) || {};
        
        const { error } = await supabase
          .from('workspace_assets')
          .update({ 
            generation_settings: {
              ...currentSettings,
              workspace_dismissed: true,
              dismissed_at: new Date().toISOString()
            }
          })
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success('Item cleared from workspace');
        return true;
      },
      'Failed to clear item from workspace',
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

        // Delete from workspace_assets only (simplified schema - no separate content tables)
        const { error: workspaceError } = await supabase
          .from('workspace_assets')
          .delete()
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (workspaceError) throw workspaceError;

        toast.success('Item deleted permanently');
        return true;
      },
      'Failed to delete item permanently',
      setDeletingItems
    );
  }, [withOptimisticUpdate]);

  // Clear entire job from workspace (library-first approach)
  const clearJobFromWorkspace = useCallback(async (jobId: string) => {
    return withOptimisticUpdate(
      jobId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get all workspace assets for this job
        const { data: assets } = await supabase
          .from('workspace_assets')
          .select('id, generation_settings')
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        // Update assets with dismissed flag
        if (assets) {
          for (const asset of assets) {
            const currentSettings = (asset.generation_settings as Record<string, any>) || {};
            await supabase
              .from('workspace_assets')
              .update({ 
                generation_settings: {
                  ...currentSettings,
                  workspace_dismissed: true,
                  dismissed_at: new Date().toISOString()
                }
              })
              .eq('id', asset.id);
          }
        }

        const totalCleared = assets?.length || 0;
        toast.success(`Job cleared from workspace (${totalCleared} items)`);
        return true;
      },
      'Failed to clear job from workspace',
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

        // Validate job ID - reject synthetic "single-" IDs
        if (jobId.startsWith('single-')) {
          throw new Error('Cannot delete synthetic job ID. Use individual item deletion instead.');
        }

        // Get all workspace assets for this job
        const { data: assets } = await supabase
          .from('workspace_assets')
          .select('id, asset_type')
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        // Delete workspace assets
        if (assets && assets.length > 0) {
          const { error: workspaceError } = await supabase
            .from('workspace_assets')
            .delete()
            .eq('job_id', jobId)
            .eq('user_id', user.id);
          if (workspaceError) throw workspaceError;
        }

        // Delete job record (handle case where job might not exist)
        const { error: jobError } = await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId)
          .eq('user_id', user.id);

        // Don't throw error if job doesn't exist - it might have been a failed job
        if (jobError && !jobError.message.includes('No rows')) {
          console.warn('Job deletion warning:', jobError);
        }

        const totalDeleted = assets?.length || 0;
        toast.success(`Job deleted permanently (${totalDeleted} items)`);
        return true;
      },
      'Failed to delete job permanently',
      setDeletingJobs
    );
  }, [withOptimisticUpdate]);

  // Clear all workspace (hide all items) - Fixed to remove date filter bug
  const clearWorkspace = useCallback(async () => {
    await clearWorkspaceRealtime();
  }, [clearWorkspaceRealtime]);

  // Delete all workspace items permanently
  const deleteAllWorkspace = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🗑️ OPTIMIZED: Deleting all workspace items permanently');
      
      // Get ALL workspace assets for permanent deletion
      const { data: assets } = await supabase
        .from('workspace_assets')
        .select('id')
        .eq('user_id', user.id);

      console.log(`Found ${assets?.length || 0} workspace assets to delete`);

      // Delete workspace assets permanently
      if (assets && assets.length > 0) {
        const { error: deleteAssetsError } = await supabase
          .from('workspace_assets')
          .delete()
          .in('id', assets.map(asset => asset.id))
          .eq('user_id', user.id);
        
        if (deleteAssetsError) throw deleteAssetsError;
        console.log(`✅ Deleted ${assets.length} assets permanently`);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });

      const totalDeleted = assets?.length || 0;
      toast.success(`${totalDeleted} items deleted permanently`);
      return true;
    } catch (error) {
      console.error('Failed to delete all workspace items:', error);
      toast.error('Failed to delete all items');
      return false;
    }
  }, [queryClient]);

  return {
    // Data properties
    assets: formattedAssets,
    isLoading,
    loadMore,
    hasMore: false, // Simplified for now
    refreshAssets,
    deleteAsset,
    deleteMultipleAssets,
    
    // State properties
    deletingItems,
    deletingJobs,
    
    // Action methods
    clearFromWorkspace,
    deleteItemPermanently,
    clearJobFromWorkspace,
    deleteJobPermanently,
    clearWorkspace,
    deleteAllWorkspace,
  };
};
