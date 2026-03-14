import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public retryable?: boolean
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error | APIError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof APIError) {
    logger.error(`API Error [${error.code}]: ${error.message}`, {
      statusCode: error.statusCode,
      retryable: error.retryable,
    });

    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      retryable: error.retryable || false,
    });
  }

  // Handle other errors
  logger.error(`Unhandled error: ${error.message}`, error);

  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    retryable: true,
  });
}

/**
 * Retry logic for flaky API calls
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Retry wrapper for API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delayMs = opts.initialDelayMs || 1000;

  for (let attempt = 1; attempt <= (opts.maxAttempts || 3); attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = isRetryableError(lastError, opts);

      if (attempt === opts.maxAttempts || !isRetryable) {
        throw lastError;
      }

      logger.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms: ${lastError.message}`);

      // Wait before retrying
      await sleep(delayMs);

      // Increase delay for next attempt (exponential backoff)
      delayMs = Math.min(delayMs * (opts.backoffMultiplier || 2), opts.maxDelayMs || 30000);
    }
  }

  throw lastError || new Error('Unknown error');
}

function isRetryableError(error: Error, options: RetryOptions): boolean {
  // Parse status code from error message if present
  const statusMatch = error.message.match(/status[:\s]+(\d{3})/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1]);
    return (options.retryableStatuses || DEFAULT_RETRY_OPTIONS.retryableStatuses).includes(
      status
    );
  }

  // Retryable error patterns
  const retryablePatterns = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'timeout'];

  return retryablePatterns.some((pattern) => error.message.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fallback handler for OCR failures
 */
export function handleOCRFailure(
  error: Error,
  fallback: 'manual_entry' | 'skip' | 'queue'
) {
  logger.warn(`OCR processing failed, using fallback: ${fallback}`, { error });

  switch (fallback) {
    case 'manual_entry':
      return {
        requiresManualEntry: true,
        message: 'Receipt image could not be processed automatically. Please enter details manually.',
        extractedData: null,
      };

    case 'skip':
      return {
        requiresManualEntry: false,
        message: 'Receipt processing skipped.',
        extractedData: null,
      };

    case 'queue':
      return {
        requiresManualEntry: false,
        message: 'Receipt queued for manual review.',
        queuedForReview: true,
        extractedData: null,
      };

    default:
      return {
        requiresManualEntry: true,
        error: error.message,
      };
  }
}

/**
 * Timeout wrapper for long-running operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new APIError(408, timeoutMessage, 'TIMEOUT', true)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Circuit breaker pattern for failing services
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half_open' = 'closed';

  constructor(
    private failureThreshold = 5,
    private resetTimeoutMs = 60000
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeoutMs) {
        this.state = 'half_open';
        logger.info('Circuit breaker entering half-open state');
      } else {
        throw new APIError(503, 'Service temporarily unavailable', 'CIRCUIT_OPEN', true);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      logger.error(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
