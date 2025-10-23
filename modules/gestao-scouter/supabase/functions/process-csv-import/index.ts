import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import Papa from "npm:papaparse@5.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();
    
    console.log('🚀 [process-csv-import] Iniciando processamento do job:', job_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar job
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job não encontrado: ${jobError?.message}`);
    }

    console.log('📋 Job encontrado:', job.file_name);

    // 2. Atualizar status para processing
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString() 
      })
      .eq('id', job_id);

    // 3. Iniciar processamento em background
    EdgeRuntime.waitUntil((async () => {
      const startTime = Date.now();
      let lastHeartbeat = Date.now();
      
      try {
        console.log('🚀 [INÍCIO] Processamento do job:', job_id);
        console.log('📄 Arquivo:', job.file_name, '| Tamanho:', job.file_size, 'bytes');
        
        // Download arquivo do storage
        console.log('📥 [DOWNLOAD] Baixando arquivo do storage...');
        const downloadStart = Date.now();
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('csv-imports')
          .download(job.file_path);

        if (downloadError) {
          throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`);
        }
        console.log(`✅ [DOWNLOAD] Concluído em ${Date.now() - downloadStart}ms`);

        // Parse CSV usando PapaParse com streaming
        console.log('🔍 [PARSE] Iniciando parse do CSV em modo streaming...');
        const parseStart = Date.now();
        
        // Converter Blob para ArrayBuffer e então para string em chunks
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(uint8Array);
        
        // Usar streaming com PapaParse
        let headers: string[] = [];
        const allRows: Record<string, string>[] = [];
        let rowCount = 0;
        
        const parseResult = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          transform: (value: string) => value.trim(),
          chunkSize: 1024 * 100, // 100KB chunks para evitar estouro de memória
          chunk: (results: any) => {
            // Processar chunk por chunk
            if (results.data && Array.isArray(results.data)) {
              allRows.push(...results.data);
              rowCount += results.data.length;
              
              if (results.meta?.fields && headers.length === 0) {
                headers = results.meta.fields;
              }
            }
          }
        });

        if (parseResult.errors.length > 0) {
          console.warn('⚠️ [PARSE] Avisos durante parse:', parseResult.errors.slice(0, 5));
        }

        headers = parseResult.meta.fields || headers;
        
        console.log(`✅ [PARSE] Concluído em ${Date.now() - parseStart}ms`);
        console.log(`📊 [DADOS] Total de linhas: ${allRows.length} | Colunas: ${headers.length}`);
        console.log(`📋 [COLUNAS] ${headers.join(', ')}`);

        // Atualizar total de linhas
        await supabase
          .from('import_jobs')
          .update({ 
            total_rows: allRows.length,
            started_at: new Date().toISOString()
          })
          .eq('id', job_id);

        // Processar em chunks de 100 registros (reduzido para evitar timeout)
        const CHUNK_SIZE = 100;
        const HEARTBEAT_INTERVAL = 2000; // Atualizar a cada 2 segundos
        let processed = 0;
        let inserted = 0;
        let failed = 0;
        const errors: string[] = [];
        const totalChunks = Math.ceil(allRows.length / CHUNK_SIZE);

        console.log(`🔄 [PROCESSAMENTO] Iniciando em ${totalChunks} chunks de até ${CHUNK_SIZE} registros`);

        for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
          const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
          const chunkStart = Date.now();
          const chunk = allRows.slice(i, Math.min(i + CHUNK_SIZE, allRows.length));
          
          // Verificar se job foi pausado/cancelado a cada 10 chunks (melhor performance)
          if (chunkNum % 10 === 0) {
            const { data: currentJob } = await supabase
              .from('import_jobs')
              .select('status')
              .eq('id', job_id)
              .single();

            if (currentJob?.status === 'paused') {
              console.log('⏸️ [PAUSADO] Job pausado pelo usuário');
              await supabase
                .from('import_jobs')
                .update({
                  processed_rows: processed,
                  inserted_rows: inserted,
                  failed_rows: failed,
                  errors: errors.slice(0, 100)
                })
                .eq('id', job_id);
              return;
            }

            if (currentJob?.status === 'failed') {
              console.log('❌ [CANCELADO] Job cancelado pelo usuário');
              return;
            }
          }
          
          console.log(`📦 [CHUNK ${chunkNum}/${totalChunks}] Processando ${chunk.length} registros...`);
          
          // Mapear registros
          const records = chunk.map((row, rowIndex) => {
            try {
              const record: any = {};
              const mapping = job.column_mapping as Record<string, any>;
              
              Object.entries(mapping).forEach(([dbField, priorities]) => {
                let value = null;
                
                // Suporte a priorização (primary/secondary/tertiary)
                if (typeof priorities === 'object' && priorities !== null) {
                  const primary = priorities.primary;
                  const secondary = priorities.secondary;
                  const tertiary = priorities.tertiary;
                  
                  if (primary && row[primary]) value = row[primary];
                  if (!value && secondary && row[secondary]) value = row[secondary];
                  if (!value && tertiary && row[tertiary]) value = row[tertiary];
                } else {
                  // Mapeamento simples string -> string
                  if (row[priorities]) value = row[priorities];
                }
                
                if (value) record[dbField] = value;
              });
              
              return record;
            } catch (error) {
              const errorMsg = `Linha ${i + rowIndex + 1}: Erro no mapeamento - ${error.message}`;
              errors.push(errorMsg);
              console.error('❌', errorMsg);
              return null;
            }
          }).filter(r => r !== null && Object.keys(r).length > 0);

          console.log(`✨ [CHUNK ${chunkNum}/${totalChunks}] ${records.length} registros mapeados`);

          // Insert batch
          if (records.length > 0) {
            const insertStart = Date.now();
            const { error: insertError } = await supabase
              .from(job.target_table)
              .insert(records);

            if (insertError) {
              failed += records.length;
              const errorMsg = `Chunk ${chunkNum}: ${insertError.message}`;
              errors.push(errorMsg);
              console.error('❌ [INSERT]', errorMsg);
            } else {
              inserted += records.length;
              console.log(`✅ [INSERT] ${records.length} registros inseridos em ${Date.now() - insertStart}ms`);
            }
          }

          processed += chunk.length;
          const progressPct = Math.round((processed / allRows.length) * 100);
          const avgTimePerRecord = (Date.now() - startTime) / processed;
          const estimatedRemaining = Math.round((allRows.length - processed) * avgTimePerRecord / 1000);

          console.log(`📈 [PROGRESSO] ${progressPct}% (${processed}/${allRows.length}) | Tempo restante estimado: ${estimatedRemaining}s`);

          // Heartbeat: Atualizar progresso periodicamente
          const now = Date.now();
          if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
            await supabase
              .from('import_jobs')
              .update({
                processed_rows: processed,
                inserted_rows: inserted,
                failed_rows: failed,
                errors: errors.slice(0, 100) // Limitar a 100 erros
              })
              .eq('id', job_id);
            
            lastHeartbeat = now;
            console.log(`💓 [HEARTBEAT] Progresso atualizado no banco`);
          }

          console.log(`⏱️ [CHUNK ${chunkNum}/${totalChunks}] Concluído em ${Date.now() - chunkStart}ms`);
          
          // Liberar memória a cada chunk
          if (chunkNum % 50 === 0) {
            // Force garbage collection hint
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        // Finalizar job
        const totalTime = Date.now() - startTime;
        const recordsPerSecond = Math.round((processed / totalTime) * 1000);
        
        console.log(`🎯 [FINALIZAÇÃO] Atualizando status do job...`);
        await supabase
          .from('import_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processed_rows: processed,
            inserted_rows: inserted,
            failed_rows: failed,
            errors: errors.slice(0, 100)
          })
          .eq('id', job_id);

        // Deletar arquivo do storage após processamento
        console.log('🗑️ [LIMPEZA] Removendo arquivo do storage...');
        await supabase.storage
          .from('csv-imports')
          .remove([job.file_path]);

        console.log(`✅ [SUCESSO] Importação concluída em ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`📊 [ESTATÍSTICAS] ${inserted} inseridos | ${failed} falharam | ${recordsPerSecond} registros/s`);

      } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('❌ [ERRO FATAL] Erro no processamento após', (totalTime / 1000).toFixed(1), 's:', error);
        console.error('Stack:', error.stack);
        
        await supabase
          .from('import_jobs')
          .update({
            status: 'failed',
            error_message: `${error.message} (após ${(totalTime / 1000).toFixed(1)}s)`,
            completed_at: new Date().toISOString()
          })
          .eq('id', job_id);
      }
    })());

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Processamento iniciado em background',
        job_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [process-csv-import] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
