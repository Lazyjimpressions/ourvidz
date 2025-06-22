
import { supabase } from '@/integrations/supabase/client';

export interface PromptEnhancementParams {
  prompt: string;
  mode: 'character' | 'general';
  characterId?: string;
  metadata?: any;
}

export interface DirectEnhancementResult {
  jobId: string;
  success: boolean;
  error?: string;
}

export class PromptEnhancementService {
  static async enhancePrompt(params: PromptEnhancementParams) {
    try {
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'enhance',
          metadata: {
            prompt: params.prompt,
            mode: params.mode,
            characterId: params.characterId,
            ...params.metadata
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Prompt enhancement error:', error);
      throw error;
    }
  }

  // Direct enhancement method for admin testing
  static async enhancePromptDirect(prompt: string): Promise<DirectEnhancementResult> {
    try {
      console.log('Starting direct prompt enhancement for admin testing:', prompt);
      
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'enhance',
          metadata: {
            prompt: prompt,
            mode: 'general',
            adminTest: true
          }
        }
      });

      if (error) {
        console.error('Failed to queue enhancement job:', error);
        throw error;
      }

      console.log('Enhancement job queued successfully:', data);
      
      return {
        jobId: data.job.id,
        success: true
      };
    } catch (error) {
      console.error('Direct prompt enhancement error:', error);
      return {
        jobId: '',
        success: false,
        error: error.message
      };
    }
  }

  // Poll for job completion
  static async pollJobStatus(jobId: string): Promise<{ status: string; result?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('status, metadata, error_message')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return {
        status: data.status,
        result: data.metadata?.enhanced_prompt,
        error: data.error_message
      };
    } catch (error) {
      console.error('Error polling job status:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }
}
