// ============================================
// HTTP Call Step Runner
// ============================================
// Executes HTTP request steps

import { BaseStepRunner, type StepExecutionContext, type StepExecutionResult } from './BaseStepRunner';

export interface HttpCallStepConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number;
}

export class HttpCallStepRunner extends BaseStepRunner<HttpCallStepConfig> {
  readonly type = 'http_call';
  readonly displayName = 'HTTP Call';
  
  validate(config: HttpCallStepConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!config.url) {
      errors.push('url is required');
    }
    
    if (!config.method) {
      errors.push('method is required');
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (config.method && !validMethods.includes(config.method)) {
      errors.push(`method must be one of: ${validMethods.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  async execute(
    config: HttpCallStepConfig,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const logs: string[] = [];
    const startTime = Date.now();
    
    try {
      logs.push(`Executing HTTP ${config.method} request to: ${config.url}`);
      
      // Replace placeholders in config
      const processedConfig = this.replacePlaceholdersInObject(config, context) as HttpCallStepConfig;
      
      // Build fetch options
      const fetchOptions: RequestInit = {
        method: processedConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...processedConfig.headers
        }
      };
      
      // Add body for non-GET requests
      if (processedConfig.method !== 'GET' && processedConfig.body) {
        fetchOptions.body = JSON.stringify(processedConfig.body);
        logs.push(`Request body: ${JSON.stringify(processedConfig.body)}`);
      }
      
      // Add timeout handling
      const timeout = processedConfig.timeout || 30000; // Default 30 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      fetchOptions.signal = controller.signal;
      
      try {
        // Make the HTTP call
        const response = await fetch(processedConfig.url, fetchOptions);
        clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          const errorText = await response.text();
          logs.push(`Error: HTTP ${response.status} - ${errorText}`);
          return {
            ...this.createErrorResult(`HTTP ${response.status}: ${errorText}`, logs),
            duration
          };
        }
        
        // Try to parse response as JSON
        let result: unknown;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
          logs.push(`Response: ${JSON.stringify(result).substring(0, 200)}`);
        } else {
          result = await response.text();
          logs.push(`Response: ${String(result).substring(0, 200)}`);
        }
        
        logs.push(`Successfully completed HTTP ${config.method} request`);
        
        return {
          ...this.createSuccessResult(result, logs),
          duration
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout';
        } else {
          errorMessage = error.message;
        }
      }
      
      logs.push(`Exception: ${errorMessage}`);
      
      return {
        ...this.createErrorResult(errorMessage, logs),
        duration
      };
    }
  }
  
  estimateTime(config: HttpCallStepConfig): number {
    // Estimate based on timeout or default 3 seconds
    return config.timeout || 3000;
  }
  
  describe(config: HttpCallStepConfig): string {
    return `${config.method} request to ${config.url}`;
  }
}
