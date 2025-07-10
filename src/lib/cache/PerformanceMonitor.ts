/**
 * Performance monitoring and optimization tracker
 * Tracks library performance metrics and suggests optimizations
 */

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  assetLoadTime: number;
  scrollPerformance: number;
  memoryUsage: number;
  cacheHitRate: number;
  timestamp: number;
}

interface OptimizationSuggestion {
  type: 'memory' | 'performance' | 'user-experience';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: string;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private observer: PerformanceObserver | null = null;
  private startTime: number = 0;
  private isMonitoring = false;

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startLibrarySession(): void {
    this.startTime = performance.now();
    this.isMonitoring = true;
    console.log('📊 Performance monitoring started');
  }

  endLibrarySession(): PerformanceMetrics {
    const endTime = performance.now();
    const sessionMetrics = this.calculateSessionMetrics(endTime - this.startTime);
    
    this.metrics.push(sessionMetrics);
    this.isMonitoring = false;
    
    // Keep only last 50 sessions
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50);
    }
    
    console.log('📊 Library session ended:', sessionMetrics);
    return sessionMetrics;
  }

  private calculateSessionMetrics(sessionDuration: number): PerformanceMetrics {
    const memInfo = (performance as any).memory;
    
    return {
      loadTime: this.getAverageLoadTime(),
      renderTime: this.getAverageRenderTime(),
      assetLoadTime: this.getAverageAssetLoadTime(),
      scrollPerformance: this.getScrollPerformance(),
      memoryUsage: memInfo?.usedJSHeapSize || 0,
      cacheHitRate: this.calculateCacheHitRate(),
      timestamp: Date.now()
    };
  }

  private getAverageLoadTime(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp?.startTime || 0;
  }

  private getAverageRenderTime(): number {
    const measureEntries = performance.getEntriesByType('measure');
    const renderMeasures = measureEntries.filter(entry => entry.name.includes('render'));
    
    if (renderMeasures.length === 0) return 0;
    
    const total = renderMeasures.reduce((sum, entry) => sum + entry.duration, 0);
    return total / renderMeasures.length;
  }

  private getAverageAssetLoadTime(): number {
    const resourceEntries = performance.getEntriesByType('resource');
    const assetEntries = resourceEntries.filter(entry => 
      entry.name.includes('blob:') || entry.name.includes('signed-url')
    );
    
    if (assetEntries.length === 0) return 0;
    
    const total = assetEntries.reduce((sum, entry) => sum + entry.duration, 0);
    return total / assetEntries.length;
  }

  private getScrollPerformance(): number {
    // Estimate scroll performance based on frame timing
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0] as PerformanceNavigationTiming;
      return nav.loadEventEnd - nav.loadEventStart;
    }
    return 0;
  }

  private calculateCacheHitRate(): number {
    // Calculate cache hit rate from session storage
    let hits = 0;
    let total = 0;
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('cache-stats-')) {
        try {
          const stats = JSON.parse(sessionStorage.getItem(key) || '{}');
          hits += stats.hits || 0;
          total += stats.total || 0;
        } catch (error) {
          // Ignore invalid entries
        }
      }
    });
    
    return total > 0 ? hits / total : 0;
  }

  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const recentMetrics = this.metrics.slice(-10); // Last 10 sessions
    
    if (recentMetrics.length === 0) return suggestions;

    // Average metrics for analysis
    const avgLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
    const avgCacheHit = recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length;

    // Load time analysis
    if (avgLoadTime > 3000) {
      suggestions.push({
        type: 'performance',
        severity: avgLoadTime > 5000 ? 'critical' : 'high',
        message: `Average load time is ${(avgLoadTime / 1000).toFixed(1)}s`,
        action: 'Consider implementing more aggressive lazy loading and prefetching'
      });
    }

    // Memory usage analysis
    const memoryMB = avgMemory / (1024 * 1024);
    if (memoryMB > 200) {
      suggestions.push({
        type: 'memory',
        severity: memoryMB > 500 ? 'critical' : 'high',
        message: `High memory usage: ${memoryMB.toFixed(1)}MB`,
        action: 'Enable more aggressive memory cleanup and reduce cache sizes'
      });
    }

    // Cache hit rate analysis
    if (avgCacheHit < 0.5) {
      suggestions.push({
        type: 'performance',
        severity: avgCacheHit < 0.3 ? 'high' : 'medium',
        message: `Low cache hit rate: ${(avgCacheHit * 100).toFixed(1)}%`,
        action: 'Improve caching strategy and increase cache durations'
      });
    }

    return suggestions;
  }

  getPerformanceSummary(): {
    averageLoadTime: number;
    averageMemory: number;
    cacheHitRate: number;
    sessionsAnalyzed: number;
    suggestions: OptimizationSuggestion[];
  } {
    const recentMetrics = this.metrics.slice(-20);
    
    if (recentMetrics.length === 0) {
      return {
        averageLoadTime: 0,
        averageMemory: 0,
        cacheHitRate: 0,
        sessionsAnalyzed: 0,
        suggestions: []
      };
    }

    const avgLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
    const avgCacheHit = recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length;

    return {
      averageLoadTime: avgLoadTime,
      averageMemory: avgMemory,
      cacheHitRate: avgCacheHit,
      sessionsAnalyzed: recentMetrics.length,
      suggestions: this.generateOptimizationSuggestions()
    };
  }

  private initializeMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        if (this.isMonitoring) {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name.includes('library')) {
              console.log(`📊 Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
            }
          });
        }
      });

      try {
        this.observer.observe({ entryTypes: ['measure', 'paint', 'resource'] });
      } catch (error) {
        console.warn('Performance observer not fully supported:', error);
      }
    }
  }

  markStart(name: string): void {
    if (this.isMonitoring) {
      performance.mark(`${name}-start`);
    }
  }

  markEnd(name: string): void {
    if (this.isMonitoring) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Mark might not exist, ignore
      }
    }
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.isMonitoring = false;
  }
}

// Global instance
export const performanceMonitor = PerformanceMonitor.getInstance();
