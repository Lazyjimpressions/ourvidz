/**
 * Shared monitoring and performance utilities for edge functions
 */

export interface PerformanceMetrics {
  functionName: string;
  executionTime: number;
  memoryUsage?: number;
  cacheHit?: boolean;
  fallbackLevel?: number;
  errorCount?: number;
  timestamp: string;
}

export interface CacheMetrics {
  hit: boolean;
  source: 'database' | 'cache' | 'fallback';
  responseTime: number;
  dataSize?: number;
}

export class EdgeFunctionMonitor {
  private functionName: string;
  private startTime: number;
  private metrics: PerformanceMetrics;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.startTime = Date.now();
    this.metrics = {
      functionName,
      executionTime: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record cache performance
   */
  recordCacheMetrics(metrics: CacheMetrics) {
    this.metrics.cacheHit = metrics.hit;
    console.log(`📊 Cache ${metrics.hit ? 'HIT' : 'MISS'} (${metrics.source}):`, {
      function: this.functionName,
      responseTime: metrics.responseTime,
      source: metrics.source,
      dataSize: metrics.dataSize
    });
  }

  /**
   * Record fallback usage
   */
  recordFallback(level: number, reason: string) {
    this.metrics.fallbackLevel = level;
    console.log(`⚠️ Fallback Level ${level} activated:`, {
      function: this.functionName,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: any) {
    this.metrics.errorCount = (this.metrics.errorCount || 0) + 1;
    console.error(`❌ Error in ${this.functionName}:`, {
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Finalize and log performance metrics
   */
  finalize() {
    this.metrics.executionTime = Date.now() - this.startTime;
    
    console.log(`✅ Function ${this.functionName} completed:`, {
      executionTime: this.metrics.executionTime,
      cacheHit: this.metrics.cacheHit,
      fallbackLevel: this.metrics.fallbackLevel,
      errorCount: this.metrics.errorCount,
      timestamp: this.metrics.timestamp
    });

    return this.metrics;
  }
}

/**
 * Validate cache integrity
 */
export function validateCacheIntegrity(cache: any): boolean {
  if (!cache || typeof cache !== 'object') {
    console.warn('⚠️ Cache validation failed: Invalid cache structure');
    return false;
  }

  const requiredFields = ['prompt_templates', 'negative_prompts', 'metadata'];
  const hasRequiredFields = requiredFields.every(field => cache.hasOwnProperty(field));
  
  if (!hasRequiredFields) {
    console.warn('⚠️ Cache validation failed: Missing required fields', {
      required: requiredFields,
      present: Object.keys(cache)
    });
    return false;
  }

  if (!cache.metadata?.refreshed_at) {
    console.warn('⚠️ Cache validation failed: Missing refresh timestamp');
    return false;
  }

  // Check if cache is older than 24 hours
  const refreshTime = new Date(cache.metadata.refreshed_at);
  const ageHours = (Date.now() - refreshTime.getTime()) / (1000 * 60 * 60);
  
  if (ageHours > 24) {
    console.warn('⚠️ Cache validation warning: Cache is older than 24 hours', {
      ageHours: ageHours.toFixed(2),
      refreshedAt: cache.metadata.refreshed_at
    });
    return false;
  }

  console.log('✅ Cache validation passed:', {
    templateCount: Object.keys(cache.prompt_templates || {}).length,
    negativePromptCount: Object.keys(cache.negative_prompts || {}).length,
    refreshedAt: cache.metadata.refreshed_at,
    ageHours: ageHours.toFixed(2)
  });

  return true;
}

/**
 * Performance testing utility
 */
export async function performanceTest<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; metrics: { duration: number; timestamp: string } }> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    console.log(`⚡ Performance: ${operationName} completed in ${duration}ms`);
    
    return {
      result,
      metrics: {
        duration,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 Performance: ${operationName} failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Content detection performance test
 */
export function testContentDetection() {
  const testCases = [
    { prompt: "beautiful landscape", expected: 'sfw' },
    { prompt: "nude woman on beach", expected: 'nsfw' },
    { prompt: "family portrait", expected: 'sfw' },
    { prompt: "sexy adult content", expected: 'nsfw' },
    { prompt: "children playing in park", expected: 'sfw' }
  ];

  console.log('🧪 Running content detection tests...');
  
  testCases.forEach((test, index) => {
    const nsfwKeywords = [
      'nude', 'naked', 'topless', 'nsfw', 'adult', 'erotic', 'sexual', 'sex', 
      'porn', 'xxx', 'breasts', 'nipples', 'pussy', 'vagina', 'penis', 'cock', 
      'dick', 'ass', 'butt', 'hardcore', 'explicit', 'uncensored', 'intimate', 'sexy'
    ];
    
    const lowerPrompt = test.prompt.toLowerCase();
    const hasNsfwContent = nsfwKeywords.some(keyword => lowerPrompt.includes(keyword));
    const result = hasNsfwContent ? 'nsfw' : 'sfw';
    
    const passed = result === test.expected;
    console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'} "${test.prompt}" -> ${result} (expected: ${test.expected})`);
  });
}