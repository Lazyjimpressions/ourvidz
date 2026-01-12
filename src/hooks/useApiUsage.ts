import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ApiProviderBalance {
  id: string;
  provider_id: string;
  balance_usd: number | null;
  balance_credits: number | null;
  currency: string;
  last_synced_at: string | null;
  sync_method: string | null;
  sync_status: 'success' | 'failed' | 'pending' | null;
  sync_error: string | null;
  balance_metadata: Record<string, any>;
  updated_at: string;
  api_providers: {
    id: string;
    name: string;
    display_name: string;
  };
}

interface ApiUsageAggregate {
  id: string;
  provider_id: string;
  model_id: string | null;
  date_bucket: string;
  hour_bucket: number | null;
  request_count: number;
  success_count: number;
  error_count: number;
  tokens_input_total: number;
  tokens_output_total: number;
  tokens_cached_total: number;
  cost_usd_total: number;
  cost_credits_total: number;
  avg_response_time_ms: number | null;
  p95_response_time_ms: number | null;
  p99_response_time_ms: number | null;
  api_providers: {
    id: string;
    name: string;
    display_name: string;
  };
  api_models: {
    id: string;
    display_name: string;
    model_key: string;
  } | null;
}

interface ApiUsageLog {
  id: string;
  provider_id: string;
  model_id: string | null;
  user_id: string | null;
  request_type: 'chat' | 'image' | 'video';
  endpoint_path: string | null;
  request_payload: any;
  tokens_input: number | null;
  tokens_output: number | null;
  tokens_total: number | null;
  tokens_cached: number | null;
  cost_usd: number | null;
  cost_credits: number | null;
  response_status: number | null;
  response_time_ms: number;
  response_payload: any;
  error_message: string | null;
  provider_metadata: Record<string, any>;
  created_at: string;
  api_providers: {
    name: string;
    display_name: string;
  };
  api_models: {
    display_name: string;
    model_key: string;
  } | null;
}

interface UsageLogFilters {
  providerId?: string;
  modelId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  requestType?: 'chat' | 'image' | 'video';
  page?: number;
  pageSize?: number;
}

/**
 * Hook to fetch API provider balances
 */
export const useApiBalances = () => {
  return useQuery({
    queryKey: ['api-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_provider_balances')
        .select(`
          *,
          api_providers!inner(id, name, display_name)
        `)
        .order('api_providers.display_name');

      if (error) throw error;
      return data as ApiProviderBalance[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to manually sync provider balances
 */
export const useSyncBalances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-provider-balances', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-balances'] });
    }
  });
};

/**
 * Hook to fetch API usage aggregates
 */
export const useApiUsageAggregates = (
  timeRange: '24h' | '7d' | '30d' | 'all' = '7d',
  providerId?: string | null
) => {
  return useQuery({
    queryKey: ['api-usage-aggregates', timeRange, providerId],
    queryFn: async () => {
      const now = new Date();
      let startDate: string;

      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default:
          startDate = '2000-01-01'; // All time
      }

      let query = supabase
        .from('api_usage_aggregates')
        .select(`
          *,
          api_providers!inner(id, name, display_name),
          api_models(id, display_name, model_key)
        `)
        .gte('date_bucket', startDate)
        .order('date_bucket', { ascending: false })
        .order('hour_bucket', { ascending: false });

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ApiUsageAggregate[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch detailed API usage logs with pagination
 */
export const useApiUsageLogs = (filters: UsageLogFilters = {}) => {
  const {
    providerId,
    modelId,
    userId,
    startDate,
    endDate,
    requestType,
    page = 1,
    pageSize = 50
  } = filters;

  return useQuery({
    queryKey: ['api-usage-logs', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('api_usage_logs')
        .select(`
          *,
          api_providers!inner(name, display_name),
          api_models(display_name, model_key)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      if (modelId) {
        query = query.eq('model_id', modelId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (requestType) {
        query = query.eq('request_type', requestType);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return {
        data: data as ApiUsageLog[],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000,
  });
};
