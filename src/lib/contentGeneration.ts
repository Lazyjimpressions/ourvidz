
import { supabase } from '@/integrations/supabase/client';

export interface GenerateContentParams {
  jobType: 'enhance' | 'image' | 'preview' | 'video';
  prompt: string;
  projectId?: string;
  videoId?: string;
  sceneId?: string;
  characterId?: string;
  metadata?: any;
}

export interface GeneratedContent {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  contentUrl?: string;
  error?: string;
}

export const generateContent = async (params: GenerateContentParams): Promise<{ job: any }> => {
  try {
    console.log('Generating content:', params);

    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: params
    });

    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error || 'Content generation failed');
    }

    return { job: data.job };
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
};

export const checkJobStatus = async (jobId: string) => {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return job;
  } catch (error) {
    console.error('Error checking job status:', error);
    throw error;
  }
};

export const waitForJobCompletion = async (
  jobId: string, 
  onProgress?: (status: string) => void,
  timeout = 120000 // 2 minutes
): Promise<any> => {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Job timeout'));
          return;
        }

        const job = await checkJobStatus(jobId);
        
        if (onProgress) {
          onProgress(job.status);
        }

        if (job.status === 'completed') {
          resolve(job);
        } else if (job.status === 'failed') {
          reject(new Error(job.error_message || 'Job failed'));
        } else {
          // Continue polling
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        reject(error);
      }
    };

    checkStatus();
  });
};
