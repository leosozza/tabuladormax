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
    const startTime = Date.now();
    
    // Parse request body
    const { lastSyncDate, limit = 5000 } = await req.json();
    
    console.log('🔄 get-leads-for-sync: Iniciando sincronização', {
      lastSyncDate,
      limit,
      timestamp: new Date().toISOString()
    });

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente não configuradas');
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
    }

    // Criar cliente com service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar leads modificados desde a última sincronização
    const query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: true })
      .limit(limit);

    // Adicionar filtro de data se fornecido
    if (lastSyncDate) {
      query.gte('updated_at', lastSyncDate);
    }

    const { data: leads, error, count } = await query;

    if (error) {
      console.error('❌ Erro ao buscar leads:', error);
      throw error;
    }

    const duration = Date.now() - startTime;

    console.log('✅ Sincronização concluída:', {
      leads_returned: leads?.length || 0,
      total_matching: count,
      duration_ms: duration
    });

    return new Response(
      JSON.stringify({
        success: true,
        leads: leads || [],
        total: count,
        returned: leads?.length || 0,
        synced_at: new Date().toISOString(),
        duration_ms: duration
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ get-leads-for-sync: Erro', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        leads: [],
        total: 0,
        returned: 0,
        synced_at: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
