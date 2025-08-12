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

  // Clear item from workspace (library-first approach)
  const clearFromWorkspace = useCallback(async (itemId: string, itemType: 'image' | 'video') => {
    return withOptimisticUpdate(
      itemId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Update the correct table based on item type with dismissed flag
        const table = itemType === 'video' ? 'videos' : 'images';
        const { data: currentItem } = await supabase
          .from(table)
          .select('metadata')
          .eq('id', itemId)
          .eq('user_id', user.id)
          .single();

        const currentMetadata = (currentItem?.metadata as Record<string, any>) || {};
        
        const { error } = await supabase
          .from(table)
          .update({ 
            metadata: {
              ...currentMetadata,
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

  // Clear entire job from workspace (library-first approach)
  const clearJobFromWorkspace = useCallback(async (jobId: string) => {
    return withOptimisticUpdate(
      jobId,
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get all items for this job from both tables
        const { data: images } = await supabase
          .from('images')
          .select('id, metadata')
          .eq('user_id', user.id)
          .eq('metadata->>job_id', jobId);

        const { data: videos } = await supabase
          .from('videos')
          .select('id, metadata')
          .eq('user_id', user.id)
          .eq('metadata->>job_id', jobId);

        // Update images with dismissed flag
        if (images) {
          for (const image of images) {
            const currentMetadata = (image.metadata as Record<string, any>) || {};
            await supabase
              .from('images')
              .update({ 
                metadata: {
                  ...currentMetadata,
                  workspace_dismissed: true,
                  dismissed_at: new Date().toISOString()
                }
              })
              .eq('id', image.id);
          }
        }

        // Update videos with dismissed flag
        if (videos) {
          for (const video of videos) {
            const currentMetadata = (video.metadata as Record<string, any>) || {};
            await supabase
              .from('videos')
              .update({ 
                metadata: {
                  ...currentMetadata,
                  workspace_dismissed: true,
                  dismissed_at: new Date().toISOString()
                }
              })
              .eq('id', video.id);
          }
        }

        const totalCleared = (images?.length || 0) + (videos?.length || 0);
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

  // Clear all workspace (hide all items) - Fixed to use correct data model
  const clearWorkspace = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🧹 OPTIMIZED: Clearing workspace via metadata.workspace_dismissed');
      
      // Get today's start (UTC-based to match database)
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      
      // Update images with dismissed flag
      const { data: images } = await supabase
        .from('images')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString());

      // Update images with dismissed flag (individual updates for simplicity)
      if (images && images.length > 0) {
        for (const image of images) {
          const currentMetadata = (image.metadata as Record<string, any>) || {};
          await supabase
            .from('images')
            .update({ 
              metadata: {
                ...currentMetadata,
                workspace_dismissed: true,
                dismissed_at: new Date().toISOString()
              }
            })
            .eq('id', image.id)
            .eq('user_id', user.id);
        }
        console.log(`✅ Dismissed ${images.length} images from workspace`);
      }

      // Update videos with dismissed flag
      const { data: videos } = await supabase
        .from('videos')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString());

      // Update videos with dismissed flag (individual updates for simplicity)
      if (videos && videos.length > 0) {
        for (const video of videos) {
          const currentMetadata = (video.metadata as Record<string, any>) || {};
          await supabase
            .from('videos')
            .update({ 
              metadata: {
                ...currentMetadata,
                workspace_dismissed: true,
                dismissed_at: new Date().toISOString()
              }
            })
            .eq('id', video.id)
            .eq('user_id', user.id);
        }
        console.log(`✅ Dismissed ${videos.length} videos from workspace`);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });

      toast.success('Workspace cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear workspace:', error);
      toast.error('Failed to clear workspace');
      return false;
    }
  }, [queryClient]);

  // Delete all workspace items permanently
  const deleteAllWorkspace = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🗑️ OPTIMIZED: Deleting all workspace items permanently');
      
      // Get today's start (UTC-based to match database)
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      
      // Get today's items to delete
      const { data: images } = await supabase
        .from('images')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString());

      const { data: videos } = await supabase
        .from('videos')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString());

      // Delete images permanently
      if (images && images.length > 0) {
        const { error: deleteImagesError } = await supabase
          .from('images')
          .delete()
          .in('id', images.map(img => img.id))
          .eq('user_id', user.id);
        
        if (deleteImagesError) throw deleteImagesError;
        console.log(`✅ Deleted ${images.length} images permanently`);
      }

      // Delete videos permanently
      if (videos && videos.length > 0) {
        const { error: deleteVideosError } = await supabase
          .from('videos')
          .delete()
          .in('id', videos.map(vid => vid.id))
          .eq('user_id', user.id);
        
        if (deleteVideosError) throw deleteVideosError;
        console.log(`✅ Deleted ${videos.length} videos permanently`);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });

      const totalDeleted = (images?.length || 0) + (videos?.length || 0);
      toast.success(`${totalDeleted} items deleted permanently`);
      return true;
    } catch (error) {
      console.error('Failed to delete all workspace items:', error);
      toast.error('Failed to delete all items');
      return false;
    }
  }, [queryClient]);

  return {
    deletingItems,
    deletingJobs,
    clearFromWorkspace,
    deleteItemPermanently,
    clearJobFromWorkspace,
    deleteJobPermanently,
    clearWorkspace,
    deleteAllWorkspace,
  };
};