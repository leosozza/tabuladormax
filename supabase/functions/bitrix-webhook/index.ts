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
    const payload: BitrixWebhookPayload = await req.json();
    console.log('📥 Webhook recebido do Bitrix:', payload);

    const event = payload.event;
    const leadId = payload.data?.FIELDS?.ID;

    // Eventos suportados
    const supportedEvents = [
      'ONCRM_LEAD_ADD',
      'ONCRM_LEAD_UPDATE',
      'ONCRMLEADADD',
      'ONCRMLEADUPDATE'
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

    // Preparar dados para upsert no Supabase
    const leadData = {
      id: Number(leadId),
      name: lead.NAME || lead.TITLE || null,
      age: lead.UF_IDADE ? Number(lead.UF_IDADE) : null,
      address: lead.UF_LOCAL || lead.ADDRESS || null,
      photo_url: lead.UF_PHOTO || lead.PHOTO || null,
      responsible: lead.UF_RESPONSAVEL || lead.ASSIGNED_BY_NAME || null,
      scouter: lead.UF_SCOUTER || null,
      raw: lead,
      sync_source: 'bitrix',
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      updated_at: lead.DATE_MODIFY || new Date().toISOString()
    };

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
