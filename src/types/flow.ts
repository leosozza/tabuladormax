// ============================================
// Flow Builder - Type Definitions
// ============================================

/**
 * Step type for flow actions
 */
export type FlowStepType = 
  | 'tabular' 
  | 'bitrix_connector'
  | 'bitrix_get_field'
  | 'supabase_connector'
  | 'n8n_connector'
  | 'http_call' 
  | 'wait'
  | 'send_message'
  | 'gupshup_send_text'
  | 'gupshup_send_image'
  | 'gupshup_send_buttons'
  | 'gupshup_send_template'
  | 'condition'
  | 'schedule_message'
  | 'update_contact'
  | 'add_label'
  | 'assign_agent'
  | 'assign_team'
  // New management types
  | 'notification'
  | 'transfer_notification'
  | 'assign_ai_agent'
  | 'transfer_human_agent'
  | 'close_conversation'
  | 'schedule_action';

/**
 * Trigger types for flows
 */
export type FlowTriggerType = 'button_click' | 'keyword' | 'webhook' | 'manual';

/**
 * Flow trigger definition
 */
export interface FlowTrigger {
  id: string;
  flow_id: string;
  trigger_type: FlowTriggerType;
  trigger_config: {
    button_text?: string;
    exact_match?: boolean;
    keywords?: string[];
    webhook_path?: string;
  };
  ativo: boolean;
  created_at: string;
}

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
 * Bitrix Connector - updates/creates leads in Bitrix24
 */
export interface FlowStepBitrixConnector extends FlowStepBase {
  type: 'bitrix_connector';
  config: {
    action: 'update_lead' | 'create_lead' | 'get_lead';
    webhook_url: string;
    field: string;
    value: string;
    field_type?: string;
    additional_fields?: Array<{ field: string; value: string }>;
    lead_id?: string;
  };
}

/**
 * Supabase Connector - database operations
 */
export interface FlowStepSupabaseConnector extends FlowStepBase {
  type: 'supabase_connector';
  config: {
    action: 'update' | 'insert' | 'select';
    table: 'leads' | 'chatwoot_contacts' | string;
    filters?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
}

/**
 * N8N Connector - webhook integration or MCP workflow
 */
export interface FlowStepN8NConnector extends FlowStepBase {
  type: 'n8n_connector';
  config: {
    // Mode: 'webhook' (manual) or 'mcp' (workflow selection)
    mode?: 'webhook' | 'mcp';
    // Webhook mode fields
    webhook_url?: string;
    method?: 'GET' | 'POST';
    payload?: Record<string, unknown>;
    // MCP mode fields
    workflow_id?: string;
    workflow_name?: string;
    workflow_inputs?: Record<string, unknown>;
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
 * Send Message step - sends message
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
/**
 * Bitrix Get Field - fetches field from Bitrix and stores in context
 */
export interface FlowStepBitrixGetField extends FlowStepBase {
  type: 'bitrix_get_field';
  config: {
    field_name: string; // Campo no Bitrix (ex: 'UF_CRM_CREDENCIAL')
    output_variable: string; // Nome da variável de saída (ex: 'credencial_url')
    is_file?: boolean; // Se true, converte file ID para URL pública
  };
}

/**
 * Gupshup Send Text - sends text message via WhatsApp
 */
export interface FlowStepGupshupSendText extends FlowStepBase {
  type: 'gupshup_send_text';
  config: {
    message: string; // Suporta {{variáveis}}
  };
}

/**
 * Gupshup Send Image - sends image via WhatsApp
 */
export interface FlowStepGupshupSendImage extends FlowStepBase {
  type: 'gupshup_send_image';
  config: {
    image_url: string; // URL ou {{variável}}
    caption?: string; // Legenda opcional
  };
}

/**
 * Gupshup Send Buttons - sends interactive message with quick reply buttons
 */
export interface FlowStepGupshupSendButtons extends FlowStepBase {
  type: 'gupshup_send_buttons';
  config: {
    message: string;
    buttons: Array<{
      id: string;
      title: string;
    }>;
  };
}

/**
 * Template button for branching
 */
export interface TemplateButton {
  id: string;
  text: string;
  nextStepId?: string;
}

/**
 * Gupshup Send Template - sends HSM template via WhatsApp with optional branching
 */
export interface FlowStepGupshupSendTemplate extends FlowStepBase {
  type: 'gupshup_send_template';
  config: {
    template_id: string;
    template_name?: string;
    variables: Array<{
      index: number;
      value: string;
    }>;
    buttons?: TemplateButton[];
    wait_for_response?: boolean;
    timeout_seconds?: number;
    timeout_step_id?: string;
  };
}

/**
 * Union type for all flow steps
 */
/**
 * Notification step - sends internal notification to users
 */
export interface FlowStepNotification extends FlowStepBase {
  type: 'notification';
  config: {
    title: string;
    message: string;
    target_users: string[]; // UUIDs dos profiles
    notification_type: 'info' | 'warning' | 'success' | 'error';
  };
}

/**
 * Transfer notification step - notifies user about conversation transfer
 */
export interface FlowStepTransferNotification extends FlowStepBase {
  type: 'transfer_notification';
  config: {
    target_user_id: string; // UUID do profile
    message?: string;
  };
}

/**
 * Assign AI Agent step - links an AI agent to the conversation
 */
export interface FlowStepAssignAIAgent extends FlowStepBase {
  type: 'assign_ai_agent';
  config: {
    ai_agent_id: string;
    ai_agent_name?: string;
  };
}

/**
 * Transfer Human Agent step - transfers conversation to a specific user
 */
export interface FlowStepTransferHumanAgent extends FlowStepBase {
  type: 'transfer_human_agent';
  config: {
    target_user_id: string;
    target_user_name?: string;
    notify_user?: boolean;
  };
}

/**
 * Close Conversation step - marks conversation as closed
 */
export interface FlowStepCloseConversation extends FlowStepBase {
  type: 'close_conversation';
  config: {
    closure_reason?: string;
  };
}

/**
 * Schedule Action step - schedules future execution based on fixed date or lead field
 */
export interface FlowStepScheduleAction extends FlowStepBase {
  type: 'schedule_action';
  config: {
    schedule_type: 'fixed_date' | 'lead_field';
    fixed_date?: string; // ISO string
    lead_field?: string; // e.g., 'data_agendamento'
    offset_days?: number; // -1 = day before, 0 = same day
    offset_hours?: number; // Hour of day to execute
    target_flow_id?: string;
    target_step_id?: string;
  };
}

export type FlowStep = 
  | FlowStepTabular 
  | FlowStepBitrixConnector
  | FlowStepBitrixGetField
  | FlowStepSupabaseConnector
  | FlowStepN8NConnector
  | FlowStepHttpCall 
  | FlowStepWait
  | FlowStepSendMessage
  | FlowStepGupshupSendText
  | FlowStepGupshupSendImage
  | FlowStepGupshupSendButtons
  | FlowStepGupshupSendTemplate
  | FlowStepCondition
  | FlowStepScheduleMessage
  | FlowStepUpdateContact
  | FlowStepAddLabel
  | FlowStepAssignAgent
  | FlowStepAssignTeam
  // New management step types
  | FlowStepNotification
  | FlowStepTransferNotification
  | FlowStepAssignAIAgent
  | FlowStepTransferHumanAgent
  | FlowStepCloseConversation
  | FlowStepScheduleAction;

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
