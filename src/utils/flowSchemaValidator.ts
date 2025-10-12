// ============================================
// Flow Schema Validator - JSON Schema Validation
// ============================================
// Validates flow definitions against versioned schemas

import type { FlowStep } from '@/types/flow';

/**
 * Flow definition structure for versioning
 */
export interface FlowDefinition {
  steps: FlowStep[];
  metadata?: {
    criado_em?: string;
    atualizado_em?: string;
    [key: string]: any;
  };
}

/**
 * Validation result with error details
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Schema version type
 */
export type SchemaVersion = 'v1' | 'v2';

/**
 * Validates a flow definition against the specified schema version
 */
export function validateFlowDefinition(
  definition: any,
  schemaVersion: SchemaVersion = 'v1'
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if definition exists
  if (!definition) {
    errors.push({
      field: 'definition',
      message: 'Flow definition is required'
    });
    return { valid: false, errors };
  }

  // Check if definition is an object
  if (typeof definition !== 'object' || Array.isArray(definition)) {
    errors.push({
      field: 'definition',
      message: 'Flow definition must be an object',
      value: typeof definition
    });
    return { valid: false, errors };
  }

  // Validate based on schema version
  if (schemaVersion === 'v1') {
    return validateV1Schema(definition, errors);
  }

  // Default: unknown schema version
  errors.push({
    field: 'schemaVersion',
    message: `Unknown schema version: ${schemaVersion}`,
    value: schemaVersion
  });
  
  return { valid: false, errors };
}

/**
 * Validates flow definition against v1 schema
 */
function validateV1Schema(
  definition: any,
  errors: ValidationError[]
): ValidationResult {
  // Check for steps array
  if (!definition.steps) {
    errors.push({
      field: 'steps',
      message: 'Flow definition must contain "steps" array'
    });
    return { valid: false, errors };
  }

  if (!Array.isArray(definition.steps)) {
    errors.push({
      field: 'steps',
      message: 'Flow definition "steps" must be an array',
      value: typeof definition.steps
    });
    return { valid: false, errors };
  }

  // Validate each step
  definition.steps.forEach((step: any, index: number) => {
    validateStep(step, index, errors);
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a single step
 */
function validateStep(
  step: any,
  index: number,
  errors: ValidationError[]
): void {
  const stepPrefix = `steps[${index}]`;

  // Required fields
  const requiredFields = ['id', 'type', 'nome', 'config'];
  requiredFields.forEach((field) => {
    if (!step[field]) {
      errors.push({
        field: `${stepPrefix}.${field}`,
        message: `Step must have "${field}" field`
      });
    }
  });

  // Validate step type
  const validTypes = ['tabular', 'http_call', 'wait'];
  if (step.type && !validTypes.includes(step.type)) {
    errors.push({
      field: `${stepPrefix}.type`,
      message: `Invalid step type. Allowed: ${validTypes.join(', ')}`,
      value: step.type
    });
  }

  // Validate config is an object
  if (step.config && (typeof step.config !== 'object' || Array.isArray(step.config))) {
    errors.push({
      field: `${stepPrefix}.config`,
      message: 'Step config must be an object',
      value: typeof step.config
    });
  }

  // Type-specific validation
  if (step.type === 'tabular') {
    validateTabularStep(step, stepPrefix, errors);
  } else if (step.type === 'http_call') {
    validateHttpCallStep(step, stepPrefix, errors);
  } else if (step.type === 'wait') {
    validateWaitStep(step, stepPrefix, errors);
  }
}

/**
 * Validates tabular step configuration
 */
function validateTabularStep(
  step: any,
  prefix: string,
  errors: ValidationError[]
): void {
  const config = step.config || {};
  
  const requiredFields = ['webhook_url', 'field', 'value'];
  requiredFields.forEach((field) => {
    if (!config[field]) {
      errors.push({
        field: `${prefix}.config.${field}`,
        message: `Tabular step requires "${field}" in config`
      });
    }
  });
}

/**
 * Validates HTTP call step configuration
 */
function validateHttpCallStep(
  step: any,
  prefix: string,
  errors: ValidationError[]
): void {
  const config = step.config || {};
  
  if (!config.url) {
    errors.push({
      field: `${prefix}.config.url`,
      message: 'HTTP call step requires "url" in config'
    });
  }
  
  if (!config.method) {
    errors.push({
      field: `${prefix}.config.method`,
      message: 'HTTP call step requires "method" in config'
    });
  }
  
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (config.method && !validMethods.includes(config.method)) {
    errors.push({
      field: `${prefix}.config.method`,
      message: `Invalid HTTP method. Allowed: ${validMethods.join(', ')}`,
      value: config.method
    });
  }
}

/**
 * Validates wait step configuration
 */
function validateWaitStep(
  step: any,
  prefix: string,
  errors: ValidationError[]
): void {
  const config = step.config || {};
  
  if (!config.seconds) {
    errors.push({
      field: `${prefix}.config.seconds`,
      message: 'Wait step requires "seconds" in config'
    });
  }
  
  if (config.seconds && (typeof config.seconds !== 'number' || config.seconds <= 0)) {
    errors.push({
      field: `${prefix}.config.seconds`,
      message: 'Wait step "seconds" must be a positive number',
      value: config.seconds
    });
  }
}

/**
 * Creates a flow definition from steps
 */
export function createFlowDefinition(
  steps: FlowStep[],
  metadata?: Record<string, any>
): FlowDefinition {
  return {
    steps,
    metadata: {
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Extracts steps from a flow definition
 */
export function extractSteps(definition: FlowDefinition): FlowStep[] {
  return definition.steps || [];
}
