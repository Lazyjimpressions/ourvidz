
import { supabase } from '@/integrations/supabase/client';
import { generateContent } from '@/lib/contentGeneration';

interface VideoGenerationParams {
  projectId: string;
  duration: number;
  resolution: string;
  format: string;
}

export const generateVideo = async (params: VideoGenerationParams) => {
  try {
    console.log('Starting video generation workflow:', params);

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get project details
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

    // Start with enhance job using the new content generation system
    const { job } = await generateContent({
      jobType: 'enhance',
      prompt: project.enhanced_prompt || project.original_prompt,
      projectId: params.projectId,
      videoId: video.id,
      characterId: project.character_id,
      metadata: {
        duration: params.duration,
        resolution: params.resolution,
        format: params.format
      }
    });

    console.log('Enhance job queued successfully:', job);

    // Log usage
    await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action: 'video_generation_started',
        credits_consumed: 1,
        metadata: {
          project_id: params.projectId,
          video_id: video.id,
          job_id: job.id
        }
      });

    return {
      video,
      job
    };

  } catch (error) {
    console.error('Error in video generation:', error);
    throw error;
  }
};

export const queuePreviewJob = async (videoId: string, enhancedPrompt: string) => {
  try {
    const { job } = await generateContent({
      jobType: 'preview',
      prompt: enhancedPrompt,
      videoId: videoId
    });

    return { job };
  } catch (error) {
    console.error('Error queuing preview job:', error);
    throw error;
  }
};

export const queueVideoJob = async (videoId: string, previewUrl: string) => {
  try {
    const { job } = await generateContent({
      jobType: 'video',
      prompt: 'Generate final video',
      videoId: videoId,
      metadata: {
        previewUrl: previewUrl
      }
    });

    return { job };
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
