/**
 * StoryboardEditor Page V2
 *
 * Redesigned project editor with:
 * - SceneStrip for horizontal scene navigation
 * - ClipCanvas with drag-and-drop clip management
 * - ClipLibrary sidebar for reference sources (desktop only, drawer on mobile)
 * - ClipDetailPanel for editing selected clips
 * - AI-assisted workflow throughout
 * - Mobile-responsive layout
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StoryboardLayout } from '@/components/StoryboardLayout';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useStoryboardAI } from '@/hooks/useStoryboardAI';
import { useClipOrchestration } from '@/hooks/useClipOrchestration';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ArrowLeft,
  Play,
  Download,
  Loader2,
  Sparkles,
  Clock,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Library,
  User,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  StoryboardScene,
  StoryboardClip,
  CreateSceneInput,
  ProjectAssembly,
  ClipType,
  MotionPreset,
  ReferenceSlot,
  ReferenceRole,
} from '@/types/storyboard';
import { CharacterCanon } from '@/types/character-hub-v2';
import {
  SceneStrip,
  ClipCanvas,
  ClipLibrary,
  ClipDetailPanel,
  MotionLibrary,
} from '@/components/storyboard';
import { StoryPlannerSheet } from '@/components/storyboard/StoryPlannerSheet';
import { AssemblyPreview } from '@/components/storyboard/AssemblyPreview';
import { CharacterPickerDialog } from '@/components/storyboard/CharacterPickerDialog';
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';
import { StoryboardService } from '@/lib/services/StoryboardService';
import { Character } from '@/types/roleplay';
import { toast } from 'sonner';

const StoryboardEditor = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const {
    activeProject,
    activeProjectLoading,
    scenes,
    activeScene,
    clips,
    loadProject,
    clearActiveProject,
    createScene,
    updateScene,
    deleteScene,
    selectScene,
    updateProject,
    createClip,
    updateClip,
    deleteClip,
  } = useStoryboard();

  const { recommendClipType, isRecommendingClipType } = useStoryboardAI();
  const { getModelForClipType, generateClip } = useClipOrchestration(activeProject?.content_mode || 'nsfw');

  // Local UI state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [sceneToDelete, setSceneToDelete] = useState<StoryboardScene | null>(null);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [isAddingClip, setIsAddingClip] = useState(false);
  const [showStoryPlanner, setShowStoryPlanner] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [assembly, setAssembly] = useState<ProjectAssembly | null>(null);
  const [isLoadingAssembly, setIsLoadingAssembly] = useState(false);
  const [storyPlanOpen, setStoryPlanOpen] = useState(false); // collapsed by default on mobile
  const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);

  // Selected clip for detail panel
  const [selectedClip, setSelectedClip] = useState<StoryboardClip | null>(null);
  const [recommendedClipType, setRecommendedClipType] = useState<ClipType | undefined>();
  const [isGeneratingClip, setIsGeneratingClip] = useState(false);

  // Phase 8.2: Multi-conditioning references for selected clip
  const [clipReferences, setClipReferences] = useState<ReferenceSlot[]>([]);
  const [activeRefSlot, setActiveRefSlot] = useState<ReferenceRole | null>(null);

  // Character canons (would come from character hub)
  const [characterCanons, setCharacterCanons] = useState<CharacterCanon[]>([]);

  // Get clips for active scene
  const activeSceneClips = useMemo(() => {
    if (!activeScene) return [];
    return clips.filter((c) => c.scene_id === activeScene.id).sort((a, b) => a.clip_order - b.clip_order);
  }, [clips, activeScene]);

  // Get previous clip (for context)
  const previousClip = useMemo(() => {
    if (!selectedClip) return undefined;
    const idx = activeSceneClips.findIndex((c) => c.id === selectedClip.id);
    return idx > 0 ? activeSceneClips[idx - 1] : undefined;
  }, [selectedClip, activeSceneClips]);

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }

    return () => {
      clearActiveProject();
    };
  }, [projectId, loadProject, clearActiveProject]);

  // Sync title for editing
  useEffect(() => {
    if (activeProject) {
      setEditedTitle(activeProject.title);
    }
  }, [activeProject?.title]);

  // Load character canons when project has a primary character
  useEffect(() => {
    const loadCanons = async () => {
      if (!activeProject?.primary_character_id) {
        setCharacterCanons([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('character_canon')
          .select('*')
          .eq('character_id', activeProject.primary_character_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to load character canons:', error);
          return;
        }

        setCharacterCanons((data || []) as CharacterCanon[]);
        console.log('🎭 Loaded character canons:', data?.length || 0);
      } catch (err) {
        console.error('Error loading canons:', err);
      }
    };

    loadCanons();
  }, [activeProject?.primary_character_id]);

  // Auto-select first scene when project has scenes and none selected
  useEffect(() => {
    if (scenes.length > 0 && !activeScene) {
      selectScene(scenes[0]);
    }
  }, [scenes.length, activeScene?.id, selectScene]);

  // Load recommended clip type when clip selected
  useEffect(() => {
    if (selectedClip && activeScene) {
      const clipIndex = activeSceneClips.findIndex((c) => c.id === selectedClip.id);
      const position: 'first' | 'middle' | 'last' =
        clipIndex === 0 ? 'first' :
        clipIndex === activeSceneClips.length - 1 ? 'last' : 'middle';

      recommendClipType({
        position,
        previousClipType: previousClip?.clip_type,
        sceneMood: activeScene?.mood,
        hasMotionPreset: !!selectedClip?.motion_preset_id,
      }).then((result) => {
        setRecommendedClipType(result.recommended);
      });
    }
  }, [selectedClip?.id, activeScene?.id, previousClip?.id, activeSceneClips.length]);

  // Phase 8.2: Sync references when selected clip changes
  useEffect(() => {
    if (selectedClip) {
      // Load references from clip's generation_config or references field
      const savedRefs = selectedClip.references ||
        (selectedClip.generation_config as { references?: ReferenceSlot[] })?.references ||
        [];
      setClipReferences(savedRefs);

      // If clip has legacy reference_image_url but no references, create identity slot
      if (savedRefs.length === 0 && selectedClip.reference_image_url) {
        setClipReferences([{
          url: selectedClip.reference_image_url,
          role: 'identity',
          source: selectedClip.reference_image_source,
        }]);
      }
    } else {
      setClipReferences([]);
    }
    setActiveRefSlot(null);
  }, [selectedClip?.id]);

  // Handlers
  const handleBackToList = () => {
    navigate('/storyboard');
  };

  const handleSaveTitle = async () => {
    if (!activeProject || !editedTitle.trim()) return;

    if (editedTitle.trim() !== activeProject.title) {
      await updateProject(activeProject.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAddScene = async () => {
    if (!activeProject) return;

    setIsAddingScene(true);
    try {
      const newScene = await createScene({
        project_id: activeProject.id,
        title: `Scene ${scenes.length + 1}`,
        target_duration_seconds: 30,
      });
      selectScene(newScene);
    } finally {
      setIsAddingScene(false);
    }
  };

  const handleDeleteScene = async () => {
    if (sceneToDelete) {
      await deleteScene(sceneToDelete.id);
      setSceneToDelete(null);
    }
  };

  const handleSelectScene = (scene: StoryboardScene) => {
    selectScene(scene);
    setSelectedClip(null);
  };

  const handleAddClip = async () => {
    if (!activeScene) return;

    setIsAddingClip(true);
    try {
      const newClip = await createClip({
        scene_id: activeScene.id,
        prompt: '',
        clip_type: 'quick',
      });
      setSelectedClip(newClip);
    } finally {
      setIsAddingClip(false);
    }
  };

  const handleSelectClip = (clip: StoryboardClip) => {
    setSelectedClip(clip);
  };

  const handleUpdateClip = async (updates: Partial<StoryboardClip>) => {
    if (!selectedClip) return;
    await updateClip(selectedClip.id, updates);
    setSelectedClip((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleDeleteClip = async () => {
    if (!selectedClip) return;
    await deleteClip(selectedClip.id);
    setSelectedClip(null);
  };

  const handleDuplicateClip = async () => {
    if (!selectedClip || !activeScene) return;
    const newClip = await createClip({
      scene_id: activeScene.id,
      prompt: selectedClip.prompt,
      reference_image_url: selectedClip.reference_image_url,
      reference_image_source: selectedClip.reference_image_source,
      clip_type: selectedClip.clip_type,
    });
    setSelectedClip(newClip);
  };

  const handleApproveClip = async () => {
    if (!selectedClip) return;
    await updateClip(selectedClip.id, { status: 'approved' });
    setSelectedClip((prev) => (prev ? { ...prev, status: 'approved' } : null));
  };

  const handleGenerateClip = async () => {
    if (!selectedClip || !activeScene || !activeProject) return;
    if (!selectedClip.prompt?.trim()) {
      toast.error('Please enter a motion prompt before generating');
      console.error('🎬 Clip has no prompt');
      return;
    }

    setIsGeneratingClip(true);
    try {
      await updateClip(selectedClip.id, { status: 'generating' });

      const { ClipOrchestrationService } = await import('@/lib/services/ClipOrchestrationService');

      const genRequest = {
        clipId: selectedClip.id,
        clipType: selectedClip.clip_type,
        prompt: selectedClip.prompt,
        referenceImageUrl: selectedClip.reference_image_url,
        referenceImageSource: selectedClip.reference_image_source, // Phase 8.1: For chain detection
        referenceVideoUrl: previousClip?.video_url,
        motionPresetId: selectedClip.motion_preset_id,
        endFrameUrl: selectedClip.end_frame_url,
        contentMode: (activeProject.content_mode || 'nsfw') as 'sfw' | 'nsfw',
        aspectRatio: (activeProject.aspect_ratio || '16:9') as '16:9' | '9:16' | '1:1',
        durationSeconds: selectedClip.duration_seconds,
        sceneId: activeScene.id, // Phase 8.1: For character injection
        references: clipReferences.length > 0 ? clipReferences : undefined, // Phase 8.2: Multi-conditioning
      };

      console.log('🎬 Starting clip generation:', {
        clipId: selectedClip.id,
        clipType: selectedClip.clip_type,
        hasRefImage: !!selectedClip.reference_image_url,
        hasRefVideo: !!previousClip?.video_url,
        multiCondRefs: clipReferences.length, // Phase 8.2: Log multi-ref count
      });

      const result = await ClipOrchestrationService.generateClip(genRequest);

      if (result.success) {
        await updateClip(selectedClip.id, {
          resolved_model_id: result.resolvedModelId,
          prompt_template_id: result.promptTemplateId,
          enhanced_prompt: result.enhancedPrompt,
          job_id: result.jobId, // Store job ID for recovery
          ...(result.videoUrl ? {
            status: 'completed',
            video_url: result.videoUrl,
          } : {}),
        });

        if (result.jobId) {
          toast.success('Video generation started', {
            description: 'This may take a few minutes. The video will appear when ready.',
          });
        }

        console.log('🎬 Generation initiated:', {
          success: true,
          jobId: result.jobId,
          videoUrl: result.videoUrl,
        });
      } else {
        await updateClip(selectedClip.id, { status: 'failed' });
        toast.error('Generation failed', {
          description: result.error || 'Unknown error occurred',
        });
        console.error('🎬 Generation failed:', result.error);
      }
    } catch (error) {
      console.error('🎬 Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Generation error', {
        description: errorMessage,
      });
      await updateClip(selectedClip.id, { status: 'failed' });
    } finally {
      setIsGeneratingClip(false);
    }
  };

  const handleReorderClips = async (fromIndex: number, toIndex: number) => {
    if (!activeScene) return;
    const reorderedClips = [...activeSceneClips];
    const [movedClip] = reorderedClips.splice(fromIndex, 1);
    reorderedClips.splice(toIndex, 0, movedClip);

    for (let i = 0; i < reorderedClips.length; i++) {
      if (reorderedClips[i].clip_order !== i) {
        await updateClip(reorderedClips[i].id, { clip_order: i });
      }
    }
  };

  const handleDropImage = async (imageUrl: string, source: 'library' | 'upload') => {
    if (!activeScene) return;

    setIsAddingClip(true);
    try {
      const newClip = await createClip({
        scene_id: activeScene.id,
        prompt: '',
        reference_image_url: imageUrl,
        reference_image_source: source === 'library' ? 'library' : 'uploaded',
        clip_type: 'quick',
      });
      setSelectedClip(newClip);
    } finally {
      setIsAddingClip(false);
    }
  };

  const handleSelectReference = (imageUrl: string, source: 'character_portrait' | 'extracted_frame' | 'library' | 'workspace') => {
    if (!selectedClip) {
      toast.info('Select a clip first, then pick a reference image');
      return;
    }

    // Phase 8.2: If picking for a specific slot, add to references array
    if (activeRefSlot) {
      const newRef: ReferenceSlot = {
        url: imageUrl,
        role: activeRefSlot,
        source,
        strength: 1.0,
      };

      // Replace existing ref with same role or add new
      const updated = clipReferences.filter(r => r.role !== activeRefSlot);
      updated.push(newRef);
      setClipReferences(updated);

      // Also update clip's generation_config with references
      handleUpdateClip({
        generation_config: {
          ...(selectedClip.generation_config as Record<string, unknown> || {}),
          references: updated,
        },
        // Keep legacy field in sync with identity slot
        reference_image_url: activeRefSlot === 'identity' ? imageUrl : selectedClip.reference_image_url,
        reference_image_source: activeRefSlot === 'identity' ? source : selectedClip.reference_image_source,
      });

      setActiveRefSlot(null);
      setShowLibraryDrawer(false);
      return;
    }

    // Legacy: just update single reference
    handleUpdateClip({
      reference_image_url: imageUrl,
      reference_image_source: source,
    });
    setShowLibraryDrawer(false);
  };

  // Phase 8.2: Update all references
  const handleUpdateReferences = useCallback((refs: ReferenceSlot[]) => {
    setClipReferences(refs);
    if (selectedClip) {
      // Find identity ref for legacy field sync
      const identityRef = refs.find(r => r.role === 'identity');
      handleUpdateClip({
        generation_config: {
          ...(selectedClip.generation_config as Record<string, unknown> || {}),
          references: refs,
        },
        reference_image_url: identityRef?.url || selectedClip.reference_image_url,
        reference_image_source: identityRef?.source || selectedClip.reference_image_source,
      });
    }
  }, [selectedClip]);

  // Phase 8.2: Open picker for specific slot
  const handlePickReferenceForSlot = useCallback((role: ReferenceRole) => {
    setActiveRefSlot(role);
    setShowLibraryDrawer(true);
  }, []);

  const handleSelectMotionPreset = (preset: MotionPreset) => {
    if (selectedClip) {
      handleUpdateClip({
        motion_preset_id: preset.id,
        clip_type: 'controlled',
      });
    }
  };

  const handleFrameExtracted = useCallback(async (frameUrl: string, percentage: number, timestampMs: number) => {
    if (!selectedClip) return;

    console.log('📸 [StoryboardEditor] Frame extracted:', {
      clipId: selectedClip.id,
      percentage,
      timestampMs,
    });

    await updateClip(selectedClip.id, {
      extracted_frame_url: frameUrl,
      extraction_percentage: percentage,
      extraction_timestamp_ms: timestampMs,
    });
  }, [selectedClip, updateClip]);

  const handleOpenPreview = useCallback(async () => {
    if (!projectId) return;
    setShowPreview(true);
    setIsLoadingAssembly(true);
    try {
      const data = await StoryboardService.getProjectAssembly(projectId);
      setAssembly(data);
    } catch (err) {
      console.error('Failed to load assembly:', err);
    } finally {
      setIsLoadingAssembly(false);
    }
  }, [projectId]);

  const handleApplyPlan = useCallback(
    async (sceneInputs: CreateSceneInput[]) => {
      for (const input of sceneInputs) {
        await createScene(input);
      }
      if (projectId) loadProject(projectId);
    },
    [createScene, loadProject, projectId]
  );

  const handleCharacterSelected = async (character: Character) => {
    if (!activeProject) return;
    await updateProject(activeProject.id, {
      primary_character_id: character.id,
    });
    // Reload to get the populated character
    if (projectId) loadProject(projectId);
    setShowCharacterPicker(false);
  };

  // Phase 8.2: Handle video clip selection for motion reference
  const handleSelectVideoClip = useCallback((videoUrl: string, _clipId: string) => {
    if (!selectedClip) {
      toast.info('Select a clip first, then pick a video reference');
      return;
    }

    // If picking for motion slot specifically, add as motion reference
    if (activeRefSlot === 'motion') {
      const newRef: ReferenceSlot = {
        url: videoUrl,
        role: 'motion',
        source: 'extracted_frame', // Closest source type
        strength: 1.0,
      };

      const updated = clipReferences.filter(r => r.role !== 'motion');
      updated.push(newRef);
      setClipReferences(updated);

      handleUpdateClip({
        generation_config: {
          ...(selectedClip.generation_config as Record<string, unknown> || {}),
          references: updated,
        },
      });

      setActiveRefSlot(null);
      setShowLibraryDrawer(false);
      console.log('🎬 Added video as motion reference:', videoUrl.substring(0, 60) + '...');
      return;
    }

    // Default: add as motion reference
    const newRef: ReferenceSlot = {
      url: videoUrl,
      role: 'motion',
      source: 'extracted_frame',
      strength: 1.0,
    };

    const updated = clipReferences.filter(r => r.role !== 'motion');
    updated.push(newRef);
    setClipReferences(updated);

    handleUpdateClip({
      generation_config: {
        ...(selectedClip.generation_config as Record<string, unknown> || {}),
        references: updated,
      },
    });

    setShowLibraryDrawer(false);
    console.log('🎬 Added video as motion reference:', videoUrl.substring(0, 60) + '...');
  }, [selectedClip, activeRefSlot, clipReferences, handleUpdateClip]);

  // Calculate total duration
  const totalDuration = scenes.reduce((sum, s) => sum + s.target_duration_seconds, 0);

  // Loading state
  if (authLoading || activeProjectLoading) {
    return (
      <StoryboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </StoryboardLayout>
    );
  }

  // Project not found
  if (!activeProject) {
    return (
      <StoryboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-sm text-muted-foreground mb-4">Project not found</p>
          <Button variant="outline" onClick={handleBackToList} className="h-8 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Projects
          </Button>
        </div>
      </StoryboardLayout>
    );
  }

  const libraryContent = (
    <ClipLibrary
      character={activeProject.primary_character}
      characterCanons={characterCanons}
      clips={activeSceneClips} // Pass all clips for both frames and videos
      onSelectReference={handleSelectReference}
      onSelectVideoClip={handleSelectVideoClip}
      onSelectMotionPreset={handleSelectMotionPreset}
      className="w-full h-full"
    />
  );

  return (
    <StoryboardLayout>
      <div className="flex flex-col h-[calc(100vh-var(--header-height,64px))]">
        {/* Project Header - responsive */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="h-8 w-8 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-0 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {isEditingTitle ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditedTitle(activeProject.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="h-8 flex-1 min-w-0 text-sm bg-muted border-border"
                autoFocus
              />
            ) : (
              <h1
                className="text-sm font-medium text-foreground cursor-pointer hover:text-foreground/80 truncate"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit"
              >
                {activeProject.title}
              </h1>
            )}

            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize hidden sm:inline-block flex-shrink-0">
              {activeProject.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Duration - hide on very small screens */}
            <span className="text-xs text-muted-foreground items-center gap-1 hidden sm:flex">
              <Clock className="w-3 h-3" />
              {totalDuration}s / {activeProject.target_duration_seconds}s
            </span>

            {/* Character button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 hidden md:flex"
              onClick={() => setShowCharacterPicker(true)}
            >
              <User className="w-3.5 h-3.5" />
              {activeProject.primary_character?.name || 'Character'}
            </Button>

            {/* AI button */}
            {activeProject.ai_assistance_level !== 'none' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-h-[44px] md:min-h-0 text-xs gap-1.5"
                onClick={() => setShowStoryPlanner(true)}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI</span>
              </Button>
            )}

            {/* Library toggle (mobile only) */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-0 md:hidden"
              onClick={() => setShowLibraryDrawer(true)}
            >
              <Library className="w-4 h-4" />
            </Button>

            {/* Preview */}
            <Button variant="outline" size="sm" className="h-8 min-h-[44px] md:min-h-0 text-xs gap-1.5" onClick={handleOpenPreview}>
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="md:hidden" onClick={() => setShowCharacterPicker(true)}>
                  <User className="w-3.5 h-3.5 mr-2" />
                  {activeProject.primary_character ? `Character: ${activeProject.primary_character.name}` : 'Select Character'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Export clips
                </DropdownMenuItem>
                <DropdownMenuItem>Render video</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Generated story - use Sheet on mobile, Collapsible on desktop */}
        {activeProject.ai_story_plan &&
         (activeProject.ai_story_plan.sceneBreakdown?.length > 0 ||
          activeProject.ai_story_plan.storyBeats?.length > 0) && (
          <>
            {/* Mobile: show as button that opens Sheet */}
            <div className="md:hidden border-b border-border bg-muted/40">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                onClick={() => setStoryPlanOpen(true)}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span>Story</span>
                <span className="text-muted-foreground">
                  ({activeProject.ai_story_plan.sceneBreakdown?.length ?? 0} scenes)
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 ml-auto" />
              </button>
            </div>

            {/* Mobile: Sheet for story plan */}
            <Sheet open={storyPlanOpen} onOpenChange={setStoryPlanOpen}>
              <SheetContent side="bottom" className="max-h-[60vh] bg-background md:hidden">
                <SheetHeader className="pb-3">
                  <SheetTitle className="text-sm">Story Plan</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto space-y-2 text-xs text-muted-foreground pb-safe">
                  {activeProject.ai_story_plan.sceneBreakdown?.map((scene, i) => (
                    <div key={i} className="rounded border border-border bg-muted/60 px-3 py-2">
                      <div className="font-medium text-foreground/80">
                        Scene {scene.sceneNumber}: {scene.title}
                      </div>
                      {scene.description && (
                        <p className="mt-1 text-muted-foreground">{scene.description}</p>
                      )}
                      <span className="text-muted-foreground/60">{scene.targetDuration}s</span>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop: inline Collapsible */}
            <Collapsible open={storyPlanOpen} onOpenChange={setStoryPlanOpen} className="hidden md:block border-b border-border bg-muted/40">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                >
                  {storyPlanOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span>Story</span>
                  <span className="text-muted-foreground">
                    ({activeProject.ai_story_plan.sceneBreakdown?.length ?? 0} scenes)
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-48 overflow-y-auto px-4 pb-3 pt-0">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {activeProject.ai_story_plan.sceneBreakdown?.map((scene, i) => (
                      <div key={i} className="rounded border border-border bg-muted/60 px-3 py-2">
                        <div className="font-medium text-foreground/80">
                          Scene {scene.sceneNumber}: {scene.title}
                        </div>
                        {scene.description && (
                          <p className="mt-1 text-muted-foreground">{scene.description}</p>
                        )}
                        <span className="text-muted-foreground/60">{scene.targetDuration}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Scene Strip */}
        <SceneStrip
          scenes={scenes}
          activeSceneId={activeScene?.id}
          onSceneSelect={handleSelectScene}
          onAddScene={handleAddScene}
          onSceneDelete={setSceneToDelete}
          isAddingScene={isAddingScene}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Clip Canvas */}
            {activeScene ? (
              <ClipCanvas
                scene={activeScene}
                clips={activeSceneClips}
                selectedClipId={selectedClip?.id}
                onClipSelect={handleSelectClip}
                onAddClip={handleAddClip}
                onReorderClips={handleReorderClips}
                onDropImage={handleDropImage}
                isAddingClip={isAddingClip}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/30 border-b border-border">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Select a scene to view clips</p>
                  <Button size="sm" className="h-8 text-xs" onClick={handleAddScene}>
                    Add First Scene
                  </Button>
                </div>
              </div>
            )}

            {/* Clip Detail Panel */}
            {selectedClip && (
              <ClipDetailPanel
                clip={selectedClip}
                previousClip={previousClip}
                contentMode={activeProject.content_mode || 'nsfw'}
                isGenerating={isGeneratingClip}
                recommendedClipType={recommendedClipType}
                onUpdateClip={handleUpdateClip}
                onGenerate={handleGenerateClip}
                onDelete={handleDeleteClip}
                onDuplicate={handleDuplicateClip}
                onApprove={handleApproveClip}
                onSelectMotionPreset={handleSelectMotionPreset}
                onFrameExtracted={handleFrameExtracted}
                onPickReference={() => setShowLibraryDrawer(true)}
                // Phase 8.2: Multi-conditioning
                references={clipReferences}
                onUpdateReferences={handleUpdateReferences}
                onPickReferenceForSlot={handlePickReferenceForSlot}
                className="flex-shrink-0"
              />
            )}
          </div>

          {/* Library Sidebar - desktop only */}
          <div className="hidden md:block w-64 flex-shrink-0">
            {libraryContent}
          </div>
        </div>
      </div>

      {/* Library/Workspace Image Picker - mobile */}
      <ImagePickerDialog
        isOpen={showLibraryDrawer}
        onClose={() => setShowLibraryDrawer(false)}
        onSelect={(imageUrl, source) => handleSelectReference(imageUrl, source)}
        title="Select Reference Image"
        source="workspace"
      />

      {/* Character Picker */}
      <CharacterPickerDialog
        open={showCharacterPicker}
        onOpenChange={setShowCharacterPicker}
        selectedCharacterId={activeProject.primary_character_id}
        onSelect={handleCharacterSelected}
      />

      {/* Delete Scene Confirmation */}
      <AlertDialog open={!!sceneToDelete} onOpenChange={(open) => !open && setSceneToDelete(null)}>
        <AlertDialogContent className="max-w-sm bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Scene</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete "{sceneToDelete?.title || 'Untitled'}"? This will also delete all clips
              in this scene.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScene} className="h-8 text-xs bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Story Planner Sheet */}
      <StoryPlannerSheet
        isOpen={showStoryPlanner}
        onClose={() => setShowStoryPlanner(false)}
        projectId={activeProject.id}
        onApplyPlan={handleApplyPlan}
      />

      {/* Assembly Preview */}
      <AssemblyPreview
        assembly={assembly}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        isLoading={isLoadingAssembly}
      />
    </StoryboardLayout>
  );
};

export default StoryboardEditor;