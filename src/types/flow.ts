// ============================================
// Flow Builder - Type Definitions
// ============================================

/**
 * Step type for flow actions
 */
export type FlowStepType = 
  | 'tabular' 
  | 'http_call' 
  | 'wait'
  | 'send_message'
  | 'condition'
  | 'schedule_message'
  | 'update_contact'
  | 'add_label'
  | 'assign_agent'
  | 'assign_team';

/**
 * Base flow step interface
 */
export interface FlowStepBase {
  id: string;
  type: FlowStepType;
  nome: string;
  descricao?: string;
}

/**
 * Tabular step - executes a button action
 */
export interface FlowStepTabular extends FlowStepBase {
  type: 'tabular';
  config: {
    buttonId: string;
    webhook_url: string;
    field: string;
    value: string;
    field_type?: string;
    additional_fields?: Array<{ field: string; value: string }>;
    transfer_conversation?: boolean;
  };
}

/**
 * HTTP Call step - makes an HTTP request
 */
export interface FlowStepHttpCall extends FlowStepBase {
  type: 'http_call';
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
}

/**
 * Wait step - adds delay between steps
 */
export interface FlowStepWait extends FlowStepBase {
  type: 'wait';
  config: {
    seconds: number;
  };
}

/**
 * Send Message step - sends message to Chatwoot
 */
export interface FlowStepSendMessage extends FlowStepBase {
  type: 'send_message';
  config: {
    conversationId: string;
    message: string;
    messageType?: 'incoming' | 'outgoing';
  };
}

/**
 * Condition step - conditional logic
 */
export interface FlowStepCondition extends FlowStepBase {
  type: 'condition';
  config: {
    conditions: Array<{
      variable: string;
      operator: string;
      value: string;
    }>;
    logic: 'AND' | 'OR';
  };
}

/**
 * Schedule Message step - schedules message for later
 */
export interface FlowStepScheduleMessage extends FlowStepBase {
  type: 'schedule_message';
  config: {
    conversationId: string;
    message: string;
    delayMinutes: number;
  };
}

/**
 * Update Contact step - updates contact information
 */
export interface FlowStepUpdateContact extends FlowStepBase {
  type: 'update_contact';
  config: {
    contactId: string;
    name?: string;
    email?: string;
    phone_number?: string;
    custom_attributes?: Record<string, unknown>;
  };
}

/**
 * Add Label step - adds label to conversation
 */
export interface FlowStepAddLabel extends FlowStepBase {
  type: 'add_label';
  config: {
    conversationId: string;
    labels: string[];
  };
}

/**
 * Assign Agent step - assigns agent to conversation
 */
export interface FlowStepAssignAgent extends FlowStepBase {
  type: 'assign_agent';
  config: {
    conversationId: string;
    agentId: string;
  };
}

/**
 * Assign Team step - assigns team to conversation
 */
export interface FlowStepAssignTeam extends FlowStepBase {
  type: 'assign_team';
  config: {
    conversationId: string;
    teamId: string;
  };
}

/**
 * Union type for all flow steps
 */
export type FlowStep = 
  | FlowStepTabular 
  | FlowStepHttpCall 
  | FlowStepWait
  | FlowStepSendMessage
  | FlowStepCondition
  | FlowStepScheduleMessage
  | FlowStepUpdateContact
  | FlowStepAddLabel
  | FlowStepAssignAgent
  | FlowStepAssignTeam;

/**
 * Flow definition
 */
export interface Flow {
  id: string;
  nome: string;
  descricao?: string;
  steps: FlowStep[];
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  criado_por?: string;
}

/**
 * Flow run status
 */
export type FlowRunStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Log entry for flow execution
 */
export interface FlowLogEntry {
  timestamp: string;
  stepId: string;
  stepNome: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: unknown;
}

/**
 * Flow run record
 */
export interface FlowRun {
  id: string;
  flow_id: string;
  lead_id?: number;
  status: FlowRunStatus;
  logs: FlowLogEntry[];
  resultado?: unknown;
  iniciado_em: string;
  finalizado_em?: string;
  executado_por?: string;
}

/**
 * Request to execute a flow
 */
export interface ExecuteFlowRequest {
  flowId: string;
  leadId?: number;
  context?: Record<string, unknown>;
}

/**
 * Response from flow execution
 */
export interface ExecuteFlowResponse {
  runId: string;
  status: FlowRunStatus;
  message: string;
}

/**
 * Flow creation/update request
 */
export interface CreateFlowRequest {
  nome: string;
  descricao?: string;
  steps: FlowStep[];
  ativo?: boolean;
}

/**
 * Flow list item (minimal info)
 */
export interface FlowListItem {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
  stepsCount: number;
}
