// ============================================
// Flows v2 - Validation Utilities
// ============================================
// Utility functions for validating flow configurations using Zod schemas

import { ZodSchema, ZodError } from 'zod';
import {
  FlowStepSchema,
  FlowVersionSchema,
  FlowDefinitionSchema,
  ExecuteFlowRequestSchema,
  CreateFlowDefinitionRequestSchema,
  CreateFlowVersionRequestSchema,
  UpdateFlowDefinitionRequestSchema,
  PublishFlowVersionRequestSchema,
} from './schemas';

// ============================================
// Validation Result Types
// ============================================

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  errors: Array<{
    path: string[];
    message: string;
  }>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// ============================================
// Core Validation Function
// ============================================

/**
 * Validates data against a Zod schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with parsed data or errors
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const parsed = schema.parse(data);
    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          path: err.path.map(String),
          message: err.message,
        })),
      };
    }
    // Unexpected error
    return {
      success: false,
      errors: [
        {
          path: [],
          message: error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}

/**
 * Validates data and throws an error if validation fails
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws Error if validation fails
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = validate(schema, data);
  if (!result.success) {
    const errorMessages = (result as ValidationError).errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }
  return result.data;
}

// ============================================
// Specific Validation Functions
// ============================================

/**
 * Validates a flow step
 */
export function validateFlowStep(step: unknown): ValidationResult<any> {
  return validate(FlowStepSchema, step);
}

/**
 * Validates multiple flow steps
 */
export function validateFlowSteps(steps: unknown[]): ValidationResult<any[]> {
  const errors: Array<{ path: string[]; message: string }> = [];
  const validatedSteps: any[] = [];

  steps.forEach((step, index) => {
    const result = validateFlowStep(step);
    if (result.success) {
      validatedSteps.push(result.data);
    } else {
      const validationError = result as ValidationError;
      errors.push(...validationError.errors.map((err) => ({
        path: [`steps[${index}]`, ...err.path],
        message: err.message,
      })));
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: validatedSteps };
}

/**
 * Validates a flow definition
 */
export function validateFlowDefinition(definition: unknown): ValidationResult<any> {
  return validate(FlowDefinitionSchema, definition);
}

/**
 * Validates a flow version
 */
export function validateFlowVersion(version: unknown): ValidationResult<any> {
  return validate(FlowVersionSchema, version);
}

/**
 * Validates a flow execution request
 */
export function validateExecuteFlowRequest(request: unknown): ValidationResult<any> {
  return validate(ExecuteFlowRequestSchema, request);
}

/**
 * Validates a create flow definition request
 */
export function validateCreateFlowDefinitionRequest(request: unknown): ValidationResult<any> {
  return validate(CreateFlowDefinitionRequestSchema, request);
}

/**
 * Validates a create flow version request
 */
export function validateCreateFlowVersionRequest(request: unknown): ValidationResult<any> {
  return validate(CreateFlowVersionRequestSchema, request);
}

/**
 * Validates an update flow definition request
 */
export function validateUpdateFlowDefinitionRequest(request: unknown): ValidationResult<any> {
  return validate(UpdateFlowDefinitionRequestSchema, request);
}

/**
 * Validates a publish flow version request
 */
export function validatePublishFlowVersionRequest(request: unknown): ValidationResult<any> {
  return validate(PublishFlowVersionRequestSchema, request);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Checks if all steps in a flow are enabled
 */
export function hasEnabledSteps(steps: any[]): boolean {
  return steps.some((step) => step.enabled !== false);
}

/**
 * Filters out disabled steps from a flow
 */
export function getEnabledSteps(steps: any[]): any[] {
  return steps.filter((step) => step.enabled !== false);
}

/**
 * Validates that step IDs are unique within a flow
 */
export function validateUniqueStepIds(steps: any[]): ValidationResult<any[]> {
  const stepIds = new Set<string>();
  const duplicates: string[] = [];

  steps.forEach((step) => {
    if (stepIds.has(step.id)) {
      duplicates.push(step.id);
    } else {
      stepIds.add(step.id);
    }
  });

  if (duplicates.length > 0) {
    return {
      success: false,
      errors: [
        {
          path: ['steps'],
          message: `Duplicate step IDs found: ${duplicates.join(', ')}`,
        },
      ],
    };
  }

  return { success: true, data: steps };
}

/**
 * Validates a complete flow (definition + version + steps)
 */
export function validateCompleteFlow(data: {
  definition: unknown;
  version: unknown;
}): ValidationResult<{ definition: any; version: any }> {
  // Validate definition
  const defResult = validateFlowDefinition(data.definition);
  if (!defResult.success) {
    return defResult;
  }

  // Validate version
  const versionResult = validateFlowVersion(data.version);
  if (!versionResult.success) {
    return versionResult;
  }

  // Validate unique step IDs
  const uniqueResult = validateUniqueStepIds(versionResult.data.steps);
  if (!uniqueResult.success) {
    return uniqueResult as ValidationError as ValidationResult<{ definition: any; version: any }>;
  }

  return {
    success: true,
    data: {
      definition: defResult.data,
      version: versionResult.data,
    },
  };
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: Array<{ path: string[]; message: string }>): string {
  return errors.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  }).join('\n');
}

/**
 * Checks if a validation result is successful (type guard)
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationSuccess<T> {
  return result.success === true;
}

/**
 * Checks if a validation result is an error (type guard)
 */
export function isValidationError<T>(
  result: ValidationResult<T>
): result is ValidationError {
  return result.success === false;
}
