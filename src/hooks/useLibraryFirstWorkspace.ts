import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { useToast } from '@/hooks/use-toast';
import { useAssetsWithDebounce } from '@/hooks/useAssetsWithDebounce';
import { GenerationFormat } from '@/types/generation';
import { ReferenceMetadata } from '@/types/workspace';
import { modifyOriginalPrompt } from '@/utils/promptModification';
import { uploadReferenceImage as uploadReferenceFile, getReferenceImageUrl } from '@/lib/storage';

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
  referenceMetadata: ReferenceMetadata | null;
  workspaceCleared: boolean;
  // Exact copy workflow
  exactCopyMode: boolean;
  useOriginalParams: boolean;
  lockSeed: boolean;
  
  // Enhancement Model Selection
  enhancementModel: 'qwen_base' | 'qwen_instruct' | 'none';
  userPreferredModel: 'qwen_base' | 'qwen_instruct' | 'none';
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
  deleteItem: (id: string, type: 'image' | 'video') => Promise<void>;
  dismissItem: (id: string, type: 'image' | 'video') => Promise<void>;
  setLightboxIndex: (index: number | null) => void;
  // Job-level actions (simplified)
  selectJob: (jobId: string) => void;
  deleteJob: (jobId: string) => Promise<void>;
  dismissJob: (jobId: string) => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  useJobAsReference: (jobId: string) => void;
  applyAssetParamsFromItem: (item: UnifiedAsset) => void;
  setExactCopyMode: (on: boolean) => void;
  setUseOriginalParams: (on: boolean) => void;
  setLockSeed: (on: boolean) => void;
  setReferenceMetadata: (metadata: ReferenceMetadata | null) => void;
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
  const [cameraAngle, setCameraAngle] = useState<'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye'>('eye_level');
  const [style, setStyle] = useState('cinematic lighting, film grain, dramatic composition');
  const [styleRef, setStyleRef] = useState<File | null>(null);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [workspaceCleared, setWorkspaceCleared] = useState(false);
  // Exact copy workflow state
  const [exactCopyMode, setExactCopyMode] = useState<boolean>(false);
  const [referenceMetadata, setReferenceMetadata] = useState<ReferenceMetadata | null>(null);
  const [useOriginalParams, setUseOriginalParams] = useState<boolean>(false);
  const [lockSeed, setLockSeed] = useState<boolean>(false);
  
  // Enhancement Model Selection
  const [enhancementModel, setEnhancementModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');
  const [userPreferredModel, setUserPreferredModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');

  // LIBRARY-FIRST: Use debounced asset loading to prevent infinite loops
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

  // LIBRARY-FIRST: Enhanced real-time subscriptions with debouncing to prevent infinite loops
  useEffect(() => {
    let imagesChannel: any = null;
    let videosChannel: any = null;
    let isSubscribed = false;
    
    const setupLibrarySubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return () => {};

      console.log('📡 LIBRARY-FIRST: Setting up DEBOUNCED real-time subscriptions');

      // Prevent multiple subscriptions
      if (isSubscribed) {
        console.log('⚠️ Already subscribed, skipping setup');
        return () => {};
      }

      // Clean up any existing channels first
      if (imagesChannel) {
        supabase.removeChannel(imagesChannel);
        imagesChannel = null;
      }
      if (videosChannel) {
        supabase.removeChannel(videosChannel);
        videosChannel = null;
      }

      let debounceTimer: NodeJS.Timeout | null = null;
      let pendingUpdates = new Set<string>();

      const localDebouncedInvalidate = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          if (pendingUpdates.size > 0) {
            console.log('🔄 DEBOUNCED: Processing', pendingUpdates.size, 'pending updates');
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
        // Enhanced Images subscription - listen for both INSERT and UPDATE
        imagesChannel = supabase
          .channel(`workspace-images-realtime-${user.id}-${Date.now()}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'images',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            console.log('📷 NEW IMAGE - Adding to debounced update queue:', payload.new);
            pendingUpdates.add(`image-insert-${payload.new.id}`);
            localDebouncedInvalidate();
            
            // Emit completion event for other systems
            window.dispatchEvent(new CustomEvent('library-assets-ready', {
              detail: { 
                type: 'image', 
                assetId: payload.new.id,
                jobId: payload.new.job_id 
              }
            }));
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'images',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            const image = payload.new as any;
            if (image.status === 'completed' && (image.image_url || image.image_urls)) {
              console.log('📷 IMAGE COMPLETED - Adding to debounced update queue:', image.id);
              pendingUpdates.add(`image-update-${image.id}`);
              localDebouncedInvalidate();
              
              // Show toast notification (immediate)
              toast({
                title: "Image Ready",
                description: "New image generated and ready to view",
              });
            }
          });

        // Enhanced Videos subscription - listen for both INSERT and UPDATE  
        videosChannel = supabase
          .channel(`workspace-videos-realtime-${user.id}-${Date.now()}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'videos',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            console.log('🎥 NEW VIDEO - Adding to debounced update queue:', payload.new);
            pendingUpdates.add(`video-insert-${payload.new.id}`);
            localDebouncedInvalidate();
            
            // Emit completion event for other systems
            window.dispatchEvent(new CustomEvent('library-assets-ready', {
              detail: { 
                type: 'video', 
                assetId: payload.new.id,
                jobId: payload.new.job_id 
              }
            }));
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'videos',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            const video = payload.new as any;
            if (video.status === 'completed' && video.video_url) {
              console.log('🎥 VIDEO COMPLETED - Adding to debounced update queue:', video.id);
              pendingUpdates.add(`video-update-${video.id}`);
              localDebouncedInvalidate();
              
              // Show toast notification (immediate)
              toast({
                title: "Video Ready",
                description: "New video generated and ready to view",
              });
            }
          });

        // Subscribe to both channels
        await Promise.all([
          imagesChannel.subscribe(),
          videosChannel.subscribe()
        ]);

        isSubscribed = true;
        console.log('✅ LIBRARY-FIRST: Successfully subscribed to real-time channels');

      } catch (error) {
        console.error('❌ LIBRARY-FIRST: Failed to setup subscriptions:', error);
        // Clean up on error
        if (imagesChannel) {
          supabase.removeChannel(imagesChannel);
          imagesChannel = null;
        }
        if (videosChannel) {
          supabase.removeChannel(videosChannel);
          videosChannel = null;
        }
        isSubscribed = false;
      }

      return () => {
        console.log('📡 LIBRARY-FIRST: Cleaning up debounced real-time subscriptions');
        isSubscribed = false;
        
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        if (imagesChannel) {
          supabase.removeChannel(imagesChannel);
          imagesChannel = null;
        }
        if (videosChannel) {
          supabase.removeChannel(videosChannel);
          videosChannel = null;
        }
      };
    };

    let cleanup: () => void;
    setupLibrarySubscription().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [queryClient, debouncedInvalidate]);

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
        
        // Show toast notification with proper undefined check
        if (assets && assets.length > 0) {
          toast({
            title: "New Content Ready",
            description: `${assets.length} new ${assets[0]?.type || 'item'}${assets.length > 1 ? 's' : ''} generated`,
          });
        }
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
        format: (mode === 'image' 
          ? (quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast')
          : (quality === 'high' ? 'video_high' : 'video_fast')
        ) as GenerationFormat,
        prompt: finalPrompt,
        batchCount: mode === 'image' ? 3 : 1,
        metadata: {
          num_images: mode === 'image' ? 3 : 1,
          // LIBRARY-FIRST: No destination needed - always goes to library tables
          // Reference image data - FIXED: Use reference_url and signed URLs for private bucket
          ...((referenceImageUrl || referenceImage) && {
            reference_image: true,
            reference_url: referenceImageUrl || (referenceImage ? await uploadAndSignReference(referenceImage) : undefined),
            reference_strength: exactCopyMode ? 0.9 : referenceStrength,
            reference_type: (exactCopyMode ? 'composition' : 'character') as 'style' | 'composition' | 'character',
            exact_copy_mode: exactCopyMode
          }),
          // Seed for character reproduction
          ...(finalSeed && { seed: finalSeed }),
          // Video-specific parameters
          ...(mode === 'video' && {
            duration: videoDuration,
            motion_intensity: motionIntensity,
            sound_enabled: soundEnabled
          }),
          // Video reference URLs (included in metadata for queue-job compatibility)
          ...(mode === 'video' ? {
            start_reference_url: startRefUrl,
            end_reference_url: endRefUrl
          } : {}),
          // Control parameters (disabled in exact copy mode)
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
            negative_prompt: ''
          } : {}),
          // Pass reference metadata for exact copy mode
          ...(exactCopyMode && referenceMetadata ? {
            exact_copy_mode: true,
            originalEnhancedPrompt: referenceMetadata.originalEnhancedPrompt,
            originalSeed: referenceMetadata.originalSeed,
            originalStyle: referenceMetadata.originalStyle,
            originalCameraAngle: referenceMetadata.originalCameraAngle,
            originalShotType: referenceMetadata.originalShotType
          } : {})
        }
      };
      
      // DEBUG: Log reference image handling
      console.log('🎯 GENERATION REQUEST FINAL DEBUG:', {
        referenceImage: !!referenceImage,
        referenceImageUrl: !!referenceImageUrl,
        exactCopyMode,
        hasReferenceData: !!(referenceImageUrl || referenceImage),
        referenceMetadata: generationRequest.metadata?.reference_url ? 'URL set' : 'No URL',
        // DEBUG: Full metadata being sent
        fullMetadata: generationRequest.metadata,
        exactCopyInMetadata: generationRequest.metadata?.exact_copy_mode,
        originalEnhancedPromptInMetadata: generationRequest.metadata?.originalEnhancedPrompt
      });

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
        
        console.log('🚫 WORKSPACE: Dismissing item:', id, 'type:', type, 'with metadata:', updatedMetadata);
        
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
      console.log('🧹 LIBRARY-FIRST: Clearing workspace (dismissing all today\'s items)');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Set workspace as cleared immediately for better UX
      setWorkspaceCleared(true);

      // Dismiss all today's items
      const todayStart = getTodayStartUTC();
      
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

      // Dispatch an event so page-level components can consume and set URL-based reference
      window.dispatchEvent(new CustomEvent('workspace-use-job-as-reference', {
        detail: {
          jobId,
          url: bestImage.url,
          assetId: bestImage.id,
          type: 'image'
        }
      }));

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
    workspaceAssets,
    activeJobId,
    lightboxIndex,
    referenceMetadata,
    enhancementModel,
    userPreferredModel,
    exactCopyMode,
    useOriginalParams,
    lockSeed,
    
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
    getJobStats,
    getActiveJob,
    getJobById
  };
}; 