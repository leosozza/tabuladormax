// ============================================
// Step Runner Base - Base Interface for Step Runners
// ============================================
// Defines the contract for all step runner implementations

import type { FlowStep } from '@/types/flow';

/**
 * Context passed to step runners during execution
 */
export interface StepExecutionContext {
  leadId?: number;
  flowId: string;
  runId: string;
  userId?: string;
  variables?: Record<string, any>;
  previousResults?: Record<string, any>;
}

/**
 * Result returned from step execution
 */
export interface StepExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  logs?: string[];
  duration?: number;
}

/**
 * Base interface for all step runners
 */
export interface StepRunner<TConfig = any> {
  /**
   * Type of step this runner handles
   */
  readonly type: string;
  
  /**
   * Display name for this runner
   */
  readonly displayName: string;
  
  /**
   * Validates the step configuration
   */
  validate(config: TConfig): { valid: boolean; errors?: string[] };
  
  /**
   * Executes the step with the given configuration and context
   */
  execute(
    config: TConfig,
    context: StepExecutionContext
  ): Promise<StepExecutionResult>;
  
  /**
   * Optional method to estimate execution time
   */
  estimateTime?(config: TConfig): number;
  
  /**
   * Optional method to get human-readable description of what the step will do
   */
  describe?(config: TConfig): string;
}

/**
 * Abstract base class for step runners
 */
export abstract class BaseStepRunner<TConfig = any> implements StepRunner<TConfig> {
  abstract readonly type: string;
  abstract readonly displayName: string;
  
  abstract validate(config: TConfig): { valid: boolean; errors?: string[] };
  
  abstract execute(
    config: TConfig,
    context: StepExecutionContext
  ): Promise<StepExecutionResult>;
  
  /**
   * Helper method to create a success result
   */
  protected createSuccessResult(data?: any, logs?: string[]): StepExecutionResult {
    return {
      success: true,
      data,
      logs: logs || []
    };
  }
  
  /**
   * Helper method to create an error result
   */
  protected createErrorResult(error: string, logs?: string[]): StepExecutionResult {
    return {
      success: false,
      error,
      logs: logs || []
    };
  }
  
  /**
   * Helper method to replace placeholders in a string
   */
  protected replacePlaceholders(
    value: string,
    context: StepExecutionContext
  ): string {
    let result = value;
    
    // Replace {{lead_id}}
    if (context.leadId) {
      result = result.replace(/\{\{lead_id\}\}/g, context.leadId.toString());
    }
    
    // Replace {{flow_id}}
    result = result.replace(/\{\{flow_id\}\}/g, context.flowId);
    
    // Replace {{run_id}}
    result = result.replace(/\{\{run_id\}\}/g, context.runId);
    
    // Replace {{user_id}}
    if (context.userId) {
      result = result.replace(/\{\{user_id\}\}/g, context.userId);
    }
    
    // Replace custom variables
    if (context.variables) {
      Object.keys(context.variables).forEach((key) => {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(placeholder, String(context.variables![key]));
      });
    }
    
    // Replace previous results
    if (context.previousResults) {
      Object.keys(context.previousResults).forEach((key) => {
        const placeholder = new RegExp(`\\{\\{results\\.${key}\\}\\}`, 'g');
        result = result.replace(placeholder, String(context.previousResults![key]));
      });
    }
    
    return result;
  }
  
  /**
   * Helper method to replace placeholders in an object
   */
  protected replacePlaceholdersInObject(
    obj: any,
    context: StepExecutionContext
  ): any {
    if (typeof obj === 'string') {
      return this.replacePlaceholders(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item) => this.replacePlaceholdersInObject(item, context));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      Object.keys(obj).forEach((key) => {
        result[key] = this.replacePlaceholdersInObject(obj[key], context);
      });
      return result;
    }
    
    return obj;
  }
}
