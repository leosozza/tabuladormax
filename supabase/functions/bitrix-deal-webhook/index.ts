// Edge Function para receber webhooks do Bitrix24 para DEALS
// Recebe atualizações de deals do Bitrix e sincroniza no Supabase
// Também cria negociações automáticas quando um novo deal é criado
// Suporta múltiplas pipelines com mapeamento dinâmico de stages

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback mapping - used when pipeline config not found
const DEFAULT_STAGE_TO_STATUS: Record<string, string> = {
  'C1:NEW': 'recepcao_cadastro',
  'C1:UC_O2KDK6': 'ficha_preenchida',
  'C1:EXECUTING': 'atendimento_produtor',
  'C1:WON': 'negocios_fechados',
  'C1:LOSE': 'contrato_nao_fechado',
  'C1:UC_MKIQ0S': 'analisar',
  'NEW': 'recepcao_cadastro',
  'PREPARATION': 'ficha_preenchida',
  'EXECUTING': 'atendimento_produtor',
  'WON': 'negocios_fechados',
  'LOSE': 'contrato_nao_fechado',
};

// Get stage mapping from pipeline config
async function getStageToStatusMapping(supabase: any, categoryId: string | null): Promise<Record<string, string>> {
  if (!categoryId) {
    return DEFAULT_STAGE_TO_STATUS;
  }

  const { data: config } = await supabase
    .from('pipeline_configs')
    .select('stage_mapping')
    .eq('id', categoryId)
    .maybeSingle();

  if (config?.stage_mapping?.stages) {
    // Merge with defaults for fallback
    return { ...DEFAULT_STAGE_TO_STATUS, ...config.stage_mapping.stages };
  }

  return DEFAULT_STAGE_TO_STATUS;
}

interface BitrixDealWebhookPayload {
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

  let event = '';
  let dealId = '';
  const startTime = Date.now();

  try {
    // Detectar Content-Type e fazer parse adequado
    const contentType = req.headers.get('content-type') || '';
    console.log('📋 [bitrix-deal-webhook] Content-Type recebido:', contentType);

    let payload: BitrixDealWebhookPayload;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data do Bitrix
      const text = await req.text();
      console.log('📄 Payload bruto (form data):', text.substring(0, 500) + '...');
      
      const params = new URLSearchParams(text);
      
      event = params.get('event') || '';
      dealId = params.get('data[FIELDS][ID]') || '';
      const domain = params.get('auth[domain]') || 'maxsystem.bitrix24.com.br';
      
      payload = {
        event,
        data: { FIELDS: { ID: dealId } },
        ts: Date.now(),
        auth: { access_token: '', domain }
      };
      
      console.log('✅ Form data convertido para JSON:', payload);
    } else {
      payload = await req.json();
      console.log('📥 Webhook recebido (JSON):', payload);
      event = payload.event;
      dealId = payload.data?.FIELDS?.ID;
    }

    console.log('📥 Processando evento:', event, 'Deal ID:', dealId);

    // Eventos suportados para Deals
    const supportedEvents = [
      'ONCRM_DEAL_ADD',
      'ONCRM_DEAL_UPDATE',
      'ONCRMDEALADD',
      'ONCRMDEALUPDATE',
      'ONCRM_DEAL_DELETE',
      'ONCRMDEALDELETE'
    ];

    if (!supportedEvents.includes(event)) {
      console.log('⚠️ Evento não suportado:', event);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dealId) {
      console.error('❌ ID do deal não fornecido no webhook');
      return new Response(
        JSON.stringify({ error: 'Deal ID missing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Suporte a DELETE
    if (event.includes('DELETE')) {
      console.log(`🗑️ Deletando deal ${dealId} do Supabase`);
      
      // Primeiro deletar negotiations que referenciam este deal
      const { error: negError } = await supabase
        .from('negotiations')
        .delete()
        .eq('bitrix_deal_id', parseInt(dealId));
      
      if (negError) {
        console.error('⚠️ Erro ao deletar negotiations:', negError);
        // Continua mesmo com erro para tentar deletar o deal
      } else {
        console.log(`✅ Negotiations com bitrix_deal_id ${dealId} deletadas`);
      }

      // Também deletar pelo deal_id se existir referência
      const { data: dealRecord } = await supabase
        .from('deals')
        .select('id')
        .eq('bitrix_deal_id', parseInt(dealId))
        .maybeSingle();
      
      if (dealRecord?.id) {
        const { error: negByDealError } = await supabase
          .from('negotiations')
          .delete()
          .eq('deal_id', dealRecord.id);
        
        if (negByDealError) {
          console.error('⚠️ Erro ao deletar negotiations por deal_id:', negByDealError);
        }
      }
      
      // Agora deletar o deal
      const { error: deleteError } = await supabase
        .from('deals')
        .delete()
        .eq('bitrix_deal_id', parseInt(dealId));

      if (deleteError) {
        console.error('❌ Erro ao deletar deal:', deleteError);
        throw deleteError;
      }

      console.log(`✅ Deal ${dealId} e negotiations associadas deletados com sucesso`);
      return new Response(
        JSON.stringify({ success: true, message: 'Deal e negotiations deletados', dealId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar deal completo do Bitrix via API
    const bitrixDomain = payload.auth?.domain || 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.deal.get?ID=${dealId}`;
    
    console.log('🔍 Buscando deal completo do Bitrix:', bitrixUrl);
    const bitrixResponse = await fetch(bitrixUrl);
    const bitrixData = await bitrixResponse.json();

    if (!bitrixData.result) {
      console.error('❌ Deal não encontrado no Bitrix:', dealId, bitrixData);
      return new Response(
        JSON.stringify({ error: 'Deal not found in Bitrix' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deal = bitrixData.result;
    console.log('✅ Deal obtido do Bitrix:', JSON.stringify(deal, null, 2));

    // Extrair dados do cliente (contato ou empresa)
    let clientName = deal.TITLE || 'Cliente não identificado';
    let clientPhone = null;
    let clientEmail = null;

    // Tentar buscar contato se houver CONTACT_ID
    if (deal.CONTACT_ID) {
      try {
        const contactUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.contact.get?ID=${deal.CONTACT_ID}`;
        const contactResponse = await fetch(contactUrl);
        const contactData = await contactResponse.json();
        
        if (contactData.result) {
          const contact = contactData.result;
          clientName = [contact.NAME, contact.LAST_NAME].filter(Boolean).join(' ') || clientName;
          
          // Extrair telefone
          if (Array.isArray(contact.PHONE) && contact.PHONE.length > 0) {
            clientPhone = contact.PHONE[0]?.VALUE;
          }
          
          // Extrair email
          if (Array.isArray(contact.EMAIL) && contact.EMAIL.length > 0) {
            clientEmail = contact.EMAIL[0]?.VALUE;
          }
          
          console.log(`✅ Contato resolvido: ${clientName}`);
        }
      } catch (e) {
        console.warn('⚠️ Não foi possível buscar contato:', e);
      }
    }

    // Tentar vincular a um lead local se houver LEAD_ID
    let localLeadId = null;
    if (deal.LEAD_ID) {
      const { data: leadData } = await supabase
        .from('leads')
        .select('id')
        .eq('id', parseInt(deal.LEAD_ID))
        .maybeSingle();
      
      if (leadData) {
        localLeadId = leadData.id;
        console.log(`✅ Lead local encontrado: ${localLeadId}`);
      }
    }

    // Preparar dados do deal para upsert
    const dealData = {
      bitrix_deal_id: parseInt(dealId),
      title: deal.TITLE || `Deal #${dealId}`,
      stage_id: deal.STAGE_ID,
      category_id: deal.CATEGORY_ID,
      opportunity: deal.OPPORTUNITY ? parseFloat(deal.OPPORTUNITY) : null,
      currency_id: deal.CURRENCY_ID,
      company_id: deal.COMPANY_ID ? parseInt(deal.COMPANY_ID) : null,
      contact_id: deal.CONTACT_ID ? parseInt(deal.CONTACT_ID) : null,
      bitrix_lead_id: deal.LEAD_ID ? parseInt(deal.LEAD_ID) : null,
      lead_id: localLeadId,
      assigned_by_id: deal.ASSIGNED_BY_ID ? parseInt(deal.ASSIGNED_BY_ID) : null,
      created_date: deal.DATE_CREATE ? new Date(deal.DATE_CREATE).toISOString() : null,
      close_date: deal.CLOSEDATE && deal.CLOSEDATE !== '' ? new Date(deal.CLOSEDATE).toISOString() : null,
      date_modify: deal.DATE_MODIFY ? new Date(deal.DATE_MODIFY).toISOString() : null,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      raw: deal,
      last_sync_at: new Date().toISOString(),
      sync_status: 'synced',
    };

    console.log('📝 Dados do deal preparados:', JSON.stringify(dealData, null, 2));

    // Upsert do deal
    const { data: upsertedDeal, error: dealError } = await supabase
      .from('deals')
      .upsert(dealData, { 
        onConflict: 'bitrix_deal_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (dealError) {
      console.error('❌ Erro ao salvar deal:', dealError);
      throw dealError;
    }

    console.log('✅ Deal salvo com sucesso:', upsertedDeal.id);

    // Get pipeline_id from deal's category_id
    const pipelineId = deal.CATEGORY_ID ? String(deal.CATEGORY_ID) : '1';

    // Get dynamic stage mapping for this pipeline
    const stageToStatus = await getStageToStatusMapping(supabase, pipelineId);

    // Verificar se já existe negociação para este deal
    const { data: existingNegotiation } = await supabase
      .from('negotiations')
      .select('id, status')
      .eq('deal_id', upsertedDeal.id)
      .maybeSingle();

    if (existingNegotiation) {
      console.log(`📋 Negociação existente encontrada: ${existingNegotiation.id}`);
      
      // Atualizar status da negociação baseado no stage do Bitrix
      const newStatus = stageToStatus[deal.STAGE_ID] || 'recepcao_cadastro';
      if (newStatus !== existingNegotiation.status) {
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({ 
            status: newStatus,
            pipeline_id: pipelineId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingNegotiation.id);

        if (updateError) {
          console.warn('⚠️ Erro ao atualizar status da negociação:', updateError);
        } else {
          console.log(`✅ Status da negociação atualizado: ${existingNegotiation.status} → ${newStatus} (pipeline: ${pipelineId})`);
        }
      }
    } else {
      // Criar nova negociação automaticamente
      console.log('🆕 Criando nova negociação para o deal...');
      
      const negotiationStatus = stageToStatus[deal.STAGE_ID] || 'recepcao_cadastro';
      const baseValue = deal.OPPORTUNITY ? parseFloat(deal.OPPORTUNITY) : 0;
      
      const negotiationData = {
        deal_id: upsertedDeal.id,
        bitrix_deal_id: parseInt(dealId),
        title: deal.TITLE || `Negociação #${dealId}`,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        status: negotiationStatus,
        pipeline_id: pipelineId,
        base_value: baseValue,
        total_value: baseValue,
        start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newNegotiation, error: negotiationError } = await supabase
        .from('negotiations')
        .insert(negotiationData)
        .select()
        .single();

      if (negotiationError) {
        console.error('❌ Erro ao criar negociação:', negotiationError);
        // Não lançar erro, apenas logar - o deal foi salvo com sucesso
      } else {
        console.log(`✅ Nova negociação criada: ${newNegotiation.id} (status: ${negotiationStatus}, pipeline: ${pipelineId})`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [bitrix-deal-webhook] Processamento concluído em ${processingTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dealId: upsertedDeal.id,
        bitrix_deal_id: parseInt(dealId),
        processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [bitrix-deal-webhook] Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        error: String(error),
        event,
        dealId,
        processingTime: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
