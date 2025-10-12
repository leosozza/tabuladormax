// ============================================
// Step Runners - Main Export and Registration
// ============================================
// Exports all step runners and registers them automatically

export * from './BaseStepRunner';
export * from './StepRunnerRegistry';
export * from './TabularStepRunner';
export * from './HttpCallStepRunner';
export * from './WaitStepRunner';

import { TabularStepRunner } from './TabularStepRunner';
import { HttpCallStepRunner } from './HttpCallStepRunner';
import { WaitStepRunner } from './WaitStepRunner';
import { stepRunnerRegistry } from './StepRunnerRegistry';

// Register all step runners
stepRunnerRegistry.register(new TabularStepRunner());
stepRunnerRegistry.register(new HttpCallStepRunner());
stepRunnerRegistry.register(new WaitStepRunner());
