import { toast } from 'sonner';

export interface AssetServiceError {
  code: string;
  message: string;
  context?: Record<string, any>;
  userMessage: string;
  recoverable: boolean;
}

export class AssetServiceErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static lastErrorTime = new Map<string, number>();
  
  static createError(
    code: string, 
    message: string, 
    context?: Record<string, any>,
    userMessage?: string
  ): AssetServiceError {
    return {
      code,
      message,
      context,
      userMessage: userMessage || this.getDefaultUserMessage(code),
      recoverable: this.isRecoverable(code)
    };
  }

  static handleError(error: AssetServiceError): void {
    const now = Date.now();
    const errorKey = error.code;
    
    // Track error frequency
    const count = this.errorCounts.get(errorKey) || 0;
    const lastTime = this.lastErrorTime.get(errorKey) || 0;
    
    // Reset count if it's been more than 5 minutes since last error
    if (now - lastTime > 5 * 60 * 1000) {
      this.errorCounts.set(errorKey, 1);
    } else {
      this.errorCounts.set(errorKey, count + 1);
    }
    
    this.lastErrorTime.set(errorKey, now);
    
    // Log error details
    console.error('🚨 ASSET SERVICE ERROR:', {
      code: error.code,
      message: error.message,
      context: error.context,
      count: this.errorCounts.get(errorKey),
      recoverable: error.recoverable,
      timestamp: new Date().toISOString()
    });

    // Show user notification based on error frequency
    const errorCount = this.errorCounts.get(errorKey) || 1;
    
    if (errorCount === 1) {
      // First occurrence - show detailed error
      toast.error(error.userMessage, {
        description: error.recoverable ? "Retrying automatically..." : "Please refresh the page",
        duration: error.recoverable ? 3000 : 6000
      });
    } else if (errorCount <= 3) {
      // Repeated errors - show simpler message
      toast.error(`Service Issue (${errorCount}/3)`, {
        description: error.recoverable ? "Still trying to resolve..." : "Please refresh the page",
        duration: 2000
      });
    } else {
      // Frequent errors - show circuit breaker message
      toast.error("Service Temporarily Unavailable", {
        description: "Too many errors. Service will retry in a few minutes.",
        duration: 5000
      });
    }
  }

  private static getDefaultUserMessage(code: string): string {
    switch (code) {
      case 'FETCH_FAILED':
        return 'Failed to load your content';
      case 'AUTH_REQUIRED':
        return 'Please sign in to continue';
      case 'NETWORK_ERROR':
        return 'Network connection issue';
      case 'BUCKET_ACCESS_FAILED':
        return 'Could not access storage';
      case 'URL_GENERATION_FAILED':
        return 'Could not generate preview URLs';
      case 'SESSION_FILTER_FAILED':
        return 'Could not filter today\'s content';
      case 'DATABASE_QUERY_FAILED':
        return 'Database query failed';
      default:
        return 'An unexpected error occurred';
    }
  }

  private static isRecoverable(code: string): boolean {
    const nonRecoverableErrors = [
      'AUTH_REQUIRED',
      'PERMISSION_DENIED',
      'INVALID_USER'
    ];
    
    return !nonRecoverableErrors.includes(code);
  }

  static getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  static resetErrorCounts(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
    console.log('🔄 Asset service error counts reset');
  }
}