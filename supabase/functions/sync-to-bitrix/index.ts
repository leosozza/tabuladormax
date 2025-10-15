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

    // Sobrescrever campos mapeados se atualizados
    if (lead.name) bitrixPayload.fields.NAME = lead.name;
    if (lead.age) bitrixPayload.fields.UF_IDADE = lead.age;
    if (lead.address) bitrixPayload.fields.UF_LOCAL = lead.address;
    if (lead.photo_url) bitrixPayload.fields.UF_PHOTO = lead.photo_url;
    if (lead.responsible) bitrixPayload.fields.UF_RESPONSAVEL = lead.responsible;
    if (lead.scouter) bitrixPayload.fields.UF_SCOUTER = lead.scouter;
    if (lead.bitrix_telemarketing_id) {
      bitrixPayload.fields.PARENT_ID_1144 = lead.bitrix_telemarketing_id;
    }

    console.log('🔄 Sincronizando com Bitrix:', {
      leadId: lead.id,
      fieldsCount: Object.keys(bitrixPayload.fields).length,
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
