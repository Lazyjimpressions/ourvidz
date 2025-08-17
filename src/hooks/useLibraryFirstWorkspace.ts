import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';
import { useToast } from '@/hooks/use-toast';
import { useAssetsWithDebounce } from '@/hooks/useAssetsWithDebounce';
import { useOptimizedWorkspaceUrls } from '@/hooks/useOptimizedWorkspaceUrls';
import { GenerationFormat } from '@/types/generation';
import { ReferenceMetadata } from '@/types/workspace';
import { modifyOriginalPrompt } from '@/utils/promptModification';
import { uploadReferenceImage as uploadReferenceFile, getReferenceImageUrl } from '@/lib/storage';

// STAGING-FIRST: Simplified workspace state using staging assets
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
  referenceMetadata: ReferenceMetadata | null;
  workspaceCleared: boolean;
  signedUrls: Map<string, string>;
  isUrlLoading: boolean;
  // Exact copy workflow
  exactCopyMode: boolean;
  useOriginalParams: boolean;
  lockSeed: boolean;
  
  // Enhancement Model Selection
  enhancementModel: 'qwen_base' | 'qwen_instruct' | 'none';
  userPreferredModel: 'qwen_base' | 'qwen_instruct' | 'none';
  
  // Advanced SDXL Settings
  numImages: number;
  steps: number;
  guidanceScale: number;
  negativePrompt: string;
  compelEnabled: boolean;
  compelWeights: string;
  seed: number | null;
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
  setEnhancementModel: (model: 'qwen_base' | 'qwen_instruct' | 'none') => void;
  updateEnhancementModel: (model: 'qwen_base' | 'qwen_instruct' | 'none') => void;
  generate: (referenceImageUrl?: string | null, beginningRefImageUrl?: string | null, endingRefImageUrl?: string | null, seed?: number | null) => Promise<void>;
  clearWorkspace: () => Promise<void>;
  deleteAllWorkspace: () => Promise<void>;
  deleteItem: (id: string, type: 'image' | 'video') => Promise<void>;
  clearItem: (id: string, type: 'image' | 'video') => Promise<void>;
  setLightboxIndex: (index: number | null) => void;
  // Job-level actions (simplified)
  selectJob: (jobId: string) => void;
  deleteJob: (jobId: string) => Promise<void>;
  clearJob: (jobId: string) => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  useJobAsReference: (jobId: string) => void;
  applyAssetParamsFromItem: (item: UnifiedAsset) => void;
  setExactCopyMode: (on: boolean) => void;
  setUseOriginalParams: (on: boolean) => void;
  setLockSeed: (on: boolean) => void;
  setReferenceMetadata: (metadata: ReferenceMetadata | null) => void;
  // Advanced SDXL Settings
  setNumImages: (num: number) => void;
  setSteps: (steps: number) => void;
  setGuidanceScale: (scale: number) => void;
  setNegativePrompt: (prompt: string) => void;
  setCompelEnabled: (enabled: boolean) => void;
  setCompelWeights: (weights: string) => void;
  setSeed: (seed: number | null) => void;
  // Helper functions
  getJobStats: () => { totalJobs: number; totalItems: number; readyJobs: number; pendingJobs: number; hasActiveJob: boolean };
  getActiveJob: () => any | null;
  getJobById: (jobId: string) => any | null;
  // URL management
  registerAssetRef: (assetId: string, element: HTMLElement | null) => void;
  forceLoadAssetUrls: (assetId: string) => void;
  preloadNextAssets: (count?: number) => void;
  invalidateAssetCache: (assetId: string) => void;
  clearAllCache: () => void;
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
  const [cameraAngle, setCameraAngle] = useState<'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye'>('eye_level');
  const [style, setStyle] = useState('cinematic lighting, film grain, dramatic composition');
  const [styleRef, setStyleRef] = useState<File | null>(null);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [workspaceCleared, setWorkspaceCleared] = useState(false);
  // Optimistic placeholders for immediate UX feedback
  const [optimisticAssets, setOptimisticAssets] = useState<UnifiedAsset[]>([]);
  // Exact copy workflow state
  const [exactCopyMode, setExactCopyMode] = useState<boolean>(false);
  const [referenceMetadata, setReferenceMetadata] = useState<ReferenceMetadata | null>(null);
  const [useOriginalParams, setUseOriginalParams] = useState<boolean>(false);
  const [lockSeed, setLockSeed] = useState<boolean>(false);
  
  // Enhancement Model Selection
  const [enhancementModel, setEnhancementModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');
  const [userPreferredModel, setUserPreferredModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');

  // Advanced SDXL Settings
  const [numImages, setNumImages] = useState(3);
  const [steps, setSteps] = useState(25);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [compelEnabled, setCompelEnabled] = useState(false);
  const [compelWeights, setCompelWeights] = useState('');
  const [seed, setSeed] = useState<number | null>(null);

  // STAGING-FIRST: Use debounced asset loading to prevent infinite loops
  const { 
    data: workspaceAssets = [], 
    isLoading: assetsLoading, 
    error: assetsError,
    debouncedInvalidate,
    isCircuitOpen,
    retryCount 
  } = useAssetsWithDebounce({ 
    sessionOnly: true, 
    debounceMs: 2000,
    maxRetries: 3 
  });

  // Helper function to get today's start (UTC-based to match database)
  const getTodayStartUTC = () => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return today.toISOString();
  };

  // STAGING-FIRST: Subscribe to workspace_assets instead of images/videos
  useEffect(() => {
    let workspaceChannel: any = null;
    let isSubscribed = false;
    
    const setupWorkspaceSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return () => {};

      console.log('📡 STAGING-FIRST: Setting up workspace_assets subscription');

      // Prevent multiple subscriptions
      if (isSubscribed) {
        console.log('⚠️ Already subscribed, skipping setup');
        return () => {};
      }

      // Clean up any existing channels first
      if (workspaceChannel) {
        supabase.removeChannel(workspaceChannel);
        workspaceChannel = null;
      }

      let debounceTimer: NodeJS.Timeout | null = null;
      let pendingUpdates = new Set<string>();

      const localDebouncedInvalidate = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          if (pendingUpdates.size > 0) {
            console.log('🔄 DEBOUNCED: Processing', pendingUpdates.size, 'pending workspace updates');
            // Use the hook's debounced invalidate method
            if (debouncedInvalidate) {
              debouncedInvalidate();
            } else {
              queryClient.invalidateQueries({ queryKey: ['assets', true] });
            }
            pendingUpdates.clear();
          }
          debounceTimer = null;
        }, 2000); // 2 second debounce
      };

      try {
        // Subscribe to workspace_assets for INSERT events
        workspaceChannel = supabase
          .channel(`workspace-assets-realtime-${user.id}-${Date.now()}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'workspace_assets',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            const asset = payload.new as any;
            console.log('🎉 NEW WORKSPACE ASSET - Adding to debounced update queue:', asset);
            pendingUpdates.add(`workspace-asset-insert-${asset.id}`);
            localDebouncedInvalidate();
            // Remove any optimistic placeholders for this job
            if (asset.job_id) {
              setOptimisticAssets(prev => prev.filter(a => a.metadata?.job_id !== asset.job_id));
            }
            
            // Note: Legacy custom event dispatch removed - relying on Supabase Realtime only

            // Show immediate toast notification
            toast({
              title: `${asset.asset_type === 'image' ? 'Image' : 'Video'} Ready`,
              description: "New content generated and added to workspace",
            });
          })
          .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'workspace_assets',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            console.log('🗑️ WORKSPACE ASSET DELETED:', payload.old);
            localDebouncedInvalidate();
          });

        // Subscribe to the channel
        await workspaceChannel.subscribe();

        isSubscribed = true;
        console.log('✅ STAGING-FIRST: Successfully subscribed to workspace_assets');

      } catch (error) {
        console.error('❌ STAGING-FIRST: Failed to setup workspace subscription:', error);
        // Clean up on error
        if (workspaceChannel) {
          supabase.removeChannel(workspaceChannel);
          workspaceChannel = null;
        }
        isSubscribed = false;
      }

      return () => {
        console.log('📡 STAGING-FIRST: Cleaning up workspace subscription');
        isSubscribed = false;
        
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        if (workspaceChannel) {
          supabase.removeChannel(workspaceChannel);
          workspaceChannel = null;
        }
      };
    };

    let cleanup: () => void;
    setupWorkspaceSubscription().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [queryClient, debouncedInvalidate]);

  // OPTIMIZED: Use the new optimized URL loading hook
  const {
    assets: assetsWithUrls,
    signedUrls,
    loadingUrls,
    registerAssetRef,
    forceLoadAssetUrls,
    preloadNextAssets,
    invalidateAssetCache,
    clearAllCache,
    isLoading: isUrlLoading
  } = useOptimizedWorkspaceUrls(workspaceAssets, {
    enabled: true,
    batchSize: 10,
    prefetchThreshold: 0.5
  });

  // Generate content (simplified - always goes to library)
  const generate = useCallback(async (
    referenceImageUrl?: string | null,
    beginningRefImageUrl?: string | null, 
    endingRefImageUrl?: string | null,
    seed?: number | null
  ) => {
    if (!prompt.trim() && !exactCopyMode) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt to generate content",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Helper: upload reference file to reference_images and return signed URL
      const uploadAndSignReference = async (file: File): Promise<string> => {
        const res = await uploadReferenceFile(file);
        if (res.error || !res.data?.path) {
          throw (res as any).error || new Error('Failed to upload reference image');
        }
        const signed = await getReferenceImageUrl(res.data.path);
        if (!signed) {
          throw new Error('Failed to sign reference image URL');
        }
        return signed;
      };

      // LIBRARY-FIRST: Create generation request (always goes to library)
      const preserveStrength = 0.8; // High strength for exact copying
      
      // EXACT COPY MODE: Use original enhanced prompt as base
      let finalPrompt: string;
      let finalSeed: number | undefined;
      let finalStyle: string = style;
      let finalCameraAngle: string = cameraAngle;
      let finalShotType: string = shotType;
      let finalAspectRatio: '16:9' | '1:1' | '9:16' = aspectRatio;
      
      // 🎯 DEBUG: Add comprehensive logging for exact copy troubleshooting
      console.log('🎯 EXACT COPY DEBUG - State Check:', {
        exactCopyMode,
        hasReferenceMetadata: !!referenceMetadata,
        referenceMetadataKeys: referenceMetadata ? Object.keys(referenceMetadata) : 'none',
        referenceImageUrl: !!referenceImageUrl,
        referenceImage: !!referenceImage,
        prompt: prompt.trim(),
        style,
        cameraAngle,
        shotType,
        enhancementModel,
        // DEBUG: Full reference metadata
        fullReferenceMetadata: referenceMetadata
      });
      
      if (exactCopyMode && referenceMetadata) {
        console.log('🎯 EXACT COPY MODE: Using reference metadata:', {
          originalEnhancedPrompt: referenceMetadata.originalEnhancedPrompt,
          userModification: prompt.trim(),
          originalSeed: referenceMetadata.originalSeed
        });
        
        // Use original enhanced prompt as base
        finalPrompt = referenceMetadata.originalEnhancedPrompt;
        
        // Apply user modification if provided
        if (prompt.trim()) {
          console.log('🎯 EXACT COPY: Applying modification to original prompt');
          finalPrompt = modifyOriginalPrompt(finalPrompt, prompt.trim());
          console.log('🎯 EXACT COPY: Modified prompt result:', finalPrompt);
        }
        
        // Use original seed
        finalSeed = referenceMetadata.originalSeed;
        
        // Style params: use originals if toggled, else keep current UI controls
        if (useOriginalParams) {
          finalStyle = referenceMetadata.originalStyle || '';
          finalCameraAngle = referenceMetadata.originalCameraAngle || 'eye_level';
          finalShotType = referenceMetadata.originalShotType || 'wide';
          if (referenceMetadata.aspectRatio === '16:9' || referenceMetadata.aspectRatio === '1:1' || referenceMetadata.aspectRatio === '9:16') {
            finalAspectRatio = referenceMetadata.aspectRatio;
          }
        }
        
        console.log('🎯 EXACT COPY MODE - ACTIVE:', {
          originalPrompt: referenceMetadata.originalEnhancedPrompt,
          modifiedPrompt: finalPrompt,
          originalSeed: finalSeed,
          originalStyle: referenceMetadata.originalStyle,
          originalCameraAngle: referenceMetadata.originalCameraAngle,
          originalShotType: referenceMetadata.originalShotType,
          styleDisabled: true,
          finalStyle,
          finalCameraAngle,
          finalShotType
        });
      } else if (exactCopyMode && (referenceImageUrl || referenceImage) && !referenceMetadata) {
        // ✅ MINIMAL FIX: Handle uploaded images without metadata (the broken case)
        console.log('🎯 EXACT COPY MODE - UPLOADED REFERENCE (no metadata)');
        
        if (prompt.trim()) {
          // User provided modification
          finalPrompt = `maintain the exact same subject, person, face, and body from the reference image, only ${prompt.trim()}, keep all other details identical, same pose, same lighting, same composition, high quality, detailed, professional`;
        } else {
          // Promptless exact copy
          finalPrompt = 'exact copy of the reference image, same subject, same pose, same lighting, same composition, high quality, detailed, professional';
        }
        
        console.log('🎯 EXACT COPY MODE - UPLOADED REFERENCE:', {
          finalPrompt,
          hasModification: !!prompt.trim()
        });
      } else {
        // Normal generation flow
        finalPrompt = prompt.trim() || '';
        finalSeed = lockSeed && seed ? seed : undefined;
        
        // If user provided an uploaded/URL reference without metadata, guide the model to preserve subject
        if (exactCopyMode && !referenceMetadata) {
          finalPrompt = finalPrompt ? `${finalPrompt}, exact copy, high quality` : 'exact copy, high quality';
        }
        
        console.log('🎯 NORMAL GENERATION MODE:', {
          finalPrompt,
          finalSeed,
          style,
          cameraAngle,
          shotType
        });
      }

      // Precompute signed reference URLs when needed
      const startRefUrl = mode === 'video'
        ? (beginningRefImageUrl || (beginningRefImage ? await uploadAndSignReference(beginningRefImage) : undefined))
        : undefined;
      const endRefUrl = mode === 'video'
        ? (endingRefImageUrl || (endingRefImage ? await uploadAndSignReference(endingRefImage) : undefined))
        : undefined;

      const generationRequest = {
        job_type: (mode === 'image' 
          ? (quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast')
          : (quality === 'high' ? 'wan_video_high' : 'wan_video_fast')
        ),
        prompt: finalPrompt,
        quality: quality,
        // format omitted - let edge function default based on job_type
        model_type: mode === 'image' ? 'sdxl' : 'wan',
        reference_image_url: (referenceImageUrl || referenceImage) 
          ? (referenceImageUrl || (referenceImage ? await uploadAndSignReference(referenceImage) : undefined))
          : undefined,
        reference_strength: exactCopyMode ? 0.9 : referenceStrength,
        seed: finalSeed,
        num_images: mode === 'video' ? 1 : numImages,
        steps: steps,
        guidance_scale: guidanceScale,
        negative_prompt: negativePrompt,
        compel_enabled: compelEnabled,
        compel_weights: compelWeights,
        metadata: {
          // STAGING-FIRST: All assets go to workspace_assets table
          duration: mode === 'video' ? videoDuration : undefined,
          motion_intensity: mode === 'video' ? motionIntensity : undefined,
          start_reference_url: startRefUrl,
          end_reference_url: endRefUrl,
          // Control parameters
          aspect_ratio: finalAspectRatio,
          shot_type: finalShotType,
          camera_angle: finalCameraAngle,
          style: finalStyle,
          enhancement_model: exactCopyMode ? 'none' : enhancementModel,
          contentType: contentType,
          // Skip enhancement in exact copy mode
          user_requested_enhancement: exactCopyMode ? false : (enhancementModel !== 'none'),
          skip_enhancement: exactCopyMode ? true : (enhancementModel === 'none'),
          // Exact copy parameter overrides
          ...(exactCopyMode ? {
            num_inference_steps: 15,
            guidance_scale: 3.0,
            negative_prompt: '',
            exact_copy_mode: true,
            originalEnhancedPrompt: referenceMetadata?.originalEnhancedPrompt,
            originalSeed: referenceMetadata?.originalSeed,
            originalStyle: referenceMetadata?.originalStyle,
            originalCameraAngle: referenceMetadata?.originalCameraAngle,
            originalShotType: referenceMetadata?.originalShotType
          } : {})
        }
      };
      
      // DEBUG: Log reference image handling
      console.log('🎯 GENERATION REQUEST FINAL DEBUG:', {
        referenceImage: !!referenceImage,
        referenceImageUrl: !!referenceImageUrl,
        exactCopyMode,
        hasReferenceData: !!(referenceImageUrl || referenceImage),
        referenceMetadata: generationRequest.reference_image_url ? 'URL set' : 'No URL',
        // DEBUG: Full metadata being sent
        fullMetadata: generationRequest.metadata,
        exactCopyInMetadata: generationRequest.metadata?.exact_copy_mode,
        originalEnhancedPromptInMetadata: generationRequest.metadata?.originalEnhancedPrompt
      });

      // STAGING-FIRST: Use queue-job directly for new staging-first architecture
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: generationRequest
      });

      if (error) {
        console.error('❌ Generation error:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate content",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ STAGING-FIRST: Generation request successful:', data);
      const jobId = data?.jobId as string | undefined;
      if (jobId) {
        // Create optimistic placeholders immediately
        const count = mode === 'image' ? numImages : 1;
        const now = new Date();
        const placeholders: UnifiedAsset[] = Array.from({ length: count }, (_, i) => ({
          id: `optimistic-${jobId}-${i}`,
          type: mode,
          prompt: finalPrompt,
          createdAt: now,
          status: 'processing',
          url: undefined,
          modelType: mode === 'image' ? 'sdxl' : 'wan',
          duration: mode === 'video' ? (videoDuration || undefined) : undefined,
          metadata: {
            job_id: jobId,
            asset_index: i
          }
        }));
        setOptimisticAssets(prev => [...placeholders, ...prev]);
        setActiveJobId(jobId);
      }
      
      toast({
        title: `${mode === 'image' ? 'Image' : 'Video'} Generation Started`,
        description: "Your content is being generated and will appear in the workspace when ready",
      });

      // Clear exact copy mode after generation
      if (exactCopyMode) {
        setExactCopyMode(false);
        setReferenceMetadata(null);
        setUseOriginalParams(false);
        setLockSeed(false);
      }

    } catch (error: any) {
      console.error('❌ Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt, mode, referenceImage, referenceStrength, contentType, quality,
    beginningRefImage, endingRefImage, videoDuration, motionIntensity, soundEnabled,
    aspectRatio, shotType, cameraAngle, style, styleRef, exactCopyMode, referenceMetadata,
    useOriginalParams, lockSeed, enhancementModel, toast, numImages, videoDuration
  ]);

  const clearItem = useCallback(async (id: string, type: 'image' | 'video') => {
    // Optimistic removal - snapshot and update immediately
    const previousAssets = queryClient.getQueryData(['assets', true]);
    
    try {
      console.log('🧹 STAGING-FIRST: Clearing item:', { id, type });

      // Optimistically remove from cache
      queryClient.setQueryData(['assets', true], (prev: any) => 
        prev?.filter((asset: any) => asset.id !== id) || []
      );

      await WorkspaceAssetService.clearAsset(id);

      console.log('✅ STAGING-FIRST: Item cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      
      toast({
        title: "Item Cleared",
        description: "Item saved to library and removed from workspace"
      });
    } catch (error) {
      console.error('❌ STAGING-FIRST: Clear failed:', error);
      
      // Rollback optimistic update on error
      queryClient.setQueryData(['assets', true], previousAssets);
      
      toast({
        title: "Clear Failed",
        description: "Failed to clear item",
        variant: "destructive",
      });
    } finally {
      // Reconcile with server
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
    }
  }, [queryClient, toast]);

  const deleteAllWorkspace = useCallback(async () => {
    try {
      console.log('🗑️ STAGING-FIRST: Deleting all workspace items permanently');

      if (workspaceAssets.length === 0) {
        toast({
          title: "Workspace Empty", 
          description: "No items to delete"
        });
        return;
      }

      // Delete all assets permanently
      const deletions = workspaceAssets.map(async (asset) => {
        return WorkspaceAssetService.discardAsset(asset.id);
      });

      await Promise.all(deletions);

      console.log('✅ STAGING-FIRST: Deleted all workspace items');
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
      
      toast({
        title: "Workspace Deleted",
        description: `${workspaceAssets.length} items permanently deleted`
      });
    } catch (error) {
      console.error('❌ STAGING-FIRST: Delete all failed:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete workspace items",
        variant: "destructive",
      });
    }
  }, [workspaceAssets, queryClient, toast]);

  // STAGING-FIRST: Workspace delete = discard from workspace_assets (use WorkspaceAssetService)
  const deleteItem = useCallback(async (id: string, type: 'image' | 'video') => {
    // Optimistic removal - snapshot and update immediately
    const previousAssets = queryClient.getQueryData(['assets', true]);
    
    try {
      console.log('🗑️ STAGING-FIRST: Deleting staged asset:', { id, type });
      
      // Optimistically remove from cache
      queryClient.setQueryData(['assets', true], (prev: any) => 
        prev?.filter((asset: any) => asset.id !== id) || []
      );
      
      await WorkspaceAssetService.discardAsset(id);
      
      toast({
        title: "Item Deleted",
        description: "Item removed from workspace",
      });
    } catch (error) {
      console.error('❌ STAGING-FIRST: Delete failed:', error);
      
      // Rollback optimistic update on error
      queryClient.setQueryData(['assets', true], previousAssets);
      
      toast({
        title: "Delete Failed",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      // Reconcile with server
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
    }
  }, [queryClient, toast]);

  // STAGING-FIRST: Clear workspace = clear all workspace assets (save to library then remove)
  const clearWorkspace = useCallback(async () => {
    try {
      console.log('🧹 STAGING-FIRST: Clearing all workspace items');

      if (workspaceAssets.length === 0) {
        toast({
          title: "Workspace Empty", 
          description: "No items to clear"
        });
        return;
      }

      await WorkspaceAssetService.clearWorkspace();

      console.log('✅ STAGING-FIRST: Cleared workspace items');
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      
      toast({
        title: "Workspace Cleared",
        description: "All items saved to library and removed from workspace"
      });
    } catch (error) {
      console.error('❌ STAGING-FIRST: Clear failed:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear workspace",
        variant: "destructive",
      });
    }
  }, [workspaceAssets.length, queryClient, toast]);

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

  const clearJob = useCallback(async (jobId: string) => {
    try {
      console.log('🧹 STAGING-FIRST: Clearing job:', jobId);
      
      await WorkspaceAssetService.clearJob(jobId);

      console.log('✅ STAGING-FIRST: Job cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['assets', true] }); // Fix cache key
      queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      
      toast({
        title: "Job Cleared",
        description: "Job items saved to library and removed from workspace"
      });
    } catch (error) {
      console.error('❌ STAGING-FIRST: Clear job failed:', error);
      toast({
        title: "Clear Job Failed",
        description: "Failed to clear job items",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  const saveJob = useCallback(async (jobId: string) => {
    // Items are already in library, so "save" just removes dismissed flag
    const jobItems = workspaceAssets.filter(asset => 
      asset.metadata?.job_id === jobId
    );
    
    for (const item of jobItems) {
      const { data: currentItem } = await supabase
        .from('workspace_assets')
        .select('generation_settings')
        .eq('id', item.id)
        .maybeSingle();
      
      if (currentItem?.generation_settings) {
        const currentSettings = currentItem.generation_settings as Record<string, any> || {};
        if (currentSettings.workspace_dismissed) {
          const updatedSettings = {
            ...currentSettings,
            workspace_dismissed: false
          };
        
          await supabase
            .from('workspace_assets')
            .update({ generation_settings: updatedSettings })
            .eq('id', item.id);
        }
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['library-workspace-items'] });
  }, [workspaceAssets, queryClient]);

  const useJobAsReference = useCallback((jobId: string) => {
    try {
      // Find completed image assets for the given job
      const jobAssets = workspaceAssets
        .filter(asset => asset.metadata?.job_id === jobId)
        .filter(asset => asset.type === 'image')
        .filter(asset => asset.status === 'completed' && !!asset.url);

      if (jobAssets.length === 0) {
        toast({
          title: 'No Reference Found',
          description: 'No completed images found in this job to use as reference',
          variant: 'destructive'
        });
        return;
      }

      // Pick the earliest created image as the canonical reference
      const bestImage = jobAssets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

      // Note: Legacy custom event dispatch removed - direct state updates only

      toast({
        title: 'Reference Set',
        description: 'Job image set as reference for next generation'
      });
    } catch (error) {
      console.error('useJobAsReference failed', error);
      toast({
        title: 'Failed to Set Reference',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  }, [workspaceAssets, toast]);

  // Apply original generation parameters from an asset's metadata
  const applyAssetParamsFromItem = useCallback((item: UnifiedAsset) => {
    try {
      const gen = (item.metadata as any)?.generationParams || (item.metadata as any) || {};

      // Seed
      const seedFromItem: number | undefined = gen.seed ?? (item as any).seed ?? undefined;
      if (seedFromItem !== undefined && seedFromItem !== null) {
        // Lock seed if available; consume when generate() is called via passed seed parameter
        setLockSeed(true);
      } else {
        setLockSeed(false);
      }

      // Aspect ratio mapping from width/height or explicit aspect
      let nextAspect: '16:9' | '1:1' | '9:16' = aspectRatio;
      if (gen.aspectRatio) {
        if (gen.aspectRatio === '16:9' || gen.aspectRatio === '1:1' || gen.aspectRatio === '9:16') {
          nextAspect = gen.aspectRatio;
        }
      } else if (gen.width && gen.height) {
        const w = Number(gen.width), h = Number(gen.height);
        if (w && h) {
          const r = w / h;
          if (Math.abs(r - 16/9) < 0.05) nextAspect = '16:9';
          else if (Math.abs(r - 9/16) < 0.05) nextAspect = '9:16';
          else if (Math.abs(r - 1) < 0.05) nextAspect = '1:1';
        }
      }
      setAspectRatio(nextAspect);

      // Quality/content type
      if (item.quality === 'high' || item.quality === 'fast') setQuality(item.quality as any);
      if ((item.metadata as any)?.contentType === 'sfw' || (item.metadata as any)?.contentType === 'nsfw') {
        setContentType((item.metadata as any).contentType);
      }

      // Shot / angle / style
      if (gen.shotType) setShotType(gen.shotType);
      if (gen.cameraAngle) setCameraAngle(gen.cameraAngle);
      if (gen.style) setStyle(gen.style);

      // Reference strength for exact copy
      setReferenceStrength(0.1);
      setExactCopyMode(true);
      setUseOriginalParams(true);
      // Ensure image mode
      setMode('image');
    } catch (e) {
      console.warn('applyAssetParamsFromItem failed', e);
    }
  }, [aspectRatio, setAspectRatio, setQuality, setContentType, setShotType, setCameraAngle, setStyle]);

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
    workspaceAssets: (
      // Merge optimistic placeholders (that haven't been replaced yet) with real assets
      [
        ...optimisticAssets.filter(opt => !workspaceAssets.some(real => real.metadata?.job_id && real.metadata?.job_id === opt.metadata?.job_id)),
        ...workspaceAssets.map(asset => ({
          ...asset,
          url: signedUrls.get(asset.id) || (asset.url && (asset.url.startsWith('http://') || asset.url.startsWith('https://')) ? asset.url : undefined)
        }))
      ]
    ),
    activeJobId,
    lightboxIndex,
    referenceMetadata,
    enhancementModel,
    userPreferredModel,
    exactCopyMode,
    useOriginalParams,
    lockSeed,
    workspaceCleared,
    signedUrls,
    isUrlLoading,
    // Advanced SDXL Settings
    numImages,
    steps,
    guidanceScale,
    negativePrompt,
    compelEnabled,
    compelWeights,
    seed,
    
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
    deleteAllWorkspace,
    deleteItem,
    clearItem,
    setLightboxIndex,
    selectJob,
    deleteJob,
    clearJob,
    saveJob,
    useJobAsReference,
    applyAssetParamsFromItem,
    setExactCopyMode: (on: boolean) => {
      setExactCopyMode(on);
      // Auto-set enhancement model based on exact copy mode
      if (on) {
        // Save current model as user preference and set to 'none'
        setUserPreferredModel(enhancementModel);
        setEnhancementModel('none');
      } else {
        // Restore user's preferred model
        setEnhancementModel(userPreferredModel);
      }
    },
    setUseOriginalParams,
    setLockSeed,
    updateEnhancementModel: (model: 'qwen_base' | 'qwen_instruct' | 'none') => {
      if (!exactCopyMode) {
        // Only update user preference when not in exact copy mode
        setUserPreferredModel(model);
        setEnhancementModel(model);
      }
    },
    setReferenceMetadata,
    // Advanced SDXL Settings Actions
    setNumImages,
    setSteps,
    setGuidanceScale,
    setNegativePrompt,
    setCompelEnabled,
    setCompelWeights,
    setSeed,
    getJobStats,
    getActiveJob,
    getJobById,
    
    // URL management
    registerAssetRef,
    forceLoadAssetUrls,
    preloadNextAssets,
    invalidateAssetCache,
    clearAllCache
  };
};