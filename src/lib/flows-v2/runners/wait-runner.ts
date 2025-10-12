// ============================================
// Flows v2 - Wait Step Runner
// ============================================
// Step runner for wait/delay actions

import {
  BaseStepRunner,
  StepExecutionContext,
  StepExecutionResult,
  StepLogEntry,
  createSuccessResult,
  createFailureResult,
} from '../step-runner';
import { WaitStepConfig } from '../schemas';

/**
 * Step runner for wait actions
 */
export class WaitStepRunner extends BaseStepRunner<WaitStepConfig> {
  readonly stepType = 'wait';

  /**
   * Validates wait step configuration
   */
  validateConfig(config: WaitStepConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.seconds || config.seconds <= 0) {
      errors.push('seconds must be a positive number');
    }

    if (config.seconds > 3600) {
      errors.push('seconds cannot exceed 3600 (1 hour)');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Executes wait step
   */
  protected async executeStep(
    config: WaitStepConfig,
    context: StepExecutionContext,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult> {
    const stepId = 'wait-step';
    const stepName = 'Wait';

    const reason = config.reason ?? 'Waiting as configured';
    
    this.log(
      stepId,
      stepName,
      'info',
      `Waiting for ${config.seconds} seconds`,
      { seconds: config.seconds, reason },
      onLog
    );

    try {
      // Wait for the specified duration
      await new Promise((resolve) => setTimeout(resolve, config.seconds * 1000));

      this.log(
        stepId,
        stepName,
        'success',
        `Wait completed (${config.seconds} seconds)`,
        {},
        onLog
      );

      return createSuccessResult(
        { waited: config.seconds },
        { reason }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(stepId, stepName, 'error', 'Wait step failed', { error: errorMessage }, onLog);
      return createFailureResult(errorMessage);
    }
  }
}
