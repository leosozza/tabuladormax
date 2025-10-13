import type { FlowStepType } from '@/types/flow';

/** Rótulos padrão por tipo */
export function getDefaultLabel(type: FlowStepType): string {
  const labels: Record<FlowStepType, string> = {
    tabular: 'Tabulação',
    http_call: 'HTTP Request',
    wait: 'Aguardar',
    send_message: 'Enviar Mensagem',
    condition: 'Condição',
    schedule_message: 'Agendar Mensagem',
    update_contact: 'Atualizar Contato',
    add_label: 'Adicionar Label',
    assign_agent: 'Atribuir Agente',
    assign_team: 'Atribuir Time',
  };
  return labels[type] ?? String(type);
}

/** Configs padrão por tipo */
export function getDefaultConfig(type: FlowStepType): any {
  const configs: Record<FlowStepType, any> = {
    tabular: {
      buttonId: '',
      webhook_url:
        'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json',
      field: 'STATUS_ID',
      value: '',
      field_type: 'string',
      additional_fields: [],
    },
    http_call: {
      url: '',
      method: 'GET',
      headers: {},
      body: {},
    },
    wait: {
      seconds: 5,
    },
    send_message: {
      conversationId: '{{conversation.id}}',
      message: '',
      messageType: 'outgoing',
    },
    condition: {
      conditions: [],
      logic: 'AND' as 'AND' | 'OR',
    },
    schedule_message: {
      conversationId: '{{conversation.id}}',
      message: '',
      delayMinutes: 60,
    },
    update_contact: {
      contactId: '{{sender.id}}',
      name: '',
      email: '',
      phone_number: '',
      custom_attributes: {},
    },
    add_label: {
      conversationId: '{{conversation.id}}',
      labels: [],
    },
    assign_agent: {
      conversationId: '{{conversation.id}}',
      agentId: '',
    },
    assign_team: {
      conversationId: '{{conversation.id}}',
      teamId: '',
    },
  };

  return configs[type] ?? {};
}