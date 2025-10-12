// ============================================
// Wait Step Runner
// ============================================
// Executes wait/delay steps

import { BaseStepRunner, type StepExecutionContext, type StepExecutionResult } from './BaseStepRunner';

export interface WaitStepConfig {
  seconds: number;
}

export class WaitStepRunner extends BaseStepRunner<WaitStepConfig> {
  readonly type = 'wait';
  readonly displayName = 'Wait/Delay';
  
  validate(config: WaitStepConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!config.seconds) {
      errors.push('seconds is required');
    }
    
    if (typeof config.seconds !== 'number' || config.seconds <= 0) {
      errors.push('seconds must be a positive number');
    }
    
    if (config.seconds > 300) {
      errors.push('seconds cannot exceed 300 (5 minutes)');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  async execute(
    config: WaitStepConfig,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const logs: string[] = [];
    const startTime = Date.now();
    
    try {
      logs.push(`Waiting for ${config.seconds} second(s)...`);
      
      // Wait for the specified duration
      await new Promise((resolve) => setTimeout(resolve, config.seconds * 1000));
      
      const duration = Date.now() - startTime;
      logs.push(`Wait completed after ${(duration / 1000).toFixed(2)} seconds`);
      
      return {
        ...this.createSuccessResult({ waited: config.seconds }, logs),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Exception: ${errorMessage}`);
      
      return {
        ...this.createErrorResult(errorMessage, logs),
        duration
      };
    }
  }
  
  estimateTime(config: WaitStepConfig): number {
    // Estimate is the actual wait time in milliseconds
    return config.seconds * 1000;
  }
  
  describe(config: WaitStepConfig): string {
    return `Wait for ${config.seconds} second(s)`;
  }
}
