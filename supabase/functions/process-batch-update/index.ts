import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, filePath, fieldName } = await req.json();

    if (!jobId || !filePath || !fieldName) {
      throw new Error('Missing required parameters');
    }

    console.log(`🔄 Iniciando atualização em lote - Job: ${jobId}, Campo: ${fieldName}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mark job as processing
    await supabase
      .from('batch_update_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Download CSV from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('leads-csv-import')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`);
    }

    // Parse CSV
    const text = await fileData.text();
    const lines = text.trim().split('\n');
    const rows = lines.slice(1).map(line => { // Skip header
      const parts = line.split(',').map(cell => cell.trim());
      return {
        id: parseInt(parts[0]),
        value: parts[1] || null
      };
    });

    console.log(`📊 Total de linhas a processar: ${rows.length}`);

    // Update total_rows
    await supabase
      .from('batch_update_jobs')
      .update({ total_rows: rows.length })
      .eq('id', jobId);

    let processedRows = 0;
    let updatedRows = 0;
    let errorRows = 0;
    const errorDetails: any[] = [];

    // Process each row
    for (const row of rows) {
      try {
        const { error: updateError } = await supabase
          .from('leads')
          .update({ [fieldName]: row.value })
          .eq('id', row.id);

        if (updateError) {
          throw updateError;
        }

        updatedRows++;
      } catch (error: any) {
        console.error(`❌ Erro ao atualizar lead ${row.id}:`, error);
        errorRows++;
        errorDetails.push({
          lead_id: row.id,
          error: error.message
        });
      }

      processedRows++;

      // Update progress every 10 rows
      if (processedRows % 10 === 0) {
        await supabase
          .from('batch_update_jobs')
          .update({ 
            processed_rows: processedRows,
            updated_rows: updatedRows,
            error_rows: errorRows
          })
          .eq('id', jobId);
      }
    }

    // Mark job as completed
    await supabase
      .from('batch_update_jobs')
      .update({ 
        status: 'completed',
        processed_rows: processedRows,
        updated_rows: updatedRows,
        error_rows: errorRows,
        error_details: errorDetails.length > 0 ? errorDetails : null,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ Atualização concluída - Atualizados: ${updatedRows}, Erros: ${errorRows}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedRows,
        updated: updatedRows,
        errors: errorRows
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro no processo de atualização:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
