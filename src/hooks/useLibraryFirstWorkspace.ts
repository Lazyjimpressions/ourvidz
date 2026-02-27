import { useState, useCallback, useEffect, useRef } from 'react';
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
import { useVideoModelSettings } from './useVideoModelSettings';
import { SlotRole, buildFigurePrefix, buildQuickScenePrompt, QUICK_SCENE_SLOTS } from '@/types/slotRoles';
import { stripToStoragePath } from '@/lib/utils/stripToStoragePath';

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
  selectedModel: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string } | null;
  
  // Video-specific State
  beginningRefImage: File | null;
  beginningRefImageUrl: string | null;
  endingRefImage: File | null;
  endingRefImageUrl: string | null;
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
  // Video Extend settings
  extendCrf: number;
  extendReverseVideo: boolean;
  sourceVideoDuration: number;
  // Per-keyframe strengths for video multi mode
  keyframeStrengths: number[];
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
  setSelectedModel: (model: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string } | null) => void;
  setBeginningRefImage: (image: File | null) => void;
  setBeginningRefImageUrl: (url: string | null) => void;
  setEndingRefImage: (image: File | null) => void;
  setEndingRefImageUrl: (url: string | null) => void;
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
  generate: (referenceImageUrl?: string | null, beginningRefImageUrl?: string | null, endingRefImageUrl?: string | null, seed?: number | null, additionalImageUrls?: string[], slotRoles?: SlotRole[], poseDescription?: string, videoSlotIsVideo?: boolean[], multiAdvancedParams?: { enableDetailPass?: boolean; constantRateFactor?: number; temporalAdainFactor?: number; toneMapCompressionRatio?: number; firstPassSteps?: number; secondPassSteps?: number }, motionRefVideoUrl?: string) => Promise<void>;
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
  // Video Extend settings
  setExtendCrf: (crf: number) => void;
  setExtendReverseVideo: (reverse: boolean) => void;
  setSourceVideoDuration: (duration: number) => void;
  // Per-keyframe strengths
  setKeyframeStrengths: (strengths: number[]) => void;
  
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
  const [contentType, setContentType] = useState<'sfw' | 'nsfw'>('nsfw');
  const [quality, setQuality] = useState<'fast' | 'high'>('high');
  // Model Type Selection
  // Fix 1: Synchronous lazy initializer — eliminates async race window for returning users
  const [selectedModel, setSelectedModelInternal] = useState<{ id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string; model_key?: string }>(() => {
    const savedModel = localStorage.getItem('workspace-selected-model');
    if (savedModel) {
      try {
        const parsed = JSON.parse(savedModel);
        if (parsed.id && parsed.type && parsed.display_name) {
          return parsed;
        }
      } catch (e) {}
    }
    return { id: 'sdxl', type: 'sdxl', display_name: 'SDXL' };
  });
  
  // Load default model on mount
  useEffect(() => {
    const initializeSelectedModel = async () => {
      // Check localStorage for full model object (new format)
      const savedModel = localStorage.getItem('workspace-selected-model');
      if (savedModel) {
        try {
          const parsed = JSON.parse(savedModel);
          if (parsed.id && parsed.type && parsed.display_name) {
            setSelectedModelInternal(parsed);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse saved model, using default');
        }
      }

      // Check old format for backwards compatibility
      const saved = localStorage.getItem('workspace-model-type');
      if (saved === 'replicate_rv51') {
        // Legacy - will be upgraded by components that have access to real models
        setSelectedModelInternal({ id: 'legacy-rv51', type: 'replicate', display_name: 'RV5.1' });
        return;
      } else if (saved === 'sdxl') {
        setSelectedModelInternal({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });
        return;
      }
      
      // Load default model from api_models table (non-local, default for generation)
      try {
        const { data: defaultModel, error } = await supabase
          .from('api_models')
          .select('id, model_key, display_name, api_providers!inner(name)')
          .eq('modality', 'image')
          .eq('is_active', true)
          .contains('default_for_tasks', ['t2i'])
          .order('priority', { ascending: true })
          .limit(1)
          .single();
        
        if (!error && defaultModel) {
          const providerName = (defaultModel.api_providers as any)?.name || '';
          const modelType = providerName === 'replicate' ? 'replicate' : 
                           providerName === 'fal' ? 'fal' : 'sdxl';
          setSelectedModelInternal({
            id: defaultModel.id,
            type: modelType,
            display_name: defaultModel.display_name,
            model_key: defaultModel.model_key
          });
          return;
        }
      } catch (err) {
        console.warn('⚠️ Could not load default model from database:', err);
      }
      
      // Fallback to SDXL if database query fails
      setSelectedModelInternal({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });
    };
    
    initializeSelectedModel();
  }, []);
  
  // Video-specific State
  const [beginningRefImage, setBeginningRefImage] = useState<File | null>(null);
  const [beginningRefImageUrl, setBeginningRefImageUrl] = useState<string | null>(null);
  const [endingRefImage, setEndingRefImage] = useState<File | null>(null);
  const [endingRefImageUrl, setEndingRefImageUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(5);
  const [motionIntensity, setMotionIntensity] = useState(0.5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Sync videoDuration with model's default when model changes
  const { settings: videoSettings } = useVideoModelSettings(
    mode === 'video' ? selectedModel?.id || null : null
  );
  
  useEffect(() => {
    if (videoSettings?.defaultDuration) {
      setVideoDuration(videoSettings.defaultDuration);
    }
  }, [videoSettings?.defaultDuration]);
  
  // Control Parameters
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('1:1');
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
  
  // Wrapper to persist changes and handle I2I/T2I mode switching
  // Moved here after all state declarations to avoid initialization order issues
  const setSelectedModel = useCallback((newModel: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string } | null) => {
    if (!newModel) return;
    console.log('🔄 Model selection changed to:', newModel);
    
    // Save full model object (new format) - do this synchronously first
    localStorage.setItem('workspace-selected-model', JSON.stringify(newModel));
    
    // Fix 2: Keep old format for backwards compatibility — correctly map fal types
    const saveValue = newModel.type === 'replicate' ? 'replicate_rv51'
                    : newModel.type === 'fal' ? `fal_${newModel.id}`
                    : 'sdxl';
    localStorage.setItem('workspace-model-type', saveValue);
    
    // Update state immediately (synchronous)
    setSelectedModelInternal(newModel);
    
    // Check I2I support asynchronously (fire-and-forget)
    // This prevents blocking the UI while checking model capabilities
    (async () => {
      try {
        // Check if the new model supports I2I
        // SDXL always supports I2I, but API models need to be checked
        let modelSupportsI2I = false;
        
        if (newModel.id === 'sdxl' || newModel.type === 'sdxl') {
          // SDXL always supports I2I
          modelSupportsI2I = true;
        } else {
          // For API models, check capabilities from database
          const { data: modelData, error } = await supabase
            .from('api_models')
            .select('capabilities, model_key')
            .eq('id', newModel.id)
            .single();
          
          if (!error && modelData) {
            const capabilities = modelData.capabilities as any;
              // Check if model supports I2I using capabilities (no hard-coded checks)
              modelSupportsI2I = capabilities?.supports_i2i === true || 
                                    capabilities?.reference_images === true ||
                                    capabilities?.supports_i2v === true ||
                                    capabilities?.video?.reference_mode === 'single' ||
                                    !!capabilities?.input_schema?.image_url ||
                                    !!capabilities?.input_schema?.video;
              
              console.log('🔍 Model I2I support check:', {
                modelId: newModel.id,
                modelKey: modelData.model_key,
                displayName: newModel.display_name,
                supportsI2I: modelSupportsI2I,
                capabilities: capabilities
              });
          }
        }
        
        // If model doesn't support I2I and we have a reference image, clear it
        if (!modelSupportsI2I && (referenceImage || referenceImageUrl)) {
          console.log('🧹 Clearing reference image - selected model does not support I2I');
          setReferenceImage(null);
          setReferenceImageUrl(null);
          setReferenceMetadata(null);
          setExactCopyMode(false);
        }
      } catch (err) {
        console.warn('⚠️ Could not check model capabilities:', err);
        // On error, clear reference image to be safe (assume T2I)
        if (referenceImage || referenceImageUrl) {
          console.log('🧹 Clearing reference image - error checking model capabilities, assuming T2I');
          setReferenceImage(null);
          setReferenceImageUrl(null);
          setReferenceMetadata(null);
          setExactCopyMode(false);
        } else {
          console.log('✅ Keeping reference image - model appears to be I2I despite check error');
        }
      }
    })();
  }, [referenceImage, referenceImageUrl]);
  
  // Sync referenceImageUrl with beginningRefImageUrl so it persists across image/video modes
  // When referenceImageUrl is set, also set beginningRefImageUrl (for video mode)
  useEffect(() => {
    if (referenceImageUrl && referenceImageUrl !== beginningRefImageUrl) {
      setBeginningRefImageUrl(referenceImageUrl);
      console.log('🔄 Synced referenceImageUrl to beginningRefImageUrl:', referenceImageUrl.substring(0, 60) + '...');
    }
  }, [referenceImageUrl, beginningRefImageUrl]);
  
  // Sync beginningRefImageUrl back to referenceImageUrl when switching to image mode
  useEffect(() => {
    if (mode === 'image' && beginningRefImageUrl && beginningRefImageUrl !== referenceImageUrl) {
      setReferenceImageUrl(beginningRefImageUrl);
      console.log('🔄 Synced beginningRefImageUrl to referenceImageUrl (switched to image mode):', beginningRefImageUrl.substring(0, 60) + '...');
    }
  }, [mode, beginningRefImageUrl, referenceImageUrl]);
  
  // Enhancement Model Selection
  const [enhancementModel, setEnhancementModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');
  const [userPreferredModel, setUserPreferredModel] = useState<'qwen_base' | 'qwen_instruct' | 'none'>('qwen_instruct');
  
  // Reference Type Selection (default to character for modify mode)
  const [referenceType, setReferenceType] = useState<'style' | 'character' | 'composition'>('character');

  // Advanced SDXL Settings (modify mode defaults)
  const [numImages, setNumImages] = useState(1);
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
  // Video Extend settings
  const [extendCrf, setExtendCrf] = useState(35);
  const [extendReverseVideo, setExtendReverseVideo] = useState(false);
  const [sourceVideoDuration, setSourceVideoDuration] = useState(0);
  // Per-keyframe strengths for video multi mode (5 slots)
  const [keyframeStrengths, setKeyframeStrengths] = useState<number[]>([1, 1, 1, 1, 1]);

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
            console.log('🎉 NEW WORKSPACE ASSET - Invalidating immediately:', asset);
            // Fix: Invalidate immediately for INSERTs (user is waiting), skip debounce
            queryClient.invalidateQueries({ queryKey: ['assets', true] }).then(() => {
              // Fix: Only remove optimistic placeholder AFTER cache has real data
              if (asset.job_id) {
                console.log('✅ Cache refreshed, removing optimistic placeholder for job:', asset.job_id);
                setOptimisticAssets(prev => prev.filter(a => a.metadata?.job_id !== asset.job_id));
              }
            });
            
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

  // POLLING FALLBACK: Check for completed jobs when optimistic placeholders are active
  // Uses a ref to avoid re-creating the interval on every optimisticAssets change
  const optimisticAssetsRef = useRef(optimisticAssets);
  optimisticAssetsRef.current = optimisticAssets;

  useEffect(() => {
    if (optimisticAssets.length === 0) return;

    const interval = setInterval(async () => {
      const current = optimisticAssetsRef.current;
      if (current.length === 0) return;

      const jobIds = current
        .map(a => a.metadata?.job_id)
        .filter(Boolean) as string[];

      if (jobIds.length === 0) return;

      console.log('🔍 Polling fallback: checking', jobIds.length, 'active jobs');

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status')
        .in('id', jobIds);

      const completedJobs = jobs?.filter(j => j.status === 'completed' || j.status === 'failed') || [];

      if (completedJobs.length > 0) {
        console.log('✅ Polling fallback: found', completedJobs.length, 'completed jobs, refreshing cache');
        await queryClient.invalidateQueries({ queryKey: ['assets', true] });
        setOptimisticAssets(prev =>
          prev.filter(a => !completedJobs.some(j => j.id === a.metadata?.job_id))
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [optimisticAssets.length > 0, queryClient]); // Only re-create when transitioning between 0 and non-zero

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
    overrideBeginningRefImageUrl?: string | null, 
    overrideEndingRefImageUrl?: string | null,
    overrideSeed?: number | null,
    additionalImageUrls?: string[],
    slotRoles?: SlotRole[],
    poseDescription?: string,
    videoSlotIsVideo?: boolean[],
    multiAdvancedParams?: { enableDetailPass?: boolean; constantRateFactor?: number; temporalAdainFactor?: number; toneMapCompressionRatio?: number; firstPassSteps?: number; secondPassSteps?: number },
    motionRefVideoUrl?: string
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
        console.log('📤 MOBILE DEBUG: Starting reference image upload:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isValidFile: file instanceof File,
          hasName: !!file.name,
          hasSize: file.size > 0
        });
        
        if (!file || !(file instanceof File)) {
          throw new Error('Invalid file object provided');
        }
        
        if (file.size === 0) {
          throw new Error('File is empty');
        }
        
        const res = await uploadReferenceFile(file);
        if (res.error || !res.data?.path) {
          console.error('❌ MOBILE DEBUG: Reference image upload failed:', {
            error: res.error,
            hasData: !!res.data,
            hasPath: !!res.data?.path,
            path: res.data?.path
          });
          throw (res as any).error || new Error('Failed to upload reference image');
        }
        
        console.log('✅ MOBILE DEBUG: Reference image uploaded to:', res.data.path);
        
        const signed = await getReferenceImageUrl(res.data.path);
        if (!signed || typeof signed !== 'string' || signed.trim() === '') {
          console.error('❌ MOBILE DEBUG: Failed to sign reference image URL:', {
            signed,
            type: typeof signed,
            isEmpty: signed === '',
            isNull: signed === null,
            isUndefined: signed === undefined
          });
          throw new Error('Failed to sign reference image URL');
        }
        
        console.log('✅ MOBILE DEBUG: Reference image URL signed:', {
          url: signed.substring(0, 60) + '...',
          fullLength: signed.length,
          isValidUrl: signed.startsWith('http://') || signed.startsWith('https://')
        });
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
      } else {
        // Normal generation flow (no reference image) - prompt will be enhanced later if reference image is found
        finalPrompt = prompt.trim() || '';
        finalSeed = lockSeed && seed ? seed : undefined;
        
        console.log('🎯 NORMAL GENERATION MODE (will check for reference image later):', {
          finalPrompt,
          finalSeed,
          style,
          cameraAngle,
          shotType
        });
      }

      // DUAL-ROUTE ARCHITECTURE: Detect model provider for appropriate reference handling
      // API models (fal, replicate, openrouter) have different capabilities than local models (SDXL, WAN workers)
      const getModelProvider = (model: typeof selectedModel): 'fal' | 'replicate' | 'openrouter' | 'local' => {
        if (model?.type === 'fal') return 'fal';
        if (model?.type === 'replicate') return 'replicate';
        // Check for openrouter models by model_key pattern if needed
        return 'local'; // Default to local (SDXL/WAN workers)
      };
      
      const modelProvider = getModelProvider(selectedModel);
      const isApiRoute = ['fal', 'replicate', 'openrouter'].includes(modelProvider);
      const isLocalRoute = modelProvider === 'local';
      
      console.log('🔀 ROUTE DETECTION:', {
        modelProvider,
        isApiRoute,
        isLocalRoute,
        selectedModelType: selectedModel?.type,
        selectedModelId: selectedModel?.id
      });
      
      // Precompute signed reference URLs when needed
      // For video mode, use beginningRefImage or referenceImage
      // API models (fal.ai WAN 2.1 i2v): Only single reference supported
      // Local WAN workers: Start + end references supported
      const startRefUrl = mode === 'video'
        ? (overrideBeginningRefImageUrl || beginningRefImageUrl || 
           (beginningRefImage ? await uploadAndSignReference(beginningRefImage) : undefined) ||
           (referenceImageUrl || (referenceImage ? await uploadAndSignReference(referenceImage) : undefined)))
        : undefined;
      
      // Calculate endRefUrl for ALL video models (local + API MultiCondition)
      const endRefUrl = mode === 'video'
        ? (overrideEndingRefImageUrl || endingRefImageUrl || (endingRefImage ? await uploadAndSignReference(endingRefImage) : undefined))
        : undefined;

      // FIX: Compute effective reference URL BEFORE prompt enhancement (so we know if we have a reference image)
      console.log('🔍 MOBILE DEBUG - Reference image state before upload:', {
        hasOverrideUrl: !!overrideReferenceImageUrl,
        hasReferenceImageUrl: !!referenceImageUrl,
        hasReferenceImageFile: !!referenceImage,
        referenceImageFileName: referenceImage?.name,
        referenceImageFileSize: referenceImage?.size,
        referenceImageFileType: referenceImage?.type
      });
      
      let effRefUrl: string | undefined;
      
      try {
        if (overrideReferenceImageUrl) {
          effRefUrl = overrideReferenceImageUrl;
          console.log('✅ MOBILE DEBUG: Using override reference URL');
        } else if (referenceImageUrl) {
          effRefUrl = referenceImageUrl;
          console.log('✅ MOBILE DEBUG: Using existing reference URL');
        } else if (referenceImage) {
          console.log('📤 MOBILE DEBUG: Uploading reference image File...');
          effRefUrl = await uploadAndSignReference(referenceImage);
          console.log('✅ MOBILE DEBUG: Reference image uploaded successfully');
        } else {
          effRefUrl = undefined;
          console.log('⚠️ MOBILE DEBUG: No reference image provided');
        }
      } catch (uploadError) {
        console.error('❌ MOBILE DEBUG: Reference image upload failed:', uploadError);
        toast({
          title: "Reference Image Upload Failed",
          description: "Failed to upload reference image. Please try again.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
      
      console.log('🔍 MOBILE DEBUG - Effective reference URL after upload:', {
        effRefUrl: effRefUrl ? `${effRefUrl.substring(0, 60)}...` : 'MISSING',
        effRefUrlLength: effRefUrl?.length || 0,
        isValidUrl: effRefUrl ? (effRefUrl.startsWith('http://') || effRefUrl.startsWith('https://')) : false
      });
      
      // NOW enhance prompt if we have a reference image (but not in exact copy mode)
      if (!exactCopyMode && effRefUrl) {
        if (mode === 'video') {
          // I2V MODE: Do NOT wrap with identity-preservation boilerplate.
          // WAN 2.1 already receives the reference image via image_url — the prompt
          // should describe motion, camera, and scene changes instead.
          console.log('🎬 I2V MODE: Passing user prompt through without identity wrapping');
          finalPrompt = prompt.trim() || 'gentle motion, cinematic, high quality';
        } else {
          // IMAGE I2I MODE: Pass user prompt directly — no hardcoded wrapping.
          // Enhancement is handled by the enhance-prompt edge function if toggled on.
          console.log('🎯 I2I MODE: Passing user prompt through without identity wrapping');
          finalPrompt = prompt.trim() || 'enhance this image';
        }
        
        // Guard against seed-based near copies: clear lockSeed if it was set by exact copy
        finalSeed = (lockSeed && seed && !wasSetByExactCopy) ? seed : undefined;
        
        console.log('🎯 MODIFY MODE - ACTIVE (after upload):', {
          finalPrompt,
          finalSeed,
          hasReferenceMetadata: !!referenceMetadata,
          userModification: prompt.trim(),
          hasEffRefUrl: !!effRefUrl
        });
      }

      // Use the already computed reference strength from above

      // Fetch model_key from database if we have a model ID (for API models)
      let modelKey: string | undefined = selectedModel?.model_key;
      if (!modelKey && selectedModel?.id && selectedModel.id !== 'sdxl') {
        try {
          const { data: modelData } = await supabase
            .from('api_models')
            .select('model_key')
            .eq('id', selectedModel.id)
            .single();
          if (modelData) {
            modelKey = modelData.model_key;
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch model_key:', err);
        }
      }
      
      const generationRequest = {
        job_type: (mode === 'image'
          ? (selectedModel?.type === 'replicate'
              ? (quality === 'high' ? 'rv51_high' : 'rv51_fast')
              : selectedModel?.type === 'fal'
                ? 'fal_image'
                : (quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast'))
          : (selectedModel?.type === 'fal'
              ? 'fal_video'
              : (quality === 'high' ? 'wan_video_high' : 'wan_video_fast'))
        ),
        prompt: finalPrompt,
        quality: quality,
        // format omitted - let edge function default based on job_type
        model_type: mode === 'image'
          ? (selectedModel?.type === 'replicate' ? 'rv51' : selectedModel?.type === 'fal' ? 'sdxl' : 'sdxl')
          : (selectedModel?.type === 'fal' ? 'sdxl' : 'wan'),
        // Pass model_key for template lookup (preferred) or model_id as fallback
        model_key: modelKey || selectedModel?.id,
        model_id: selectedModel?.id,
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
            // DUAL-ROUTE: Only include end_reference_url for local workers (API models don't support it)
            start_reference_url: startRefUrl,
            ...(isLocalRoute && mode === 'video' && { end_reference_url: endRefUrl }),
            // Track model provider for downstream routing decisions
            model_provider: modelProvider,
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


      // Fix 3: Pre-generate guard — ALWAYS re-resolve provider type from DB for UUID model IDs
      // This catches stale localStorage, smart-model-switching race conditions, and type mismatches
      let effectiveModel = selectedModel;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedModel?.id || '');
      if (isUUID) {
        const { data: modelRow } = await supabase
          .from('api_models')
          .select('id, model_key, display_name, api_providers!inner(name)')
          .eq('id', selectedModel.id)
          .single();
        if (modelRow) {
          const pName = (modelRow.api_providers as any)?.name || '';
          const resolvedType = pName === 'fal' ? 'fal' : pName === 'replicate' ? 'replicate' : 'sdxl';
          if (resolvedType !== selectedModel?.type) {
            console.warn(`⚠️ Model type mismatch: stored=${selectedModel?.type}, actual=${resolvedType} — correcting`);
          }
          effectiveModel = { ...selectedModel, type: resolvedType };
          localStorage.setItem('workspace-selected-model', JSON.stringify(effectiveModel));
        }
      }

      // STAGING-FIRST: Route strictly by effectiveModel - Replicate/Fal go to respective edge functions, SDXL goes to queue-job
      const edgeFunction = effectiveModel?.type === 'fal'
        ? 'fal-image'
        : effectiveModel?.type === 'replicate'
          ? 'replicate-image'
          : 'queue-job';
      
      console.log('🚀 ROUTING:', {
        selectedModel,
        edgeFunction,
        job_type: generationRequest.job_type,
        enhancementModel: generationRequest.metadata?.enhancement_model,
        // Debug reference image for I2I
        hasReferenceImage: !!effRefUrl,
        referenceImageUrl: effRefUrl ? `${effRefUrl.substring(0, 60)}...` : 'none',
        referenceStrength: computedReferenceStrength
      });
      
      let requestPayload;
      
      if (effectiveModel?.type === 'replicate') {
        // Guard: Check if model ID is valid (not empty and not legacy)
        if (!selectedModel.id || selectedModel.id === 'legacy-rv51') {
          toast({
            title: "Model Selection Required",
            description: "Please select a valid Replicate model and try again",
            variant: "destructive",
          });
          setIsGenerating(false);
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
            scheduler: 'K_EULER',
            // I2I parameters for reference images
            image: effRefUrl || undefined,
            prompt_strength: effRefUrl ? (exactCopyMode ? 0.05 : (1 - computedReferenceStrength)) : undefined
          },
          metadata: {
            ...generationRequest.metadata,
            // Include reference image URL for server fallback
            reference_image_url: effRefUrl,
            // Pass content type for safety checker
            contentType: contentType,
            // Pass aspect ratio for server-side dimension mapping
            aspectRatio: finalAspectRatio
          }
        };
      } else if (selectedModel?.type === 'fal') {
        // Guard: Check if model ID is valid
        if (!selectedModel.id) {
          toast({
            title: "Model Selection Required",
            description: "Please select a valid fal.ai model and try again",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }

        // Convert aspect ratio to width/height for fal.ai (min 1024)
        const aspectRatioMap: Record<string, { width: number; height: number }> = {
          '1:1': { width: 1024, height: 1024 },
          '16:9': { width: 1344, height: 768 },
          '9:16': { width: 768, height: 1344 },
          '3:2': { width: 1216, height: 832 },
          '2:3': { width: 832, height: 1216 }
        };
        const dimensions = aspectRatioMap[finalAspectRatio] || { width: 1024, height: 1024 };

        // Build fal.ai-specific payload (supports both image and video)
        const isFalVideo = mode === 'video';
        
        // Check if this video model requires a reference image (I2V) using capabilities from the already-loaded model data
        let videoRequiresRefImage = false;
        let cachedCaps: any = {};
        let modelTasks: string[] = [];
        if (isFalVideo && selectedModel.id) {
          try {
            const { data: modelData } = await supabase
              .from('api_models')
              .select('capabilities, tasks')
              .eq('id', selectedModel.id)
              .single();
            cachedCaps = (modelData?.capabilities as any) || {};
            modelTasks = (modelData as any)?.tasks || [];
            videoRequiresRefImage = cachedCaps?.input_schema?.image_url?.required === true ||
                                   cachedCaps?.input_schema?.video?.required === true || // V2V extend models
                                   cachedCaps?.supports_i2v === true ||
                                   cachedCaps?.video?.reference_mode === 'single' ||
                                   cachedCaps?.video?.reference_mode === 'dual';
          } catch (err) {
            console.warn('⚠️ Could not check model capabilities');
          }
        }
        
        // Validate reference image URL ONLY for I2I requests (not T2I)
        // Check if this is an I2I-capable model that requires a reference image
        const hasReferenceImage = !!(referenceImage || referenceImageUrl || effRefUrl || startRefUrl || (additionalImageUrls && additionalImageUrls.some(u => u && u.trim() !== '')));
        const isI2IRequest = hasReferenceImage && !isFalVideo;
        const isI2VRequest = hasReferenceImage && isFalVideo;
        
        // CRITICAL DEBUG: Log reference image state before validation
        console.log('🔍 MOBILE DEBUG - Reference image validation check:', {
          hasReferenceImageFile: !!referenceImage,
          hasReferenceImageUrl: !!referenceImageUrl,
          hasEffRefUrl: !!effRefUrl,
          hasStartRefUrl: !!startRefUrl,
          isI2IRequest,
          isFalVideo,
          selectedModelId: selectedModel.id,
          selectedModelType: selectedModel.type,
          selectedModelDisplayName: selectedModel.display_name
        });
        
        // Generic I2V validation: if model requires a reference image, block without one
        if (isFalVideo && videoRequiresRefImage && !startRefUrl && !effRefUrl) {
          console.error('❌ This video model requires a reference image');
          toast({
            title: "Reference Image Required",
            description: "This model requires a reference image for video generation",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        
        // Validate reference image for I2I requests
        // Allow multi-ref: if effRefUrl is missing but additionalImageUrls has images, still valid
        const hasAdditionalRefs = additionalImageUrls && additionalImageUrls.some(u => u && typeof u === 'string' && u.trim() !== '');
        if (isI2IRequest && !effRefUrl && !hasAdditionalRefs) {
          // If we have a file but no URL, the upload might have failed
          if (referenceImage) {
            console.error('❌ I2I request: Reference image file exists but upload failed or URL not available');
            toast({
              title: "Reference Image Upload Failed",
              description: "The reference image file was selected but couldn't be uploaded. Please try selecting it again.",
              variant: "destructive",
            });
          } else {
            console.error('❌ I2I request to fal.ai but no reference image URL available');
            toast({
              title: "Reference Image Required",
              description: "Please select or upload a reference image for I2I generation",
              variant: "destructive",
            });
          }
          setIsGenerating(false);
          return;
        }
        
        // Build input object
        const inputObj: any = {
          image_size: dimensions,
          num_inference_steps: steps,
          guidance_scale: guidanceScale,
          negative_prompt: negativePrompt,
          seed: lockSeed && finalSeed ? finalSeed : undefined,
        };
        
        // I2I parameters for reference images (image mode)
        if (!isFalVideo) {
          // Build image_urls array from all ref slots (multi-ref support)
          const allRefUrls: string[] = [];
          if (effRefUrl && typeof effRefUrl === 'string' && effRefUrl.trim() !== '') {
            allRefUrls.push(stripToStoragePath(effRefUrl));
          }
          if (additionalImageUrls && additionalImageUrls.length > 0) {
            for (const url of additionalImageUrls) {
              if (url && typeof url === 'string' && url.trim() !== '') {
                allRefUrls.push(stripToStoragePath(url));
              }
            }
          }

          // Mutable model reference — Quick Scene may auto-switch if selected model can't handle ref count
          let effectiveModel = { ...selectedModel };
          
          if (allRefUrls.length > 1) {
            // Multi-ref: send as image_urls array (for Seedream, Flux-2 etc.)
            inputObj.image_urls = allRefUrls;
            inputObj.strength = computedReferenceStrength;
            console.log('✅ Multi-ref: Added image_urls array with', allRefUrls.length, 'images');
            
            // Quick Scene mode: use deterministic prompt when we have 3-5 refs
            // (Char A, Char B, Pose, optional Scene, optional Outfit)
            const isQuickScene = allRefUrls.length >= 3 && allRefUrls.length <= 5;
            
           if (isQuickScene) {
              const hasScene = allRefUrls.length >= 4;
              const hasOutfit = allRefUrls.length >= 5;
              // Replace the user prompt with the full Quick Scene system prompt
              finalPrompt = buildQuickScenePrompt(finalPrompt, hasScene, hasOutfit, 'Both', poseDescription);
              console.log('🎯 Quick Scene: Built deterministic system prompt (hasScene:', hasScene, 'hasOutfit:', hasOutfit, ')');
              
              // Validate selected model supports enough image refs
              // Fetch max_images from the selected model's capabilities
              try {
                const { data: selModelCaps } = await supabase
                  .from('api_models')
                  .select('capabilities')
                  .eq('id', selectedModel.id)
                  .single();
                const maxImages = (selModelCaps?.capabilities as any)?.max_images;
                if (maxImages && allRefUrls.length > maxImages) {
                  console.warn(`⚠️ Selected model supports max ${maxImages} images but ${allRefUrls.length} provided. Auto-switching to Seedream v4.5 Edit.`);
                  // Find a model that supports enough refs
                  const { data: fallbackModel } = await supabase
                    .from('api_models')
                    .select('id, display_name, model_key')
                    .eq('is_active', true)
                    .gte('capabilities->>max_images', String(allRefUrls.length))
                    .order('priority', { ascending: false })
                    .limit(1)
                    .single();
                  if (fallbackModel) {
                    console.log(`✅ Auto-switched to ${fallbackModel.display_name} (${fallbackModel.model_key}) for ${allRefUrls.length}-image Quick Scene`);
                    effectiveModel = { ...effectiveModel, id: fallbackModel.id, display_name: fallbackModel.display_name, model_key: fallbackModel.model_key };
                  }
                } else if (!maxImages) {
                  // Model has no max_images defined — check if it's NOT a known multi-ref model
                  // Default fal.ai limit is 4 for most edit models
                  const DEFAULT_FAL_MAX = 4;
                  if (allRefUrls.length > DEFAULT_FAL_MAX) {
                    console.warn(`⚠️ Selected model has no max_images cap (assumed ${DEFAULT_FAL_MAX}) but ${allRefUrls.length} refs provided. Auto-switching.`);
                    const { data: fallbackModel } = await supabase
                      .from('api_models')
                      .select('id, display_name, model_key')
                      .eq('is_active', true)
                      .gte('capabilities->>max_images', String(allRefUrls.length))
                      .order('priority', { ascending: false })
                      .limit(1)
                      .single();
                    if (fallbackModel) {
                      console.log(`✅ Auto-switched to ${fallbackModel.display_name} (${fallbackModel.model_key})`);
                      effectiveModel = { ...effectiveModel, id: fallbackModel.id, display_name: fallbackModel.display_name, model_key: fallbackModel.model_key };
                    }
                  }
                }
              } catch (err) {
                console.warn('⚠️ Could not validate model max_images capability:', err);
              }
               
               // num_characters will be set after requestPayload is built (see below)
             } else {
              // Fallback: legacy Figure notation for non-Quick-Scene multi-ref
              const filledSlots: { figureIndex: number; role: SlotRole }[] = allRefUrls.map((_, i) => ({
                figureIndex: i + 1,
                role: slotRoles?.[i] || 'reference',
              }));
              
              const figurePrefix = buildFigurePrefix(filledSlots);
              
              if (figurePrefix && !finalPrompt.includes('Figure ')) {
                finalPrompt = figurePrefix + finalPrompt;
                console.log('🎯 Legacy: Auto-injected Figure notation:', figurePrefix);
              }
            }
          } else if (allRefUrls.length === 1) {
            // Single ref: send as image_url (standard I2I)
            inputObj.image_url = allRefUrls[0];
            inputObj.strength = computedReferenceStrength;
            console.log('✅ Single ref: Added image_url to inputObj:', allRefUrls[0].substring(0, 60) + '...');
          } else {
            console.log('ℹ️ No reference images for this generation');
          }
        }
        
        // Video-specific parameters (model-agnostic: edge function applies input_defaults and schema filtering)
        if (isFalVideo) {
          const refImageUrl = startRefUrl || effRefUrl;
          
          // Check if this is a video extend model (uses cached caps from validation above)
          const isExtendModel = cachedCaps?.input_schema?.video?.required === true;
          // Check if this is a MultiCondition model (supports images[] array with temporal positions)
           const isMultiModel = modelTasks.includes('multi');
          
          if (isExtendModel && refImageUrl) {
            // fal.ai LTX extend expects `video` as a plain URL string
            inputObj.video = stripToStoragePath(refImageUrl);
            // Pass source video duration for tail-conditioning computation in edge function
            inputObj.source_video_duration = sourceVideoDuration || 0;
            // reverse_video is a top-level param in the schema
            if (extendReverseVideo) inputObj.reverse_video = true;
            // constant_rate_factor: compress input video to match training data
            if (extendCrf !== 35) inputObj.constant_rate_factor = extendCrf;
          } else if (isMultiModel && refImageUrl) {
            // MultiCondition: build images[] from image keyframe slots, videos[] from motionRefVideoUrl
            const { autoSpaceFrames } = await import('@/types/videoSlots');
            // Gather all image ref URLs: start (slot 0), additionalRefs (slots 1-3), end (slot 4)
            const filledEntries: { url: string; slotIndex: number }[] = [];
            if (refImageUrl) filledEntries.push({ url: stripToStoragePath(refImageUrl), slotIndex: 0 });
            if (additionalImageUrls) {
              additionalImageUrls.forEach((url, i) => {
                if (url && typeof url === 'string' && url.trim() !== '') {
                  filledEntries.push({ url: stripToStoragePath(url), slotIndex: i + 1 });
                }
              });
            }
            if (endRefUrl) filledEntries.push({ url: stripToStoragePath(endRefUrl), slotIndex: 4 });
            // maxFrame must be < actual num_frames to avoid fal.ai 500 errors
            const fps = cachedCaps?.input_schema?.frame_rate?.default || 30;
            const actualNumFrames = (videoDuration || 5) * fps;
            const maxFrame = actualNumFrames - 1; // last valid frame index
            
            // All filled entries are images now (no more isVideo splitting)
            if (filledEntries.length > 0) {
              const imageFrames = autoSpaceFrames(filledEntries.length, maxFrame);
              inputObj.images = filledEntries.map((entry, i) => ({
                image_url: entry.url,
                start_frame_num: imageFrames[i],
                strength: keyframeStrengths[entry.slotIndex] ?? 1,
              }));
            }
            
            // Separate motion reference video (if provided)
            if (motionRefVideoUrl) {
              inputObj.videos = [{
                url: stripToStoragePath(motionRefVideoUrl),
              }];
            }
            
            // Don't set image_url -- multi uses images[]/videos[] arrays
            delete inputObj.image_url;
            console.log(`🎬 MultiCondition: ${filledEntries.length} images, ${motionRefVideoUrl ? 1 : 0} motion ref video, strengths: ${filledEntries.map(e => keyframeStrengths[e.slotIndex] ?? 1).join(', ')}`);
          } else if (refImageUrl) {
            inputObj.image_url = stripToStoragePath(refImageUrl); // Standard I2V
          }
          inputObj.duration = videoDuration || 5;
          
          // MultiCondition advanced params
          if (multiAdvancedParams) {
            if (multiAdvancedParams.enableDetailPass) inputObj.enable_detail_pass = true;
            if (multiAdvancedParams.constantRateFactor !== undefined && multiAdvancedParams.constantRateFactor !== 29) inputObj.constant_rate_factor = multiAdvancedParams.constantRateFactor;
            if (multiAdvancedParams.temporalAdainFactor !== undefined && multiAdvancedParams.temporalAdainFactor !== 0.5) inputObj.temporal_adain_factor = multiAdvancedParams.temporalAdainFactor;
            if (multiAdvancedParams.toneMapCompressionRatio !== undefined && multiAdvancedParams.toneMapCompressionRatio !== 0) inputObj.tone_map_compression_ratio = multiAdvancedParams.toneMapCompressionRatio;
            if (multiAdvancedParams.firstPassSteps !== undefined && multiAdvancedParams.firstPassSteps !== 8) inputObj.first_pass_num_inference_steps = multiAdvancedParams.firstPassSteps;
            if (multiAdvancedParams.secondPassSteps !== undefined && multiAdvancedParams.secondPassSteps !== 8) inputObj.second_pass_num_inference_steps = multiAdvancedParams.secondPassSteps;
          }
        }
        
        // CRITICAL DEBUG: Log the payload before sending
        console.log('📤 MOBILE DEBUG - Payload before sending to fal-image:', {
          hasEffRefUrl: !!effRefUrl,
          effRefUrl: effRefUrl ? `${effRefUrl.substring(0, 60)}...` : 'MISSING',
          hasStartRefUrl: !!startRefUrl,
          hasEndRefUrl: !!endRefUrl,
          inputObj: {
            ...inputObj,
            image_url: inputObj.image_url ? `${inputObj.image_url.substring(0, 60)}...` : 'missing',
            image: inputObj.image ? `${inputObj.image.substring(0, 60)}...` : 'missing'
          },
          metadata: {
            ...generationRequest.metadata,
            reference_image_url: effRefUrl ? `${effRefUrl.substring(0, 60)}...` : 'missing'
          }
        });
        
        requestPayload = {
          prompt: finalPrompt,
          apiModelId: effectiveModel.id,
          job_type: isFalVideo ? 'fal_video' : 'fal_image',
          modality: isFalVideo ? 'video' : 'image',
          quality: quality,
          input: inputObj,
          metadata: {
            ...generationRequest.metadata,
            reference_image_url: effRefUrl,
            start_reference_url: startRefUrl,
            end_reference_url: endRefUrl,
            contentType: contentType,
            aspectRatio: finalAspectRatio,
            modality: isFalVideo ? 'video' : 'image',
            // Deferred from Quick Scene detection above
            num_characters: (() => {
              const numCharSlots = (effRefUrl ? 1 : 0) + (additionalImageUrls && additionalImageUrls.length >= 1 && additionalImageUrls[0] ? 1 : 0);
              return numCharSlots >= 2 ? 2 : undefined;
            })(),
            duration: isFalVideo ? videoDuration : undefined,
            motion_intensity: isFalVideo ? motionIntensity : undefined,
            video_requires_ref: videoRequiresRefImage // Generic I2V flag
          }
        };
        
        // CRITICAL DEBUG: Log the final payload
        console.log('📤 MOBILE DEBUG - Final payload:', {
          input_image_url: requestPayload.input?.image_url ? 'PRESENT' : 'MISSING',
          input_image: requestPayload.input?.image ? 'PRESENT' : 'MISSING',
          metadata_reference_image_url: requestPayload.metadata?.reference_image_url ? 'PRESENT' : 'MISSING',
          metadata_start_reference_url: requestPayload.metadata?.start_reference_url ? 'PRESENT' : 'MISSING',
          // Log actual values for debugging
          input_image_url_value: requestPayload.input?.image_url ? `${String(requestPayload.input.image_url).substring(0, 60)}...` : null,
          metadata_reference_image_url_value: requestPayload.metadata?.reference_image_url ? `${String(requestPayload.metadata.reference_image_url).substring(0, 60)}...` : null,
          // Log input object keys
          input_keys: Object.keys(requestPayload.input || {}),
          metadata_keys: Object.keys(requestPayload.metadata || {})
        });
        
        // CRITICAL: Double-check that image_url is included for I2I requests
        if (!isFalVideo && effRefUrl && !requestPayload.input?.image_url) {
          console.error('❌ MOBILE DEBUG: CRITICAL - effRefUrl exists but image_url is missing from payload!');
          console.error('❌ MOBILE DEBUG: Adding image_url to payload now...');
          requestPayload.input = requestPayload.input || {};
          requestPayload.input.image_url = effRefUrl;
          requestPayload.input.strength = computedReferenceStrength;
        }
      } else {
        // Use original payload for SDXL/WAN
        requestPayload = generationRequest;
      }

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: requestPayload
      });

      if (error) {
        console.error('❌ Generation error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          context: (error as any).context,
          status: (error as any).status,
          body: (error as any).body
        });
        
        // Enhanced error message for missing reference image
        let errorDescription = error.message || "Failed to generate content";
        if (error.message?.includes('image_urls') || error.message?.includes('image_url')) {
          errorDescription = "Reference image is required but was not found. Please select a reference image and try again.";
        } else if ((error as any).status === 422) {
          errorDescription = "Invalid request. Please check that your reference image is properly loaded.";
        }
        
        toast({
          title: "Generation Failed",
          description: errorDescription,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
      
      // Check for error in response data (non-2xx status codes)
      if (data && typeof data === 'object' && 'error' in data) {
        console.error('❌ Generation failed with error in response:', data);
        const errorData = data as any;
        let errorDescription = errorData.error || errorData.details || "Generation failed";
        
        if (errorDescription.includes('image_urls') || errorDescription.includes('image_url')) {
          errorDescription = "Reference image is required but was not found. Please select a reference image and try again.";
        }
        
        toast({
          title: "Generation Failed",
          description: errorDescription,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      console.log('✅ STAGING-FIRST: Generation request successful:', data);
      const jobId = data?.jobId as string | undefined;
      if (jobId) {
        // Create optimistic placeholders immediately
        const clampedCount = numImages <= 1 ? 1 : (numImages <= 3 ? 3 : 6);
        const count = mode === 'image' ? clampedCount : 1;
        const now = new Date();
        const placeholders: UnifiedAsset[] = Array.from({ length: count }, (_, i) => ({
          id: `optimistic-${jobId}-${i}`,
          type: mode,
          prompt: finalPrompt,
          createdAt: now,
          status: 'processing',
          url: undefined,
          modelType: mode === 'image' ? (selectedModel?.type === 'fal' || selectedModel?.type === 'replicate' ? selectedModel.display_name : 'SDXL') : 'WAN',
          duration: mode === 'video' ? (videoDuration || undefined) : undefined,
          metadata: {
            job_id: jobId,
            asset_index: i
          }
        }));
        setOptimisticAssets(prev => [...placeholders, ...prev]);
        setActiveJobId(jobId);
      }

      // CRITICAL: Force cache invalidation after generation to catch completed assets
      // API routes (fal/replicate) complete synchronously - their workspace_asset row
      // may already exist by the time this runs. Staggered invalidations ensure we
      // catch both fast (API) and slow (queue) completions even if Realtime misses.
      const invalidateCache = () => {
        queryClient.invalidateQueries({ queryKey: ['assets', true] });
      };
      // Immediate + staggered invalidations for reliability
      setTimeout(invalidateCache, 1500);
      setTimeout(invalidateCache, 4000);
      setTimeout(invalidateCache, 8000);
      // For queue-based jobs, also invalidate after longer delays
      if (edgeFunction === 'queue-job') {
        setTimeout(invalidateCache, 15000);
        setTimeout(invalidateCache, 30000);
      }
      
      // Show success message with model info
      const modelLabel = selectedModel?.type === 'fal'
        ? `${selectedModel.display_name} (fal.ai)`
        : selectedModel?.type === 'replicate'
          ? `${selectedModel.display_name} (replicate)`
          : 'SDXL/WAN (workers)';
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
          id: item.metadata.modelType === 'replicate' ? 'legacy-rv51' : 'sdxl',
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
          id: item.metadata.modelType === 'replicate' ? 'legacy-rv51' : 'sdxl',
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
    beginningRefImageUrl,
    endingRefImage,
    endingRefImageUrl,
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
    // Video Extend settings
    extendCrf,
    extendReverseVideo,
    sourceVideoDuration,
    // Per-keyframe strengths
    keyframeStrengths,
    
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
    setBeginningRefImageUrl,
    setEndingRefImage,
    setEndingRefImageUrl,
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
    // Video Extend settings
    setExtendCrf: (c: number) => setExtendCrf(c),
    setExtendReverseVideo: (r: boolean) => setExtendReverseVideo(r),
    setSourceVideoDuration: (d: number) => setSourceVideoDuration(d),
    // Per-keyframe strengths
    setKeyframeStrengths,
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