import { describe, it, expect } from 'vitest';
import { createFlowFromButton } from '@/handlers/flowFromButton';

describe('createFlowFromButton', () => {
  it('creates a flow with main Bitrix connector step', () => {
    const buttonConfig = {
      id: 'btn-1',
      label: 'Qualificar Lead',
      description: 'Marca lead como qualificado',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
      sync_target: 'bitrix' as const,
    };

    const flow = createFlowFromButton(buttonConfig);

    expect(flow.nome).toBe('Flow: Qualificar Lead');
    expect(flow.descricao).toBe('Marca lead como qualificado');
    expect(flow.steps).toHaveLength(1);
    expect(flow.steps[0].type).toBe('bitrix_connector');
    expect(flow.steps[0].nome).toBe('Atualizar Bitrix: Qualificar Lead');
    expect(flow.steps[0].config).toMatchObject({
      action: 'update_lead',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      lead_id: '{{leadId}}',
    });
  });

  it('includes additional fields in the Bitrix step', () => {
    const buttonConfig = {
      id: 'btn-2',
      label: 'Atualizar Lead',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
      additional_fields: [
        { field: 'PRIORITY', value: 'HIGH' },
        { field: 'COMMENTS', value: 'Qualificado automaticamente' },
      ],
    };

    const flow = createFlowFromButton(buttonConfig);

    expect(flow.steps[0].config.additional_fields).toEqual([
      { field: 'PRIORITY', value: 'HIGH' },
      { field: 'COMMENTS', value: 'Qualificado automaticamente' },
    ]);
  });

  it('adds Chatwoot step when transfer_conversation is true', () => {
    const buttonConfig = {
      id: 'btn-3',
      label: 'Transferir e Qualificar',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
      transfer_conversation: true,
    };

    const flow = createFlowFromButton(buttonConfig);

    expect(flow.steps).toHaveLength(2);
    expect(flow.steps[1].type).toBe('chatwoot_connector');
    expect(flow.steps[1].nome).toBe('Transferir Conversa');
    expect(flow.steps[1].config).toMatchObject({
      action: 'transfer_conversation',
      conversation_id: '{{conversationId}}',
      agent_id: '{{targetAgentId}}',
    });
  });

  it('adds Supabase step when sync_target is supabase', () => {
    const buttonConfig = {
      id: 'btn-4',
      label: 'Sincronizar Supabase',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
      sync_target: 'supabase' as const,
    };

    const flow = createFlowFromButton(buttonConfig);

    expect(flow.steps).toHaveLength(2);
    expect(flow.steps[1].type).toBe('supabase_connector');
    expect(flow.steps[1].nome).toBe('Atualizar Supabase');
    expect(flow.steps[1].config).toMatchObject({
      action: 'update',
      table: 'leads',
      filters: { id: '{{leadId}}' },
    });
  });

  it('creates steps for sub-buttons', () => {
    const buttonConfig = {
      id: 'btn-5',
      label: 'Botão com Sub-botões',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
      sub_buttons: [
        {
          subLabel: 'Motivo 1',
          subDescription: 'Primeiro motivo',
          subWebhook: 'https://api.example.com/webhook',
          subField: 'REASON',
          subValue: 'REASON_1',
          subAdditionalFields: [],
        },
        {
          subLabel: 'Motivo 2',
          subDescription: 'Segundo motivo',
          subWebhook: 'https://api.example.com/webhook',
          subField: 'REASON',
          subValue: 'REASON_2',
          subAdditionalFields: [{ field: 'NOTE', value: 'Com nota' }],
        },
      ],
    };

    const flow = createFlowFromButton(buttonConfig);

    // Main step + 2 sub-button steps
    expect(flow.steps).toHaveLength(3);

    // Check first sub-button step
    expect(flow.steps[1].type).toBe('bitrix_connector');
    expect(flow.steps[1].nome).toBe('Sub-ação: Motivo 1');
    expect(flow.steps[1].config.field).toBe('REASON');
    expect(flow.steps[1].config.value).toBe('REASON_1');

    // Check second sub-button step with additional fields
    expect(flow.steps[2].type).toBe('bitrix_connector');
    expect(flow.steps[2].nome).toBe('Sub-ação: Motivo 2');
    expect(flow.steps[2].config.additional_fields).toEqual([
      { field: 'NOTE', value: 'Com nota' },
    ]);
  });

  it('adds Chatwoot step after sub-button when it has transfer_conversation', () => {
    const buttonConfig = {
      id: 'btn-6',
      label: 'Sub-botão com Transferência',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
      sub_buttons: [
        {
          subLabel: 'Transferir Conversa',
          subWebhook: 'https://api.example.com/webhook',
          subField: 'REASON',
          subValue: 'TRANSFERRED',
          transfer_conversation: true,
        },
      ],
    };

    const flow = createFlowFromButton(buttonConfig);

    // Main step + sub-button step + chatwoot step
    expect(flow.steps).toHaveLength(3);
    expect(flow.steps[2].type).toBe('chatwoot_connector');
    expect(flow.steps[2].nome).toBe('Transferir Conversa: Transferir Conversa');
  });

  it('creates a complete flow with all features', () => {
    const buttonConfig = {
      id: 'btn-7',
      label: 'Botão Completo',
      description: 'Botão com todas as features',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
      additional_fields: [{ field: 'PRIORITY', value: 'HIGH' }],
      transfer_conversation: true,
      sync_target: 'supabase' as const,
      sub_buttons: [
        {
          subLabel: 'Sub-ação',
          subWebhook: 'https://api.example.com/webhook',
          subField: 'REASON',
          subValue: 'REASON_1',
          subAdditionalFields: [],
        },
      ],
    };

    const flow = createFlowFromButton(buttonConfig);

    // Main Bitrix + Chatwoot + Supabase + Sub-button Bitrix = 4 steps
    expect(flow.steps).toHaveLength(4);
    expect(flow.steps[0].type).toBe('bitrix_connector');
    expect(flow.steps[1].type).toBe('chatwoot_connector');
    expect(flow.steps[2].type).toBe('supabase_connector');
    expect(flow.steps[3].type).toBe('bitrix_connector');
    expect(flow.steps[3].nome).toBe('Sub-ação: Sub-ação');
  });

  it('sets flow metadata correctly', () => {
    const buttonConfig = {
      id: 'btn-8',
      label: 'Test Button',
      description: 'Test Description',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
    };

    const flow = createFlowFromButton(buttonConfig);

    expect(flow.id).toBe('');
    expect(flow.nome).toBe('Flow: Test Button');
    expect(flow.descricao).toBe('Test Description');
    expect(flow.ativo).toBe(true);
    expect(flow.criado_em).toBeDefined();
    expect(flow.atualizado_em).toBeDefined();
  });

  it('handles button without description', () => {
    const buttonConfig = {
      id: 'btn-9',
      label: 'Button Without Description',
      color: '#3b82f6',
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED',
      field_type: 'string',
      action_type: 'tabular',
    };

    const flow = createFlowFromButton(buttonConfig);

    expect(flow.descricao).toBe('Automação gerada do botão Button Without Description');
    expect(flow.steps[0].descricao).toBe('Atualiza o campo STATUS_ID no Bitrix');
  });
});
