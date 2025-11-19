import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS headers - allow specific origin when credentials are used
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead, webhook, source } = await req.json();
    
    console.log('sync-to-bitrix: Recebendo requisição', { lead, webhook, source });

    // Evitar loop de sincronização
    if (source === 'bitrix') {
      console.log('sync-to-bitrix: Ignorando - origem é bitrix');
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored - source is bitrix' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar URL do webhook da configuração
    const { data: config } = await supabase
      .from('bitrix_sync_config')
      .select('webhook_url, active')
      .eq('active', true)
      .maybeSingle();

    if (!config) {
      console.log('⚠️ Sincronização desabilitada - nenhuma config ativa');
      return new Response(
        JSON.stringify({ success: true, message: 'Sync disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = webhook || config.webhook_url;

    // Preparar payload DINÂMICO baseado no campo raw
    const bitrixPayload: any = {
      id: lead.id,
      fields: lead.raw || {}
    };

    // Array para rastrear mapeamentos aplicados
    const appliedMappings: any[] = [];

    // Buscar mapeamentos ativos configurados
    const { data: fieldMappings, error: mappingError } = await supabase
      .from('unified_field_config')
      .select('*')
      .eq('sync_active', true)
      .order('supabase_field', { ascending: true })
      .order('sync_priority', { ascending: true });

    if (mappingError) {
      console.error('❌ Erro ao buscar mapeamentos:', mappingError);
    }

    console.log(`📋 ${fieldMappings?.length || 0} mapeamentos ativos encontrados`);

    // Aplicar mapeamentos dinâmicos
    if (fieldMappings && fieldMappings.length > 0) {
      for (const mapping of fieldMappings) {
        const value = lead[mapping.supabase_field];
        
        if (value !== null && value !== undefined && value !== '') {
          // Aplicar transformação reversa se necessário
          let transformedValue = value;
          
          if (mapping.transform_function) {
            try {
              if (mapping.transform_function === 'toNumber') {
                transformedValue = Number(value);
              } else if (mapping.transform_function === 'toString') {
                transformedValue = String(value);
              } else if (mapping.transform_function === 'toBoolean') {
                transformedValue = value ? 'Y' : 'N';
              }
            } catch (e) {
              console.warn(`⚠️ Erro ao transformar ${mapping.supabase_field}:`, e);
              transformedValue = value;
            }
          }
          
          bitrixPayload.fields[mapping.bitrix_field] = transformedValue;
          appliedMappings.push({
            supabase_field: mapping.supabase_field,
            bitrix_field: mapping.bitrix_field,
            value: transformedValue,
            transformed: !!mapping.transform_function,
            transform_function: mapping.transform_function,
            priority: mapping.priority
          });
        }
      }
    } else {
      // Fallback para mapeamentos hardcoded (backward compatibility)
      if (lead.name) {
        bitrixPayload.fields.NAME = lead.name;
        appliedMappings.push({
          supabase_field: 'name',
          bitrix_field: 'NAME',
          value: lead.name,
          transformed: false
        });
      }
      if (lead.age) {
        bitrixPayload.fields.UF_IDADE = lead.age;
        appliedMappings.push({
          supabase_field: 'age',
          bitrix_field: 'UF_IDADE',
          value: lead.age,
          transformed: false
        });
      }
      if (lead.address) {
        bitrixPayload.fields.UF_LOCAL = lead.address;
        appliedMappings.push({
          supabase_field: 'address',
          bitrix_field: 'UF_LOCAL',
          value: lead.address,
          transformed: false
        });
      }
      if (lead.photo_url) {
        bitrixPayload.fields.UF_PHOTO = lead.photo_url;
        appliedMappings.push({
          supabase_field: 'photo_url',
          bitrix_field: 'UF_PHOTO',
          value: lead.photo_url,
          transformed: false
        });
      }
      if (lead.responsible) {
        bitrixPayload.fields.UF_RESPONSAVEL = lead.responsible;
        appliedMappings.push({
          supabase_field: 'responsible',
          bitrix_field: 'UF_RESPONSAVEL',
          value: lead.responsible,
          transformed: false
        });
      }
      if (lead.scouter) {
        bitrixPayload.fields.UF_SCOUTER = lead.scouter;
        appliedMappings.push({
          supabase_field: 'scouter',
          bitrix_field: 'UF_SCOUTER',
          value: lead.scouter,
          transformed: false
        });
      }
      if (lead.bitrix_telemarketing_id) {
        bitrixPayload.fields.PARENT_ID_1144 = lead.bitrix_telemarketing_id;
        appliedMappings.push({
          supabase_field: 'bitrix_telemarketing_id',
          bitrix_field: 'PARENT_ID_1144',
          value: lead.bitrix_telemarketing_id,
          transformed: false
        });
      }
    }

    console.log('🔄 Sincronizando com Bitrix:', {
      leadId: lead.id,
      fieldsCount: Object.keys(bitrixPayload.fields).length,
      mappedFieldsCount: appliedMappings.length,
      webhook: webhookUrl
    });

    // Enviar para o Bitrix
    const bitrixResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bitrixPayload)
    });

    if (!bitrixResponse.ok) {
      const errorText = await bitrixResponse.text();
      console.error('sync-to-bitrix: Erro ao atualizar Bitrix', errorText);
      throw new Error(`Erro ao atualizar Bitrix: ${errorText}`);
    }

    const bitrixResult = await bitrixResponse.json();
    console.log('sync-to-bitrix: Bitrix atualizado com sucesso', bitrixResult);

    // Atualizar status de sincronização no Supabase
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
        sync_source: 'supabase'
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('sync-to-bitrix: Erro ao atualizar status no Supabase', updateError);
    }

    // Registrar evento de sincronização com mapeamentos
    await supabase.from('sync_events').insert({
      event_type: 'update',
      direction: 'supabase_to_bitrix',
      lead_id: lead.id,
      status: 'success',
      sync_duration_ms: Date.now() - startTime,
      field_mappings: {
        supabase_to_bitrix: appliedMappings
      },
      fields_synced_count: appliedMappings.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead sincronizado com Bitrix com sucesso',
        leadId: lead.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('sync-to-bitrix: Erro', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Registrar erro de sincronização
    try {
      const { lead } = await req.clone().json().catch(() => ({ lead: null }));
      if (lead?.id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from('sync_events').insert({
          event_type: 'update',
          direction: 'supabase_to_bitrix',
          lead_id: lead.id,
          status: 'error',
          error_message: errorMessage
        });
      }
    } catch (logError) {
      console.error('Erro ao registrar evento de erro:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
