import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Entity type IDs do Bitrix
const ENTITY_TYPES = {
  SCOUTER: 1096,
  COMMERCIAL_PROJECT: 1120,
  TELEMARKETING: 1144,
  PRODUCER: 1156,
};

/**
 * Converte chaves com bracket notation para objetos aninhados
 * Exemplo: "data[FIELDS][ID]": "123" => { data: { FIELDS: { ID: "123" } } }
 */
function parseBracketNotation(rawPayload: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(rawPayload)) {
    // Exemplo: "data[FIELDS][ID]" => ["data", "FIELDS", "ID"]
    const parts = key.split(/[\[\]]/).filter(Boolean);
    
    if (parts.length === 1) {
      result[key] = value;
      continue;
    }
    
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Webhook de SPA recebido do Bitrix');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse do payload do Bitrix
    const contentType = req.headers.get('content-type') || '';
    let payload: any = {};

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      const rawPayload: Record<string, any> = {};
      formData.forEach((value, key) => {
        rawPayload[key] = value;
      });
      payload = parseBracketNotation(rawPayload);
    } else {
      // Tentar JSON por padrão
      try {
        const text = await req.text();
        payload = JSON.parse(text);
      } catch {
        console.log('⚠️ Payload não é JSON válido, tentando form-urlencoded');
        const text = await req.text();
        const params = new URLSearchParams(text);
        const rawPayload: Record<string, any> = {};
        params.forEach((value, key) => {
          rawPayload[key] = value;
        });
        payload = parseBracketNotation(rawPayload);
      }
    }

    console.log('📦 Payload recebido:', JSON.stringify(payload, null, 2));

    // Extrair dados do webhook
    const event = payload.event || payload.EVENT;
    const data = payload.data || payload.DATA || payload;
    const fields = data?.FIELDS || data?.fields || data;

    console.log(`📌 Evento: ${event}`);
    console.log(`📌 Fields:`, JSON.stringify(fields, null, 2));

    // Identificar tipo de entidade
    const entityTypeId = parseInt(
      fields?.ENTITY_TYPE_ID || 
      fields?.entityTypeId || 
      payload.ENTITY_TYPE_ID || 
      '0'
    );

    const itemId = parseInt(
      fields?.ID || 
      fields?.id || 
      payload.ID || 
      '0'
    );

    console.log(`🔍 Entity Type ID: ${entityTypeId}, Item ID: ${itemId}`);

    // Verificar se é um tipo de entidade que nos interessa
    const supportedTypes = [
      ENTITY_TYPES.SCOUTER,
      ENTITY_TYPES.TELEMARKETING,
      ENTITY_TYPES.PRODUCER,
    ];

    if (!supportedTypes.includes(entityTypeId)) {
      console.log(`⏭️ Ignorando entityTypeId ${entityTypeId} - não suportado`);
      return new Response(
        JSON.stringify({ success: true, message: 'Entity type not supported' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar a ação com base no evento
    const isDelete = event?.toLowerCase().includes('delete');
    const isAdd = event?.toLowerCase().includes('add');
    const isUpdate = event?.toLowerCase().includes('update');

    console.log(`📋 Ação: ${isDelete ? 'DELETE' : isAdd ? 'ADD' : isUpdate ? 'UPDATE' : 'UNKNOWN'}`);

    if (isDelete && itemId > 0) {
      // Deletar da tabela bitrix_spa_entities
      const { error: deleteError } = await supabase
        .from('bitrix_spa_entities')
        .delete()
        .eq('entity_type_id', entityTypeId)
        .eq('bitrix_item_id', itemId);

      if (deleteError) {
        console.error('❌ Erro ao deletar:', deleteError);
      } else {
        console.log(`✅ Item ${itemId} deletado da cache`);
      }

      // Deletar de tabelas específicas
      if (entityTypeId === ENTITY_TYPES.SCOUTER) {
        await supabase.from('scouters').delete().eq('bitrix_id', itemId);
      } else if (entityTypeId === ENTITY_TYPES.PRODUCER) {
        await supabase.from('producers').delete().eq('bitrix_id', itemId);
      }
    } else if ((isAdd || isUpdate) && itemId > 0) {
      // Para add/update, precisamos buscar os dados atualizados do Bitrix
      console.log(`🔄 Sincronizando item ${itemId} (entityTypeId: ${entityTypeId})...`);

      // Chamar a função de sync com filtro específico
      const { data: syncData, error: syncError } = await supabase.functions.invoke(
        'sync-bitrix-spa-entities',
        { body: { entityTypeId, itemId } }
      );

      if (syncError) {
        console.error('❌ Erro ao sincronizar item:', syncError);
      } else {
        console.log('✅ Item sincronizado:', syncData);
      }
    }

    // Registrar evento de sync
    const { error: logError } = await supabase
      .from('actions_log')
      .insert({
        lead_id: itemId || 0,
        action_label: `spa_webhook_${event || 'unknown'}`,
        status: 'success',
        payload: { entityTypeId, itemId, event, timestamp: new Date().toISOString() },
      });

    if (logError) {
      console.warn('⚠️ Erro ao registrar log:', logError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processado com sucesso',
        entityTypeId,
        itemId,
        event,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro no webhook SPA:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
