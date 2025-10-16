import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Funções auxiliares
const parseBoolean = (value: string | null): boolean => {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return v === 'sim' || v === 'yes' || v === 'true' || v === '1' || v === 'y';
};

const parseNumeric = (value: string | null): number | null => {
  if (!value) return null;
  const cleaned = value.replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const parseBrazilianDate = (dateStr: string | null): string | null => {
  if (!dateStr) return null;
  try {
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Processar CSV linha por linha para evitar estouro de memória
async function* processCSVInChunks(csvText: string, chunkSize: number) {
  const lines = csvText.split('\n');
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  
  for (let i = 1; i < lines.length; i += chunkSize) {
    const chunkLines = lines.slice(i, Math.min(i + chunkSize, lines.length));
    const chunk: any[] = [];
    
    for (const line of chunkLines) {
      if (!line.trim()) continue;
      
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || null;
      });
      chunk.push(row);
    }
    
    yield { chunk, totalLines: lines.length - 1, currentLine: i + chunkLines.length - 1 };
  }
}

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
    console.log('📥 Baixando arquivo...');
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('leads-csv-import')
      .download(filePath);

    if (downloadError) throw downloadError;

    console.log(`✅ Arquivo baixado: ${fileData.size} bytes`);

    // Converter Blob para texto
    const csvText = await fileData.text();
    
    // Processar em chunks de 500 linhas (reduzido de 5000)
    const CHUNK_SIZE = 500;
    let processedRows = 0;
    let importedRows = 0;
    let errorRows = 0;
    const errorDetails: any[] = [];
    let totalLines = 0;

    console.log('🔄 Iniciando processamento em chunks...');

    for await (const { chunk, totalLines: total, currentLine } of processCSVInChunks(csvText, CHUNK_SIZE)) {
      totalLines = total;
      const leads: any[] = [];

      for (const row of chunk) {
        const lead = {
          // Campos básicos
          id: row.ID ? parseInt(row.ID) : null,
          name: row['Nome do Lead'] || row.NAME || null,
          age: row.Idade ? parseInt(row.Idade) : null,
          address: row['Localização'] || row.ADDRESS || null,
          photo_url: row['Foto do modelo'] || null,
          responsible: row['Responsável'] || null,
          scouter: row.Scouter || null,
          date_modify: new Date().toISOString(),
          
          // Informações Básicas
          etapa: row.Etapa || null,
          nome_modelo: row['Nome do Modelo'] || row['nome modelo'] || null,
          criado: parseBrazilianDate(row.Criado) || null,
          fonte: row.Fonte || null,
          
          // Contatos
          telefone_trabalho: row['Telefone de trabalho'] || null,
          celular: row.Celular || null,
          telefone_casa: row['Telefone de casa'] || null,
          
          // Endereço
          local_abordagem: row['Local da Abordagem'] || null,
          
          // Modelo/Ficha
          ficha_confirmada: parseBoolean(row['Ficha confirmada']),
          data_criacao_ficha: parseBrazilianDate(row['Data de criação da Ficha']) || null,
          data_confirmacao_ficha: parseBrazilianDate(row['Data da confirmação de ficha']) || null,
          presenca_confirmada: parseBoolean(row['Presença Confirmada']),
          compareceu: parseBoolean(row.Compareceu),
          cadastro_existe_foto: parseBoolean(row['Cadastro Existe Foto?']),
          valor_ficha: parseNumeric(row['Valor da Ficha']) || null,
          
          // Agendamento
          data_criacao_agendamento: parseBrazilianDate(row['Data da criação do agendamento']) || null,
          horario_agendamento: row['Horário do agendamento - Cliente - Campo Lista'] || null,
          data_agendamento: parseBrazilianDate(row['Data do agendamento  - Cliente - Campo Data']) || null,
          
          // Fluxo/Funil
          gerenciamento_funil: row['GERENCIAMENTO FUNIL DE QUALIFICAÇAO/AGENDAMENTO'] || null,
          status_fluxo: row['Status de Fluxo'] || null,
          etapa_funil: row['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] || null,
          etapa_fluxo: row['Etapa de fluxo'] || null,
          funil_fichas: row['Funil Fichas'] || null,
          status_tabulacao: row['Status Tabulação'] || null,
          
          // MaxSystem/Integrações
          maxsystem_id_ficha: row['MaxSystem - ID da Ficha'] || null,
          
          // Gestão/Projetos
          gestao_scouter: row['Gestão de Scouter'] || null,
          op_telemarketing: row['Op Telemarketing'] || null,
          
          // Outros
          data_retorno_ligacao: parseBrazilianDate(row['Data Retorno de ligação']) || null,
          
          // Campos técnicos
          raw: row,
          sync_source: 'csv_import',
          sync_status: 'synced',
          commercial_project_id: null,
          responsible_user_id: null,
          bitrix_telemarketing_id: row.PARENT_ID_1144 ? parseInt(row.PARENT_ID_1144) : null
        };

        if (lead.id) leads.push(lead);
      }

      // Upsert batch (menor)
      if (leads.length > 0) {
        const { error } = await supabase
          .from('leads')
          .upsert(leads, { onConflict: 'id' });

        if (error) {
          console.error(`❌ Erro no batch (linha ${currentLine}):`, error.message);
          errorRows += leads.length;
          errorDetails.push({
            linha: currentLine,
            count: leads.length,
            error: error.message
          });
        } else {
          importedRows += leads.length;
        }
      }

      processedRows += chunk.length;

      // Atualizar progresso a cada 5 chunks
      if (processedRows % (CHUNK_SIZE * 5) === 0 || currentLine >= totalLines) {
        await supabase
          .from('csv_import_jobs')
          .update({ 
            total_rows: totalLines,
            processed_rows: processedRows,
            imported_rows: importedRows,
            error_rows: errorRows,
            error_details: errorDetails.length > 0 ? errorDetails.slice(0, 10) : null
          })
          .eq('id', jobId);

        const percent = Math.round((processedRows / totalLines) * 100);
        console.log(`📊 Progresso: ${processedRows}/${totalLines} (${percent}%)`);
      }

      // Pequena pausa para liberar memória
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Finalizar job
    await supabase
      .from('csv_import_jobs')
      .update({ 
        status: errorRows > 0 ? 'completed_with_errors' : 'completed',
        total_rows: totalLines,
        processed_rows: processedRows,
        imported_rows: importedRows,
        error_rows: errorRows,
        error_details: errorDetails.length > 0 ? errorDetails.slice(0, 20) : null,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ Job ${jobId} concluído: ${importedRows}/${totalLines} importados, ${errorRows} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        totalRows: totalLines,
        importedRows,
        errorRows 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Tentar atualizar job com erro
    try {
      const { jobId } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('csv_import_jobs')
        .update({
          status: 'failed',
          error_details: [{ error: errorMessage }],
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    } catch (e) {
      console.error('Erro ao atualizar job com falha:', e);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});