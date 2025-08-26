import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ApiProvider {
  id: string;
  name: string;
  display_name: string;
  base_url: string | null;
  docs_url: string | null;
  auth_scheme: string;
  auth_header_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminApiProvider extends ApiProvider {
  secret_name: string | null;
  rate_limits: Record<string, any>;
}

/**
 * Hook for regular users - only exposes safe fields without secret_name
 * This prevents accidental exposure of sensitive secret names to non-admin users
 */
export const useApiProviders = () => {
  return useQuery({
    queryKey: ['api-providers-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_providers')
        .select(`
          id,
          name,
          display_name,
          base_url,
          docs_url,
          auth_scheme,
          auth_header_name,
          is_active,
          created_at,
          updated_at
        `)
        .eq('is_active', true)
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as ApiProvider[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook for admin users - exposes all fields including secret_name
 * This should only be used in admin components with proper role checking
 */
export const useAdminApiProviders = () => {
  return useQuery({
    queryKey: ['api-providers-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminApiProvider[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for admin data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};