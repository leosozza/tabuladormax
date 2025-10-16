// ============================================
// Flow From Button - Convert Button Config to Flow
// ============================================

import type { Flow, FlowStep } from "@/types/flow";

interface ButtonConfig {
  id: string;
  label: string;
  description?: string;
  color: string;
  webhook_url: string;
  field: string;
  value: string;
  field_type?: string;
  action_type: string;
  additional_fields?: Array<{ field: string; value: string }>;
  transfer_conversation?: boolean;
  sync_target?: 'bitrix' | 'supabase';
  sub_buttons?: Array<{
    subLabel: string;
    subDescription?: string;
    subWebhook: string;
    subField: string;
    subValue: string;
    subAdditionalFields?: Array<{ field: string; value: string }>;
    transfer_conversation?: boolean;
  }>;
}

/**
 * Creates a Flow from a button configuration
 * Converts button actions into proper connector steps (Bitrix, Supabase, Chatwoot)
 */
export function createFlowFromButton(buttonConfig: ButtonConfig): Flow {
  const steps: FlowStep[] = [];
  
  // 1️⃣ Criar BitrixConnector baseado na config do botão
  const bitrixStep: FlowStep = {
    id: `bitrix-${buttonConfig.id}`,
    type: 'bitrix_connector',
    nome: `Atualizar Bitrix: ${buttonConfig.label}`,
    descricao: buttonConfig.description || `Atualiza o campo ${buttonConfig.field} no Bitrix`,
    config: {
      action: 'update_lead',
      webhook_url: buttonConfig.webhook_url,
      field: buttonConfig.field,
      value: buttonConfig.value,
      field_type: buttonConfig.field_type || 'string',
      additional_fields: buttonConfig.additional_fields || [],
      lead_id: '{{leadId}}' // Placeholder
    }
  };
  steps.push(bitrixStep);
  
  // 2️⃣ Se transfer_conversation = true, adicionar ChatwootConnector
  if (buttonConfig.transfer_conversation) {
    const chatwootStep: FlowStep = {
      id: `chatwoot-${buttonConfig.id}`,
      type: 'chatwoot_connector',
      nome: 'Transferir Conversa',
      descricao: 'Transfere a conversa para outro agente',
      config: {
        action: 'transfer_conversation',
        conversation_id: '{{conversationId}}',
        agent_id: '{{targetAgentId}}'
      }
    };
    steps.push(chatwootStep);
  }
  
  // 3️⃣ Se sync_target = 'supabase', adicionar SupabaseConnector
  if (buttonConfig.sync_target === 'supabase') {
    const supabaseStep: FlowStep = {
      id: `supabase-${buttonConfig.id}`,
      type: 'supabase_connector',
      nome: 'Atualizar Supabase',
      descricao: 'Sincroniza dados no banco local',
      config: {
        action: 'update',
        table: 'leads',
        filters: { id: '{{leadId}}' },
        data: {
          [buttonConfig.field]: buttonConfig.value,
          updated_at: '{{now}}',
          sync_status: 'synced'
        }
      }
    };
    steps.push(supabaseStep);
  }
  
  // 4️⃣ Adicionar sub-buttons como steps separados
  if (buttonConfig.sub_buttons && buttonConfig.sub_buttons.length > 0) {
    buttonConfig.sub_buttons.forEach((subButton, index) => {
      const subStep: FlowStep = {
        id: `bitrix-sub-${buttonConfig.id}-${index}`,
        type: 'bitrix_connector',
        nome: `Sub-ação: ${subButton.subLabel}`,
        descricao: subButton.subDescription || `Atualiza ${subButton.subField} com ${subButton.subValue}`,
        config: {
          action: 'update_lead',
          webhook_url: subButton.subWebhook,
          field: subButton.subField,
          value: subButton.subValue,
          field_type: 'string',
          additional_fields: subButton.subAdditionalFields || [],
          lead_id: '{{leadId}}'
        }
      };
      steps.push(subStep);
      
      // Se sub-button tem transfer_conversation, adicionar Chatwoot step
      if (subButton.transfer_conversation) {
        const chatwootSubStep: FlowStep = {
          id: `chatwoot-sub-${buttonConfig.id}-${index}`,
          type: 'chatwoot_connector',
          nome: `Transferir Conversa: ${subButton.subLabel}`,
          descricao: 'Transfere conversa após executar sub-ação',
          config: {
            action: 'transfer_conversation',
            conversation_id: '{{conversationId}}',
            agent_id: '{{targetAgentId}}'
          }
        };
        steps.push(chatwootSubStep);
      }
    });
  }

  // Create Flow object (without id, as it's a new/temporary flow)
  const flow: Flow = {
    id: '', // Empty for new flows
    nome: `Flow: ${buttonConfig.label}`,
    descricao: buttonConfig.description || `Automação gerada do botão ${buttonConfig.label}`,
    steps,
    ativo: true,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };

  return flow;
}
