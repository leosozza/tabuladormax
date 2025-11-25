// Edge Function para re-sincronizar DATE_CLOSED de leads convertidos
// Busca leads sem DATE_CLOSED no raw mas com etapa "Lead convertido" e re-busca do Bitrix

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResyncJob {
  total_leads: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  error_details: Array<{ lead_id: number; error: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixDomain = 'maxsystem.bitrix24.com.br';

    console.log('🔍 Buscando leads convertidos sem DATE_CLOSED...');

    // Buscar leads que têm etapa "Lead convertido" mas não têm DATE_CLOSED no raw
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, raw, etapa, date_closed')
      .or('etapa.eq.Lead convertido,etapa.eq.CONVERTED')
      .is('date_closed', null);

    if (fetchError) {
      console.error('❌ Erro ao buscar leads:', fetchError);
      throw fetchError;
    }

    console.log(`📊 ${leads?.length || 0} leads encontrados para resync`);

    const job: ResyncJob = {
      total_leads: leads?.length || 0,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      error_details: []
    };

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum lead para resincronizar',
          job
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar em lotes de 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (lead) => {
        try {
          job.processed++;
          
          // Buscar lead completo do Bitrix
          const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.lead.get?ID=${lead.id}`;
          console.log(`🔍 Buscando lead ${lead.id} do Bitrix...`);
          
          const response = await fetch(bitrixUrl);
          const bitrixData = await response.json();

          if (!bitrixData.result) {
            console.warn(`⚠️ Lead ${lead.id} não encontrado no Bitrix`);
            job.skipped++;
            return;
          }

          const bitrixLead = bitrixData.result;
          const dateClosed = bitrixLead.DATE_CLOSED;

          if (!dateClosed || dateClosed === '') {
            console.log(`ℹ️ Lead ${lead.id}: DATE_CLOSED também está vazio no Bitrix`);
            job.skipped++;
            return;
          }

          // Atualizar raw e date_closed
          const updatedRaw = { ...lead.raw, DATE_CLOSED: dateClosed };
          
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              raw: updatedRaw,
              date_closed: dateClosed,
              updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar lead ${lead.id}:`, updateError);
            job.errors++;
            job.error_details.push({
              lead_id: lead.id,
              error: updateError.message
            });
            return;
          }

          console.log(`✅ Lead ${lead.id} atualizado com DATE_CLOSED: ${dateClosed}`);
          job.updated++;

        } catch (error) {
          console.error(`❌ Erro ao processar lead ${lead.id}:`, error);
          job.errors++;
          job.error_details.push({
            lead_id: lead.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }));

      // Pequeno delay entre lotes para não sobrecarregar Bitrix
      if (i + BATCH_SIZE < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Resync concluído em ${duration}ms`);
    console.log(`📊 Resultado:`, job);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Resync concluído: ${job.updated} leads atualizados`,
        job,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
