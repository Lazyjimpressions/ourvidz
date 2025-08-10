import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRefreshCache = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshCache = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-prompt-cache', {
        body: {},
      });

      if (error) {
        console.error('Cache refresh error:', error);
        throw error;
      }

      console.log('✅ Cache refreshed successfully:', data);
      toast.success('Template cache refreshed');
      return data;
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      toast.error('Failed to refresh cache');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refreshCache, isRefreshing };
};