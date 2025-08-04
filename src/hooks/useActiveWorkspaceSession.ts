import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActiveWorkspaceSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get or create active workspace session
        const { data: sessions, error } = await supabase
          .from('workspace_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching workspace session:', error);
          setLoading(false);
          return;
        }

        if (sessions && sessions.length > 0) {
          setSessionId(sessions[0].id);
        } else {
          // Create new active session if none exists
          const { data: newSession, error: createError } = await supabase
            .from('workspace_sessions')
            .insert({
              user_id: user.id,
              session_name: 'Workspace Session',
              is_active: true
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating workspace session:', createError);
          } else {
            setSessionId(newSession.id);
          }
        }
      } catch (error) {
        console.error('Error in useActiveWorkspaceSession:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSession();
  }, []);

  return { sessionId, loading };
};