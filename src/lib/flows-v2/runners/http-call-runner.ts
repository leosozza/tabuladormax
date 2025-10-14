// ============================================
// Flows v2 - HTTP Call Step Runner
// ============================================
// Step runner for executing HTTP requests

import {
  BaseStepRunner,
  StepExecutionContext,
  StepExecutionResult,
  StepLogEntry,
  createSuccessResult,
  createFailureResult,
} from '../step-runner';
import { HttpCallStepConfig } from '../schemas';

/**
 * Step runner for HTTP call actions
 */
export class HttpCallStepRunner extends BaseStepRunner<HttpCallStepConfig> {
  readonly stepType = 'http_call';

  /**
   * Validates HTTP call step configuration
   */
  validateConfig(config: HttpCallStepConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('url is required');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('url must be a valid URL');
      }
    }

    if (!config.method) {
      errors.push('method is required');
    }

    if (config.timeout && config.timeout < 0) {
      errors.push('timeout must be positive');
    }

    if (config.retry) {
      if (config.retry.max_attempts < 1 || config.retry.max_attempts > 5) {
        errors.push('retry.max_attempts must be between 1 and 5');
      }
      if (config.retry.delay < 0) {
        errors.push('retry.delay must be positive');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Executes HTTP call step
   */
  protected async executeStep(
    config: HttpCallStepConfig,
    context: StepExecutionContext,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult> {
    const stepId = 'http-call-step';
    const stepName = 'HTTP Call';

    this.log(stepId, stepName, 'info', 'Starting HTTP call', { config }, onLog);

    const maxAttempts = config.retry?.max_attempts ?? 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          const delay = config.retry?.delay ?? 1000;
          this.log(
            stepId,
            stepName,
            'info',
            `Retrying after ${delay}ms (attempt ${attempt}/${maxAttempts})`,
            {},
            onLog
          );
          await this.sleep(delay);
        }

        const result = await this.makeHttpRequest(config, context, stepId, stepName, onLog);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log(
          stepId,
          stepName,
          attempt < maxAttempts ? 'warning' : 'error',
          `HTTP call failed (attempt ${attempt}/${maxAttempts})`,
          { error: lastError.message },
          onLog
        );
      }
    }

    return createFailureResult(
      lastError?.message ?? 'HTTP call failed after all retry attempts',
      { attempts: maxAttempts }
    );
  }

  /**
   * Makes the actual HTTP request
   */
  private async makeHttpRequest(
    config: HttpCallStepConfig,
    context: StepExecutionContext,
    stepId: string,
    stepName: string,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult> {
    // Replace placeholders in URL
    const url = this.replacePlaceholders(config.url, context.leadId, context.variables);

    this.log(stepId, stepName, 'debug', 'Resolved URL', { url }, onLog);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Replace placeholders in headers
    Object.keys(headers).forEach((key) => {
      headers[key] = String(this.replacePlaceholders(headers[key], context.leadId, context.variables));
    });

    // Prepare body
    let body: string | undefined;
    if (config.body) {
      if (typeof config.body === 'string') {
        body = String(this.replacePlaceholders(config.body, context.leadId, context.variables));
      } else {
        body = JSON.stringify(this.replacePlaceholdersInObject(config.body as Record<string, unknown>, context.leadId, context.variables));
      }
    }

    this.log(stepId, stepName, 'info', 'Sending HTTP request', { method: config.method, url, headers }, onLog);

    // Make request with timeout
    const timeout = config.timeout ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(String(url), {
        method: config.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      let responseData: any;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        this.log(
          stepId,
          stepName,
          'error',
          'HTTP request failed',
          { status: response.status, response: responseData },
          onLog
        );
        return createFailureResult(
          `HTTP request failed: ${response.status} ${response.statusText}`,
          { status: response.status, response: responseData }
        );
      }

      this.log(stepId, stepName, 'success', 'HTTP call completed', { response: responseData }, onLog);

      return createSuccessResult(responseData, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`HTTP request timed out after ${timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Replace placeholders in string values
   */
  private replacePlaceholders(
    value: unknown,
    leadId: number | undefined,
    variables: Record<string, unknown>
  ): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    let result = value;

    // Replace {{leadId}} placeholder
    if (leadId !== undefined) {
      result = result.replace(/\{\{leadId\}\}/g, String(leadId));
    }

    // Replace {{variable.name}} placeholders
    Object.keys(variables).forEach((key) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, String(variables[key]));
    });

    return result;
  }

  /**
   * Replace placeholders in object (recursive)
   */
  private replacePlaceholdersInObject(
    obj: Record<string, unknown>,
    leadId: number | undefined,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (typeof value === 'string') {
        result[key] = this.replacePlaceholders(value, leadId, variables);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.replacePlaceholdersInObject(value as Record<string, unknown>, leadId, variables);
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
