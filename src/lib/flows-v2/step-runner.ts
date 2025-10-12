// ============================================
// Flows v2 - Step Runner Interface
// ============================================
// Base interfaces and types for step runners

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Result of a step execution
 */
export interface StepExecutionResult {
  success: boolean;
  status: StepStatus;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
  duration?: number; // Execution time in milliseconds
}

/**
 * Context passed to step runners
 */
export interface StepExecutionContext {
  flowExecutionId: string;
  flowDefinitionId: string;
  flowVersionId: string;
  leadId?: number;
  variables: Record<string, any>;
  previousStepResults: Record<string, StepExecutionResult>;
  userId?: string;
  timestamp: string;
}

/**
 * Log entry for step execution
 */
export interface StepLogEntry {
  timestamp: string;
  stepId: string;
  stepName: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
  data?: any;
}

/**
 * Base interface for all step runners
 */
export interface StepRunner<TConfig = any> {
  /**
   * The type of step this runner handles
   */
  readonly stepType: string;

  /**
   * Validates the step configuration
   * @param config - Step configuration to validate
   * @returns Validation result with any errors
   */
  validateConfig(config: TConfig): { valid: boolean; errors?: string[] };

  /**
   * Executes the step
   * @param config - Step configuration
   * @param context - Execution context
   * @param onLog - Callback for logging
   * @returns Execution result
   */
  execute(
    config: TConfig,
    context: StepExecutionContext,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult>;

  /**
   * Optional cleanup after step execution
   * @param context - Execution context
   */
  cleanup?(context: StepExecutionContext): Promise<void>;
}

/**
 * Registry for step runners
 */
export class StepRunnerRegistry {
  private runners: Map<string, StepRunner> = new Map();

  /**
   * Registers a step runner
   */
  register(runner: StepRunner): void {
    if (this.runners.has(runner.stepType)) {
      throw new Error(`Step runner for type '${runner.stepType}' is already registered`);
    }
    this.runners.set(runner.stepType, runner);
  }

  /**
   * Gets a step runner by type
   */
  get(stepType: string): StepRunner | undefined {
    return this.runners.get(stepType);
  }

  /**
   * Checks if a step runner is registered
   */
  has(stepType: string): boolean {
    return this.runners.has(stepType);
  }

  /**
   * Gets all registered step types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.runners.keys());
  }

  /**
   * Unregisters a step runner
   */
  unregister(stepType: string): boolean {
    return this.runners.delete(stepType);
  }

  /**
   * Clears all registered runners
   */
  clear(): void {
    this.runners.clear();
  }
}

/**
 * Utility function to create a log entry
 */
export function createLogEntry(
  stepId: string,
  stepName: string,
  level: StepLogEntry['level'],
  message: string,
  data?: any
): StepLogEntry {
  return {
    timestamp: new Date().toISOString(),
    stepId,
    stepName,
    level,
    message,
    data,
  };
}

/**
 * Utility function to create a successful result
 */
export function createSuccessResult(
  output?: any,
  metadata?: Record<string, any>,
  duration?: number
): StepExecutionResult {
  return {
    success: true,
    status: 'completed',
    output,
    metadata,
    duration,
  };
}

/**
 * Utility function to create a failed result
 */
export function createFailureResult(
  error: string,
  metadata?: Record<string, any>,
  duration?: number
): StepExecutionResult {
  return {
    success: false,
    status: 'failed',
    error,
    metadata,
    duration,
  };
}

/**
 * Utility function to measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
}

/**
 * Abstract base class for step runners with common functionality
 */
export abstract class BaseStepRunner<TConfig = any> implements StepRunner<TConfig> {
  abstract readonly stepType: string;

  /**
   * Validates the step configuration
   * Subclasses should override this method
   */
  validateConfig(config: TConfig): { valid: boolean; errors?: string[] } {
    // Default implementation - assumes config is valid
    return { valid: true };
  }

  /**
   * Executes the step with timing and error handling
   */
  async execute(
    config: TConfig,
    context: StepExecutionContext,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult> {
    try {
      // Validate config first
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return createFailureResult(
          `Configuration validation failed: ${validation.errors?.join(', ')}`
        );
      }

      // Execute with timing
      const { result, duration } = await measureExecutionTime(() =>
        this.executeStep(config, context, onLog)
      );

      return { ...result, duration };
    } catch (error) {
      return createFailureResult(
        error instanceof Error ? error.message : 'Unknown error during step execution'
      );
    }
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract executeStep(
    config: TConfig,
    context: StepExecutionContext,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult>;

  /**
   * Helper method to emit log entries
   */
  protected log(
    stepId: string,
    stepName: string,
    level: StepLogEntry['level'],
    message: string,
    data?: any,
    onLog?: (log: StepLogEntry) => void
  ): void {
    if (onLog) {
      onLog(createLogEntry(stepId, stepName, level, message, data));
    }
  }
}
