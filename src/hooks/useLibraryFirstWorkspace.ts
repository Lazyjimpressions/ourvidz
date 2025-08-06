import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { useToast } from '@/hooks/use-toast';
import { GenerationFormat } from '@/types/generation';

// LIBRARY-FIRST: Simplified workspace state using library assets
export interface LibraryFirstWorkspaceState {
  // Core State
  mode: 'image' | 'video';
  prompt: string;
  referenceImage: File | null;
  referenceStrength: number;
  contentType: 'sfw' | 'nsfw';
  quality: 'fast' | 'high';
  
  // Video-specific State
  beginningRefImage: File | null;
  endingRefImage: File | null;
  videoDuration: number;
  motionIntensity: number;
  soundEnabled: boolean;
  
  // Control Parameters
  aspectRatio: '16:9' | '1:1' | '9:16';
  shotType: 'wide' | 'medium' | 'close';
  cameraAngle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye';
  style: string;
  styleRef: File | null;
  
  // UI State
  isGenerating: boolean;
  workspaceAssets: UnifiedAsset[];
  activeJobId: string | null;
  lightboxIndex: number | null;
  workspaceCleared: boolean;
  
  // Enhancement Model Selection
  enhancementModel: 'qwen_base' | 'qwen_instruct';
}

export interface LibraryFirstWorkspaceActions {
  // Actions
  updateMode: (newMode: 'image' | 'video') => void;
  setPrompt: (prompt: string) => void;
  setReferenceImage: (image: File | null) => void;
  setReferenceStrength: (strength: number) => void;
  setContentType: (type: 'sfw' | 'nsfw') => void;
  setQuality: (quality: 'fast' | 'high') => void;
  setBeginningRefImage: (image: File | null) => void;
  setEndingRefImage: (image: File | null) => void;
  setVideoDuration: (duration: number) => void;
  setMotionIntensity: (intensity: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAspectRatio: (ratio: '16:9' | '1:1' | '9:16') => void;
  setShotType: (type: 'wide' | 'medium' | 'close') => void;
  setCameraAngle: (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => void;
  setStyle: (style: string) => void;
  setStyleRef: (ref: File | null) => void;
  setEnhancementModel: (model: 'qwen_base' | 'qwen_instruct') => void;
  generate: (referenceImageUrl?: string | null, beginningRefImageUrl?: string | null, endingRefImageUrl?: string | null, seed?: number | null) => Promise<void>;
  clearWorkspace: () => Promise<void>;
  deleteItem: (id: string, type: 'image' | 'video') => Promise<void>;
  dismissItem: (id: string, type: 'image' | 'video') => Promise<void>;
  setLightboxIndex: (index: number | null) => void;
  // Job-level actions (simplified)
  selectJob: (jobId: string) => void;
  deleteJob: (jobId: string) => Promise<void>;
  dismissJob: (jobId: string) => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  useJobAsReference: (jobId: string) => void;
  // Helper functions
  getJobStats: () => { totalJobs: number; totalItems: number; readyJobs: number; pendingJobs: number; hasActiveJob: boolean };
  getActiveJob: () => any | null;
  getJobById: (jobId: string) => any | null;
}

export const useLibraryFirstWorkspace = (): LibraryFirstWorkspaceState & LibraryFirstWorkspaceActions => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Core State
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(0.8);
  const [contentType, setContentType] = useState<'sfw' | 'nsfw'>('sfw');
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  
  // Video-specific State
  const [beginningRefImage, setBeginningRefImage] = useState<File | null>(null);
  const [endingRefImage, setEndingRefImage] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(5);
  const [motionIntensity, setMotionIntensity] = useState(0.5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Control Parameters
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [shotType, setShotType] = useState<'wide' | 'medium' | 'close'>('wide');
  const [cameraAngle, setCameraAngle] = useState<'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye'>('none');
  const [style, setStyle] = useState('');
  const [styleRef, setStyleRef] = useState<File | null>(null);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [workspaceCleared, setWorkspaceCleared] = useState(false);
  
  // Enhancement Model Selection
  const [enhancementModel, setEnhancementModel] = useState<'qwen_base' | 'qwen_instruct'>('qwen_instruct');

  // LIBRARY-FIRST: Query library assets for workspace view (session only)
  const { data: workspaceAssets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['library-workspace-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      console.log('📚 LIBRARY-FIRST: Fetching workspace assets directly from database');
      
      // Get today's date for session filtering (UTC timezone)
      const now = new Date();
      const startOfDay = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z');
      
      console.log('📅 Session filtering details:', {
        startOfDay: startOfDay.toISOString(),
        localStartOfDay: startOfDay.toLocaleString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentTime: now.toLocaleString()
      });
      
      // Direct database queries (same as LibraryV2)
      const imageQuery = supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .not('metadata->workspace_dismissed', 'eq', true)
        .order('created_at', { ascending: false });
        
      const videoQuery = supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .not('metadata->workspace_dismissed', 'eq', true)
        .order('created_at', { ascending: false });
      
      const [imageResult, videoResult] = await Promise.all([imageQuery, videoQuery]);
      
      if (imageResult.error) throw imageResult.error;
      if (videoResult.error) throw videoResult.error;
      
      console.log('📊 Raw database results:', {
        images: imageResult.data?.length || 0,
        videos: videoResult.data?.length || 0
      });
      
      // Process images (following LibraryV2 pattern)
      const allAssets: UnifiedAsset[] = [];
      
      if (imageResult.data) {
        for (const image of imageResult.data) {
          const metadata = image.metadata as any;
          const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
          const modelType = isSDXL ? 'SDXL' : 'WAN';
          
          // Handle SDXL multiple images
          if (isSDXL && image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 1) {
            // Create individual assets for each SDXL image
            image.image_urls.forEach((url: string, index: number) => {
              allAssets.push({
                id: `${image.id}_${index}`,
                type: 'image',
                title: image.title || undefined,
                prompt: image.prompt,
                enhancedPrompt: image.enhanced_prompt || undefined,
                status: image.status,
                quality: image.quality || undefined,
                format: image.format || undefined,
                createdAt: new Date(image.created_at),
                projectId: image.project_id || undefined,
                modelType,
                isSDXL: true,
                metadata: {
                  ...metadata,
                  image_url: url,
                  sdxlIndex: index,
                  originalAssetId: image.id
                },
                url: url, // Direct URL from database
                thumbnailUrl: url,
                error: undefined
              });
            });
          } else {
            // Single image (WAN or SDXL with single image)
            let imageUrl = null;
            if (image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 0) {
              imageUrl = image.image_urls[0];
            } else if (image.image_url) {
              imageUrl = image.image_url;
            }
            
            allAssets.push({
              id: image.id,
              type: 'image',
              title: image.title || undefined,
              prompt: image.prompt,
              enhancedPrompt: image.enhanced_prompt || undefined,
              status: image.status,
              quality: image.quality || undefined,
              format: image.format || undefined,
              createdAt: new Date(image.created_at),
              projectId: image.project_id || undefined,
              modelType,
              isSDXL,
              metadata: {
                ...metadata,
                image_url: imageUrl
              },
              url: imageUrl,
              thumbnailUrl: imageUrl,
              error: undefined
            });
          }
        }
      }
      
      // Process videos
      if (videoResult.data) {
        for (const video of videoResult.data) {
          const metadata = video.metadata as any;
          const isEnhanced = metadata?.enhanced || metadata?.model_type?.includes('7b');
          
          allAssets.push({
            id: video.id,
            type: 'video',
            title: video.title || undefined,
            prompt: (video as any).prompt || '',
            enhancedPrompt: video.enhanced_prompt || undefined,
            status: video.status,
            quality: (video as any).quality || undefined,
            format: video.format || undefined,
            createdAt: new Date(video.created_at),
            projectId: video.project_id || undefined,
            duration: video.duration || undefined,
            resolution: video.resolution || undefined,
            modelType: isEnhanced ? 'Enhanced' : 'Standard',
            metadata: {
              ...metadata,
              video_url: video.video_url
            },
            url: video.video_url,
            thumbnailUrl: video.video_url,
            error: undefined
          });
        }
      }
      
      console.log('📚 LIBRARY-FIRST: Direct database assets loaded:', {
        total: allAssets.length,
        images: allAssets.filter(a => a.type === 'image').length,
        videos: allAssets.filter(a => a.type === 'video').length,
        completed: allAssets.filter(a => a.status === 'completed').length,
        generating: allAssets.filter(a => a.status === 'generating').length,
        failed: allAssets.filter(a => a.status === 'failed').length,
        withUrls: allAssets.filter(a => a.url).length
      });
      
      return allAssets;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });

  // Helper function to get today's start (UTC-based)
  const getTodayStart = () => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return today.toISOString();
  };

  // LIBRARY-FIRST: Simplified real-time subscription to library tables
  useEffect(() => {
    const setupLibrarySubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('📡 LIBRARY-FIRST: Setting up library subscription for workspace');

      // Single subscription to library tables
      const channel = supabase
        .channel('library-workspace-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'images',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const image = payload.new as any;
          if (image.status === 'completed' && image.image_url) {
            console.log('📡 LIBRARY: Image completed, invalidating workspace');
            queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const video = payload.new as any;
          if (video.status === 'completed' && video.video_url) {
            console.log('📡 LIBRARY: Video completed, invalidating workspace');
            queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
          }
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    };

    setupLibrarySubscription();
  }, [queryClient]);

  // LIBRARY-FIRST: Listen for library events
  useEffect(() => {
    const handleLibraryAssetsReady = (event: CustomEvent) => {
      const { assets, sessionOnly } = event.detail;
      
      // Only process session assets for workspace
      if (sessionOnly) {
        console.log('🎉 WORKSPACE: Received library assets:', assets.length);
        
        // Reset cleared state when new content arrives
        setWorkspaceCleared(false);
        
        // Refresh workspace data
        queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
        
        // Show toast notification
        toast({
          title: "New Content Ready",
          description: `${assets.length} new ${assets[0]?.type}${assets.length > 1 ? 's' : ''} generated`,
        });
      }
    };

    const handleGenerationCompleted = (event: CustomEvent) => {
      const { assetId, type, jobId } = event.detail;
      
      console.log('🎉 WORKSPACE: Received generation completed event:', { assetId, type, jobId });
      
      // Reset cleared state when new content arrives
      setWorkspaceCleared(false);
      
      // Refresh workspace data to show new content
      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
      
      // Show toast notification
      toast({
        title: "New Content Ready",
        description: `New ${type} generated and added to workspace`,
      });
    };

    const handleGenerationBatchCompleted = (event: CustomEvent) => {
      const { assetIds, type, jobId, totalCompleted, totalExpected } = event.detail;
      
      console.log('🎉 WORKSPACE: Received generation batch completed event:', { 
        assetIds, type, jobId, totalCompleted, totalExpected 
      });
      
      // Reset cleared state when new content arrives
      setWorkspaceCleared(false);
      
      // Refresh workspace data to show new content
      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
      
      // Show toast notification
      toast({
        title: "New Content Ready",
        description: `${totalCompleted} new ${type.replace('-batch', '')}${totalCompleted > 1 ? 's' : ''} generated`,
      });
    };

    // Listen for both event types
    window.addEventListener('library-assets-ready', handleLibraryAssetsReady as EventListener);
    window.addEventListener('generation-completed', handleGenerationCompleted as EventListener);
    window.addEventListener('generation-batch-completed', handleGenerationBatchCompleted as EventListener);
    
    return () => {
      window.removeEventListener('library-assets-ready', handleLibraryAssetsReady as EventListener);
      window.removeEventListener('generation-completed', handleGenerationCompleted as EventListener);
      window.removeEventListener('generation-batch-completed', handleGenerationBatchCompleted as EventListener);
    };
  }, [queryClient, toast]);

  // Generate content (simplified - always goes to library)
  const generate = useCallback(async (
    referenceImageUrl?: string | null,
    beginningRefImageUrl?: string | null, 
    endingRefImageUrl?: string | null,
    seed?: number | null
  ) => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt to generate content",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Upload reference images if provided
      const uploadReferenceImage = async (file: File): Promise<string> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const fileName = `reference_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('reference-images')
          .upload(`${user.id}/${fileName}`, file);

        if (error) throw error;
        return data.path;
      };

      // LIBRARY-FIRST: Create generation request (always goes to library)
      const generationRequest = {
        format: (mode === 'image' ? 'sdxl_image_high' : 'video_high') as GenerationFormat,
        prompt: prompt.trim(),
        metadata: {
          num_images: mode === 'image' ? 3 : 1,
          // LIBRARY-FIRST: No destination needed - always goes to library tables
          // This ensures content appears in both library and workspace views
          user_requested_enhancement: true,
          // Reference image data
          ...((referenceImageUrl || referenceImage) && {
            reference_image: true,
            reference_strength: referenceStrength,
            reference_type: 'character' as const
          }),
          // Seed for character reproduction
          ...(seed && {
            seed: seed
          }),
          // Video-specific parameters
          ...(mode === 'video' && {
            duration: videoDuration,
            motion_intensity: motionIntensity,
            sound_enabled: soundEnabled
          }),
          // Control parameters
          aspect_ratio: aspectRatio,
          shot_type: shotType,
          camera_angle: cameraAngle,
          style: style,
          enhancement_model: enhancementModel,
          contentType: contentType
        },
        // Reference image URLs
        ...(referenceImageUrl ? 
          { referenceImageUrl } : 
          referenceImage ? { referenceImageUrl: await uploadReferenceImage(referenceImage) } : {}
        ),
        ...(mode === 'video' && beginningRefImageUrl ? 
          { startReferenceImageUrl: beginningRefImageUrl } :
          mode === 'video' && beginningRefImage ? { startReferenceImageUrl: await uploadReferenceImage(beginningRefImage) } : {}
        ),
        ...(mode === 'video' && endingRefImageUrl ? 
          { endReferenceImageUrl: endingRefImageUrl } :
          mode === 'video' && endingRefImage ? { endReferenceImageUrl: await uploadReferenceImage(endingRefImage) } : {}
        )
      };
      
      // Use existing GenerationService (simplified)
      const { GenerationService } = await import('@/lib/services/GenerationService');
      const result = await GenerationService.queueGeneration(generationRequest);
      
      if (result) {
        toast({
          title: "Generation Started",
          description: `Your ${mode} is being generated`,
        });
      } else {
        throw new Error('Failed to start generation');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    mode,
    contentType,
    quality,
    referenceImage,
    referenceStrength,
    videoDuration,
    motionIntensity,
    soundEnabled,
    beginningRefImage,
    endingRefImage,
    aspectRatio,
    shotType,
    cameraAngle,
    style,
    styleRef,
    enhancementModel,
    isGenerating,
    toast
  ]);

  // LIBRARY-FIRST: Workspace dismiss = hide from workspace view (add workspace_dismissed flag)
  const dismissItem = useCallback(async (id: string, type: 'image' | 'video') => {
    try {
      console.log('🚫 WORKSPACE: Dismissing item:', { id, type });
      
      // Add dismissed flag to library item instead of separate table
      const { data: currentItem } = await supabase
        .from(type === 'image' ? 'images' : 'videos')
        .select('metadata')
        .eq('id', id)
        .single();
      
      if (currentItem) {
        const currentMetadata = currentItem.metadata as Record<string, any> || {};
        const updatedMetadata = {
          ...currentMetadata,
          workspace_dismissed: true,
          dismissed_at: new Date().toISOString()
        };
        
        await supabase
          .from(type === 'image' ? 'images' : 'videos')
          .update({ metadata: updatedMetadata })
          .eq('id', id);
        
        queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
        
        toast({
          title: "Item Dismissed",
          description: "Item hidden from workspace view",
        });
      }
    } catch (error) {
      console.error('❌ WORKSPACE: Dismiss failed:', error);
      toast({
        title: "Dismiss Failed",
        description: "Failed to dismiss item",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  // LIBRARY-FIRST: Workspace delete = delete from library (existing AssetService.deleteAsset)
  const deleteItem = useCallback(async (id: string, type: 'image' | 'video') => {
    try {
      console.log('🗑️ WORKSPACE: Deleting item:', { id, type });
      
      await AssetService.deleteAsset(id, type);
      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
      
      toast({
        title: "Item Deleted",
        description: "Item permanently removed",
      });
    } catch (error) {
      console.error('❌ WORKSPACE: Delete failed:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  // LIBRARY-FIRST: Clear workspace = dismiss all today's items
  const clearWorkspace = useCallback(async () => {
    try {
      console.log('🧹 WORKSPACE: Clearing workspace');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Set workspace as cleared immediately for better UX
      setWorkspaceCleared(true);

      // Dismiss all today's items
      const todayStart = getTodayStart();
      
      // Get today's items and update them
      const { data: images } = await supabase
        .from('images')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', todayStart);

      const { data: videos } = await supabase
        .from('videos')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', todayStart);

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

      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
      
      toast({
        title: "Workspace Cleared",
        description: "All items dismissed from workspace",
      });
      
      console.log('✅ WORKSPACE: Successfully cleared workspace');
    } catch (error) {
      console.error('❌ WORKSPACE: Clear failed:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear workspace",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  // Simplified job management (group by job_id from metadata)
  const selectJob = useCallback((jobId: string) => {
    setActiveJobId(activeJobId === jobId ? null : jobId);
  }, [activeJobId]);

  const deleteJob = useCallback(async (jobId: string) => {
    // Find all items with this job_id and delete them
    const jobItems = workspaceAssets.filter(asset => 
      asset.metadata?.job_id === jobId
    );
    
    for (const item of jobItems) {
      await deleteItem(item.id, item.type);
    }
  }, [workspaceAssets, deleteItem]);

  const dismissJob = useCallback(async (jobId: string) => {
    // Find all items with this job_id and dismiss them
    const jobItems = workspaceAssets.filter(asset => 
      asset.metadata?.job_id === jobId
    );
    
    for (const item of jobItems) {
      await dismissItem(item.id, item.type);
    }
  }, [workspaceAssets, dismissItem]);

  const saveJob = useCallback(async (jobId: string) => {
    // Items are already in library, so "save" just removes dismissed flag
    const jobItems = workspaceAssets.filter(asset => 
      asset.metadata?.job_id === jobId
    );
    
    for (const item of jobItems) {
      const { data: currentItem } = await supabase
        .from(item.type === 'image' ? 'images' : 'videos')
        .select('metadata')
        .eq('id', item.id)
        .single();
      
      if (currentItem?.metadata) {
        const currentMetadata = currentItem.metadata as Record<string, any> || {};
        if (currentMetadata.workspace_dismissed) {
          const updatedMetadata = {
            ...currentMetadata,
            workspace_dismissed: false
          };
        
          await supabase
            .from(item.type === 'image' ? 'images' : 'videos')
            .update({ metadata: updatedMetadata })
            .eq('id', item.id);
        }
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
  }, [workspaceAssets, queryClient]);

  const useJobAsReference = useCallback((jobId: string) => {
    // TODO: Implement job as reference functionality
    console.log('TODO: Set reference image from job:', jobId);
  }, []);

  // Helper functions
  const getJobStats = useCallback(() => {
    const jobs = new Map<string, UnifiedAsset[]>();
    
    workspaceAssets.forEach(asset => {
      const jobId = asset.metadata?.job_id || 'unknown';
      if (!jobs.has(jobId)) {
        jobs.set(jobId, []);
      }
      jobs.get(jobId)!.push(asset);
    });
    
    const totalJobs = jobs.size;
    const totalItems = workspaceAssets.length;
    const readyJobs = Array.from(jobs.values()).filter(items => 
      items.every(item => item.status === 'completed' && item.url)
    ).length;
    const pendingJobs = totalJobs - readyJobs;
    const hasActiveJob = activeJobId !== null;
    
    return { totalJobs, totalItems, readyJobs, pendingJobs, hasActiveJob };
  }, [workspaceAssets, activeJobId]);

  const getActiveJob = useCallback(() => {
    if (!activeJobId) return null;
    return workspaceAssets.filter(asset => asset.metadata?.job_id === activeJobId);
  }, [workspaceAssets, activeJobId]);

  const getJobById = useCallback((jobId: string) => {
    return workspaceAssets.filter(asset => asset.metadata?.job_id === jobId);
  }, [workspaceAssets]);

  return {
    // State
    mode,
    prompt,
    referenceImage,
    referenceStrength,
    contentType,
    quality,
    beginningRefImage,
    endingRefImage,
    videoDuration,
    motionIntensity,
    soundEnabled,
    aspectRatio,
    shotType,
    cameraAngle,
    style,
    styleRef,
    isGenerating,
    workspaceAssets,
    activeJobId,
    lightboxIndex,
    enhancementModel,
    
    // Actions
    updateMode: setMode,
    setPrompt,
    setReferenceImage,
    setReferenceStrength,
    setContentType,
    setQuality,
    setBeginningRefImage,
    setEndingRefImage,
    setVideoDuration,
    setMotionIntensity,
    setSoundEnabled,
    setAspectRatio,
    setShotType,
    setCameraAngle,
    setStyle,
    setStyleRef,
    setEnhancementModel,
    generate,
    clearWorkspace,
    deleteItem,
    dismissItem,
    setLightboxIndex,
    workspaceCleared,
    selectJob,
    deleteJob,
    dismissJob,
    saveJob,
    useJobAsReference,
    getJobStats,
    getActiveJob,
    getJobById
  };
}; 