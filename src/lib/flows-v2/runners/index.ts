// ============================================
// Flows v2 - Step Runners Index
// ============================================
// Exports all step runners and provides a default registry

export { TabularStepRunner } from './tabular-runner';
export { HttpCallStepRunner } from './http-call-runner';
export { WaitStepRunner } from './wait-runner';

import { StepRunnerRegistry } from '../step-runner';
import { TabularStepRunner } from './tabular-runner';
import { HttpCallStepRunner } from './http-call-runner';
import { WaitStepRunner } from './wait-runner';

/**
 * Creates and returns a registry with all default step runners registered
 */
export function createDefaultStepRunnerRegistry(): StepRunnerRegistry {
  const registry = new StepRunnerRegistry();
  
  // Register all default runners
  registry.register(new TabularStepRunner());
  registry.register(new HttpCallStepRunner());
  registry.register(new WaitStepRunner());
  
  return registry;
}

/**
 * Default global step runner registry
 */
export const defaultStepRunnerRegistry = createDefaultStepRunnerRegistry();
