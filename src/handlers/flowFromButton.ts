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
 * Converts button actions into proper connector steps (Bitrix, Supabase)
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
      lead_id: '{{leadId}}'
    }
  };
  steps.push(bitrixStep);
  
  // 2️⃣ Se sync_target = 'supabase', adicionar SupabaseConnector
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
  
  // 3️⃣ Adicionar sub-buttons como steps separados
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
    });
  }

  // Create Flow object
  const flow: Flow = {
    id: '',
    nome: `Flow: ${buttonConfig.label}`,
    descricao: buttonConfig.description || `Automação gerada do botão ${buttonConfig.label}`,
    steps,
    ativo: true,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };

  return flow;
}
