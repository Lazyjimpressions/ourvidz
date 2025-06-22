
import { supabase } from '@/integrations/supabase/client';

export interface PromptEnhancementParams {
  prompt: string;
  mode: 'character' | 'general';
  characterId?: string;
  metadata?: any;
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
}
