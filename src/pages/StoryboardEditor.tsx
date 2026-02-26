/**
 * StoryboardEditor Page V2
 *
 * Redesigned project editor with:
 * - SceneStrip for horizontal scene navigation
 * - ClipCanvas with drag-and-drop clip management
 * - ClipLibrary sidebar for reference sources
 * - ClipDetailPanel for editing selected clips
 * - AI-assisted workflow throughout
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StoryboardLayout } from '@/components/StoryboardLayout';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useStoryboardAI } from '@/hooks/useStoryboardAI';
import { useClipOrchestration } from '@/hooks/useClipOrchestration';
import { useAuth } from '@/contexts/AuthContext';
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
  ArrowLeft,
  Play,
  Download,
  Loader2,
  Sparkles,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import {
  StoryboardScene,
  StoryboardClip,
  CreateSceneInput,
  ProjectAssembly,
  ClipType,
  MotionPreset,
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
import { StoryboardService } from '@/lib/services/StoryboardService';

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

  // Selected clip for detail panel
  const [selectedClip, setSelectedClip] = useState<StoryboardClip | null>(null);
  const [recommendedClipType, setRecommendedClipType] = useState<ClipType | undefined>();
  const [isGeneratingClip, setIsGeneratingClip] = useState(false);

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
    // Update local state
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

  const handleGenerateClip = async () => {
    if (!selectedClip || !activeScene || !activeProject) return;
    if (!selectedClip.prompt) {
      console.error('🎬 Clip has no prompt');
      return;
    }

    setIsGeneratingClip(true);
    try {
      // Update clip status to generating
      await updateClip(selectedClip.id, { status: 'generating' });

      // Import and use ClipOrchestrationService directly
      const { ClipOrchestrationService } = await import('@/lib/services/ClipOrchestrationService');

      // Build generation request from existing clip
      const genRequest = {
        clipId: selectedClip.id,
        clipType: selectedClip.clip_type,
        prompt: selectedClip.prompt,
        referenceImageUrl: selectedClip.reference_image_url,
        referenceVideoUrl: previousClip?.video_url, // For extended clips
        motionPresetId: selectedClip.motion_preset_id,
        endFrameUrl: selectedClip.end_frame_url,
        contentMode: (activeProject.content_mode || 'nsfw') as 'sfw' | 'nsfw',
        aspectRatio: (activeProject.aspect_ratio || '16:9') as '16:9' | '9:16' | '1:1',
        durationSeconds: selectedClip.duration_seconds,
      };

      console.log('🎬 Starting clip generation:', {
        clipId: selectedClip.id,
        clipType: selectedClip.clip_type,
        hasRefImage: !!selectedClip.reference_image_url,
        hasRefVideo: !!previousClip?.video_url,
      });

      // Execute full generation flow
      const result = await ClipOrchestrationService.generateClip(genRequest);

      if (result.success) {
        // Update clip with generation result
        await updateClip(selectedClip.id, {
          resolved_model_id: result.resolvedModelId,
          prompt_template_id: result.promptTemplateId,
          enhanced_prompt: result.enhancedPrompt,
          ...(result.videoUrl ? {
            status: 'completed',
            video_url: result.videoUrl,
          } : {
            // Async job - status will be updated via polling
          }),
        });

        console.log('🎬 Generation initiated:', {
          success: true,
          jobId: result.jobId,
          videoUrl: result.videoUrl,
        });
      } else {
        // Generation failed
        await updateClip(selectedClip.id, { status: 'failed' });
        console.error('🎬 Generation failed:', result.error);
      }
    } catch (error) {
      console.error('🎬 Generation error:', error);
      await updateClip(selectedClip.id, { status: 'failed' });
    } finally {
      setIsGeneratingClip(false);
    }
  };

  const handleReorderClips = async (fromIndex: number, toIndex: number) => {
    if (!activeScene) return;
    // Reorder logic - update clip_order fields
    const reorderedClips = [...activeSceneClips];
    const [movedClip] = reorderedClips.splice(fromIndex, 1);
    reorderedClips.splice(toIndex, 0, movedClip);

    // Update each clip's order
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

  const handleSelectReference = (imageUrl: string, source: 'character_portrait' | 'extracted_frame' | 'library') => {
    if (selectedClip) {
      handleUpdateClip({
        reference_image_url: imageUrl,
        reference_image_source: source,
      });
    }
  };

  const handleSelectMotionPreset = (preset: MotionPreset) => {
    if (selectedClip) {
      handleUpdateClip({
        motion_preset_id: preset.id,
        clip_type: 'controlled',
      });
    }
  };

  // Handle frame extraction from completed clip
  const handleFrameExtracted = useCallback(async (frameUrl: string, percentage: number, timestampMs: number) => {
    if (!selectedClip) return;

    console.log('📸 [StoryboardEditor] Frame extracted:', {
      clipId: selectedClip.id,
      percentage,
      timestampMs,
    });

    // Update clip with extracted frame
    await updateClip(selectedClip.id, {
      extracted_frame_url: frameUrl,
      extraction_percentage: percentage,
      extraction_timestamp_ms: timestampMs,
    });
  }, [selectedClip, updateClip]);

  // Handle preview
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

  // Handle applying story plan
  const handleApplyPlan = useCallback(
    async (sceneInputs: CreateSceneInput[]) => {
      for (const input of sceneInputs) {
        await createScene(input);
      }
      if (projectId) loadProject(projectId);
    },
    [createScene, loadProject, projectId]
  );

  // Calculate total duration
  const totalDuration = scenes.reduce((sum, s) => sum + s.target_duration_seconds, 0);

  // Loading state
  if (authLoading || activeProjectLoading) {
    return (
      <StoryboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading project...</p>
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
          <p className="text-sm text-gray-400 mb-4">Project not found</p>
          <Button variant="outline" onClick={handleBackToList} className="h-8 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Projects
          </Button>
        </div>
      </StoryboardLayout>
    );
  }

  return (
    <StoryboardLayout>
      <div className="flex flex-col h-[calc(100vh-var(--header-height,64px))]">
        {/* Project Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Title */}
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
                className="h-8 w-64 text-sm bg-gray-900 border-gray-700"
                autoFocus
              />
            ) : (
              <h1
                className="text-sm font-medium text-gray-100 cursor-pointer hover:text-white"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit"
              >
                {activeProject.title}
              </h1>
            )}

            {/* Status badge */}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 capitalize">
              {activeProject.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Duration indicator */}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalDuration}s / {activeProject.target_duration_seconds}s
            </span>

            {/* AI button */}
            {activeProject.ai_assistance_level !== 'none' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowStoryPlanner(true)}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI
              </Button>
            )}

            {/* Preview button */}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleOpenPreview}>
              <Play className="w-3.5 h-3.5" />
              Preview
            </Button>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Export clips
                </DropdownMenuItem>
                <DropdownMenuItem>Render video</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Scene Strip */}
        <SceneStrip
          scenes={scenes}
          activeSceneId={activeScene?.id}
          onSceneSelect={handleSelectScene}
          onAddScene={handleAddScene}
          isAddingScene={isAddingScene}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
              <div className="flex-1 flex items-center justify-center bg-gray-900/30 border-b border-gray-800">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-2">Select a scene to view clips</p>
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
                onSelectMotionPreset={handleSelectMotionPreset}
                onFrameExtracted={handleFrameExtracted}
                className="flex-shrink-0"
              />
            )}
          </div>

          {/* Library Sidebar */}
          <ClipLibrary
            character={activeProject.primary_character}
            characterCanons={characterCanons}
            clips={activeSceneClips.filter((c) => c.extracted_frame_url)}
            onSelectReference={handleSelectReference}
            onSelectMotionPreset={handleSelectMotionPreset}
            className="w-64 flex-shrink-0"
          />
        </div>
      </div>

      {/* Delete Scene Confirmation */}
      <AlertDialog open={!!sceneToDelete} onOpenChange={(open) => !open && setSceneToDelete(null)}>
        <AlertDialogContent className="max-w-sm bg-gray-950 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Scene</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete "{sceneToDelete?.title || 'Untitled'}"? This will also delete all clips
              in this scene.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScene} className="h-8 text-xs bg-red-600 hover:bg-red-700">
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
