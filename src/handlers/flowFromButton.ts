// ============================================
// Flow From Button Converter
// ============================================

import type { CreateFlowRequest, FlowStep, FlowStepType } from "@/types/flow";

interface ButtonConfig {
  id: string;
  label: string;
  description?: string;
  webhook_url: string;
  field: string;
  value: string;
  field_type: string;
  action_type: string;
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
 * Create a Flow from button configuration
 * Converts button action into a flow with steps
 */
export function createFlowFromButton(buttonConfig: ButtonConfig): CreateFlowRequest {
  const steps: FlowStep[] = [];
  
  // Determine step type based on button configuration
  const stepType = determineStepType(buttonConfig);
  
  // Create main step from button
  const mainStep = createStepFromButton(buttonConfig, stepType, 'step-1');
  if (mainStep) {
    steps.push(mainStep);
  }
  
  // Create steps from sub-buttons if any
  if (buttonConfig.sub_buttons && buttonConfig.sub_buttons.length > 0) {
    buttonConfig.sub_buttons.forEach((subButton, index) => {
      const subStep = createStepFromSubButton(subButton, index + 2);
      if (subStep) {
        steps.push(subStep);
      }
    });
  }
  
  return {
    nome: `Flow: ${buttonConfig.label}`,
    descricao: buttonConfig.description || `Flow gerado a partir do botão "${buttonConfig.label}"`,
    steps,
    ativo: true
  };
}

/**
 * Determine the step type based on button configuration
 */
function determineStepType(button: ButtonConfig): FlowStepType {
  const actionType = button.action_type?.toLowerCase() || '';
  const webhookUrl = button.webhook_url?.toLowerCase() || '';
  
  // Check for tabular action
  if (actionType.includes('tabular') || button.field) {
    return 'tabular';
  }
  
  // Check for email action
  if (actionType.includes('email') || webhookUrl.includes('email') || webhookUrl.includes('mail')) {
    return 'email';
  }
  
  // Check for status change
  if (actionType.includes('status') || button.field?.toUpperCase() === 'STATUS_ID') {
    return 'change_status';
  }
  
  // Check for wait action
  if (actionType.includes('wait') || actionType.includes('delay')) {
    return 'wait';
  }
  
  // Check for HTTP call
  if (actionType.includes('http') || actionType.includes('api')) {
    return 'http_call';
  }
  
  // Default to webhook if has webhook_url
  if (button.webhook_url) {
    return 'webhook';
  }
  
  // Fallback to webhook
  return 'webhook';
}

/**
 * Create a flow step from button configuration
 */
function createStepFromButton(button: ButtonConfig, stepType: FlowStepType, stepId: string): FlowStep | null {
  const baseName = button.label || 'Ação';
  
  switch (stepType) {
    case 'tabular':
      return {
        id: stepId,
        type: 'tabular',
        nome: baseName,
        descricao: button.description,
        config: {
          buttonId: button.id,
          webhook_url: button.webhook_url || '',
          field: button.field || '',
          value: button.value || '',
          field_type: button.field_type,
          additional_fields: button.additional_fields
        }
      };
    
    case 'http_call':
      return {
        id: stepId,
        type: 'http_call',
        nome: baseName,
        descricao: button.description,
        config: {
          url: button.webhook_url || '',
          method: 'POST',
          body: {
            field: button.field,
            value: button.value,
            ...convertAdditionalFields(button.additional_fields)
          }
        }
      };
    
    case 'email':
      return {
        id: stepId,
        type: 'email',
        nome: baseName,
        descricao: button.description,
        config: {
          to: '',
          subject: button.label || 'Notificação',
          body: button.description || ''
        }
      };
    
    case 'change_status':
      return {
        id: stepId,
        type: 'change_status',
        nome: baseName,
        descricao: button.description,
        config: {
          statusId: button.value || '',
          webhook_url: button.webhook_url
        }
      };
    
    case 'webhook':
      return {
        id: stepId,
        type: 'webhook',
        nome: baseName,
        descricao: button.description,
        config: {
          url: button.webhook_url || '',
          method: 'POST',
          body: {
            field: button.field,
            value: button.value,
            ...convertAdditionalFields(button.additional_fields)
          }
        }
      };
    
    case 'wait':
      return {
        id: stepId,
        type: 'wait',
        nome: baseName,
        descricao: button.description,
        config: {
          seconds: 5
        }
      };
    
    default:
      return null;
  }
}

/**
 * Create a flow step from sub-button configuration
 */
function createStepFromSubButton(subButton: any, stepNumber: number): FlowStep | null {
  const stepId = `step-${stepNumber}`;
  
  // Determine if it's a status change or webhook
  const isStatusChange = subButton.subField?.toUpperCase() === 'STATUS_ID';
  
  if (isStatusChange) {
    return {
      id: stepId,
      type: 'change_status',
      nome: subButton.subLabel || `Sub-ação ${stepNumber - 1}`,
      descricao: subButton.subDescription,
      config: {
        statusId: subButton.subValue || '',
        webhook_url: subButton.subWebhook
      }
    };
  }
  
  return {
    id: stepId,
    type: 'webhook',
    nome: subButton.subLabel || `Sub-ação ${stepNumber - 1}`,
    descricao: subButton.subDescription,
    config: {
      url: subButton.subWebhook || '',
      method: 'POST',
      body: {
        field: subButton.subField,
        value: subButton.subValue,
        ...convertAdditionalFields(subButton.subAdditionalFields)
      }
    }
  };
}

/**
 * Convert additional fields array to object
 */
function convertAdditionalFields(fields?: Array<{ field: string; value: string }>): Record<string, string> {
  if (!fields || fields.length === 0) {
    return {};
  }
  
  return fields.reduce((acc, { field, value }) => {
    acc[field] = value;
    return acc;
  }, {} as Record<string, string>);
}
