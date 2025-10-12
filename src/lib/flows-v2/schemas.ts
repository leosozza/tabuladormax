// ============================================
// Flows v2 - JSON Schema Definitions
// ============================================
// JSON Schema definitions for validating flow steps and configurations

import { z } from 'zod';

// ============================================
// Step Type Schemas
// ============================================

/**
 * Schema for Tabular step configuration
 */
export const TabularStepConfigSchema = z.object({
  buttonId: z.string().optional(),
  webhook_url: z.string().url('Invalid webhook URL'),
  field: z.string().min(1, 'Field is required'),
  value: z.union([z.string(), z.number(), z.boolean()]),
  additional_fields: z
    .array(
      z.object({
        field: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
      })
    )
    .optional(),
});

/**
 * Schema for HTTP Call step configuration
 */
export const HttpCallStepConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  url: z.string().url('Invalid URL'),
  headers: z.record(z.string()).optional(),
  body: z.union([z.string(), z.record(z.any())]).optional(),
  timeout: z.number().positive().optional().default(30000),
  retry: z
    .object({
      max_attempts: z.number().int().positive().max(5).default(3),
      delay: z.number().positive().default(1000),
    })
    .optional(),
});

/**
 * Schema for Wait step configuration
 */
export const WaitStepConfigSchema = z.object({
  seconds: z.number().positive().max(3600, 'Wait time cannot exceed 1 hour'),
  reason: z.string().optional(),
});

/**
 * Schema for base step properties
 */
export const BaseStepSchema = z.object({
  id: z.string().min(1, 'Step ID is required'),
  type: z.enum(['tabular', 'http_call', 'wait']),
  nome: z.string().min(1, 'Step name is required'),
  descricao: z.string().optional(),
  enabled: z.boolean().default(true),
  continue_on_error: z.boolean().default(false),
});

/**
 * Schema for Tabular step
 */
export const TabularStepSchema = BaseStepSchema.extend({
  type: z.literal('tabular'),
  config: TabularStepConfigSchema,
});

/**
 * Schema for HTTP Call step
 */
export const HttpCallStepSchema = BaseStepSchema.extend({
  type: z.literal('http_call'),
  config: HttpCallStepConfigSchema,
});

/**
 * Schema for Wait step
 */
export const WaitStepSchema = BaseStepSchema.extend({
  type: z.literal('wait'),
  config: WaitStepConfigSchema,
});

/**
 * Discriminated union schema for all step types
 */
export const FlowStepSchema = z.discriminatedUnion('type', [
  TabularStepSchema,
  HttpCallStepSchema,
  WaitStepSchema,
]);

// ============================================
// Flow Configuration Schemas
// ============================================

/**
 * Schema for flow definition
 */
export const FlowDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, 'Flow name is required').max(255),
  descricao: z.string().max(1000).optional(),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

/**
 * Schema for flow version
 */
export const FlowVersionSchema = z.object({
  id: z.string().uuid().optional(),
  flow_definition_id: z.string().uuid(),
  version_number: z.number().int().positive(),
  steps: z.array(FlowStepSchema).min(1, 'Flow must have at least one step'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  published_at: z.string().datetime().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  change_notes: z.string().max(500).optional(),
});

/**
 * Schema for flow execution
 */
export const FlowExecutionSchema = z.object({
  id: z.string().uuid().optional(),
  flow_definition_id: z.string().uuid(),
  flow_version_id: z.string().uuid(),
  lead_id: z.number().int().positive().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  logs: z.array(z.any()).default([]),
  result: z.any().optional(),
  error_message: z.string().optional(),
  started_at: z.string().datetime().optional(),
  finished_at: z.string().datetime().optional(),
  executed_by: z.string().uuid().optional(),
  context: z.record(z.any()).default({}),
});

// ============================================
// Request/Response Schemas
// ============================================

/**
 * Schema for creating a flow definition
 */
export const CreateFlowDefinitionRequestSchema = z.object({
  nome: z.string().min(1).max(255),
  descricao: z.string().max(1000).optional(),
  is_active: z.boolean().default(true),
});

/**
 * Schema for creating a flow version
 */
export const CreateFlowVersionRequestSchema = z.object({
  flow_definition_id: z.string().uuid(),
  steps: z.array(FlowStepSchema).min(1),
  status: z.enum(['draft', 'published']).default('draft'),
  change_notes: z.string().max(500).optional(),
});

/**
 * Schema for executing a flow
 */
export const ExecuteFlowRequestSchema = z.object({
  flow_definition_id: z.string().uuid(),
  flow_version_id: z.string().uuid().optional(), // If not provided, use latest published version
  lead_id: z.number().int().positive().optional(),
  context: z.record(z.any()).optional().default({}),
});

/**
 * Schema for updating a flow definition
 */
export const UpdateFlowDefinitionRequestSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  descricao: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
});

/**
 * Schema for publishing a flow version
 */
export const PublishFlowVersionRequestSchema = z.object({
  version_id: z.string().uuid(),
  change_notes: z.string().max(500).optional(),
});

// ============================================
// Type Exports (inferred from schemas)
// ============================================

export type TabularStepConfig = z.infer<typeof TabularStepConfigSchema>;
export type HttpCallStepConfig = z.infer<typeof HttpCallStepConfigSchema>;
export type WaitStepConfig = z.infer<typeof WaitStepConfigSchema>;
export type BaseStep = z.infer<typeof BaseStepSchema>;
export type TabularStep = z.infer<typeof TabularStepSchema>;
export type HttpCallStep = z.infer<typeof HttpCallStepSchema>;
export type WaitStep = z.infer<typeof WaitStepSchema>;
export type FlowStep = z.infer<typeof FlowStepSchema>;
export type FlowDefinition = z.infer<typeof FlowDefinitionSchema>;
export type FlowVersion = z.infer<typeof FlowVersionSchema>;
export type FlowExecution = z.infer<typeof FlowExecutionSchema>;
export type CreateFlowDefinitionRequest = z.infer<typeof CreateFlowDefinitionRequestSchema>;
export type CreateFlowVersionRequest = z.infer<typeof CreateFlowVersionRequestSchema>;
export type ExecuteFlowRequest = z.infer<typeof ExecuteFlowRequestSchema>;
export type UpdateFlowDefinitionRequest = z.infer<typeof UpdateFlowDefinitionRequestSchema>;
export type PublishFlowVersionRequest = z.infer<typeof PublishFlowVersionRequestSchema>;
