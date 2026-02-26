import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlaygroundPrompt {
  id: string;
  user_id: string;
  name: string;
  prompt_text: string;
  tags: string[];
  task_type: string;
  model_family: string | null;
  is_standard: boolean;
  created_at: string;
  updated_at: string;
}

interface UsePlaygroundPromptsReturn {
  prompts: PlaygroundPrompt[];
  isLoading: boolean;
  savePrompt: (name: string, promptText: string, tags: string[], taskType: string, modelFamily?: string | null) => Promise<void>;
  updatePrompt: (id: string, updates: Partial<Pick<PlaygroundPrompt, 'name' | 'prompt_text' | 'tags' | 'task_type' | 'model_family'>>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  refresh: () => void;
}

export function usePlaygroundPrompts(): UsePlaygroundPromptsReturn {
  const [prompts, setPrompts] = useState<PlaygroundPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    const query = supabase
      .from('playground_prompts' as any)
      .select('*')
      .order('is_standard', { ascending: false })
      .order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('❌ Failed to fetch playground prompts:', error);
    } else {
      setPrompts((data as any[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const savePrompt = useCallback(async (name: string, promptText: string, tags: string[], taskType: string, modelFamily?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('playground_prompts' as any)
      .insert({
        user_id: user.id,
        name,
        prompt_text: promptText,
        tags,
        task_type: taskType,
        model_family: modelFamily || null,
      } as any);

    if (error) throw error;
    await fetchPrompts();
  }, [fetchPrompts]);

  const updatePrompt = useCallback(async (id: string, updates: Partial<Pick<PlaygroundPrompt, 'name' | 'prompt_text' | 'tags' | 'task_type' | 'model_family'>>) => {
    const { error } = await supabase
      .from('playground_prompts' as any)
      .update(updates as any)
      .eq('id', id);

    if (error) throw error;
    await fetchPrompts();
  }, [fetchPrompts]);

  const deletePrompt = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('playground_prompts' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchPrompts();
  }, [fetchPrompts]);

  return { prompts, isLoading, savePrompt, updatePrompt, deletePrompt, refresh: fetchPrompts };
}
