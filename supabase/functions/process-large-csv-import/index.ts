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

    const { jobId, filePath } = await req.json();
    
    console.log(`🚀 Iniciando processamento do job ${jobId}: ${filePath}`);

    // Atualizar status para processing
    await supabase
      .from('csv_import_jobs')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    // Baixar arquivo do Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('leads-csv-import')
      .download(filePath);

    if (downloadError) throw downloadError;

    // Converter Blob para texto
    const csvText = await fileData.text();
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV vazio ou inválido');
    }

    const totalRows = lines.length - 1;
    
    await supabase
      .from('csv_import_jobs')
      .update({ total_rows: totalRows })
      .eq('id', jobId);

    // Processar em chunks de 5000 linhas
    const CHUNK_SIZE = 5000;
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    
    let processedRows = 0;
    let importedRows = 0;
    let errorRows = 0;
    const errorDetails: any[] = [];

    for (let i = 1; i < lines.length; i += CHUNK_SIZE) {
      const chunkLines = lines.slice(i, i + CHUNK_SIZE);
      const leads: any[] = [];

      for (const line of chunkLines) {
        if (!line.trim()) continue;
        
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || null;
        });

        // Mapear para estrutura do lead
        const lead = {
          id: row.ID ? parseInt(row.ID) : null,
          name: row['Nome do Lead'] || row.NAME || null,
          age: row.Idade ? parseInt(row.Idade) : null,
          address: row['Localização'] || row.ADDRESS || null,
          photo_url: row['Foto do modelo'] || null,
          responsible: row['Responsável'] || null,
          scouter: row.Scouter || null,
          raw: row,
          sync_source: 'csv_import',
          sync_status: 'synced',
          date_modify: new Date().toISOString(),
          commercial_project_id: null,
          responsible_user_id: null,
          bitrix_telemarketing_id: row.PARENT_ID_1144 ? parseInt(row.PARENT_ID_1144) : null
        };

        if (lead.id) leads.push(lead);
      }

      // Upsert batch
      const { error } = await supabase
        .from('leads')
        .upsert(leads, { onConflict: 'id' });

      if (error) {
        console.error('❌ Erro no batch:', error);
        errorRows += leads.length;
        errorDetails.push({
          batch: Math.floor(i / CHUNK_SIZE) + 1,
          count: leads.length,
          error: error.message
        });
      } else {
        importedRows += leads.length;
      }

      processedRows += chunkLines.length;

      // Atualizar progresso
      await supabase
        .from('csv_import_jobs')
        .update({ 
          processed_rows: processedRows,
          imported_rows: importedRows,
          error_rows: errorRows
        })
        .eq('id', jobId);

      console.log(`📊 Progresso: ${processedRows}/${totalRows} (${Math.round(processedRows/totalRows*100)}%)`);
    }

    // Finalizar job
    await supabase
      .from('csv_import_jobs')
      .update({ 
        status: errorRows > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        error_details: errorDetails.length > 0 ? errorDetails : null
      })
      .eq('id', jobId);

    console.log(`✅ Job ${jobId} concluído: ${importedRows}/${totalRows} importados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        totalRows,
        importedRows,
        errorRows 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar CSV:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
