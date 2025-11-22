import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Iniciando correção de nomes de scouters...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Executar função SQL de correção em massa
    const { data, error } = await supabase.rpc('fix_scouter_names');

    if (error) {
      console.error('❌ Erro ao executar fix_scouter_names:', error);
      throw error;
    }

    const result = data[0];
    const leadsFixed = result?.leads_fixed || 0;
    const leadsNotFound = result?.leads_not_found || 0;

    console.log(`✅ Correção concluída:`);
    console.log(`   - ${leadsFixed} leads corrigidos`);
    console.log(`   - ${leadsNotFound} leads sem correspondência no cache SPA`);

    return new Response(
      JSON.stringify({
        success: true,
        leadsFixed,
        leadsNotFound,
        message: `${leadsFixed} leads corrigidos com sucesso!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro na correção de scouters:', error);
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
