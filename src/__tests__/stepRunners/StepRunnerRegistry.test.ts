// ============================================
// Step Runner Registry - Unit Tests
// ============================================
// Test suite for step runner registry

import { describe, it, expect, beforeEach } from 'vitest';
import { stepRunnerRegistry, validateStepsHaveRunners } from '../../stepRunners/StepRunnerRegistry';
import { TabularStepRunner } from '../../stepRunners/TabularStepRunner';
import type { StepRunner } from '../../stepRunners/BaseStepRunner';

describe('Step Runner Registry', () => {
  beforeEach(() => {
    // Clear registry before each test
    stepRunnerRegistry.clear();
  });
  
  describe('register', () => {
    it('should register a step runner', () => {
      const runner = new TabularStepRunner();
      stepRunnerRegistry.register(runner);
      
      expect(stepRunnerRegistry.has('tabular')).toBe(true);
    });
    
    it('should overwrite existing runner with warning', () => {
      // TODO: Implement test with console.warn mock
    });
  });
  
  describe('get', () => {
    it('should retrieve registered runner', () => {
      // TODO: Implement test
    });
    
    it('should return undefined for unregistered type', () => {
      // TODO: Implement test
    });
  });
  
  describe('getRegisteredTypes', () => {
    it('should return all registered types', () => {
      // TODO: Implement test
    });
  });
  
  describe('validateStepsHaveRunners', () => {
    it('should validate when all runners exist', () => {
      // TODO: Implement test
    });
    
    it('should detect missing runners', () => {
      // TODO: Implement test
    });
  });
});
