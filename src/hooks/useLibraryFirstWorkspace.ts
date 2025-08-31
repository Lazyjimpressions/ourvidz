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
  referenceImageUrl: string | null;
  referenceStrength: number;
  contentType: 'sfw' | 'nsfw';
  quality: 'fast' | 'high';
  selectedModel: { id: string; type: 'sdxl' | 'replicate'; display_name: string } | null;
  
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
  
  // Reference Type Selection
  referenceType: 'style' | 'character' | 'composition';
  
  // Advanced SDXL Settings
  numImages: number;
  steps: number;
  guidanceScale: number;
  negativePrompt: string;
  compelEnabled: boolean;
  compelWeights: string;
  seed: number | null;
  
  // Debug controls
  bypassEnhancement: boolean;
  hardOverride: boolean;
  // Clothing Edit Mode
  clothingEditMode: boolean;
  lockHair: boolean;
  originalClothingColor: string;
  targetGarments: string[];
}

export interface LibraryFirstWorkspaceActions {
  // Actions
  updateMode: (newMode: 'image' | 'video') => void;
  setPrompt: (prompt: string) => void;
  setReferenceImage: (image: File | null) => void;
  setReferenceImageUrl: (url: string | null) => void;
  setReferenceStrength: (strength: number) => void;
  setContentType: (type: 'sfw' | 'nsfw') => void;
  setQuality: (quality: 'fast' | 'high') => void;
  setSelectedModel: (model: { id: string; type: 'sdxl' | 'replicate'; display_name: string } | null) => void;
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
  setReferenceType: (type: 'style' | 'character' | 'composition') => void;
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
  applyExactCopyParamsFromItem: (item: UnifiedAsset) => void;
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
  // Debug controls
  setBypassEnhancement: (enabled: boolean) => void;
  setHardOverride: (enabled: boolean) => void;
  // Clothing Edit Mode
  setClothingEditMode: (enabled: boolean) => void;
  setLockHair: (enabled: boolean) => void;
  setOriginalClothingColor: (color: string) => void;
  setTargetGarments: (garments: string[]) => void;
  
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

export interface LibraryFirstWorkspaceConfig {
  disableUrlOptimization?: boolean;
}

export const useLibraryFirstWorkspace = (config: LibraryFirstWorkspaceConfig = {}): LibraryFirstWorkspaceState & LibraryFirstWorkspaceActions => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Core State
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(0.80); // Better default for character mode
  const [contentType, setContentType] = useState<'sfw' | 'nsfw'>('sfw');
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  // Model Type Selection
  const initializeSelectedModel = (): { id: string; type: 'sdxl' | 'replicate'; display_name: string } => {
    // Check localStorage
    const saved = localStorage.getItem('workspace-model-type');
    if (saved === 'replicate_rv51') {
      // Legacy compatibility - convert to RV5.1 model format
      return { id: 'legacy-rv51', type: 'replicate', display_name: 'RV5.1' };
    } else if (saved === 'sdxl') {
      return { id: 'sdxl', type: 'sdxl', display_name: 'SDXL' };
    }
    
    // Default to SDXL
    return { id: 'sdxl', type: 'sdxl', display_name: 'SDXL' };
  };
  
  const [selectedModel, setSelectedModelInternal] = useState<{ id: string; type: 'sdxl' | 'replicate'; display_name: string }>(() => {
    try {
      return initializeSelectedModel();
    } catch (error) {
      console.error('Failed to initialize selectedModel, using default:', error);
      return { id: 'sdxl', type: 'sdxl', display_name: 'SDXL' };
    }
  });
  
  // Wrapper to persist changes
  const setSelectedModel = useCallback((newModel: { id: string; type: 'sdxl' | 'replicate'; display_name: string } | null) => {
    if (!newModel) return;
    console.log('🔄 Model selection changed to:', newModel);
    // Save simplified format for backwards compatibility
    const saveValue = newModel.type === 'replicate' ? 'replicate_rv51' : 'sdxl';
    localStorage.setItem('workspace-model-type', saveValue);
    setSelectedModelInternal(newModel);
  }, []);
  
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
  const [wasSetByExactCopy, setWasSetByExactCopy] = useState<boolean>(false);
  
  // Enhancement Model Selection
  const [enhancementModel, setEnhancementModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');
  const [userPreferredModel, setUserPreferredModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');
  
  // Reference Type Selection (default to character for modify mode)
  const [referenceType, setReferenceType] = useState<'style' | 'character' | 'composition'>('character');

  // Advanced SDXL Settings (modify mode defaults)
  const [numImages, setNumImages] = useState(3);
  const [steps, setSteps] = useState(25);
  const [guidanceScale, setGuidanceScale] = useState(6.0); // Better for modify mode
  const [negativePrompt, setNegativePrompt] = useState('');
  const [compelEnabled, setCompelEnabled] = useState(false);
  const [compelWeights, setCompelWeights] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  // Debug controls
  const [bypassEnhancement, setBypassEnhancement] = useState(false);
  const [hardOverride, setHardOverride] = useState(false);
  
  // Clothing Edit Mode
  const [clothingEditMode, setClothingEditMode] = useState(false);
  const [lockHair, setLockHair] = useState(false);
  const [originalClothingColor, setOriginalClothingColor] = useState('black');
  const [targetGarments, setTargetGarments] = useState<string[]>([]);

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

  // OPTIMIZED: Use the new optimized URL loading hook with preloading (configurable)
  const {
    assets: assetsWithUrls,
    signedUrls,
    loadingUrls,
    registerAssetRef,
    forceLoadAssetUrls,
    preloadNextAssets,
    loadAssetUrlsBatch,
    invalidateAssetCache,
    clearAllCache,
    isLoading: isUrlLoading
  } = useOptimizedWorkspaceUrls(workspaceAssets, {
    enabled: !config.disableUrlOptimization,
    batchSize: 12,
    prefetchThreshold: 0.3
  });

  // Preload first 24 assets for better UX
  useEffect(() => {
    if (workspaceAssets.length > 0) {
      preloadNextAssets(24);
    }
  }, [workspaceAssets.length > 0, preloadNextAssets]);

  // Preload first 24 assets on mount for immediate rendering (if enabled)
  useEffect(() => {
    if (!config.disableUrlOptimization && workspaceAssets.length > 0) {
      const firstAssets = workspaceAssets.slice(0, 24);
      const assetIds = firstAssets.map(asset => asset.id);
      console.log('🚀 WORKSPACE: Preloading first 24 assets:', assetIds);
      loadAssetUrlsBatch(assetIds);
    }
  }, [workspaceAssets.length > 0, loadAssetUrlsBatch, config.disableUrlOptimization]);

  // Generate content (simplified - always goes to library)
  const generate = useCallback(async (
    overrideReferenceImageUrl?: string | null,
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
      // Reference strength defaults - align with worker's denoise_strength defaults
      const modifyStrength = 0.80; // Standard modify mode strength
      
      // Compute reference strength with user selection
      const computedReferenceStrength = exactCopyMode 
        ? 0.95 // High preservation for exact copy
        : (referenceStrength || modifyStrength); // Use UI slider or smart default
      
      console.log('🔍 I2I CRITICAL VALUES:', {
        modifyStrength,
        computedReferenceStrength,
        resulting_denoise: 1 - computedReferenceStrength,
        mode: exactCopyMode ? 'COPY' : 'MODIFY',
        referenceType,
        exactCopyMode,
        referenceStrengthFromUI: referenceStrength
      });
      const copyStrength = 0.95; // Copy mode strength (worker will clamp denoise to ≤0.05)
      
      // CRITICAL: Calculate denoise strength for modify mode (worker expects complete settings)
      const computedDenoiseStrength = exactCopyMode ? 0.05 : (1 - computedReferenceStrength); // Now 0.20 for modify mode
      
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
      } else if (!exactCopyMode && (referenceImageUrl || referenceImage)) {
        // MODIFY MODE: Handle reference images for modification
        console.log('🎯 MODIFY MODE: Processing reference image for modification');
        
        if (referenceMetadata && prompt.trim()) {
          // Workspace item with metadata and user modification
          console.log('🎯 MODIFY MODE: Workspace item with modification');
          finalPrompt = `preserve the same person/identity and facial features from the reference image, ${prompt.trim()}, maintaining similar quality and detail level`;
        } else if (prompt.trim()) {
          // Uploaded image or workspace item without metadata, with user modification
          console.log('🎯 MODIFY MODE: Reference image with modification');
          finalPrompt = `preserve the same person/identity and facial features from the reference image, ${prompt.trim()}, maintaining similar quality and detail level`;
        } else {
          // Reference image but no modification prompt
          console.log('🎯 MODIFY MODE: Reference image without modification');
          finalPrompt = 'preserve the same person/identity and facial features from the reference image, maintaining similar quality and detail level';
        }
        
        // Guard against seed-based near copies: clear lockSeed if it was set by exact copy
        finalSeed = (lockSeed && seed && !wasSetByExactCopy) ? seed : undefined;
        
        console.log('🎯 MODIFY MODE - ACTIVE:', {
          finalPrompt,
          finalSeed,
          hasReferenceMetadata: !!referenceMetadata,
          userModification: prompt.trim()
        });
      } else {
        // Normal generation flow (no reference image)
        finalPrompt = prompt.trim() || '';
        finalSeed = lockSeed && seed ? seed : undefined;
        
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

      // FIX: Compute effective reference URL (not shadowed by parameter)
      const effRefUrl = (overrideReferenceImageUrl || referenceImageUrl || referenceImage) 
        ? (overrideReferenceImageUrl || referenceImageUrl || (referenceImage ? await uploadAndSignReference(referenceImage) : undefined))
        : undefined;

      // Use the already computed reference strength from above

      const generationRequest = {
        job_type: (mode === 'image' 
          ? (selectedModel?.type === 'replicate' 
              ? (quality === 'high' ? 'rv51_high' : 'rv51_fast')
              : (quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast'))
          : (quality === 'high' ? 'wan_video_high' : 'wan_video_fast')
        ),
        prompt: finalPrompt,
        quality: quality,
        // format omitted - let edge function default based on job_type
        model_type: mode === 'image' ? (selectedModel?.type === 'replicate' ? 'rv51' : 'sdxl') : 'wan',
        reference_image_url: effRefUrl,
        reference_strength: computedReferenceStrength,
        seed: finalSeed,
        num_images: mode === 'video' ? 1 : numImages,
        steps: steps,
        guidance_scale: exactCopyMode ? 1.0 : guidanceScale, // Use actual guidanceScale from UI
        negative_prompt: negativePrompt,
        // CRITICAL: Pass top-level denoise_strength for SDXL worker  
        denoise_strength: exactCopyMode ? 0.05 : (1 - computedReferenceStrength), // Use UI-derived denoise
        seed_locked: exactCopyMode && lockSeed,
        compel_enabled: compelEnabled,
        compel_weights: compelWeights,
        metadata: (() => {
          const baseMetadata = {
            // STAGING-FIRST: All assets go to workspace_assets table
            duration: mode === 'video' ? videoDuration : undefined,
            motion_intensity: mode === 'video' ? motionIntensity : undefined,
            start_reference_url: startRefUrl,
            end_reference_url: endRefUrl,
            // FIX: Add reference_image_url to metadata for server-side logging
            reference_image_url: effRefUrl,
            // Control parameters
            aspect_ratio: finalAspectRatio,
            shot_type: finalShotType,
            camera_angle: finalCameraAngle,
            style: finalStyle,
            enhancement_model: exactCopyMode || selectedModel?.type === 'replicate' ? 'none' : enhancementModel,
            contentType: contentType,
            // Skip enhancement in exact copy mode or for replicate models
            user_requested_enhancement: exactCopyMode || selectedModel?.type === 'replicate' ? false : (enhancementModel !== 'none'),
            skip_enhancement: exactCopyMode || selectedModel?.type === 'replicate' ? true : (enhancementModel === 'none'),
            // Add reference mode and entry path for server classification  
            reference_mode: exactCopyMode ? 'copy' : (effRefUrl ? 'modify' : undefined),
            reference_type: effRefUrl ? referenceType : undefined, // Pass reference type
            exact_copy_mode: exactCopyMode,
            lock_hair: lockHair, // Pass Hair Lock setting to worker
          };

          if (exactCopyMode) {
            // Copy mode parameters
            return {
              ...baseMetadata,
              num_inference_steps: 15,
              guidance_scale: 1.0, // Copy mode: minimal guidance
              negative_prompt: '',
              ...(referenceMetadata?.originalEnhancedPrompt && { originalEnhancedPrompt: referenceMetadata.originalEnhancedPrompt }),
              ...(referenceMetadata?.originalSeed && { originalSeed: referenceMetadata.originalSeed }),
              ...(referenceMetadata?.originalStyle && { originalStyle: referenceMetadata.originalStyle }),
              ...(referenceMetadata?.originalCameraAngle && { originalCameraAngle: referenceMetadata.originalCameraAngle }),
              ...(referenceMetadata?.originalShotType && { originalShotType: referenceMetadata.originalShotType }),
              // Add reference profile for copy mode too
              reference_profile: {
                type: 'copy',
                reference_strength: computedReferenceStrength,
                denoise_strength: 1 - computedReferenceStrength,
                guidance_scale: 1.0,
                steps: 15,
                seed_locked: lockSeed,
                exact_copy_mode: true
              }
            };
          } else {
            // FIXED: Only use I2I parameters when reference image exists
            if (effRefUrl) {
              // Modify mode parameters - set I2I parameters for reference image modifications
              return {
                ...baseMetadata,
                num_inference_steps: steps || 25,
                guidance_scale: guidanceScale || 6,
                denoise_strength: 1 - computedReferenceStrength,
                negative_prompt: negativePrompt || undefined,
                exact_copy_mode: false,
                reference_mode: 'modify', // Only set when reference image exists
                reference_type: referenceType,
                // Add reference profile for metadata preservation
                reference_profile: {
                  type: referenceType,
                  reference_strength: computedReferenceStrength,
                  denoise_strength: 1 - computedReferenceStrength,
                  guidance_scale: guidanceScale || 6,
                  steps: steps || 25,
                  seed_locked: lockSeed,
                  exact_copy_mode: false
                }
              };
            } else {
              // Text-to-image mode parameters - no I2I parameters
              return {
                ...baseMetadata,
                num_inference_steps: steps || 25,
                guidance_scale: guidanceScale || 7.5, // Standard CFG for txt2img
                negative_prompt: negativePrompt || undefined,
                exact_copy_mode: false
                // No reference_mode, reference_type, or I2I parameters
              };
            }
          }
        })()
      };
      
      console.log('🎯 GENERATION DEBUG:', {
        mode: exactCopyMode ? 'EXACT_COPY' : 'MODIFY',
        exact_copy_mode: generationRequest.metadata?.exact_copy_mode,
        reference_mode: generationRequest.metadata?.reference_mode,
        reference_strength: computedReferenceStrength,
        denoise_strength: `${1 - computedReferenceStrength} (computed by worker)`,
        lockSeed,
        seed_present: !!finalSeed,
        prompt_preview: finalPrompt.substring(0, 80) + '...',
        has_reference_image: !!effRefUrl,
        was_set_by_exact_copy: wasSetByExactCopy || false,
        // LOG CRITICAL VALUES FOR CFG BUG VERIFICATION
        controlValues: {
          steps,
          reference_strength: computedReferenceStrength,
          guidance_scale: guidanceScale
        }
      });

      // 🆕 CRITICAL DEBUG: Check exact_copy_mode flag
      console.log('🎯 CRITICAL DEBUG - exact_copy_mode flag:', {
        exactCopyMode,
        metadataExactCopyMode: generationRequest.metadata?.exact_copy_mode,
        referenceMode: generationRequest.metadata?.reference_mode,
        hasReferenceImage: !!effRefUrl,
        finalPrompt: finalPrompt.substring(0, 100) + '...'
      });


      // STAGING-FIRST: Route strictly by selectedModel - Replicate goes to replicate-image, SDXL goes to queue-job
      const edgeFunction = selectedModel?.type === 'replicate' ? 'replicate-image' : 'queue-job';
      
      console.log('🚀 ROUTING:', {
        selectedModel,
        edgeFunction,
        job_type: generationRequest.job_type,
        enhancementModel: generationRequest.metadata?.enhancement_model
      });
      
      let requestPayload;
      
      if (selectedModel?.type === 'replicate') {
        // Guard: Check if model ID is valid
        if (!selectedModel.id || selectedModel.id === 'legacy-rv51') {
          toast({
            title: "Model Selection Required",
            description: "Please reselect the model and try again",
            variant: "destructive",
          });
          return;
        }
        
        // Convert aspect ratio to width/height
        const aspectRatioMap: Record<string, { width: number; height: number }> = {
          '1:1': { width: 1024, height: 1024 },
          '16:9': { width: 1344, height: 768 },
          '9:16': { width: 768, height: 1344 },
          '3:2': { width: 1216, height: 832 },
          '2:3': { width: 832, height: 1216 }
        };
        const dimensions = aspectRatioMap[finalAspectRatio] || { width: 1024, height: 1024 };
        
        // Build Replicate-specific payload
        requestPayload = {
          prompt: finalPrompt,
          apiModelId: selectedModel.id,
          jobType: generationRequest.job_type,
          quality: quality,
          input: {
            steps: steps,
            guidance_scale: guidanceScale,
            negative_prompt: negativePrompt,
            seed: lockSeed ? finalSeed : undefined, // Only send seed if locked
            width: dimensions.width,
            height: dimensions.height,
            num_outputs: numImages,
            scheduler: 'EulerA'
          },
          metadata: generationRequest.metadata
        };
      } else {
        // Use original payload for SDXL/WAN
        requestPayload = generationRequest;
      }
      
      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: requestPayload
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
          modelType: mode === 'image' ? (selectedModel?.type === 'replicate' ? selectedModel.display_name : 'SDXL') : 'WAN',
          duration: mode === 'video' ? (videoDuration || undefined) : undefined,
          metadata: {
            job_id: jobId,
            asset_index: i
          }
        }));
        setOptimisticAssets(prev => [...placeholders, ...prev]);
        setActiveJobId(jobId);
      }
      
      // Show success message with model info
      const modelLabel = selectedModel?.type === 'replicate' ? `${selectedModel.display_name} (replicate)` : 'SDXL/WAN (workers)';
      toast({
        title: `${mode === 'image' ? 'Image' : 'Video'} Generation Started`,
        description: `Generating with ${modelLabel}...`,
      });

      // Clear exact copy mode after generation
      if (exactCopyMode) {
        setExactCopyMode(false);
        setReferenceMetadata(null);
        setUseOriginalParams(false);
        setLockSeed(false);
        setWasSetByExactCopy(false);
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
    prompt, mode, referenceImage, referenceStrength, contentType, quality, selectedModel,
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

      const itemCount = workspaceAssets.length;

      // Optimistic update: immediately clear the workspace grid
      queryClient.setQueryData(['assets', true], []);

      // Delete all assets permanently
      const deletions = workspaceAssets.map(async (asset) => {
        return WorkspaceAssetService.discardAsset(asset.id);
      });

      await Promise.all(deletions);

      console.log('✅ STAGING-FIRST: Deleted all workspace items');
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
      
      toast({
        title: "Workspace Deleted",
        description: `${itemCount} items permanently deleted`
      });
    } catch (error) {
      console.error('❌ STAGING-FIRST: Delete all failed:', error);
      // Restore on error
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
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

      // Optimistic update: immediately clear the workspace grid
      queryClient.setQueryData(['assets', true], []);

      await WorkspaceAssetService.clearWorkspace();

      console.log('✅ STAGING-FIRST: Cleared workspace items');
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      
      toast({
        title: "Workspace Cleared",
        description: "All items saved to library and removed from workspace"
      });
    } catch (error) {
      console.error('❌ STAGING-FIRST: Clear failed:', error);
      // Restore on error
      queryClient.invalidateQueries({ queryKey: ['assets', true] });
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
    console.log('📋 Applying asset parameters from item (modify-friendly):', item);
    
    try {
      // Apply model type only
      if (item.metadata?.modelType) {
        setSelectedModel({ 
          id: item.metadata.modelType === 'replicate' ? 'rv51' : 'sdxl',
          type: item.metadata.modelType === 'replicate' ? 'replicate' : 'sdxl',
          display_name: item.metadata.modelType === 'replicate' ? 'RV5.1' : 'SDXL'
        });
      }

      // Apply generation parameters from metadata
      const gen = item.metadata?.generationParams || {};
      if (gen.aspectRatio) setAspectRatio(gen.aspectRatio);
      if (gen.shotType) setShotType(gen.shotType);
      if (gen.cameraAngle) setCameraAngle(gen.cameraAngle);
      if (gen.style) setStyle(gen.style);

      // Default to modify mode (not exact copy)
      setReferenceStrength(0.6);
      // Ensure image mode
      setMode('image');
      
      // IMPORTANT: Do not touch seed or lockSeed in modify-friendly function
    } catch (e) {
      console.warn('Failed to apply asset parameters:', e);
    }
  }, [setMode, setReferenceStrength, setSelectedModel, setAspectRatio, setShotType, setCameraAngle, setStyle]);

  const applyExactCopyParamsFromItem = useCallback((item: UnifiedAsset) => {
    console.log('🎯 Applying exact copy parameters from item:', item);
    
    try {
      // Apply seed and lock it for exact copy
      if (item.metadata?.seed) {
        setLockSeed(true);
        setWasSetByExactCopy(true); // Track that this was set by exact copy
      }
      
      if (item.metadata?.modelType) {
        setSelectedModel({ 
          id: item.metadata.modelType === 'replicate' ? 'rv51' : 'sdxl',
          type: item.metadata.modelType === 'replicate' ? 'replicate' : 'sdxl',
          display_name: item.metadata.modelType === 'replicate' ? 'RV5.1' : 'SDXL'
        });
      }

      // Apply generation parameters from metadata
      const gen = item.metadata?.generationParams || {};
      if (gen.aspectRatio) setAspectRatio(gen.aspectRatio);
      if (gen.shotType) setShotType(gen.shotType);
      if (gen.cameraAngle) setCameraAngle(gen.cameraAngle);
      if (gen.style) setStyle(gen.style);

      // High strength for exact copy
      setReferenceStrength(0.9);
      setExactCopyMode(true);
      setUseOriginalParams(true);
      // Ensure image mode
      setMode('image');
    } catch (e) {
      console.warn('Failed to apply exact copy parameters:', e);
    }
  }, [setMode, setReferenceStrength, setExactCopyMode, setUseOriginalParams, setLockSeed, setSelectedModel, setAspectRatio, setShotType, setCameraAngle, setStyle]);

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
    referenceImageUrl,
    referenceStrength,
    contentType,
    quality,
    selectedModel,
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
          // Preserve original storage path for signing, add signedUrl if available
          signedUrl: signedUrls.get(asset.id),
          // Keep original url (storage path) intact for AssetMappers to use
          url: asset.url
        }))
      ]
    ),
    activeJobId,
    lightboxIndex,
    referenceMetadata,
    enhancementModel,
    userPreferredModel,
    referenceType,
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
    // Debug controls
    bypassEnhancement,
    hardOverride,
    // Clothing Edit Mode
    clothingEditMode,
    lockHair,
    originalClothingColor,
    targetGarments,
    
    // Actions
    updateMode: setMode,
    setPrompt,
    setReferenceImage,
    setReferenceImageUrl,
    setReferenceStrength,
    setContentType,
    setQuality,
    setSelectedModel,
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
    setReferenceType,
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
    applyExactCopyParamsFromItem,
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
        // Clear seed lock when switching from exact copy to modify mode
        if (wasSetByExactCopy) {
          setLockSeed(false);
          setWasSetByExactCopy(false);
        }
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
    // Debug controls
    setBypassEnhancement,
    setHardOverride,
    // Clothing Edit Mode
    setClothingEditMode,
    setLockHair,
    setOriginalClothingColor,
    setTargetGarments,
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