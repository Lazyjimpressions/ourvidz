/**
 * StoryboardEditor Page
 *
 * Project editor with timeline, scene panel, and clip workspace.
 * Three-panel layout following the PRD UI/UX guidelines.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { StoryboardLayout } from '@/components/StoryboardLayout';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Plus,
  Play,
  Download,
  Settings,
  Loader2,
  Film,
  MoreVertical,
  Trash2,
  GripVertical,
  Sparkles,
  ChevronRight,
  Clock,
  Pencil,
} from 'lucide-react';
import {
  StoryboardScene,
  StoryboardClip,
  CreateSceneInput,
  UpdateSceneInput,
} from '@/types/storyboard';

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
  } = useStoryboard();

  // Local UI state
  const [isScenePanelOpen, setIsScenePanelOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [sceneToDelete, setSceneToDelete] = useState<StoryboardScene | null>(null);
  const [isAddingScene, setIsAddingScene] = useState(false);

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
        target_duration_seconds: 5,
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
    setIsScenePanelOpen(true);
  };

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="h-8 w-8 p-0"
            >
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
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Assist
              </Button>
            )}

            {/* Preview button */}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Preview
            </Button>

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 text-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export clips</DropdownMenuItem>
                <DropdownMenuItem>Render video</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  activeScene?.id === scene.id
                    ? 'bg-primary/20 border border-primary/50'
                    : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                }`}
                onClick={() => handleSelectScene(scene)}
              >
                <span className="text-[10px] text-gray-500 w-4">S{index + 1}</span>
                <span className="text-xs text-gray-300 max-w-24 truncate">
                  {scene.title || 'Untitled'}
                </span>
                <span className="text-[10px] text-gray-600">{scene.target_duration_seconds}s</span>

                {/* Scene status indicator */}
                {scene.clips && scene.clips.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </div>
            ))}

            {/* Add scene button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-xs gap-1 flex-shrink-0"
              onClick={handleAddScene}
              disabled={isAddingScene}
            >
              {isAddingScene ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              Add Scene
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Scene List (Left Panel) */}
          <div className="w-60 border-r border-gray-800 bg-gray-950/50 overflow-y-auto">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Scenes
                </h2>
                <span className="text-[10px] text-gray-600">{scenes.length}</span>
              </div>

              {scenes.length === 0 ? (
                <div className="text-center py-8">
                  <Film className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-3">No scenes yet</p>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddScene}
                    disabled={isAddingScene}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Scene
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all ${
                        activeScene?.id === scene.id
                          ? 'bg-gray-800'
                          : 'hover:bg-gray-900'
                      }`}
                      onClick={() => handleSelectScene(scene)}
                    >
                      <GripVertical className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500">S{index + 1}</span>
                          <span className="text-xs text-gray-200 truncate">
                            {scene.title || 'Untitled'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-600">
                            {scene.target_duration_seconds}s
                          </span>
                          {scene.clips && scene.clips.length > 0 && (
                            <span className="text-[10px] text-gray-600">
                              {scene.clips.length} clip{scene.clips.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Scene menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectScene(scene);
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSceneToDelete(scene);
                            }}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clip Workspace (Main Area) */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeScene ? (
              <div className="max-w-3xl mx-auto">
                {/* Scene header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-medium text-gray-100">
                      {activeScene.title || 'Untitled Scene'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activeScene.description || 'No description'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit Scene
                  </Button>
                </div>

                {/* Scene settings row */}
                <div className="flex items-center gap-4 mb-6 text-xs text-gray-400">
                  {activeScene.setting && (
                    <span>Setting: {activeScene.setting}</span>
                  )}
                  {activeScene.mood && (
                    <span>Mood: {activeScene.mood}</span>
                  )}
                  <span>Duration: {activeScene.target_duration_seconds}s</span>
                </div>

                {/* Clips */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Clips
                    </h3>
                    <Button size="sm" className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" />
                      Add Clip
                    </Button>
                  </div>

                  {activeScene.clips && activeScene.clips.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {activeScene.clips.map((clip, index) => (
                        <div
                          key={clip.id}
                          className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-all cursor-pointer"
                        >
                          <div className="aspect-video bg-gray-950 flex items-center justify-center">
                            {clip.thumbnail_url ? (
                              <img
                                src={clip.thumbnail_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Film className="w-6 h-6 text-gray-700" />
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-[10px] text-gray-400 truncate">
                              {clip.prompt}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-gray-600">
                                Clip {index + 1}
                              </span>
                              <span className={`text-[10px] capitalize ${
                                clip.status === 'completed' ? 'text-green-500' :
                                clip.status === 'generating' ? 'text-yellow-500' :
                                clip.status === 'failed' ? 'text-red-500' :
                                'text-gray-500'
                              }`}>
                                {clip.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-gray-800 rounded-lg">
                      <Film className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-3">No clips in this scene</p>
                      <Button size="sm" className="h-7 text-xs gap-1">
                        <Plus className="w-3 h-3" />
                        Generate First Clip
                      </Button>
                    </div>
                  )}
                </div>

                {/* AI Suggestions */}
                {activeProject.ai_assistance_level !== 'none' && (
                  <div className="mt-6 p-3 bg-purple-900/10 border border-purple-800/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs font-medium text-purple-300">AI Suggestions</span>
                    </div>
                    <div className="space-y-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start text-gray-400 hover:text-gray-200">
                        <ChevronRight className="w-3 h-3 mr-1" />
                        Generate scene description
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start text-gray-400 hover:text-gray-200">
                        <ChevronRight className="w-3 h-3 mr-1" />
                        Suggest clip prompts
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Film className="w-12 h-12 text-gray-700 mb-3" />
                <h3 className="text-sm font-medium text-gray-400 mb-1">
                  Select a scene to edit
                </h3>
                <p className="text-xs text-gray-500 mb-4 max-w-xs">
                  Choose a scene from the list to view and edit its clips, or add a new scene to get started.
                </p>
                <Button size="sm" className="h-8 text-xs" onClick={handleAddScene}>
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add First Scene
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Scene Confirmation */}
      <AlertDialog
        open={!!sceneToDelete}
        onOpenChange={(open) => !open && setSceneToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm bg-gray-950 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Scene</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete "{sceneToDelete?.title || 'Untitled'}"?
              This will also delete all clips in this scene.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScene}
              className="h-8 text-xs bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StoryboardLayout>
  );
};

export default StoryboardEditor;
