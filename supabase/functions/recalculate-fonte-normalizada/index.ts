import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Iniciando limpeza de dados corrompidos...');
    
    // Etapa 1: Limpar dados corrompidos
    const { data: corruptedData, error: cleanError } = await supabase
      .rpc('clean_corrupted_fonte');
    
    if (cleanError) {
      console.error('❌ Erro ao limpar dados corrompidos:', cleanError);
      throw cleanError;
    }

    console.log(`✅ ${corruptedData.cleaned} registros corrompidos limpos`);
    console.log('🔄 Iniciando recálculo de fonte_normalizada...');
    
    // Etapa 2: Recalcular fonte_normalizada em lotes
    const { data: recalculatedData, error: recalcError } = await supabase
      .rpc('recalculate_fonte_batch');
    
    if (recalcError) {
      console.error('❌ Erro ao recalcular fontes:', recalcError);
      throw recalcError;
    }

    console.log(`✅ ${recalculatedData.total_updated} leads recalculados`);

    return new Response(
      JSON.stringify({
        success: true,
        corrupted_cleaned: corruptedData.cleaned,
        fonte_recalculated: recalculatedData.total_updated,
        message: `✅ Processo concluído: ${corruptedData.cleaned} corrompidos limpos, ${recalculatedData.total_updated} fontes recalculadas`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Erro desconhecido'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
