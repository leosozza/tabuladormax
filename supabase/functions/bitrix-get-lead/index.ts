import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();

    if (!leadId) {
      throw new Error('leadId é obrigatório');
    }

    console.log(`[bitrix-get-lead] Buscando lead ${leadId}`);

    // Buscar configuração do webhook do Bitrix
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from('bitrix_sync_config')
      .select('webhook_url')
      .eq('active', true)
      .single();

    if (!config?.webhook_url) {
      throw new Error('Configuração do Bitrix não encontrada');
    }

    // Extrair domínio e token do webhook
    const webhookMatch = config.webhook_url.match(/https:\/\/([^\/]+)\/rest\/(\d+)\/([^\/]+)\//);
    if (!webhookMatch) {
      throw new Error('Formato de webhook inválido');
    }

    const [, bitrixDomain, , bitrixToken] = webhookMatch;

    // Buscar lead do Bitrix
    const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${leadId}`;
    console.log(`[bitrix-get-lead] URL: ${bitrixUrl}`);

    const response = await fetch(bitrixUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[bitrix-get-lead] Erro do Bitrix:', data);
      throw new Error(data.error_description || 'Erro ao buscar lead do Bitrix');
    }

    console.log(`[bitrix-get-lead] Lead ${leadId} encontrado`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[bitrix-get-lead] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
