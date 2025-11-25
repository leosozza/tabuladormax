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

    console.log('🔄 Iniciando normalização de etapas em lotes...');
    
    // Processar etapas em múltiplos mini-lotes
    let totalUpdated = 0;
    let hasMore = true;
    let iterations = 0;
    const MAX_ITERATIONS = 50; // ~25.000 leads por chamada da Edge Function
    const BATCH_SIZE = 500;

    while (hasMore && iterations < MAX_ITERATIONS) {
      const { data: batchData, error: batchError } = await supabase
        .rpc('normalize_etapa_single_batch', { p_batch_size: BATCH_SIZE });
      
      if (batchError) {
        console.error(`❌ Erro no lote ${iterations + 1}:`, batchError);
        throw batchError;
      }

      totalUpdated += batchData.updated;
      hasMore = batchData.has_more;
      iterations++;

      console.log(`📦 Lote ${iterations}: ${batchData.updated} leads atualizados (total: ${totalUpdated})`);
      
      // Se não há mais para processar, parar
      if (!hasMore) {
        console.log('✅ Todos os leads foram processados!');
        break;
      }
    }

    const needsMoreCalls = hasMore && iterations >= MAX_ITERATIONS;
    
    if (needsMoreCalls) {
      console.log(`⚠️ Limite de iterações atingido. Execute novamente para continuar.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        etapas_normalized: totalUpdated,
        iterations,
        needs_more_calls: needsMoreCalls,
        message: needsMoreCalls 
          ? `⚠️ Processados ${totalUpdated} leads em ${iterations} lotes. Execute novamente para continuar.`
          : `✅ Processo concluído: ${totalUpdated} etapas normalizadas em ${iterations} lotes`
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
