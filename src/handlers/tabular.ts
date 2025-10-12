// ============================================
// Tabular Handler - Reusable Button Execution Logic
// ============================================

import { supabase } from "@/integrations/supabase/client";

export interface TabularConfig {
  buttonId?: string;
  webhook_url: string;
  field: string;
  value: string;
  field_type?: string;
  sync_target?: 'bitrix' | 'supabase';
  additional_fields?: Array<{ field: string; value: string }>;
}

export interface TabularContext {
  leadId: number;
  chatwootData?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  bitrixFields?: unknown[];
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface TabularResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Helper function to replace placeholders in values
 */
const replacePlaceholders = (
  inputValue: string,
  context: TabularContext,
  value: string
): string => {
  if (typeof inputValue !== 'string') return inputValue;

  const { leadId, chatwootData, profile, scheduledDate, scheduledTime } = context;
  
  const chatwootRec = chatwootData as Record<string, any> | undefined;
  const profileRec = profile as Record<string, any> | undefined;

  return inputValue
    .replace(/\{\{valor_botao\}\}/g, value)
    .replace(/\{\{data\}\}/g, scheduledDate || new Date().toISOString().split('T')[0])
    .replace(/\{\{horario\}\}/g, scheduledTime || '')
    .replace(/\{\{nome_lead\}\}/g, String(chatwootRec?.name || ''))
    .replace(/\{\{id_lead\}\}/g, String(leadId))
    .replace(/\{\{telefone\}\}/g, String(profileRec?.phone_number || chatwootRec?.phone_number || ''))
    .replace(/\{\{email\}\}/g, String(profileRec?.email || chatwootRec?.email || ''))
    .replace(/\{\{responsavel\}\}/g, String(profileRec?.responsible || ''))
    .replace(/\{\{endereco\}\}/g, String(profileRec?.address || ''))
    .replace(/\{\{idade\}\}/g, profileRec?.age ? String(profileRec.age) : '')
    .replace(/\{\{scouter\}\}/g, String(profileRec?.scouter || ''));
};

/**
 * Helper function to convert enumeration labels to IDs for Bitrix
 */
const convertEnumerationValue = (
  fieldName: string,
  value: string,
  bitrixFields: unknown[]
): string => {
  if (!bitrixFields || bitrixFields.length === 0) {
    return value;
  }

  const fieldDef = (bitrixFields as Record<string, unknown>[]).find((f: Record<string, unknown>) =>
    f.ID === fieldName ||
    f.FIELD_NAME === fieldName ||
    f.name === fieldName
  ) as Record<string, unknown> | undefined;

  if (!fieldDef || fieldDef.type !== 'enumeration' || !fieldDef.items) {
    return value;
  }

  const items = fieldDef.items as Record<string, unknown>[];
  const item = items.find((i: Record<string, unknown>) =>
    i.VALUE === value ||
    i.ID === value
  );

  if (item && item.ID) {
    console.log(`🔄 Convertendo "${value}" → ID "${item.ID}" (campo: ${fieldName})`);
    return String(item.ID);
  }

  return value;
};

/**
 * Execute a tabular action (button click simulation)
 * This function encapsulates the logic of updating Bitrix and/or Supabase
 */
export async function runTabular(
  config: TabularConfig,
  context: TabularContext
): Promise<TabularResult> {
  try {
    const { webhook_url, field, value, sync_target = 'bitrix', additional_fields = [] } = config;
    const { leadId, chatwootData, bitrixFields = [] } = context;

    console.log('🎯 runTabular called:', { config, leadId });

    // Process additional fields with placeholder replacement
    const additionalFieldsProcessed: Record<string, unknown> = {};
    if (additional_fields && Array.isArray(additional_fields)) {
      additional_fields.forEach(({ field: addField, value: addValue }) => {
        const processedValue = replacePlaceholders(addValue, context, value);
        if (processedValue !== '' && addField) {
          additionalFieldsProcessed[addField] = processedValue;
        }
      });
    }

    // Determine synchronization flow based on sync_target
    if (sync_target === 'supabase') {
      // Supabase → Bitrix flow
      // Update Supabase first
      if (chatwootData) {
        const chatwootRec = chatwootData as Record<string, any>;
        const updatedAttributes = {
          ...(chatwootRec.custom_attributes || {}),
          [field]: value,
        };

        // Update chatwoot_contacts (implementation depends on your saveChatwootContact function)
        // await saveChatwootContact({ ...chatwootData, custom_attributes: updatedAttributes });
      }

      // Update leads table
      await supabase
        .from('leads')
        .upsert({ id: leadId, [field]: value }, { onConflict: 'id' });

      // Call edge function to sync with Bitrix
      if (webhook_url) {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-to-bitrix', {
          body: {
            lead: {
              id: leadId,
              [field]: value,
            },
            webhook: webhook_url,
            source: 'supabase'
          }
        });

        if (syncError) {
          console.error('Erro ao sincronizar com Bitrix:', syncError);
          return {
            success: false,
            message: `Erro ao sincronizar com Bitrix: ${syncError.message || String(syncError)}`,
            error: syncError.message
          };
        }

        return {
          success: true,
          message: `Dados sincronizados via Supabase → Bitrix. Lead ${leadId}.`,
          data: syncData
        };
      } else {
        return {
          success: true,
          message: `Dados salvos localmente no Supabase. Lead ${leadId}.`
        };
      }
    } else {
      // Bitrix as source of truth flow
      if (webhook_url) {
        // Convert enumeration values for additional fields
        const processedAdditionalFields = Object.fromEntries(
          Object.entries(additionalFieldsProcessed).map(([key, val]) => [
            key,
            typeof val === 'string' ? convertEnumerationValue(key, val, bitrixFields) : val
          ])
        );

        // Combine main field with processed additional fields
        const mainValue = typeof value === 'string' ? convertEnumerationValue(field, value, bitrixFields) : value;
        const allFields = {
          [field]: mainValue,
          ...processedAdditionalFields
        };

        console.log('🔍 Campos a enviar ao Bitrix:', allFields);

        // Build URL with query parameters in Bitrix format
        const params = new URLSearchParams();
        params.append('ID', String(leadId));

        Object.entries(allFields).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            val.forEach((item) => {
              params.append(`FIELDS[${key}][]`, String(item));
            });
          } else if (typeof val === 'object' && val !== null) {
            Object.entries(val).forEach(([subKey, subVal]) => {
              params.append(`FIELDS[${key}][${subKey}]`, String(subVal));
            });
          } else {
            params.append(`FIELDS[${key}]`, String(val));
          }
        });

        const fullUrl = `${webhook_url}?${params.toString()}`;
        console.log('🔗 URL do Bitrix:', fullUrl);

        // Make GET request (Bitrix expected format)
        const response = await fetch(fullUrl, {
          method: 'GET'
        });

        const responseData = await response.json();
        console.log('📥 Resposta do Bitrix:', responseData);

        if (responseData.error) {
          console.error('❌ Erro do Bitrix:', responseData.error_description || responseData.error);
          return {
            success: false,
            message: `Erro do Bitrix: ${responseData.error_description || responseData.error}`,
            error: responseData.error_description || responseData.error
          };
        }

        if (!response.ok) {
          console.error('❌ Erro HTTP do Bitrix:', responseData);
          return {
            success: false,
            message: `Erro ao atualizar Bitrix: ${JSON.stringify(responseData)}`,
            error: JSON.stringify(responseData)
          };
        }

        console.log('✅ Bitrix atualizado com sucesso!');

      // Update Supabase after Bitrix success
        if (chatwootData) {
          const chatwootRec = chatwootData as Record<string, any>;
          const updatedAttributes = {
            ...(chatwootRec.custom_attributes || {}),
            [field]: value,
          };
          // await saveChatwootContact({ ...chatwootData, custom_attributes: updatedAttributes });
        }

        // Update leads table
        await supabase
          .from('leads')
          .upsert({ id: leadId, [field]: value }, { onConflict: 'id' });

        return {
          success: true,
          message: `Lead ${leadId} atualizado no Bitrix.${responseData.result?.ID ? ` ID: ${responseData.result.ID}` : ''}`,
          data: responseData
        };
      }

      // No webhook, just local update
      await supabase
        .from('leads')
        .upsert({ id: leadId, [field]: value }, { onConflict: 'id' });

      return {
        success: true,
        message: `Lead ${leadId} atualizado localmente.`
      };
    }
  } catch (error) {
    console.error('❌ Erro em runTabular:', error);
    return {
      success: false,
      message: `Erro ao executar ação: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
