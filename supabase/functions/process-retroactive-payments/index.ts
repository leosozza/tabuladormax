import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const BATCH_SIZE = 500; // Processar 500 leads por vez

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { cutoffDate } = await req.json();
    
    if (!cutoffDate) {
      throw new Error('cutoffDate é obrigatório');
    }

    let totalProcessed = 0;
    let hasMore = true;
    const startTime = Date.now();

    console.log(`🚀 Iniciando processamento retroativo até ${cutoffDate}`);

    while (hasMore) {
      // Buscar próximo lote de leads não pagos
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('id')
        .lte('criado', `${cutoffDate}T23:59:59`)
        .not('scouter', 'is', null)
        .or('ficha_paga.is.null,ficha_paga.eq.false')
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error('Erro ao buscar leads:', fetchError);
        throw fetchError;
      }

      if (!leads || leads.length === 0) {
        hasMore = false;
        break;
      }

      // Atualizar este lote
      const leadIds = leads.map(l => l.id);
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          ficha_paga: true,
          data_pagamento: `${cutoffDate}T00:00:00`,
          updated_at: new Date().toISOString()
        })
        .in('id', leadIds);

      if (updateError) {
        console.error('Erro ao atualizar leads:', updateError);
        throw updateError;
      }

      totalProcessed += leads.length;
      console.log(`✅ Processados ${totalProcessed} leads...`);

      // Se processou menos que o batch size, acabou
      if (leads.length < BATCH_SIZE) {
        hasMore = false;
      }

      // Pequena pausa para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Processamento concluído: ${totalProcessed} leads em ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        cutoffDate,
        durationSeconds: duration,
        message: `${totalProcessed} leads marcados como pagos até ${cutoffDate}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
