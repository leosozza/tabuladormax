// ============================================
// Flow Builder - Type Definitions
// ============================================

/**
 * Step type for flow actions
 */
export type FlowStepType = 'tabular' | 'http_call' | 'wait' | 'email' | 'change_status' | 'webhook';

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
    body?: Record<string, any>;
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
 * Email step - sends an email
 */
export interface FlowStepEmail extends FlowStepBase {
  type: 'email';
  config: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  };
}

/**
 * Change Status step - changes lead status
 */
export interface FlowStepChangeStatus extends FlowStepBase {
  type: 'change_status';
  config: {
    statusId: string;
    webhook_url?: string;
  };
}

/**
 * Webhook step - calls a webhook URL
 */
export interface FlowStepWebhook extends FlowStepBase {
  type: 'webhook';
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: Record<string, any>;
  };
}

/**
 * Union type for all flow steps
 */
export type FlowStep = FlowStepTabular | FlowStepHttpCall | FlowStepWait | FlowStepEmail | FlowStepChangeStatus | FlowStepWebhook;

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
  data?: any;
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
  resultado?: any;
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
  context?: Record<string, any>;
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
