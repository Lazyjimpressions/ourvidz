
import { supabase } from '@/integrations/supabase/client';

interface VideoGenerationParams {
  projectId: string;
  duration: number;
  resolution: string;
  format: string;
}

export const generateVideo = async (params: VideoGenerationParams) => {
  try {
    console.log('Starting video generation workflow:', params);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('enhanced_prompt, original_prompt, character_id')
      .eq('id', params.projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Create video record with draft status
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        project_id: params.projectId,
        user_id: user.id,
        duration: params.duration,
        resolution: params.resolution,
        format: params.format,
        status: 'draft'
      })
      .select()
      .single();

    if (videoError) {
      console.error('Error creating video:', videoError);
      throw videoError;
    }

    console.log('Video record created:', video);

    // Start with enhance job using existing queue-job infrastructure
    const { data, error } = await supabase.functions.invoke('queue-job', {
      body: {
        jobType: 'enhance',
        videoId: video.id,
        projectId: params.projectId,
        metadata: {
          prompt: project.enhanced_prompt || project.original_prompt,
          characterId: project.character_id,
          duration: params.duration,
          resolution: params.resolution,
          format: params.format
        }
      }
    });

    if (error) {
      console.error('Error queuing enhance job:', error);
      throw error;
    }

    console.log('Enhance job queued successfully:', data);

    // Log usage
    await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action: 'video_generation_started',
        credits_consumed: 1,
        metadata: {
          project_id: params.projectId,
          video_id: video.id
        }
      });

    return {
      video,
      job: data.job
    };

  } catch (error) {
    console.error('Error in video generation:', error);
    throw error;
  }
};

export const queuePreviewJob = async (videoId: string, enhancedPrompt: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('queue-job', {
      body: {
        jobType: 'preview',
        videoId: videoId,
        metadata: {
          prompt: enhancedPrompt
        }
      }
    });

    if (error) throw error;
    return { job: data.job };
  } catch (error) {
    console.error('Error queuing preview job:', error);
    throw error;
  }
};

export const queueVideoJob = async (videoId: string, previewUrl: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('queue-job', {
      body: {
        jobType: 'video',
        videoId: videoId,
        metadata: {
          previewUrl: previewUrl
        }
      }
    });

    if (error) throw error;
    return { job: data.job };
  } catch (error) {
    console.error('Error queuing video job:', error);
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
