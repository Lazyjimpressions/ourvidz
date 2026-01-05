/**
 * useStoryboard Hook
 *
 * State management for storyboard projects, scenes, and clips.
 * Follows patterns from useLibraryFirstWorkspace.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { StoryboardService } from '@/lib/services/StoryboardService';
import {
  StoryboardProject,
  StoryboardScene,
  StoryboardClip,
  CreateProjectInput,
  UpdateProjectInput,
  CreateSceneInput,
  UpdateSceneInput,
  CreateClipInput,
  UpdateClipInput,
  ProjectStatus
} from '@/types/storyboard';
import { useToast } from '@/hooks/use-toast';

export interface UseStoryboardReturn {
  // Projects
  projects: StoryboardProject[];
  projectsLoading: boolean;
  projectsError: Error | null;

  // Active project
  activeProject: StoryboardProject | null;
  activeProjectLoading: boolean;

  // Scenes
  scenes: StoryboardScene[];
  activeScene: StoryboardScene | null;

  // Clips
  clips: StoryboardClip[];
  activeClip: StoryboardClip | null;

  // UI State
  isCreatingProject: boolean;
  isEditingProject: boolean;

  // Project Actions
  createProject: (input: CreateProjectInput) => Promise<StoryboardProject>;
  updateProject: (projectId: string, input: UpdateProjectInput) => Promise<StoryboardProject>;
  deleteProject: (projectId: string) => Promise<void>;
  loadProject: (projectId: string) => void;
  clearActiveProject: () => void;

  // Scene Actions
  createScene: (input: CreateSceneInput) => Promise<StoryboardScene>;
  updateScene: (sceneId: string, input: UpdateSceneInput) => Promise<StoryboardScene>;
  deleteScene: (sceneId: string) => Promise<void>;
  reorderScenes: (sceneIds: string[]) => Promise<void>;
  selectScene: (scene: StoryboardScene | null) => void;

  // Clip Actions
  createClip: (input: CreateClipInput) => Promise<StoryboardClip>;
  updateClip: (clipId: string, input: UpdateClipInput) => Promise<StoryboardClip>;
  deleteClip: (clipId: string) => Promise<void>;
  selectClip: (clip: StoryboardClip | null) => void;

  // Refetch
  refetchProjects: () => void;
  refetchActiveProject: () => void;
}

export function useStoryboard(): UseStoryboardReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // UI State
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<StoryboardScene | null>(null);
  const [activeClip, setActiveClip] = useState<StoryboardClip | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // List all projects
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['storyboard-projects', user?.id],
    queryFn: () => StoryboardService.listProjects(),
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Get active project with scenes
  const {
    data: activeProject,
    isLoading: activeProjectLoading,
    refetch: refetchActiveProject
  } = useQuery({
    queryKey: ['storyboard-project', activeProjectId],
    queryFn: () => activeProjectId
      ? StoryboardService.getProject(activeProjectId, true)
      : null,
    enabled: !!activeProjectId,
    staleTime: 10000, // 10 seconds
  });

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => StoryboardService.createProject(input),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-projects'] });
      toast({
        title: 'Project created',
        description: `"${project.title}" has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: UpdateProjectInput }) =>
      StoryboardService.updateProject(projectId, input),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-projects'] });
      queryClient.invalidateQueries({ queryKey: ['storyboard-project', project.id] });
      toast({
        title: 'Project updated',
        description: `"${project.title}" has been saved.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => StoryboardService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-projects'] });
      if (activeProjectId) {
        setActiveProjectId(null);
      }
      toast({
        title: 'Project deleted',
        description: 'The project has been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create scene mutation
  const createSceneMutation = useMutation({
    mutationFn: (input: CreateSceneInput) => StoryboardService.createScene(input),
    onSuccess: () => {
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['storyboard-project', activeProjectId] });
      }
      toast({
        title: 'Scene created',
        description: 'New scene has been added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create scene',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update scene mutation
  const updateSceneMutation = useMutation({
    mutationFn: ({ sceneId, input }: { sceneId: string; input: UpdateSceneInput }) =>
      StoryboardService.updateScene(sceneId, input),
    onSuccess: () => {
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['storyboard-project', activeProjectId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update scene',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete scene mutation
  const deleteSceneMutation = useMutation({
    mutationFn: (sceneId: string) => StoryboardService.deleteScene(sceneId),
    onSuccess: () => {
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['storyboard-project', activeProjectId] });
      }
      setActiveScene(null);
      toast({
        title: 'Scene deleted',
        description: 'The scene has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete scene',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reorder scenes mutation
  const reorderScenesMutation = useMutation({
    mutationFn: (sceneIds: string[]) => {
      if (!activeProjectId) throw new Error('No active project');
      return StoryboardService.reorderScenes(activeProjectId, sceneIds);
    },
    onSuccess: () => {
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['storyboard-project', activeProjectId] });
      }
    },
  });

  // Create clip mutation
  const createClipMutation = useMutation({
    mutationFn: (input: CreateClipInput) => StoryboardService.createClip(input),
    onSuccess: () => {
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['storyboard-project', activeProjectId] });
      }
      toast({
        title: 'Clip created',
        description: 'New clip has been added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create clip',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update clip mutation
  const updateClipMutation = useMutation({
    mutationFn: ({ clipId, input }: { clipId: string; input: UpdateClipInput }) =>
      StoryboardService.updateClip(clipId, input),
    onSuccess: () => {
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['storyboard-project', activeProjectId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update clip',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete clip mutation
  const deleteClipMutation = useMutation({
    mutationFn: (clipId: string) => StoryboardService.deleteClip(clipId),
    onSuccess: () => {
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['storyboard-project', activeProjectId] });
      }
      setActiveClip(null);
      toast({
        title: 'Clip deleted',
        description: 'The clip has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete clip',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const loadProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setActiveScene(null);
    setActiveClip(null);
  }, []);

  const clearActiveProject = useCallback(() => {
    setActiveProjectId(null);
    setActiveScene(null);
    setActiveClip(null);
  }, []);

  const selectScene = useCallback((scene: StoryboardScene | null) => {
    setActiveScene(scene);
    setActiveClip(null);
  }, []);

  const selectClip = useCallback((clip: StoryboardClip | null) => {
    setActiveClip(clip);
  }, []);

  // ==========================================================================
  // DERIVED STATE
  // ==========================================================================

  // Extract scenes from active project
  const scenes = activeProject?.scenes || [];

  // Extract clips from active scene
  const clips = activeScene?.clips || [];

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Projects
    projects,
    projectsLoading,
    projectsError: projectsError as Error | null,

    // Active project
    activeProject: activeProject || null,
    activeProjectLoading,

    // Scenes
    scenes,
    activeScene,

    // Clips
    clips,
    activeClip,

    // UI State
    isCreatingProject,
    isEditingProject,

    // Project Actions
    createProject: async (input) => {
      setIsCreatingProject(true);
      try {
        return await createProjectMutation.mutateAsync(input);
      } finally {
        setIsCreatingProject(false);
      }
    },
    updateProject: async (projectId, input) => {
      setIsEditingProject(true);
      try {
        return await updateProjectMutation.mutateAsync({ projectId, input });
      } finally {
        setIsEditingProject(false);
      }
    },
    deleteProject: async (projectId) => {
      await deleteProjectMutation.mutateAsync(projectId);
    },
    loadProject,
    clearActiveProject,

    // Scene Actions
    createScene: async (input) => createSceneMutation.mutateAsync(input),
    updateScene: async (sceneId, input) => updateSceneMutation.mutateAsync({ sceneId, input }),
    deleteScene: async (sceneId) => deleteSceneMutation.mutateAsync(sceneId),
    reorderScenes: async (sceneIds) => reorderScenesMutation.mutateAsync(sceneIds),
    selectScene,

    // Clip Actions
    createClip: async (input) => createClipMutation.mutateAsync(input),
    updateClip: async (clipId, input) => updateClipMutation.mutateAsync({ clipId, input }),
    deleteClip: async (clipId) => deleteClipMutation.mutateAsync(clipId),
    selectClip,

    // Refetch
    refetchProjects: () => refetchProjects(),
    refetchActiveProject: () => refetchActiveProject(),
  };
}
