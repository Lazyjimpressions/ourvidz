import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CharacterTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  category: string | null;
  icon_emoji: string | null;
  is_active: boolean;
  priority: number;
  default_data: {
    appearance_tags?: string[];
    traits?: string;
    persona?: string;
    first_message?: string;
    voice_tone?: string;
    mood?: string;
    [key: string]: any; // Allow additional fields
  };
  created_at: string;
  updated_at: string;
}

export function useCharacterTemplates() {
  const [templates, setTemplates] = useState<CharacterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('character_templates')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (fetchError) throw fetchError;

        setTemplates((data || []) as CharacterTemplate[]);
      } catch (err) {
        console.error('Error loading character templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return { templates, loading, error };
}
