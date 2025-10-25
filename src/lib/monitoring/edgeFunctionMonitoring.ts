/**
 * Edge Function monitoring utilities for Supabase Deno functions
 * This code runs in Deno runtime on Supabase Edge Functions
 */

export interface EdgeFunctionLog {
  functionName: string;
  timestamp: number;
  duration: number;
  status: 'success' | 'error';
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logger for Edge Functions that tracks performance and errors
 */
export class EdgeFunctionLogger {
  private functionName: string;
  private startTime: number;
  private logs: EdgeFunctionLog[] = [];

  constructor(functionName: string) {
    this.functionName = functionName;
    this.startTime = Date.now();
  }

  /**
   * Log function start
   */
  start() {
    this.startTime = Date.now();
    console.log(`[${this.functionName}] Function started at ${new Date(this.startTime).toISOString()}`);
  }

  /**
   * Log function completion
   */
  complete(statusCode: number, metadata?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;
    const log: EdgeFunctionLog = {
      functionName: this.functionName,
      timestamp: this.startTime,
      duration,
      status: 'success',
      statusCode,
      metadata,
    };

    this.logs.push(log);
    console.log(`[${this.functionName}] Completed in ${duration}ms with status ${statusCode}`);
    
    if (duration > 5000) {
      console.warn(`[${this.functionName}] SLOW: Execution took ${duration}ms`);
    }

    return log;
  }

  /**
   * Log function error
   */
  error(error: Error, statusCode: number = 500, metadata?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;
    const log: EdgeFunctionLog = {
      functionName: this.functionName,
      timestamp: this.startTime,
      duration,
      status: 'error',
      statusCode,
      errorMessage: error.message,
      metadata: {
        ...metadata,
        errorName: error.name,
        errorStack: error.stack,
      },
    };

    this.logs.push(log);
    console.error(`[${this.functionName}] Error after ${duration}ms:`, error.message);

    return log;
  }

  /**
   * Log custom metric
   */
  metric(name: string, value: number, unit: string = 'ms') {
    console.log(`[${this.functionName}] Metric ${name}: ${value}${unit}`);
  }

  /**
   * Get all logs
   */
  getLogs(): EdgeFunctionLog[] {
    return this.logs;
  }
}

/**
 * Create a monitored Edge Function handler
 */
export function createMonitoredHandler<T = unknown>(
  functionName: string,
  handler: (req: Request, logger: EdgeFunctionLogger) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const logger = new EdgeFunctionLogger(functionName);
    logger.start();

    try {
      const response = await handler(req, logger);
      logger.complete(response.status, {
        method: req.method,
        url: req.url,
      });
      return response;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error(errorObj, 500, {
        method: req.method,
        url: req.url,
      });
      
      return new Response(
        JSON.stringify({
          error: errorObj.message,
          functionName,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Measure execution time of a block of code
 */
export async function measureAsync<T>(
  logger: EdgeFunctionLogger,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.metric(name, Date.now() - start);
    return result;
  } catch (error) {
    logger.metric(`${name}.error`, Date.now() - start);
    throw error;
  }
}

/**
 * PostgreSQL query monitoring wrapper
 */
export async function monitorQuery<T>(
  logger: EdgeFunctionLogger,
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return measureAsync(logger, `query.${queryName}`, queryFn);
}
