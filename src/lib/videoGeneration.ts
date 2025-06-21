
import { supabase } from '@/integrations/supabase/client';
import { usageAPI, videoAPI, projectAPI } from '@/lib/database';

interface VideoGenerationParams {
  projectId: string;
  duration: number;
  resolution: string;
  format: string;
}

export const generateVideo = async (params: VideoGenerationParams) => {
  try {
    console.log('Starting video generation:', params);

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get project details
    const project = await projectAPI.getById(params.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Create video record
    const video = await videoAPI.create({
      project_id: params.projectId,
      user_id: user.id,
      duration: params.duration,
      resolution: params.resolution,
      format: params.format,
      status: 'processing'
    });

    console.log('Video record created:', video);

    // Queue the video generation job
    const { data: jobData, error: jobError } = await supabase.functions.invoke('queue-job', {
      body: {
        jobType: 'video_generation',
        projectId: params.projectId,
        videoId: video.id,
        metadata: {
          duration: params.duration,
          resolution: params.resolution,
          format: params.format,
          enhanced_prompt: project.enhanced_prompt,
          scenes: project.scenes || []
        }
      }
    });

    if (jobError) {
      console.error('Error queuing job:', jobError);
      throw jobError;
    }

    console.log('Job queued successfully:', jobData);

    // Log usage
    await usageAPI.logAction('video_generation', 1, {
      project_id: params.projectId,
      video_id: video.id,
      job_id: jobData.job?.id
    });

    return {
      video,
      job: jobData.job
    };

  } catch (error) {
    console.error('Error in video generation:', error);
    throw error;
  }
};

export const checkVideoStatus = async (videoId: string) => {
  try {
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error) throw error;
    return video;
  } catch (error) {
    console.error('Error checking video status:', error);
    throw error;
  }
};

export const getVideoProgress = async (jobId: string) => {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return job;
  } catch (error) {
    console.error('Error getting job progress:', error);
    throw error;
  }
};
