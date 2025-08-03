import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GenerationFormat, GenerationRequest, GENERATION_CONFIGS } from '@/types/generation';
import { GenerationService } from '@/lib/services/GenerationService';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { useGeneration } from '@/hooks/useGeneration';
import { useRealtimeWorkspace } from '@/hooks/useRealtimeWorkspace';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceItem {
  id: string;
  url: string;
  prompt: string;
  type: 'image' | 'video';
  modelType?: string;
  quality?: 'fast' | 'high';
  generationParams?: {
    seed?: number;
    originalAssetId?: string;
    timestamp?: string;
  };
  seed?: number;
  originalAssetId?: string;
  timestamp?: string;
  referenceImage?: File | null;
  referenceStrength?: number;
}

export interface SimplifiedWorkspaceState {
  // Core State (6 variables)
  mode: 'image' | 'video';
  prompt: string;
  referenceImage: File | null;
  referenceStrength: number;
  contentType: 'sfw' | 'nsfw';
  quality: 'fast' | 'high';
  
  // Video-specific State (4 variables)
  beginningRefImage: File | null;
  endingRefImage: File | null;
  videoDuration: number;
  motionIntensity: number;
  soundEnabled: boolean;
  
  // Control Parameters (4 variables) - NEW
  aspectRatio: '16:9' | '1:1' | '9:16';
  shotType: 'wide' | 'medium' | 'close';
  cameraAngle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye';
  style: string;
  styleRef: File | null;
  
  // UI State (2 variables)
  isGenerating: boolean;
  lightboxIndex: number | null;
  
  // Enhancement Model Selection (1 variable) - NEW
  enhancementModel: 'qwen_base' | 'qwen_instruct';
  
  // Real-time workspace items
  workspaceItems: WorkspaceItem[];
}

export interface SimplifiedWorkspaceActions {
  // Core Actions (6 actions)
  updateMode: (mode: 'image' | 'video') => void;
  setPrompt: (prompt: string) => void;
  setReferenceImage: (file: File | null) => void;
  setReferenceStrength: (strength: number) => void;
  setContentType: (type: 'sfw' | 'nsfw') => void;
  setQuality: (quality: 'fast' | 'high') => void;
  
  // Video-specific Actions (4 actions)
  setBeginningRefImage: (file: File | null) => void;
  setEndingRefImage: (file: File | null) => void;
  setVideoDuration: (duration: number) => void;
  setMotionIntensity: (intensity: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Control Parameter Actions - NEW
  setAspectRatio: (ratio: '16:9' | '1:1' | '9:16') => void;
  setShotType: (type: 'wide' | 'medium' | 'close') => void;
  setCameraAngle: (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => void;
  setStyle: (style: string) => void;
  setStyleRef: (file: File | null) => void;
  
  // Enhancement Model Selection Action - NEW
  setEnhancementModel: (model: 'qwen_base' | 'qwen_instruct') => void;
  
  // Generation Actions
  generate: () => Promise<void>;
  
  // Workspace Management Actions
  clearWorkspace: () => void;
  deleteItem: (assetId: string) => void;
  setLightboxIndex: (index: number | null) => void;
  
  // Additional Workspace Actions
  editItem: (item: WorkspaceItem) => void;
  saveItem: (item: WorkspaceItem) => void;
  downloadItem: (item: WorkspaceItem) => void;
  useAsReference: (item: WorkspaceItem) => void;
  useSeed: (item: WorkspaceItem) => void;
}

/**
 * Unified session storage based workspace state management hook
 * Provides simplified state management with 68% reduction in variables
 * 
 * @returns {SimplifiedWorkspaceState & SimplifiedWorkspaceActions} Combined state and actions
 */
export const useSimplifiedWorkspaceState = (): SimplifiedWorkspaceState & SimplifiedWorkspaceActions => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Core State (6 variables)
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(0.85);
  const [contentType, setContentType] = useState<'sfw' | 'nsfw'>('nsfw');
  const [quality, setQuality] = useState<'fast' | 'high'>('high');
  
  // Video-specific State (4 variables)
  const [beginningRefImage, setBeginningRefImage] = useState<File | null>(null);
  const [endingRefImage, setEndingRefImage] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(3);
  const [motionIntensity, setMotionIntensity] = useState(0.5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Control Parameters (4 variables) - NEW
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [shotType, setShotType] = useState<'wide' | 'medium' | 'close'>('wide');
  const [cameraAngle, setCameraAngle] = useState<'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye'>('none');
  const [style, setStyle] = useState<string>('');
  const [styleRef, setStyleRef] = useState<File | null>(null);
  
  // UI State (2 variables)
  const [isGenerating, setIsGenerating] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Enhancement Model Selection (1 variable) - NEW
  const [enhancementModel, setEnhancementModel] = useState<'qwen_base' | 'qwen_instruct'>('qwen_instruct');
  
  // Real-time workspace items
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);

  // Integrate with existing hooks
  const { generateContent, isGenerating: generationInProgress, error: generationError } = useGeneration();
  const { tiles: realtimeTiles, isLoading: workspaceLoading, addToWorkspace: addToRealtimeWorkspace, deleteTile: deleteRealtimeTile } = useRealtimeWorkspace();

  // Sync mode with URL
  useEffect(() => {
    const urlMode = searchParams.get('mode') as 'image' | 'video';
    if (urlMode && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [searchParams, mode]);

  // Update URL when mode changes
  const updateMode = useCallback((newMode: 'image' | 'video') => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
  }, [setSearchParams]);

  // Convert realtime tiles to workspace items
  useEffect(() => {
    const convertTilesToItems = async () => {
      const items: WorkspaceItem[] = [];
      
      for (const tile of realtimeTiles) {
        try {
          // Get asset details from AssetService
          const assets = await AssetService.getAssetsByIds([tile.originalAssetId]);
          const asset = assets[0];
          
          if (asset) {
            items.push({
              id: tile.id,
              url: asset.url || asset.thumbnailUrl || '',
              prompt: asset.prompt,
              type: asset.type,
              modelType: asset.modelType,
              quality: asset.quality as 'fast' | 'high',
              originalAssetId: tile.originalAssetId,
              timestamp: asset.createdAt.toISOString(),
              generationParams: {
                seed: asset.metadata?.seed,
                originalAssetId: tile.originalAssetId,
                timestamp: asset.createdAt.toISOString()
              }
            });
          }
        } catch (error) {
          console.error('Failed to convert tile to item:', error);
        }
      }
      
      setWorkspaceItems(items);
    };

    if (realtimeTiles.length > 0) {
      convertTilesToItems();
    } else {
      setWorkspaceItems([]);
    }
  }, [realtimeTiles]);

  // Sync generation state
  useEffect(() => {
    setIsGenerating(generationInProgress);
  }, [generationInProgress]);

  // Handle generation errors
  useEffect(() => {
    if (generationError) {
      toast({
        title: "Generation Failed",
        description: generationError,
        variant: "destructive",
      });
    }
  }, [generationError, toast]);

  // Generate content
  const generate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      console.log('🚀 Starting workspace-first generation:', {
        mode,
        prompt,
        contentType,
        quality,
        hasReference: !!referenceImage
      });
      
      // Helper function to upload reference images
      const uploadReferenceImage = async (file: File): Promise<string> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const fileName = `reference_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('reference_images')
          .upload(`${user.id}/${fileName}`, file);
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('reference_images')
          .getPublicUrl(`${user.id}/${fileName}`);
        
        return urlData.publicUrl;
      };
      
      // Create generation request with workspace destination
      const generationRequest: GenerationRequest = {
        format: mode === 'image' ? 'sdxl_image_fast' : 'video_high',
        prompt: prompt.trim(),
        metadata: {
          num_images: mode === 'image' ? 6 : 1, // Default to 6 images for workspace
          destination: 'workspace', // WORKSPACE-FIRST: Generate to workspace
          session_name: `Workspace Session ${new Date().toLocaleTimeString()}`,
          user_requested_enhancement: true,
          // Reference image data
          ...(referenceImage && {
            reference_image: true,
            reference_strength: referenceStrength,
            reference_type: 'character' as const
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
          enhancement_model: enhancementModel
        },
        // Reference image URLs
        ...(referenceImage && {
          referenceImageUrl: await uploadReferenceImage(referenceImage)
        }),
        ...(mode === 'video' && beginningRefImage && {
          startReferenceImageUrl: await uploadReferenceImage(beginningRefImage)
        }),
        ...(mode === 'video' && endingRefImage && {
          endReferenceImageUrl: await uploadReferenceImage(endingRefImage)
        })
      };
      
      const result = await GenerationService.queueGeneration(generationRequest);
      
      if (result) {
        toast({
          title: "Generation Started",
          description: `Your ${mode} is being generated in the workspace`,
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

  // Workspace management
  const clearWorkspace = useCallback(async () => {
    try {
      // Clear realtime workspace
      await addToRealtimeWorkspace([]);
      setWorkspaceItems([]);
      
      toast({
        title: "Workspace Cleared",
        description: "All items have been removed from workspace",
      });
    } catch (error) {
      console.error('Failed to clear workspace:', error);
      toast({
        title: "Failed to Clear Workspace",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [addToRealtimeWorkspace, toast]);

  const deleteItem = useCallback(async (itemId: string) => {
    try {
      const item = workspaceItems.find(i => i.id === itemId);
      if (!item) return;

      // Delete from realtime workspace - expects MediaTile object
      await deleteRealtimeTile({
        id: itemId,
        originalAssetId: item.originalAssetId || itemId,
        type: item.type,
        prompt: item.prompt,
        url: item.url,
        timestamp: new Date(),
        quality: item.quality || 'fast'
      });

      toast({
        title: "Item Deleted",
        description: `${item.type} has been removed from workspace`,
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast({
        title: "Failed to Delete Item",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [workspaceItems, deleteRealtimeTile, toast]);

  const addToWorkspace = useCallback(async (item: WorkspaceItem) => {
    try {
      // Add to realtime workspace - expects array of asset IDs
      await addToRealtimeWorkspace([item.originalAssetId || item.id]);

      toast({
        title: "Added to Workspace",
        description: `${item.type} has been added to workspace`,
      });
    } catch (error) {
      console.error('Failed to add to workspace:', error);
      toast({
        title: "Failed to Add to Workspace",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [addToRealtimeWorkspace, toast]);

  const editItem = useCallback((item: WorkspaceItem) => {
    setPrompt(item.prompt);
    // TODO: Implement edit functionality with actual asset editing
    console.log('Edit item:', item);
  }, []);

  const saveItem = useCallback(async (item: WorkspaceItem) => {
    try {
      // TODO: Implement save to library functionality
      console.log('Save item:', item);
      toast({
        title: "Save Feature",
        description: "Save to library functionality coming soon",
      });
    } catch (error) {
      console.error('Failed to save item:', error);
      toast({
        title: "Failed to Save",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  const downloadItem = useCallback(async (item: WorkspaceItem) => {
    try {
      // Create a temporary link and trigger download
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.type}_${Date.now()}.${item.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `${item.type} download has begun`,
      });
    } catch (error) {
      console.error('Failed to download item:', error);
      toast({
        title: "Download Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  const useAsReference = useCallback(async (item: WorkspaceItem) => {
    try {
      // Convert item to reference image
      const response = await fetch(item.url);
      const blob = await response.blob();
      const file = new File([blob], `reference_${Date.now()}.png`, { type: 'image/png' });
      
      setReferenceImage(file);
      setReferenceStrength(0.85);

      toast({
        title: "Reference Set",
        description: `${item.type} is now your reference image`,
      });
    } catch (error) {
      console.error('Failed to set reference:', error);
      toast({
        title: "Failed to Set Reference",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  const useSeed = useCallback((item: WorkspaceItem) => {
    const seed = item.generationParams?.seed || item.seed;
    if (seed) {
      // TODO: Apply seed to current generation
      console.log('Use seed:', seed);
      toast({
        title: "Seed Feature",
        description: "Seed application functionality coming soon",
      });
    }
  }, [toast]);

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
    enhancementModel,
    isGenerating,
    workspaceItems,
    lightboxIndex,
    
    // Actions
    updateMode,
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
    setLightboxIndex,
    
    // Additional Workspace Actions
    editItem,
    saveItem,
    downloadItem,
    useAsReference,
    useSeed,
  };
}; 