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
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
  // Enhanced workspace metadata for dragging
  enhancedPrompt?: string;
  seed?: number;
  generationParams?: Record<string, any>;
  jobId?: string; // Reference to job this item belongs to
  sessionId?: string; // Reference to session this item belongs to
  bucketName?: string; // Storage bucket for signed URL generation
  status?: 'generated' | 'saved' | 'deleted'; // Item status
}

export interface WorkspaceJob {
  id: string; // job_id from database
  sessionId: string;
  prompt: string;
  items: WorkspaceItem[]; // 3 items for images, 1 for video
  createdAt: Date;
  type: 'image' | 'video';
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
  
  // UI State
  isGenerating: boolean;
  workspaceItems: WorkspaceItem[];
  workspaceJobs: WorkspaceJob[];
  activeJobId: string | null;
  lightboxIndex: number | null;
  
  // Enhancement Model Selection (1 variable) - NEW
  enhancementModel: 'qwen_base' | 'qwen_instruct';
}

export interface SimplifiedWorkspaceActions {
  // Actions
  updateMode: (newMode: string) => void;
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
  generate: () => Promise<void>;
  clearWorkspace: () => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setLightboxIndex: (index: number | null) => void;
  // Job-level actions
  selectJob: (jobId: string) => void;
  deleteJob: (jobId: string) => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  useJobAsReference: (jobId: string) => void;
  // Legacy item actions for mobile compatibility
  editItem?: (item: WorkspaceItem) => void;
  saveItem?: (itemId: string) => Promise<boolean | undefined>;
  downloadItem?: (item: WorkspaceItem) => void;
  useAsReference?: (item: WorkspaceItem) => void;
  useSeed?: (item: WorkspaceItem) => void;
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
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);
  const [workspaceJobs, setWorkspaceJobs] = useState<WorkspaceJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Enhancement Model Selection (1 variable) - NEW
  const [enhancementModel, setEnhancementModel] = useState<'qwen_base' | 'qwen_instruct'>('qwen_instruct');

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
  const updateMode = useCallback((newMode: string) => {
    const modeValue = newMode as 'image' | 'video';
    setMode(modeValue);
    setSearchParams({ mode: modeValue });
  }, [setSearchParams]);

  // Load workspace jobs from database with real-time updates
  useEffect(() => {
    const loadWorkspaceJobs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('🔄 WORKSPACE: Loading workspace items for user:', user.id);
        
        // Get workspace items grouped by job_id using any typing
        const { data, error } = await supabase
          .from('workspace_items' as any)
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'deleted') // Show all items except deleted
          .order('created_at', { ascending: false }) as { data: any[] | null, error: any };

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

        // Group items by job_id and create jobs
        const jobMap = new Map<string, WorkspaceItem[]>();
        
        data?.forEach((item: any) => {
          // PHASE 3 FIX: Better job ID fallback strategy
          const jobId = item.job_id || `session_${item.session_id}_${item.created_at}`;
          
          const workspaceItem: WorkspaceItem = {
            id: String(item.id),
            url: item.url || '',
            prompt: item.prompt || '',
            type: item.content_type as 'image' | 'video',
            timestamp: new Date(item.created_at),
            quality: (item.quality as 'fast' | 'high') || 'high',
            modelType: item.model_type,
            thumbnailUrl: item.thumbnail_url,
            enhancedPrompt: item.enhanced_prompt,
            seed: item.seed,
            generationParams: item.generation_params || {},
            jobId: item.job_id,
            sessionId: item.session_id,
            // PHASE 2 FIX: Add bucket hint for signed URL generation
            bucketName: item.bucket_name,
            status: item.status as 'generated' | 'saved' | 'deleted' || 'generated'
          };

          if (!jobMap.has(jobId)) {
            jobMap.set(jobId, []);
          }
          jobMap.get(jobId)!.push(workspaceItem);
        });

        // Convert job map to WorkspaceJob array
        const jobs: WorkspaceJob[] = Array.from(jobMap.entries()).map(([jobId, items]) => {
          const firstItem = items[0];
          return {
            id: jobId,
            sessionId: firstItem.sessionId || '',
            prompt: firstItem.prompt,
            items: items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
            createdAt: firstItem.timestamp,
            type: firstItem.type
          };
        });

        // Sort jobs by creation time (newest first)
        jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setWorkspaceJobs(jobs);
        // Process items and generate signed URLs for display
        const processedItems = await Promise.all((data || []).map(async (item: any) => {
          let displayUrl = item.url || '';
          
          // Generate signed URL if we have storage path and bucket
          if (item.storage_path && item.bucket_name && !displayUrl.startsWith('http')) {
            try {
          console.log(`🔐 WORKSPACE LOAD: Generating signed URL for item ${item.id}:`, {
                bucket: item.bucket_name,
                path: item.storage_path
              });
              
              const { data: urlData, error } = await supabase.storage
                .from(item.bucket_name)
                .createSignedUrl(item.storage_path, 3600);
              
              if (urlData?.signedUrl && !error) {
                displayUrl = urlData.signedUrl;
                console.log(`✅ WORKSPACE LOAD: Generated signed URL for item ${item.id}`);
              } else {
                console.error(`❌ WORKSPACE LOAD: Failed to generate signed URL for item ${item.id}:`, error);
              }
            } catch (error) {
              console.error('❌ Error generating signed URL:', error);
            }
          }
          
          return {
            id: String(item.id),
            url: displayUrl,
            prompt: item.prompt || '',
            type: item.content_type as 'image' | 'video',
            timestamp: new Date(item.created_at),
            quality: (item.quality as 'fast' | 'high') || 'high',
            modelType: item.model_type,
            thumbnailUrl: item.thumbnail_url,
            enhancedPrompt: item.enhanced_prompt,
            seed: item.seed,
            generationParams: item.generation_params || {},
            jobId: item.job_id,
            sessionId: item.session_id,
            bucketName: item.bucket_name,
            status: item.status as 'generated' | 'saved' | 'deleted' || 'generated'
          };
        }));
        
        setWorkspaceItems(processedItems);

        // Set active job to the most recent one
        if (jobs.length > 0 && !activeJobId) {
          setActiveJobId(jobs[0].id);
        }
      } catch (error) {
        console.error('❌ WORKSPACE: Failed to load jobs:', error);
      }
    };

    loadWorkspaceJobs();

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
          async (payload) => {
            console.log('📡 WORKSPACE REALTIME: Event received at', new Date().toISOString(), {
              eventType: payload.eventType,
              table: payload.table,
              hasNew: !!payload.new,
              newItemId: payload.new ? (payload.new as any).id : null
            });
            
            if (payload.eventType === 'INSERT' && payload.new) {
              const newItem = payload.new as any;
              console.log('✨ WORKSPACE REALTIME: Processing INSERT for item:', {
                id: newItem.id,
                job_id: newItem.job_id,
                storage_path: newItem.storage_path,
                bucket_name: newItem.bucket_name,
                content_type: newItem.content_type
              });
              
              // Generate signed URL immediately for display
              let signedUrl = '';
              if (newItem.storage_path && newItem.bucket_name) {
                try {
                  console.log('🔐 WORKSPACE REALTIME: Generating signed URL for:', {
                    bucket: newItem.bucket_name,
                    path: newItem.storage_path
                  });
                  
                  const { data: urlData, error } = await supabase.storage
                    .from(newItem.bucket_name)
                    .createSignedUrl(newItem.storage_path, 3600);
                  
                  if (urlData?.signedUrl && !error) {
                    signedUrl = urlData.signedUrl;
                    console.log('✅ WORKSPACE REALTIME: Signed URL generated successfully');
                  } else {
                    console.error('❌ WORKSPACE REALTIME: Failed to generate signed URL:', error?.message || 'Unknown error');
                    console.error('❌ Full error details:', error);
                  }
                } catch (error) {
                  console.error('❌ WORKSPACE REALTIME: Exception generating signed URL:', error);
                }
              } else {
                console.warn('⚠️ WORKSPACE REALTIME: Missing storage_path or bucket_name for item:', newItem.id);
              }
              
              // Create workspace item with signed URL
              const workspaceItem = {
                id: String(newItem.id),
                url: signedUrl,
                prompt: newItem.prompt || '',
                type: newItem.content_type as 'image' | 'video',
                timestamp: new Date(newItem.created_at),
                quality: (newItem.quality as 'fast' | 'high') || 'high',
                modelType: newItem.model_type,
                thumbnailUrl: newItem.thumbnail_url,
                enhancedPrompt: newItem.enhanced_prompt,
                seed: newItem.seed,
                generationParams: newItem.generation_params || {},
                jobId: newItem.job_id,
                sessionId: newItem.session_id,
                bucketName: newItem.bucket_name,
                status: newItem.status as 'generated' | 'saved' | 'deleted' || 'generated'
              };
              
              console.log('➕ WORKSPACE REALTIME: Adding item to workspace items');
              setWorkspaceItems(prev => {
                // Check for duplicates
                const exists = prev.some(item => item.id === workspaceItem.id);
                if (exists) {
                  console.log('🔄 WORKSPACE REALTIME: Item already exists, skipping');
                  return prev;
                }
                const updated = [workspaceItem, ...prev];
                console.log('📊 WORKSPACE REALTIME: New items count:', updated.length);
                return updated;
              });
              
              console.log('🔄 WORKSPACE REALTIME: Updating jobs list');
              setWorkspaceJobs(prevJobs => {
                const jobId = newItem.job_id || `session_${newItem.session_id}_${newItem.created_at}`;
                const existingJobIndex = prevJobs.findIndex(job => job.id === jobId);
                
                if (existingJobIndex >= 0) {
                  // Add item to existing job
                  const updatedJobs = [...prevJobs];
                  const existingJob = updatedJobs[existingJobIndex];
                  
                  // Check if item already exists in job
                  const itemExists = existingJob.items.some(item => item.id === workspaceItem.id);
                  if (!itemExists) {
                    updatedJobs[existingJobIndex] = {
                      ...existingJob,
                      items: [...existingJob.items, workspaceItem]
                    };
                    console.log(`✅ WORKSPACE REALTIME: Added item to existing job ${jobId} (${updatedJobs[existingJobIndex].items.length} items total)`);
                  } else {
                    console.log('🔄 WORKSPACE REALTIME: Item already exists in job');
                  }
                  
                  return updatedJobs;
                } else {
                  // Create new job
                  const newJob: WorkspaceJob = {
                    id: jobId,
                    sessionId: newItem.session_id || '',
                    prompt: newItem.prompt || 'Untitled',
                    items: [workspaceItem],
                    createdAt: new Date(newItem.created_at),
                    type: newItem.content_type as 'image' | 'video'
                  };
                  
                  console.log(`✅ WORKSPACE REALTIME: Created new job ${jobId} with 1 item`);
                  const updated = [newJob, ...prevJobs];
                  console.log('📊 WORKSPACE REALTIME: New jobs count:', updated.length);
                  return updated;
                }
              });
              
              // Set as active job if none selected
              if (!activeJobId && newItem.job_id) {
                console.log(`🎯 WORKSPACE REALTIME: Setting active job to: ${newItem.job_id}`);
                setActiveJobId(newItem.job_id);
              }
            } else {
              console.log('🔄 WORKSPACE REALTIME: Non-INSERT event, reloading all data');
              loadWorkspaceJobs();
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 WORKSPACE REALTIME: Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ WORKSPACE REALTIME: Successfully subscribed to real-time updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ WORKSPACE REALTIME: Channel error occurred');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ WORKSPACE REALTIME: Subscription timed out');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [activeJobId]);

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
        format: mode === 'image' ? 'sdxl_image_high' : 'video_high',
        prompt: prompt.trim(),
        metadata: {
          num_images: mode === 'image' ? 3 : 1, // 3 images per job for 1x3 grid
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
      const { error } = await supabase
        .from('workspace_items' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'generated');

      if (error) throw error;

      setWorkspaceItems([]);
      setWorkspaceJobs([]);
      setActiveJobId(null);
      
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

  const saveItem = useCallback(async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('💾 WORKSPACE: Saving item to library:', itemId);

      // Mark as saved in database
      const { error } = await supabase
        .from('workspace_items' as any)
        .update({ status: 'saved' })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state to mark as saved
      setWorkspaceItems(prev =>
        prev.map(existingItem =>
          existingItem.id === itemId
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

  // Job-level actions
  const selectJob = (jobId: string) => {
    setActiveJobId(jobId);
  };

  const deleteJob = async (jobId: string) => {
    const job = workspaceJobs.find(j => j.id === jobId);
    if (!job) return;

    try {
      // Delete all items in the job
      await Promise.all(job.items.map(item => deleteItem(item.id)));
      
      // Remove job from state
      setWorkspaceJobs(prev => prev.filter(j => j.id !== jobId));
      
      // If this was the active job, select another one
      if (activeJobId === jobId) {
        const remainingJobs = workspaceJobs.filter(j => j.id !== jobId);
        setActiveJobId(remainingJobs.length > 0 ? remainingJobs[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const saveJob = async (jobId: string) => {
    const job = workspaceJobs.find(j => j.id === jobId);
    if (!job) return;

    try {
      // Call save function for each item in the job
      await Promise.all(job.items.map(item => saveItem(item.id)));
      console.log(`Saved job ${jobId} with ${job.items.length} items to library`);
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const useJobAsReference = (jobId: string) => {
    const job = workspaceJobs.find(j => j.id === jobId);
    if (!job || job.items.length === 0) return;

    // Use first item as reference
    const firstItem = job.items[0];
    // TODO: Set reference image from URL
    console.log('Using job as reference:', firstItem.url);
  };

  return {
    // Core State
    mode,
    prompt,
    referenceImage,
    referenceStrength,
    contentType,
    quality,
    
    // Video-specific State
    beginningRefImage,
    endingRefImage,
    videoDuration,
    motionIntensity,
    soundEnabled,
    
    // Control Parameters
    aspectRatio,
    shotType,
    cameraAngle,
    style,
    styleRef,
    
    // Enhancement Model
    enhancementModel,
    
    // UI State
    isGenerating,
    workspaceItems,
    workspaceJobs,
    activeJobId,
    lightboxIndex,
    
    // Actions
    updateMode,
    setPrompt,
    setReferenceImage,
    setReferenceStrength,
    setContentType: (type: 'sfw' | 'nsfw') => setContentType(type),
    setQuality,
    setBeginningRefImage,
    setEndingRefImage,
    setVideoDuration,
    setMotionIntensity,
    setSoundEnabled,
    setAspectRatio: (ratio: '16:9' | '1:1' | '9:16') => setAspectRatio(ratio),
    setShotType: (type: 'wide' | 'medium' | 'close') => setShotType(type),
    setCameraAngle: (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => setCameraAngle(angle),
    setStyle,
    setStyleRef: (ref: File | null) => setStyleRef(ref),
    setEnhancementModel: (model: 'qwen_base' | 'qwen_instruct') => setEnhancementModel(model),
    generate,
    clearWorkspace,
    deleteItem,
    setLightboxIndex,
    // Job-level actions
    selectJob,
    deleteJob,
    saveJob,
    useJobAsReference,
    // Legacy actions for mobile compatibility
    editItem: (item: WorkspaceItem) => console.log('Edit item:', item),
    saveItem,
    downloadItem: (item: WorkspaceItem) => console.log('Download item:', item),
    useAsReference: (item: WorkspaceItem) => console.log('Use as reference:', item),
    useSeed: (item: WorkspaceItem) => console.log('Use seed:', item),
  };
};