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
    const { lead, webhook, source } = await req.json();
    
    console.log('sync-to-bitrix: Recebendo requisição', { lead, webhook, source });

    // Evitar loop de sincronização - se a origem é 'bitrix', não sincronizar de volta
    if (source === 'bitrix') {
      console.log('sync-to-bitrix: Ignorando - origem é bitrix');
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored - source is bitrix' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados para enviar ao Bitrix
    const bitrixPayload: any = {
      id: lead.id,
      fields: {}
    };

    // Copiar todos os campos do lead exceto metadados de sincronização
    Object.keys(lead).forEach(key => {
      if (!['sync_status', 'sync_source', 'last_sync_at', 'updated_at'].includes(key)) {
        bitrixPayload.fields[key] = lead[key];
      }
    });

    console.log('sync-to-bitrix: Enviando para Bitrix', { webhook, payload: bitrixPayload });

    // Enviar para o Bitrix via webhook
    if (webhook) {
      const bitrixResponse = await fetch(webhook, {
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
    }

    // Atualizar status de sincronização no Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
