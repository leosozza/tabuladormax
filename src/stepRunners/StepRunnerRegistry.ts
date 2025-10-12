// ============================================
// Step Runner Registry - Central Registry for Step Runners
// ============================================
// Manages registration and lookup of step runner implementations

import type { StepRunner } from './BaseStepRunner';

/**
 * Registry for all step runners
 */
class StepRunnerRegistry {
  private runners: Map<string, StepRunner> = new Map();
  
  /**
   * Register a step runner
   */
  register(runner: StepRunner): void {
    if (this.runners.has(runner.type)) {
      console.warn(`Step runner for type "${runner.type}" is already registered. Overwriting.`);
    }
    this.runners.set(runner.type, runner);
  }
  
  /**
   * Get a step runner by type
   */
  get(type: string): StepRunner | undefined {
    return this.runners.get(type);
  }
  
  /**
   * Check if a step runner is registered for a type
   */
  has(type: string): boolean {
    return this.runners.has(type);
  }
  
  /**
   * Get all registered step types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.runners.keys());
  }
  
  /**
   * Get all registered runners
   */
  getAll(): StepRunner[] {
    return Array.from(this.runners.values());
  }
  
  /**
   * Unregister a step runner
   */
  unregister(type: string): boolean {
    return this.runners.delete(type);
  }
  
  /**
   * Clear all registered runners
   */
  clear(): void {
    this.runners.clear();
  }
}

// Create singleton instance
export const stepRunnerRegistry = new StepRunnerRegistry();

/**
 * Decorator to automatically register a step runner
 */
export function RegisterStepRunner(runner: StepRunner): void {
  stepRunnerRegistry.register(runner);
}

/**
 * Helper function to validate if all steps in a flow have registered runners
 */
export function validateStepsHaveRunners(steps: Array<{ type: string }>): {
  valid: boolean;
  missingRunners: string[];
} {
  const missingRunners = steps
    .map((step) => step.type)
    .filter((type) => !stepRunnerRegistry.has(type))
    .filter((value, index, self) => self.indexOf(value) === index); // unique
  
  return {
    valid: missingRunners.length === 0,
    missingRunners
  };
}
