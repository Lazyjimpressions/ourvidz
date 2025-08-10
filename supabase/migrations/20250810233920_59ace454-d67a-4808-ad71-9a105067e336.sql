-- Refresh the prompt template cache to ensure latest templates are loaded
SELECT supabase.functions.invoke('refresh-prompt-cache', '{}'::jsonb);