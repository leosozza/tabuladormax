// ============================================
// Tabular Step Runner
// ============================================
// Executes tabular (button action) steps

import { BaseStepRunner, type StepExecutionContext, type StepExecutionResult } from './BaseStepRunner';

export interface TabularStepConfig {
  buttonId?: string;
  webhook_url: string;
  field: string;
  value: string;
  field_type?: string;
  additional_fields?: Array<{ field: string; value: string }>;
}

export class TabularStepRunner extends BaseStepRunner<TabularStepConfig> {
  readonly type = 'tabular';
  readonly displayName = 'Tabular Action';
  
  validate(config: TabularStepConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!config.webhook_url) {
      errors.push('webhook_url is required');
    }
    
    if (!config.field) {
      errors.push('field is required');
    }
    
    if (!config.value) {
      errors.push('value is required');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  async execute(
    config: TabularStepConfig,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const logs: string[] = [];
    const startTime = Date.now();
    
    try {
      logs.push(`Executing tabular action for field: ${config.field}`);
      
      // Replace placeholders in config
      const processedConfig = this.replacePlaceholdersInObject(config, context) as TabularStepConfig;
      
      // Build request body
      const body: any = {
        id: context.leadId,
        fields: {
          [processedConfig.field]: processedConfig.value
        }
      };
      
      // Add additional fields if any
      if (processedConfig.additional_fields && processedConfig.additional_fields.length > 0) {
        processedConfig.additional_fields.forEach((field) => {
          body.fields[field.field] = field.value;
        });
        logs.push(`Added ${processedConfig.additional_fields.length} additional field(s)`);
      }
      
      logs.push(`Sending request to: ${processedConfig.webhook_url}`);
      
      // Make the API call
      const response = await fetch(processedConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        logs.push(`Error: HTTP ${response.status} - ${errorText}`);
        return {
          ...this.createErrorResult(`HTTP ${response.status}: ${errorText}`, logs),
          duration
        };
      }
      
      const result = await response.json();
      logs.push(`Successfully updated field ${config.field} to ${config.value}`);
      
      return {
        ...this.createSuccessResult(result, logs),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Exception: ${errorMessage}`);
      
      return {
        ...this.createErrorResult(errorMessage, logs),
        duration
      };
    }
  }
  
  estimateTime(config: TabularStepConfig): number {
    // Estimate 2 seconds for tabular action
    return 2000;
  }
  
  describe(config: TabularStepConfig): string {
    return `Update field "${config.field}" to "${config.value}"`;
  }
}
