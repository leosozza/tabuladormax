// ============================================
// Flow From Button - Convert Button Config to Flow
// ============================================

import type { Flow, FlowStep } from "@/types/flow";

/**
 * Button configuration interface (subset needed for conversion)
 */
interface ButtonConfig {
  id: string;
  label: string;
  description?: string;
  webhook_url: string;
  field: string;
  value: string;
  field_type?: string;
  action_type?: string;
  additional_fields?: Array<{ field: string; value: string }>;
  sub_buttons?: Array<{
    subLabel: string;
    subDescription?: string;
    subWebhook: string;
    subField: string;
    subValue: string;
    subAdditionalFields?: Array<{ field: string; value: string }>;
  }>;
}

/**
 * Convert a button configuration to a Flow structure
 * Maps button actions to flow steps
 * 
 * Supported mappings:
 * - tabular: Standard button action (field + value update)
 * - http_call: Custom webhook calls
 * - wait: Delays between actions
 * - email: Email notifications (if configured)
 * - change_status: Status changes (STATUS_ID field)
 * - webhook: Generic webhook calls
 */
export function createFlowFromButton(buttonConfig: ButtonConfig): Flow {
  const steps: FlowStep[] = [];
  let stepCounter = 1;

  // Main button action
  if (buttonConfig.field && buttonConfig.value) {
    // Check if this is a status change
    if (buttonConfig.field === 'STATUS_ID' || buttonConfig.field.toLowerCase().includes('status')) {
      steps.push({
        id: `step-${stepCounter++}`,
        type: 'change_status',
        nome: `Mudar Status: ${buttonConfig.label}`,
        descricao: buttonConfig.description,
        config: {
          statusId: buttonConfig.value,
          webhook_url: buttonConfig.webhook_url
        }
      });
    } else {
      // Standard tabular action
      steps.push({
        id: `step-${stepCounter++}`,
        type: 'tabular',
        nome: `Atualizar ${buttonConfig.field}: ${buttonConfig.label}`,
        descricao: buttonConfig.description,
        config: {
          buttonId: buttonConfig.id,
          webhook_url: buttonConfig.webhook_url,
          field: buttonConfig.field,
          value: buttonConfig.value,
          field_type: buttonConfig.field_type,
          additional_fields: buttonConfig.additional_fields
        }
      });
    }
  }

  // If webhook_url exists and action_type suggests it's a custom call
  if (buttonConfig.webhook_url && buttonConfig.action_type === 'webhook') {
    steps.push({
      id: `step-${stepCounter++}`,
      type: 'webhook',
      nome: `Webhook: ${buttonConfig.label}`,
      descricao: buttonConfig.description,
      config: {
        url: buttonConfig.webhook_url,
        method: 'POST',
        body: {
          field: buttonConfig.field,
          value: buttonConfig.value
        }
      }
    });
  }

  // If action_type is http_call, create an HTTP call step
  if (buttonConfig.action_type === 'http_call' && buttonConfig.webhook_url) {
    steps.push({
      id: `step-${stepCounter++}`,
      type: 'http_call',
      nome: `Chamada HTTP: ${buttonConfig.label}`,
      descricao: buttonConfig.description,
      config: {
        url: buttonConfig.webhook_url,
        method: 'POST',
        body: {
          field: buttonConfig.field,
          value: buttonConfig.value
        }
      }
    });
  }

  // If action_type is email (custom extension), create email step
  if (buttonConfig.action_type === 'email') {
    steps.push({
      id: `step-${stepCounter++}`,
      type: 'email',
      nome: `Enviar Email: ${buttonConfig.label}`,
      descricao: buttonConfig.description,
      config: {
        to: '{{email}}',
        subject: buttonConfig.label,
        body: buttonConfig.description || `Ação: ${buttonConfig.label}`
      }
    });
  }

  // If action_type is wait, add a wait step
  if (buttonConfig.action_type === 'wait') {
    steps.push({
      id: `step-${stepCounter++}`,
      type: 'wait',
      nome: `Aguardar`,
      descricao: 'Pausa entre ações',
      config: {
        seconds: 5
      }
    });
  }

  // Process sub-buttons as additional steps
  if (buttonConfig.sub_buttons && buttonConfig.sub_buttons.length > 0) {
    buttonConfig.sub_buttons.forEach((subButton, index) => {
      if (subButton.subField && subButton.subValue) {
        steps.push({
          id: `step-${stepCounter++}`,
          type: 'tabular',
          nome: `Sub-ação: ${subButton.subLabel}`,
          descricao: subButton.subDescription,
          config: {
            buttonId: `${buttonConfig.id}-sub-${index}`,
            webhook_url: subButton.subWebhook,
            field: subButton.subField,
            value: subButton.subValue,
            additional_fields: subButton.subAdditionalFields
          }
        });
      }
    });
  }

  // If no steps were created, add a placeholder
  if (steps.length === 0) {
    steps.push({
      id: `step-${stepCounter++}`,
      type: 'tabular',
      nome: `Ação: ${buttonConfig.label}`,
      descricao: buttonConfig.description || 'Ação convertida do botão',
      config: {
        buttonId: buttonConfig.id,
        webhook_url: buttonConfig.webhook_url || '',
        field: buttonConfig.field || '',
        value: buttonConfig.value || ''
      }
    });
  }

  // Create the flow object
  const flow: Flow = {
    id: '', // Will be assigned when saved
    nome: `Flow: ${buttonConfig.label}`,
    descricao: buttonConfig.description || `Flow convertido do botão "${buttonConfig.label}"`,
    steps,
    ativo: true,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };

  return flow;
}
