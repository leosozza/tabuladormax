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
    const bitrixUrl = `https://${bitrixDomain}/rest/crm.lead.get?ID=${leadId}`;
    
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

    // 3. PREPARAR DADOS PARA UPSERT
    const leadData = {
      id: Number(leadId),
      name: lead.NAME || lead.TITLE || null,
      age: lead.UF_IDADE ? Number(lead.UF_IDADE) : null,
      address: lead.UF_LOCAL || lead.ADDRESS || null,
      photo_url: lead.UF_PHOTO || lead.PHOTO || null,
      responsible: responsibleName || lead.UF_RESPONSAVEL || lead.ASSIGNED_BY_NAME || null,
      scouter: lead.UF_SCOUTER || null,
      raw: lead,
      sync_source: 'bitrix',
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      updated_at: lead.DATE_MODIFY || new Date().toISOString(),
      commercial_project_id: commercialProjectId,
      responsible_user_id: responsibleUserId,
      bitrix_telemarketing_id: bitrixTelemarketingId
    };


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
