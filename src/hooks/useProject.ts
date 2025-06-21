
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectAPI, sceneAPI, videoAPI, type Project, type Scene } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export const useProject = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectAPI.getById(projectId!),
    enabled: !!projectId,
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      projectAPI.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error) => {
      console.error('Failed to update project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const createScenesMutation = useMutation({
    mutationFn: sceneAPI.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error) => {
      console.error('Failed to create scenes:', error);
      toast({
        title: "Error",
        description: "Failed to create scenes",
        variant: "destructive",
      });
    },
  });

  const updateWorkflowStep = (step: string) => {
    if (!projectId) return;
    updateProjectMutation.mutate({ 
      id: projectId, 
      updates: { workflow_step: step } 
    });
  };

  const createScenes = (sceneDescriptions: string[]) => {
    if (!projectId) return;
    
    const scenes = sceneDescriptions.map((description, index) => ({
      project_id: projectId,
      scene_number: index + 1,
      description,
      approved: false,
    }));

    createScenesMutation.mutate(scenes);
  };

  return {
    project,
    isLoading,
    updateProject: updateProjectMutation.mutate,
    updateWorkflowStep,
    createScenes,
    isUpdating: updateProjectMutation.isPending || createScenesMutation.isPending,
  };
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectAPI.getAll,
  });
};

export const useUserVideos = () => {
  return useQuery({
    queryKey: ['user-videos'],
    queryFn: videoAPI.getByUser,
  });
};
