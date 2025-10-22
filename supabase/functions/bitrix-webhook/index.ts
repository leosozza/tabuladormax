// FASE 5: Edge Function para receber webhooks do Bitrix24
// Recebe atualizações de leads do Bitrix e sincroniza no Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BitrixWebhookPayload {
  event: string;
  data: {
    FIELDS: {
      ID: string;
      [key: string]: any;
    };
  };
  ts: number;
  auth: {
    access_token: string;
    domain: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Detectar Content-Type e fazer parse adequado
    const contentType = req.headers.get('content-type') || '';
    console.log('📋 Content-Type recebido:', contentType);

    let payload: BitrixWebhookPayload;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data do Bitrix
      const text = await req.text();
      console.log('📄 Payload bruto (form data):', text.substring(0, 500) + '...');
      
      const params = new URLSearchParams(text);
      
      // Extrair event
      const event = params.get('event') || '';
      
      // Extrair ID do lead
      const leadId = params.get('data[FIELDS][ID]') || '';
      
      // Extrair domain
      const domain = params.get('auth[domain]') || 'maxsystem.bitrix24.com.br';
      
      // Construir payload no formato esperado
      payload = {
        event,
        data: {
          FIELDS: {
            ID: leadId
          }
        },
        ts: Date.now(),
        auth: {
          access_token: '',
          domain
        }
      } as BitrixWebhookPayload;
      
      console.log('✅ Form data convertido para JSON:', payload);
    } else {
      // Parse JSON tradicional
      payload = await req.json();
      console.log('📥 Webhook recebido (JSON):', payload);
    }

    console.log('📥 Processando evento:', payload.event, 'Lead ID:', payload.data?.FIELDS?.ID);

    const event = payload.event;
    const leadId = payload.data?.FIELDS?.ID;
    const startTime = Date.now();

    // Eventos suportados
    const supportedEvents = [
      'ONCRM_LEAD_ADD',
      'ONCRM_LEAD_UPDATE',
      'ONCRMLEADADD',
      'ONCRMLEADUPDATE',
      'ONCRM_LEAD_DELETE',
      'ONCRMLEADDELETE'
    ];

    if (!supportedEvents.includes(event)) {
      console.log('⚠️ Evento não suportado:', event);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!leadId) {
      console.error('❌ ID do lead não fornecido no webhook');
      return new Response(
        JSON.stringify({ error: 'Lead ID missing' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ✅ SUPORTE A DELETE
    if (event.includes('DELETE')) {
      console.log(`🗑️ Deletando lead ${leadId} do Supabase`);
      
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (deleteError) {
        console.error('❌ Erro ao deletar lead:', deleteError);
        throw deleteError;
      }

      console.log(`✅ Lead ${leadId} deletado com sucesso`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead deletado com sucesso',
          leadId: leadId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar lead completo do Bitrix via API
    const bitrixDomain = payload.auth?.domain || 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
    
    console.log('🔍 Buscando lead completo do Bitrix:', bitrixUrl);
    const bitrixResponse = await fetch(bitrixUrl);
    const bitrixData = await bitrixResponse.json();

    if (!bitrixData.result) {
      console.error('❌ Lead não encontrado no Bitrix:', leadId);
      return new Response(
        JSON.stringify({ error: 'Lead not found in Bitrix' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const lead = bitrixData.result;
    console.log('✅ Lead obtido do Bitrix:', lead);

    // 1. EXTRAIR PROJETO COMERCIAL
    const projectName = lead['Projetos Cormeciais'] || lead['Projetos Comerciais'];
    let commercialProjectId = null;

    if (projectName) {
      const { data: project } = await supabase
        .from('commercial_projects')
        .select('id')
        .ilike('name', `%${projectName}%`)
        .maybeSingle();
      
      commercialProjectId = project?.id;
    }

    // Se não encontrou projeto, usar Pinheiros como padrão
    if (!commercialProjectId) {
      const { data: defaultProject } = await supabase
        .from('commercial_projects')
        .select('id')
        .eq('code', 'PINHEIROS')
        .maybeSingle();
      
      commercialProjectId = defaultProject?.id;
    }

    // 2. EXTRAIR OPERADOR DE TELEMARKETING
    const bitrixTelemarketingId = lead.PARENT_ID_1144 ? Number(lead.PARENT_ID_1144) : null;
    let responsibleUserId = null;
    let responsibleName = null;

    if (bitrixTelemarketingId) {
      const { data: mapping } = await supabase
        .from('agent_telemarketing_mapping')
        .select('tabuladormax_user_id, bitrix_telemarketing_name')
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
        .maybeSingle();
      
      if (mapping) {
        responsibleUserId = mapping.tabuladormax_user_id;
        responsibleName = mapping.bitrix_telemarketing_name;
      }
    }

    console.log('📝 Dados extraídos:', {
      leadId,
      projectName,
      commercialProjectId,
      bitrixTelemarketingId,
      responsibleUserId,
      responsibleName
    });

    // 3. BUSCAR MAPEAMENTOS CONFIGURADOS
    const { data: fieldMappings, error: mappingError } = await supabase
      .from('bitrix_field_mappings')
      .select('*')
      .order('tabuladormax_field', { ascending: true })
      .order('priority', { ascending: true });

    if (mappingError) {
      console.error('❌ Erro ao buscar mapeamentos:', mappingError);
      throw mappingError;
    }

    console.log(`📋 ${fieldMappings?.length || 0} mapeamentos encontrados`);

    // 4. APLICAR MAPEAMENTOS DINÂMICOS
    const leadData: any = {
      id: Number(leadId),
      raw: lead,
      sync_source: 'bitrix',
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      updated_at: lead.DATE_MODIFY || new Date().toISOString(),
      commercial_project_id: commercialProjectId,
      responsible_user_id: responsibleUserId,
      bitrix_telemarketing_id: bitrixTelemarketingId
    };

    // Agrupar mapeamentos por campo de destino
    const mappingsByField = (fieldMappings || []).reduce((acc, mapping) => {
      if (!acc[mapping.tabuladormax_field]) {
        acc[mapping.tabuladormax_field] = [];
      }
      acc[mapping.tabuladormax_field].push(mapping);
      return acc;
    }, {} as Record<string, any[]>);

    // Para cada campo do TabuladorMax, aplicar a primeira fonte não-vazia
    for (const [tabuladorField, mappings] of Object.entries(mappingsByField)) {
      for (const mapping of (mappings as any[])) {
        let value = lead[mapping.bitrix_field];
        
        // Aplicar transformação se definida
        if (value !== null && value !== undefined && value !== '' && mapping.transform_function) {
          try {
            if (mapping.transform_function === 'toNumber') {
              value = Number(value);
            } else if (mapping.transform_function === 'toString') {
              value = String(value);
            } else if (mapping.transform_function === 'toBoolean') {
              value = value === '1' || value === 'Y' || value === true;
            } else if (mapping.transform_function === 'toDate') {
              value = value; // Manter como está, Postgres converterá
            } else if (mapping.transform_function === 'toTimestamp') {
              value = value; // Manter como está, Postgres converterá
            }
          } catch (e) {
            console.warn(`⚠️ Erro ao transformar ${mapping.bitrix_field}:`, e);
          }
        }
        
        // Se encontrou valor, usar e parar (fallback automático)
        if (value !== null && value !== undefined && value !== '') {
          leadData[tabuladorField] = value;
          console.log(`✅ ${tabuladorField} = ${mapping.bitrix_field} (prioridade ${mapping.priority})`);
          break; // Usar apenas o primeiro não-vazio
        }
      }
    }

    // Garantir que 'responsible' seja preenchido se possível (fallback final)
    if (!leadData.responsible && responsibleName) {
      leadData.responsible = responsibleName;
    }

    console.log('📝 Lead mapeado:', leadData);


    // Upsert no Supabase
    const { data: upsertedLead, error: upsertError } = await supabase
      .from('leads')
      .upsert(leadData, { onConflict: 'id' })
      .select()
      .single();

    if (upsertError) {
      console.error('❌ Erro ao fazer upsert no Supabase:', upsertError);
      throw upsertError;
    }

    console.log('✅ Lead sincronizado no Supabase:', upsertedLead);

    // Registrar evento de sincronização
    await supabase.from('sync_events').insert({
      event_type: event.includes('ADD') ? 'create' : event.includes('UPDATE') ? 'update' : 'delete',
      direction: 'bitrix_to_supabase',
      lead_id: parseInt(leadId),
      status: 'success',
      sync_duration_ms: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead sincronizado com sucesso',
        leadId: leadId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
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
