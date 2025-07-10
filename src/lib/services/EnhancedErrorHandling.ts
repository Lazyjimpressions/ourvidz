/**
 * Enhanced error handling with exponential backoff and request deduplication
 */

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: Error) => boolean;
}

interface RequestOptions {
  timeout?: number;
  retries?: RetryOptions;
  deduplicationKey?: string;
}

// Request deduplication to prevent multiple identical requests
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Deduplicating request for key: ${key}`);
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn()
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

export class EnhancedErrorHandling {
  private static deduplicator = new RequestDeduplicator();

  // Exponential backoff retry logic
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry this error
        if (options.retryCondition && !options.retryCondition(lastError)) {
          throw lastError;
        }
        
        // Don't delay on the last attempt
        if (attempt === options.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          options.baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5),
          options.maxDelay
        );
        
        console.warn(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delay}ms:`, lastError.message);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }

  // Enhanced request with timeout, retries, and deduplication
  static async enhancedRequest<T>(
    requestFn: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = 30000,
      retries = {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 5000,
        retryCondition: (error) => this.isRetryableError(error)
      },
      deduplicationKey
    } = options;

    const executeRequest = async (): Promise<T> => {
      return this.withTimeout(
        () => this.withRetry(requestFn, retries),
        timeout
      );
    };

    if (deduplicationKey) {
      return this.deduplicator.deduplicate(deduplicationKey, executeRequest);
    }

    return executeRequest();
  }

  // Promise.allSettled with error handling for batch operations
  static async batchWithErrorHandling<T>(
    operations: (() => Promise<T>)[],
    options: { 
      concurrency?: number;
      failFast?: boolean;
      retryFailures?: boolean;
    } = {}
  ): Promise<{ success: T[]; failures: Error[] }> {
    const { concurrency = 5, failFast = false, retryFailures = true } = options;
    
    if (failFast) {
      // Fail fast mode - stop on first error
      const results = await Promise.all(operations.map(op => op()));
      return { success: results, failures: [] };
    }

    // Process in batches with concurrency limit
    const results: T[] = [];
    const failures: Error[] = [];

    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (operation, index) => {
          try {
            if (retryFailures) {
              return await this.withRetry(operation, {
                maxRetries: 2,
                baseDelay: 500,
                maxDelay: 2000
              });
            } else {
              return await operation();
            }
          } catch (error) {
            console.error(`Batch operation ${i + index} failed:`, error);
            throw error;
          }
        })
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          failures.push(result.reason);
        }
      });
    }

    return { success: results, failures };
  }

  // Bucket fallback strategy from workspace-test
  static async withBucketFallback<T>(
    primaryBucket: string,
    fallbackBuckets: string[],
    operation: (bucket: string) => Promise<T>
  ): Promise<T> {
    const buckets = [primaryBucket, ...fallbackBuckets];
    let lastError: Error;

    for (const bucket of buckets) {
      try {
        console.log(`🔄 Trying bucket: ${bucket}`);
        return await operation(bucket);
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Bucket ${bucket} failed:`, error);
        
        // Don't try fallback for certain error types
        if (this.isFatalError(error as Error)) {
          break;
        }
      }
    }

    throw lastError!;
  }

  private static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  private static isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'fetch',
      'network',
      'timeout',
      'temporarily unavailable',
      'rate limit',
      'server error'
    ];

    const message = error.message.toLowerCase();
    return retryableMessages.some(msg => message.includes(msg));
  }

  private static isFatalError(error: Error): boolean {
    const fatalMessages = [
      'not found',
      'unauthorized',
      'forbidden',
      'invalid',
      'malformed'
    ];

    const message = error.message.toLowerCase();
    return fatalMessages.some(msg => message.includes(msg));
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static clearCache(): void {
    this.deduplicator.clear();
  }
}