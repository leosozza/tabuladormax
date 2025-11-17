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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId } = await req.json();
    
    console.log(`🔄 Retomando job ${jobId}`);

    // Buscar job pausado
    const { data: job, error: fetchError } = await supabase
      .from('csv_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status !== 'paused') {
      return new Response(
        JSON.stringify({ error: `Job está com status '${job.status}', não pode ser retomado` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Job encontrado - retomando da linha ${job.processed_rows || 0}`);

    // Atualizar status para processing e limpar timeout_reason
    await supabase
      .from('csv_import_jobs')
      .update({ 
        status: 'processing',
        timeout_reason: null,
        started_at: job.started_at || new Date().toISOString() // Manter started_at original
      })
      .eq('id', jobId);

    // Chamar função principal de processamento
    // (A função process-large-csv-import já trata streaming, então apenas reinvocamos)
    const { error: invokeError } = await supabase.functions.invoke('process-large-csv-import', {
      body: { 
        jobId,
        filePath: job.file_path,
        syncWithBitrix: false // Manter padrão
      }
    });

    if (invokeError) {
      console.error('❌ Erro ao reinvocar processamento:', invokeError);
      throw invokeError;
    }

    console.log('✅ Processamento retomado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Processamento retomado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202 }
    );

  } catch (error) {
    console.error('❌ Erro ao retomar job:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
