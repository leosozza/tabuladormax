import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS headers
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
    console.log('🔍 get-leads-count: Iniciando contagem de leads');

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente não configuradas');
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
    }

    // Criar cliente com service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar contagem total de leads
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Erro ao contar leads:', error);
      throw error;
    }

    console.log('✅ Contagem concluída:', { total_leads: count });

    return new Response(
      JSON.stringify({
        success: true,
        total_leads: count,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ get-leads-count: Erro', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
