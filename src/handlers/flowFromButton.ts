// ============================================
// Flow From Button - Convert Button Config to Flow
// ============================================

import type { Flow, FlowStep } from "@/types/flow";

interface ButtonConfig {
  id: string;
  label: string;
  description?: string;
  webhook_url: string;
  field: string;
  value: string;
  field_type?: string;
  action_type: string;
  additional_fields?: Array<{ field: string; value: string }>;
  transfer_conversation?: boolean;
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
 * Converts button actions (tabular, http_call) into Flow steps
 */
export function createFlowFromButton(buttonConfig: ButtonConfig): Flow {
  const steps: FlowStep[] = [];
  
  // Main button action as first step
  if (buttonConfig.action_type === 'tabular' || !buttonConfig.action_type) {
    // Create tabular step
    const step: FlowStep = {
      id: `step-main-${buttonConfig.id}`,
      type: 'tabular',
      nome: buttonConfig.label,
      descricao: buttonConfig.description,
      config: {
        buttonId: buttonConfig.id,
        webhook_url: buttonConfig.webhook_url,
        field: buttonConfig.field,
        value: buttonConfig.value,
        field_type: buttonConfig.field_type,
        additional_fields: buttonConfig.additional_fields || [],
        transfer_conversation: buttonConfig.transfer_conversation || false
      }
    };
    steps.push(step);
  } else if (buttonConfig.action_type === 'http_call' && buttonConfig.webhook_url) {
    // Create HTTP call step
    const step: FlowStep = {
      id: `step-main-${buttonConfig.id}`,
      type: 'http_call',
      nome: buttonConfig.label,
      descricao: buttonConfig.description,
      config: {
        url: buttonConfig.webhook_url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          field: buttonConfig.field,
          value: buttonConfig.value,
          additional_fields: buttonConfig.additional_fields || []
        }
      }
    };
    steps.push(step);
  }

  // Add sub-buttons as additional steps
  if (buttonConfig.sub_buttons && buttonConfig.sub_buttons.length > 0) {
    buttonConfig.sub_buttons.forEach((subButton, index) => {
      const subStep: FlowStep = {
        id: `step-sub-${buttonConfig.id}-${index}`,
        type: 'tabular',
        nome: subButton.subLabel,
        descricao: subButton.subDescription,
        config: {
          buttonId: `${buttonConfig.id}-sub-${index}`,
          webhook_url: subButton.subWebhook,
          field: subButton.subField,
          value: subButton.subValue,
          additional_fields: subButton.subAdditionalFields || [],
          transfer_conversation: subButton.transfer_conversation || false
        }
      };
      steps.push(subStep);
    });
  }

  // Create Flow object (without id, as it's a new/temporary flow)
  const flow: Flow = {
    id: '', // Empty for new flows
    nome: `Flow: ${buttonConfig.label}`,
    descricao: buttonConfig.description || `Flow gerado a partir do botão ${buttonConfig.label}`,
    steps,
    ativo: true,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };

  return flow;
}
