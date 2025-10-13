// ============================================
// Flows v2 - Tabular Step Runner
// ============================================
// Step runner for executing tabular actions (Bitrix field updates)

import {
  BaseStepRunner,
  StepExecutionContext,
  StepExecutionResult,
  StepLogEntry,
  createSuccessResult,
  createFailureResult,
} from '../step-runner';
import { TabularStepConfig } from '../schemas';

/**
 * Step runner for tabular actions
 */
export class TabularStepRunner extends BaseStepRunner<TabularStepConfig> {
  readonly stepType = 'tabular';

  /**
   * Validates tabular step configuration
   */
  validateConfig(config: TabularStepConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.webhook_url) {
      errors.push('webhook_url is required');
    } else {
      try {
        new URL(config.webhook_url);
      } catch {
        errors.push('webhook_url must be a valid URL');
      }
    }

    if (!config.field) {
      errors.push('field is required');
    }

    if (config.value === undefined || config.value === null) {
      errors.push('value is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Executes tabular step
   */
  protected async executeStep(
    config: TabularStepConfig,
    context: StepExecutionContext,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult> {
    const stepId = 'tabular-step';
    const stepName = 'Tabular Action';

    this.log(stepId, stepName, 'info', 'Starting tabular action', { config }, onLog);

    try {
      // Replace placeholders in webhook URL
      const webhookUrl = this.replacePlaceholders(
        config.webhook_url,
        context.leadId,
        context.variables
      );

      this.log(stepId, stepName, 'debug', 'Resolved webhook URL', { webhookUrl }, onLog);

      // Prepare request body
      const body: Record<string, unknown> = {
        id: context.leadId,
        fields: {
          [config.field]: this.replacePlaceholders(config.value, context.leadId, context.variables),
        },
      };

      // Add additional fields if present
      if (config.additional_fields && config.additional_fields.length > 0) {
        config.additional_fields.forEach((additionalField) => {
          body.fields[additionalField.field] = this.replacePlaceholders(
            additionalField.value,
            context.leadId,
            context.variables
          );
        });
      }

      this.log(stepId, stepName, 'info', 'Sending request to webhook', { body }, onLog);

      // Make HTTP request
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log(
          stepId,
          stepName,
          'error',
          'Webhook request failed',
          { status: response.status, error: errorText },
          onLog
        );
        return createFailureResult(
          `Webhook request failed: ${response.status} - ${errorText}`,
          { status: response.status }
        );
      }

      const result = await response.json();
      this.log(stepId, stepName, 'success', 'Tabular action completed', { result }, onLog);

      return createSuccessResult(result, {
        field: config.field,
        value: config.value,
        webhook_url: webhookUrl,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(stepId, stepName, 'error', 'Tabular action failed', { error: errorMessage }, onLog);
      return createFailureResult(errorMessage);
    }
  }

  /**
   * Replace placeholders in values
   */
  private replacePlaceholders(
    value: unknown,
    leadId: number | undefined,
    variables: Record<string, unknown>
  ): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    let result = value;

    // Replace {{leadId}} placeholder
    if (leadId !== undefined) {
      result = result.replace(/\{\{leadId\}\}/g, String(leadId));
    }

    // Replace {{variable.name}} placeholders
    Object.keys(variables).forEach((key) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, String(variables[key]));
    });

    return result;
  }
}
