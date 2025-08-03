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
  
  // Real-time workspace items - Direct database query
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);

  // Integrate with existing hooks
  const { generateContent, isGenerating: generationInProgress, error: generationError } = useGeneration();

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

  // Direct database query for workspace items
  useEffect(() => {
    const loadWorkspaceItems = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('🔄 WORKSPACE: Loading workspace items for user:', user.id);
        
        const { data, error } = await (supabase as any)
          .from('workspace_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'generated')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ WORKSPACE: Error loading items:', error);
          return;
        }

        console.log('✅ WORKSPACE: Loaded items:', {
          count: data?.length || 0,
          items: data?.slice(0, 3).map((item: any) => ({
            id: item.id,
            content_type: item.content_type,
            prompt: item.prompt?.substring(0, 30) + '...'
          }))
        });

        // Convert database items to WorkspaceItem format
        const items: WorkspaceItem[] = data?.map((item: any) => ({
          id: String(item.id),
          url: item.url || '',
          prompt: item.prompt || 'Untitled',
          type: item.content_type as 'image' | 'video',
          modelType: item.model_type,
          quality: item.quality as 'fast' | 'high',
          seed: item.seed,
          referenceStrength: item.reference_strength,
          generationParams: {
            seed: item.seed,
            originalAssetId: String(item.id),
            timestamp: item.created_at
          }
        })) || [];

        setWorkspaceItems(items);
      } catch (error) {
        console.error('❌ WORKSPACE: Failed to load items:', error);
      }
    };

    loadWorkspaceItems();

    // Set up real-time subscription for workspace items
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('workspace-items-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workspace_items',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 WORKSPACE: Real-time update:', payload);
            loadWorkspaceItems(); // Reload on any change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, []);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🧹 WORKSPACE: Clearing all workspace items');

      // Delete all workspace items for this user
      const { error } = await (supabase as any)
        .from('workspace_items')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'generated');

      if (error) throw error;

      setWorkspaceItems([]);
      
      toast({
        title: "Workspace Cleared",
        description: "All items have been removed from workspace",
      });
    } catch (error) {
      console.error('❌ WORKSPACE: Clear failed:', error);
      toast({
        title: "Failed to Clear Workspace",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  const deleteItem = useCallback(async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🗑️ WORKSPACE: Deleting item:', itemId);

      const { error } = await supabase.functions.invoke('delete-workspace-item', {
        body: { item_id: itemId, user_id: user.id }
      });

      if (error) throw error;

      // Update local state immediately
      setWorkspaceItems(prev => prev.filter(item => item.id !== itemId));

      toast({
        title: "Item Deleted",
        description: "Item removed from workspace and storage",
      });
    } catch (error) {
      console.error('❌ WORKSPACE: Delete failed:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  const addToWorkspace = useCallback(async (item: WorkspaceItem) => {
    try {
      console.log('➕ WORKSPACE: Adding item to workspace:', item.id);
      // Items are already in workspace when generated
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
  }, [toast]);

  const editItem = useCallback((item: WorkspaceItem) => {
    setPrompt(item.prompt);
    // TODO: Implement edit functionality with actual asset editing
    console.log('Edit item:', item);
  }, []);

  const saveItem = useCallback(async (item: WorkspaceItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('💾 WORKSPACE: Saving item to library:', item.id);

      // Mark as saved in database
      const { error } = await (supabase as any)
        .from('workspace_items')
        .update({ status: 'saved' })
        .eq('id', item.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state to mark as saved
      setWorkspaceItems(prev =>
        prev.map(existingItem =>
          existingItem.id === item.id
            ? { ...existingItem, status: 'saved' as any }
            : existingItem
        )
      );

      toast({
        title: "Item Saved",
        description: "Item saved to your library permanently",
      });

      return true;
    } catch (error) {
      console.error('❌ WORKSPACE: Save failed:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Please try again",
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