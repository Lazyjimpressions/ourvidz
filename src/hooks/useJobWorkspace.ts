import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AssetService } from '@/lib/services/AssetService';
import { useToast } from '@/hooks/use-toast';

export interface JobWorkspaceItem {
  id: string;
  url?: string;
  prompt: string;
  type: 'image' | 'video';
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  thumbnailUrl?: string;
  enhancedPrompt?: string;
  seed?: number;
  jobId?: string;
  sessionId?: string;
  status: 'generated' | 'saved' | 'deleted';
}

export interface JobWorkspaceJob {
  id: string;
  sessionId: string;
  prompt: string;
  items: JobWorkspaceItem[];
  createdAt: Date;
  type: 'image' | 'video';
  status: 'pending' | 'ready' | 'imported';
}

export const useJobWorkspace = (sessionId: string) => {
  const [jobs, setJobs] = useState<JobWorkspaceJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const { toast } = useToast();

  const loadJobs = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      // Query jobs by workspace_session_id
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          workspace_session_id,
          original_prompt,
          enhanced_prompt,
          job_type,
          status,
          created_at,
          image_id,
          video_id,
          quality,
          model_type
        `)
        .eq('workspace_session_id', sessionId)
        .eq('destination', 'workspace')
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Failed to load jobs:', jobsError);
        return;
      }

      if (!jobsData || jobsData.length === 0) {
        setJobs([]);
        return;
      }

      // Get unique asset IDs to fetch signed URLs
      const imageIds = jobsData.filter(job => job.image_id).map(job => job.image_id!);
      const videoIds = jobsData.filter(job => job.video_id).map(job => job.video_id!);

      // Use AssetService to get signed URLs
      const [imageAssets, videoAssets] = await Promise.all([
        imageIds.length > 0 ? AssetService.getAssetsByIds(imageIds) : Promise.resolve([]),
        videoIds.length > 0 ? AssetService.getAssetsByIds(videoIds) : Promise.resolve([])
      ]);

      // Create asset lookup maps
      const imageMap = new Map(imageAssets.map(asset => [asset.id, asset]));
      const videoMap = new Map(videoAssets.map(asset => [asset.id, asset]));

      // Transform jobs to workspace format
      const workspaceJobs: JobWorkspaceJob[] = jobsData.map(job => {
        const isVideo = job.job_type?.includes('video');
        const assetId = isVideo ? job.video_id : job.image_id;
        const asset = isVideo ? videoMap.get(assetId!) : imageMap.get(assetId!);

        const workspaceItem: JobWorkspaceItem = {
          id: assetId || job.id,
          url: asset?.url,
          prompt: job.original_prompt || '',
          type: isVideo ? 'video' : 'image',
          timestamp: new Date(job.created_at),
          quality: (job.quality as 'fast' | 'high') || 'fast',
          modelType: job.model_type,
          thumbnailUrl: asset?.thumbnailUrl,
          enhancedPrompt: job.enhanced_prompt,
          seed: undefined, // Will need to get from metadata if needed
          jobId: job.id,
          sessionId: job.workspace_session_id,
          status: 'generated'
        };

        return {
          id: job.id,
          sessionId: job.workspace_session_id || '',
          prompt: job.original_prompt || 'Untitled',
          items: [workspaceItem],
          createdAt: new Date(job.created_at),
          type: isVideo ? 'video' : 'image',
          status: asset?.url ? 'ready' : 'pending'
        };
      });

      setJobs(workspaceJobs);
      
      // Set first job as active if none selected
      if (!activeJobId && workspaceJobs.length > 0) {
        setActiveJobId(workspaceJobs[0].id);
      }

    } catch (error) {
      console.error('Failed to load workspace jobs:', error);
      toast({
        title: "Failed to load workspace",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectJob = (jobId: string) => {
    setActiveJobId(jobId);
  };

  const deleteJob = async (jobId: string) => {
    try {
      // Remove job from session (update workspace_session_id to null)
      const { error } = await supabase
        .from('jobs')
        .update({ workspace_session_id: null })
        .eq('id', jobId);

      if (error) throw error;

      // Update local state
      setJobs(prev => prev.filter(job => job.id !== jobId));
      
      if (activeJobId === jobId) {
        const remainingJobs = jobs.filter(job => job.id !== jobId);
        setActiveJobId(remainingJobs.length > 0 ? remainingJobs[0].id : undefined);
      }

      toast({
        title: "Job removed from workspace",
        description: "The job has been removed but the generated content remains in your library",
      });
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast({
        title: "Failed to remove job",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const saveJob = async (jobId: string) => {
    // No-op since images are already in library
    toast({
      title: "Already saved",
      description: "Generated content is automatically saved to your library",
    });
  };

  const useJobAsReference = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || job.type !== 'image' || !job.items[0]?.url) return;

    // Return the first image URL for use as reference
    return job.items[0].url;
  };

  useEffect(() => {
    loadJobs();
  }, [sessionId]);

  // Set up real-time subscription for new jobs
  useEffect(() => {
    if (!sessionId) return;

    const subscription = supabase
      .channel(`workspace-jobs-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `workspace_session_id=eq.${sessionId}`,
        },
        () => {
          console.log('Job update detected, reloading...');
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  return {
    jobs,
    loading,
    activeJobId,
    selectJob,
    deleteJob,
    saveJob,
    useJobAsReference,
    refresh: loadJobs,
  };
};