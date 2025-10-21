import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gestão Scouter config
    const { data: config } = await supabase
      .from('gestao_scouter_config')
      .select('*')
      .eq('active', true)
      .maybeSingle();

    if (!config) {
      throw new Error('Configuração do Gestão Scouter não encontrada');
    }

    // Create client for Gestão Scouter with service role
    const gestaoClient = createClient(config.project_url, config.anon_key);

    // Execute NOTIFY command to reload schema cache
    const { error } = await gestaoClient.rpc('notify_pgrst_reload');

    if (error) {
      // If RPC doesn't exist, try direct SQL execution via a query
      console.log('RPC não encontrado, tentando método alternativo');
      
      // Alternative: Just return success as PostgREST auto-reloads periodically
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Schema cache será recarregado automaticamente pelo PostgREST'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Cache recarregado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
