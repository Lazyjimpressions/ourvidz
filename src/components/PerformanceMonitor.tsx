import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UnifiedUrlService } from '@/lib/services/UnifiedUrlService';
import { sessionCache } from '@/lib/cache/SessionCache';
import { assetUrlCache, assetMetadataCache } from '@/lib/cache/StaleWhileRevalidateCache';
import { Badge } from '@/components/ui/badge';

interface PerformanceStats {
  urlService: ReturnType<typeof UnifiedUrlService.getMetrics>;
  sessionCache: any;
  urlCache: any;
  metadataCache: any;
}

/**
 * Performance monitoring component for debugging and optimization
 * Shows real-time metrics for caching and URL generation
 */
export const PerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<PerformanceStats | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      setStats({
        urlService: UnifiedUrlService.getMetrics(),
        sessionCache: {
          size: 0, // sessionCache doesn't expose size
          keys: 0
        },
        urlCache: assetUrlCache.getStats(),
        metadataCache: assetMetadataCache.getStats()
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  const clearAllCaches = () => {
    UnifiedUrlService.clearCache();
    sessionCache.clearAllCache();
    assetUrlCache.invalidate();
    assetMetadataCache.invalidate();
    console.log('🧹 All caches cleared');
  };

  const resetMetrics = () => {
    UnifiedUrlService.resetMetrics();
    console.log('📊 Metrics reset');
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 opacity-75 hover:opacity-100"
      >
        📊 Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 max-h-96 overflow-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Performance Monitor</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {stats && (
          <>
            {/* URL Service Metrics */}
            <div>
              <h4 className="text-xs font-medium mb-1">URL Service</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Hit Rate: <Badge variant="secondary">{stats.urlService.hitRate}</Badge></div>
                <div>Requests: {stats.urlService.totalRequests}</div>
                <div>Cache Hits: {stats.urlService.cacheHits}</div>
                <div>Cache Misses: {stats.urlService.cacheMisses}</div>
                <div>Errors: {stats.urlService.errors}</div>
                <div>Batches: {stats.urlService.batchRequests}</div>
              </div>
            </div>

            {/* Session Cache */}
            <div>
              <h4 className="text-xs font-medium mb-1">Session Cache</h4>
              <div className="text-xs">
                <div>Entries: {stats.sessionCache.size}</div>
                <div>Keys: {stats.sessionCache.keys}</div>
              </div>
            </div>

            {/* URL Cache */}
            <div>
              <h4 className="text-xs font-medium mb-1">URL Cache</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Size: {stats.urlCache.size}</div>
                <div>Fresh: {stats.urlCache.fresh}</div>
                <div>Stale: {stats.urlCache.stale}</div>
                <div>Expired: {stats.urlCache.expired}</div>
                <div>Hit Rate: <Badge variant="secondary">{Math.round(stats.urlCache.hitRate * 100)}%</Badge></div>
              </div>
            </div>

            {/* Metadata Cache */}
            <div>
              <h4 className="text-xs font-medium mb-1">Metadata Cache</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Size: {stats.metadataCache.size}</div>
                <div>Fresh: {stats.metadataCache.fresh}</div>
                <div>Stale: {stats.metadataCache.stale}</div>
                <div>Expired: {stats.metadataCache.expired}</div>
                <div>Hit Rate: <Badge variant="secondary">{Math.round(stats.metadataCache.hitRate * 100)}%</Badge></div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllCaches}
                className="text-xs"
              >
                Clear Caches
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetMetrics}
                className="text-xs"
              >
                Reset Metrics
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};