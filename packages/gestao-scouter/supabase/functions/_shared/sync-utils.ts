/**
 * Shared utilities for synchronization Edge Functions
 * 
 * This module provides common functionality used across sync functions:
 * - CORS headers
 * - Structured JSON logging
 * - Error handling
 * - HTTP response helpers
 */

/**
 * Standard CORS headers for all sync functions
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function_name: string;
  message: string;
  metadata?: Record<string, any>;
  duration_ms?: number;
  trace_id?: string;
}

/**
 * Creates a structured JSON log entry
 */
export function createLogEntry(
  level: LogLevel,
  functionName: string,
  message: string,
  metadata?: Record<string, any>,
  durationMs?: number,
  traceId?: string
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    function_name: functionName,
    message,
    ...(metadata && { metadata }),
    ...(durationMs !== undefined && { duration_ms: durationMs }),
    ...(traceId && { trace_id: traceId }),
  };
}

/**
 * Logs a structured JSON entry to console
 */
export function log(entry: LogEntry): void {
  const logString = JSON.stringify(entry);
  
  switch (entry.level) {
    case LogLevel.ERROR:
      console.error(logString);
      break;
    case LogLevel.WARN:
      console.warn(logString);
      break;
    case LogLevel.DEBUG:
    case LogLevel.INFO:
    default:
      console.log(logString);
      break;
  }
}

/**
 * Helper to create and log in one call
 */
export function logMessage(
  level: LogLevel,
  functionName: string,
  message: string,
  metadata?: Record<string, any>,
  durationMs?: number,
  traceId?: string
): void {
  const entry = createLogEntry(level, functionName, message, metadata, durationMs, traceId);
  log(entry);
}

/**
 * Generate a simple trace ID for request tracking
 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  error_code?: string;
  message: string;
  details?: Record<string, any>;
  trace_id?: string;
  timestamp: string;
  suggestions?: string[];
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  errorCode?: string,
  details?: Record<string, any>,
  suggestions?: string[],
  traceId?: string
): ErrorResponse {
  return {
    error,
    message,
    ...(errorCode && { error_code: errorCode }),
    ...(details && { details }),
    ...(suggestions && { suggestions }),
    ...(traceId && { trace_id: traceId }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a standardized success response
 */
export interface SuccessResponse<T = any> {
  status: 'success' | 'ok';
  data: T;
  timestamp: string;
  trace_id?: string;
  duration_ms?: number;
}

export function createSuccessResponse<T>(
  data: T,
  traceId?: string,
  durationMs?: number
): SuccessResponse<T> {
  return {
    status: 'success',
    data,
    timestamp: new Date().toISOString(),
    ...(traceId && { trace_id: traceId }),
    ...(durationMs !== undefined && { duration_ms: durationMs }),
  };
}

/**
 * Creates a JSON response with appropriate headers
 */
export function jsonResponse(
  body: any,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response {
  return new Response(
    JSON.stringify(body, null, 2),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        ...additionalHeaders,
      },
    }
  );
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export function handleCorsPreFlight(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Sanitizes error message to remove stack trace information
 * Prevents accidental exposure of implementation details
 */
function sanitizeErrorMessage(message: string): string {
  // Remove stack trace lines (lines starting with "at ")
  const lines = message.split('\n');
  const cleanLines = lines.filter(line => !line.trim().startsWith('at '));
  
  // Take only the first line (main error message)
  const mainMessage = cleanLines[0] || 'An error occurred';
  
  // Remove file paths and line numbers
  return mainMessage.replace(/\s+at\s+.*$/g, '').replace(/\(.*:\d+:\d+\)/g, '').trim();
}

/**
 * Extracts error message from various error types
 * Sanitizes the message to prevent stack trace exposure
 */
export function extractErrorMessage(error: unknown): string {
  let message: string;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    return 'Unknown error occurred';
  }
  
  // Sanitize to remove stack trace information
  return sanitizeErrorMessage(message);
}

/**
 * Extracts error details from Supabase errors
 * Sanitizes messages to prevent stack trace exposure
 */
export function extractSupabaseError(error: any): {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
} {
  const message = error?.message || 'Unknown database error';
  const details = error?.details;
  const hint = error?.hint;
  
  return {
    message: sanitizeErrorMessage(message),
    code: error?.code,
    details: typeof details === 'string' ? sanitizeErrorMessage(details) : details,
    hint: typeof hint === 'string' ? sanitizeErrorMessage(hint) : hint,
  };
}

/**
 * Performance timer helper
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number>;

  constructor() {
    this.startTime = Date.now();
    this.marks = new Map();
  }

  /**
   * Mark a checkpoint
   */
  mark(label: string): void {
    this.marks.set(label, Date.now());
  }

  /**
   * Get duration from start
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get duration between two marks
   */
  getDurationBetween(startMark: string, endMark: string): number | null {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    
    if (start === undefined || end === undefined) {
      return null;
    }
    
    return end - start;
  }

  /**
   * Get all marks with their durations from start
   */
  getAllMarks(): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const [label, time] of this.marks.entries()) {
      result[label] = time - this.startTime;
    }
    
    return result;
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < config.maxAttempts) {
        const delay = config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
        
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(required: string[]): {
  valid: boolean;
  missing: string[];
} {
  const missing = required.filter(key => !Deno.env.get(key));
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Bitrix notification interface
 */
export interface BitrixNotification {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

/**
 * Send notification to Bitrix (placeholder for future implementation)
 * 
 * @param notification - Notification details
 * @returns Promise that resolves when notification is sent
 */
export async function sendBitrixNotification(
  notification: BitrixNotification
): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement actual Bitrix API integration
  // For now, just log the notification
  logMessage(
    LogLevel.INFO,
    'bitrix-notification',
    'Bitrix notification triggered (not yet implemented)',
    {
      notification,
    }
  );
  
  return { success: true };
}
