import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { useToast } from '@/hooks/use-toast';

export const ASSETS_QUERY_KEY = ['assets'] as const;

interface UseAssetsWithDebounceOptions {
  sessionOnly?: boolean;
  debounceMs?: number;
  maxRetries?: number;
}

/**
 * Enhanced assets hook with debouncing and circuit breaker to prevent infinite loops
 * Fixes the workspace "new content ready - new undefined" issue
 */
export const useAssetsWithDebounce = (options: UseAssetsWithDebounceOptions = {}) => {
  const { sessionOnly = true, debounceMs = 1000, maxRetries = 3 } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Circuit breaker state
  const retryCountRef = useRef(0);
  const lastSuccessRef = useRef(Date.now());
  const isCircuitOpenRef = useRef(false);
  
  // Debouncing state
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInvalidationRef = useRef(false);

  const resetCircuitBreaker = useCallback(() => {
    retryCountRef.current = 0;
    lastSuccessRef.current = Date.now();
    isCircuitOpenRef.current = false;
    console.log('🔄 Circuit breaker reset - service is healthy');
  }, []);

  const openCircuitBreaker = useCallback(() => {
    isCircuitOpenRef.current = true;
    console.log('⚠️ Circuit breaker opened - too many failures, backing off');
    
    toast({
      title: "Service Temporarily Unavailable",
      description: "Asset loading is temporarily paused to prevent issues. Will retry shortly.",
      variant: "destructive",
    });

    // Auto-reset after 30 seconds
    setTimeout(() => {
      resetCircuitBreaker();
    }, 30000);
  }, [toast, resetCircuitBreaker]);

  const query = useQuery({
    queryKey: [...ASSETS_QUERY_KEY, sessionOnly],
    queryFn: async (): Promise<UnifiedAsset[]> => {
      // Circuit breaker check
      if (isCircuitOpenRef.current) {
        console.log('🚫 Circuit breaker is open, skipping asset fetch');
        return [];
      }

      try {
        console.log('🚀 DEBOUNCED: Starting asset fetch with enhanced error handling');
        
        const assets = await AssetService.getUserAssetsOptimized(sessionOnly);
        
        console.log('✅ DEBOUNCED: Asset fetch successful:', {
          total: assets.length,
          images: assets.filter(a => a.type === 'image').length,
          videos: assets.filter(a => a.type === 'video').length,
          withUrls: assets.filter(a => a.url).length,
          withErrors: assets.filter(a => a.error).length
        });

        // Success - reset circuit breaker
        if (assets.length > 0 || Date.now() - lastSuccessRef.current < 60000) {
          resetCircuitBreaker();
        }

        return assets;
        
      } catch (error: any) {
        retryCountRef.current++;
        console.error(`❌ DEBOUNCED: Asset fetch failed (attempt ${retryCountRef.current}):`, error);

        // Open circuit breaker if too many failures
        if (retryCountRef.current >= maxRetries) {
          openCircuitBreaker();
        }

        // Show user-friendly error
        toast({
          title: "Failed to Load Assets",
          description: `Could not load workspace content (attempt ${retryCountRef.current}/${maxRetries}). ${retryCountRef.current >= maxRetries ? 'Service temporarily paused.' : 'Retrying...'}`,
          variant: "destructive",
        });

        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - keep data fresh longer
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent reload on navigation
    refetchInterval: false, // No polling - rely on real-time
    retry: (failureCount, error) => {
      console.log(`🔄 DEBOUNCED: Retry attempt ${failureCount + 1} for assets query`);
      return failureCount < maxRetries && !isCircuitOpenRef.current;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Debounced invalidation function
  const debouncedInvalidate = useCallback(() => {
    if (isCircuitOpenRef.current) {
      console.log('🚫 Circuit breaker is open, skipping invalidation');
      return;
    }

    if (pendingInvalidationRef.current) {
      console.log('⏳ Invalidation already pending, skipping duplicate');
      return;
    }

    pendingInvalidationRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('🔄 DEBOUNCED: Executing debounced query invalidation');
      
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      
      debounceTimerRef.current = null;
      pendingInvalidationRef.current = false;
      
      console.log('✅ DEBOUNCED: Query invalidation completed');
    }, debounceMs);

    console.log(`⏰ DEBOUNCED: Scheduled invalidation in ${debounceMs}ms`);
  }, [queryClient, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...query,
    debouncedInvalidate,
    isCircuitOpen: isCircuitOpenRef.current,
    retryCount: retryCountRef.current,
    resetCircuitBreaker
  };
};

export const useInvalidateAssetsDebounced = () => {
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((debounceMs: number = 1000) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('🔄 DEBOUNCED INVALIDATION: Executing assets cache refresh');
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      queryClient.refetchQueries({ queryKey: ASSETS_QUERY_KEY });
      debounceTimerRef.current = null;
    }, debounceMs);

    console.log(`⏰ DEBOUNCED INVALIDATION: Scheduled refresh in ${debounceMs}ms`);
  }, [queryClient]);
};