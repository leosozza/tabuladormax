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
  currentAgent?: {
    email?: string;
    userId?: string;
  };
  // ID do telemarketing para substituição do placeholder {{telemarketing}}
  telemarketing?: number;
}

export interface TabularResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Helper function to replace placeholders in values
 * @param inputValue - The string containing placeholders to be replaced
 * @param context - The context object containing data for replacement
 * @param value - The button value
 * @param telemarketingId - The telemarketing ID to replace {{telemarketing}} placeholder
 */
const replacePlaceholders = (
  inputValue: string,
  context: TabularContext,
  value: string,
  telemarketingId?: number
): string => {
  if (typeof inputValue !== 'string') return inputValue;

  const { leadId, chatwootData, profile, scheduledDate, scheduledTime } = context;
  
  const chatwootRec = chatwootData as Record<string, unknown> | undefined;
  const profileRec = profile as Record<string, unknown> | undefined;

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
    .replace(/\{\{scouter\}\}/g, String(profileRec?.scouter || ''))
    // Substituir {{telemarketing}} pelo ID numérico do telemarketing
    .replace(/\{\{telemarketing\}\}/g, telemarketingId !== undefined ? String(telemarketingId) : '');
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
 * Helper function to get Bitrix telemarketing ID from agent mapping
 * Exportada para uso em outros módulos
 */
export const getTelemarketingId = async (
  currentAgent?: { email?: string; userId?: string }
): Promise<number> => {
  if (!currentAgent) {
    return 32; // Default: "Sem telemarketing"
  }

  try {
    // Importar supabase apenas quando necessário
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Tentar buscar mapeamento por email ou userId
    let query = supabase
      .from('agent_telemarketing_mapping')
      .select('bitrix_telemarketing_id');
    
    if (currentAgent.email) {
      query = query.eq('chatwoot_agent_email', currentAgent.email);
    } else if (currentAgent.userId) {
      query = query.eq('tabuladormax_user_id', currentAgent.userId);
    } else {
      return 32;
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('❌ Erro ao buscar mapeamento de telemarketing:', error);
      return 32;
    }

    if (data?.bitrix_telemarketing_id) {
      console.log(`✅ Telemarketing ID encontrado: ${data.bitrix_telemarketing_id} para agente ${currentAgent.email || currentAgent.userId}`);
      return data.bitrix_telemarketing_id;
    }

    // Se não encontrou no agent_mapping, tentar buscar no user_metadata
    if (currentAgent.userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === currentAgent.userId && user.user_metadata?.telemarketing_id != null) {
        console.log(`✅ Telemarketing ID encontrado no user_metadata: ${user.user_metadata.telemarketing_id} para usuário ${currentAgent.userId}`);
        return user.user_metadata.telemarketing_id;
      }
    }

    console.log(`⚠️ Nenhum mapeamento encontrado para agente ${currentAgent.email || currentAgent.userId}, usando default ID 32`);
    return 32;
  } catch (error) {
    console.error('❌ Erro ao buscar telemarketing:', error);
    return 32;
  }
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
    const { leadId, chatwootData, bitrixFields = [], currentAgent } = context;

    console.log('🎯 runTabular called:', { config, leadId, currentAgent });

    // Buscar ID do telemarketing do agente
    const telemarketingId = await getTelemarketingId(currentAgent);
    console.log(`📋 Telemarketing ID para este agente: ${telemarketingId}`);
    
    // Adicionar telemarketing ID ao contexto para uso em placeholders
    context.telemarketing = telemarketingId;

    // Process additional fields with placeholder replacement
    // Incluindo substituição do placeholder {{telemarketing}} pelo ID numérico
    const additionalFieldsProcessed: Record<string, unknown> = {};
    if (additional_fields && Array.isArray(additional_fields)) {
      additional_fields.forEach(({ field: addField, value: addValue }) => {
        const processedValue = replacePlaceholders(addValue, context, value, telemarketingId);
        if (processedValue !== '' && addField) {
          additionalFieldsProcessed[addField] = processedValue;
          // Log detalhado do campo processado
          console.log(`📝 Campo adicional processado: ${addField} = ${processedValue}${addValue.includes('{{telemarketing}}') ? ' (substituído de {{telemarketing}})' : ''}`);
        }
      });
    }

    // Adicionar campos de telemarketing automaticamente (PARENT_ID_1144 e UF_CRM_1748961149)
    additionalFieldsProcessed['PARENT_ID_1144'] = telemarketingId;
    additionalFieldsProcessed['UF_CRM_1748961149'] = telemarketingId;
    console.log(`✅ Campos de telemarketing adicionados: PARENT_ID_1144 = ${telemarketingId}, UF_CRM_1748961149 = ${telemarketingId}`);

    // Determine synchronization flow based on sync_target
    if (sync_target === 'supabase') {
      // Supabase → Bitrix flow
      // Update Supabase first
      if (chatwootData) {
        const chatwootRec = chatwootData as Record<string, unknown>;
        const customAttrs = (chatwootRec.custom_attributes as Record<string, unknown>) || {};
        const updatedAttributes = {
          ...customAttrs,
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

        // Log detalhado de todos os campos a serem enviados ao Bitrix
        console.log('🔍 Campos a enviar ao Bitrix:', allFields);
        console.log('📊 Detalhes dos campos:');
        Object.entries(allFields).forEach(([key, val]) => {
          console.log(`  - ${key}: ${val} (tipo: ${typeof val})`);
        });

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
          const chatwootRec = chatwootData as Record<string, unknown>;
          const customAttrs = (chatwootRec.custom_attributes as Record<string, unknown>) || {};
          const updatedAttributes = {
            ...customAttrs,
            [field]: value,
          };
          // await saveChatwootContact({ ...chatwootData, custom_attributes: updatedAttributes });
        }

        // Update leads table
      await supabase
        .from('leads')
        .upsert({ 
          id: leadId, 
          [field]: value,
          sync_source: 'supabase',
          sync_status: 'synced'
        }, { onConflict: 'id' });

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
