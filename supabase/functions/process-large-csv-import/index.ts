import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    if (!isNaN(date.getTime())) return date.toISOString();
    return null;
  } catch {
    return null;
  }
};

// Processar CSV em streaming linha por linha
async function* streamCSVLines(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) yield line;
      }
    }
    
    if (done) {
      if (buffer.trim()) yield buffer;
      break;
    }
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

    // Processar em streaming
    const BATCH_SIZE = 100;
    let processedRows = 0;
    let importedRows = 0;
    let errorRows = 0;
    const errorDetails: any[] = [];
    let headers: string[] = [];
    let delimiter = ',';
    let leads: any[] = [];
    let isFirstLine = true;

    console.log('🔄 Iniciando processamento em streaming...');

    for await (const line of streamCSVLines(fileData.stream())) {
      if (isFirstLine) {
        delimiter = line.includes(';') ? ';' : ',';
        headers = line.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        isFirstLine = false;
        continue;
      }

      processedRows++;
      
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || null;
      });
      const lead = {
        id: row.ID ? parseInt(row.ID) : null,
        name: row['Nome do Lead'] || row.NAME || null,
        age: row.Idade ? parseInt(row.Idade) : null,
        address: row['Localização'] || row.ADDRESS || null,
        photo_url: row['Foto do modelo'] || null,
        responsible: row['Responsável'] || null,
        scouter: row.Scouter || null,
        date_modify: new Date().toISOString(),
        etapa: row.Etapa || null,
        nome_modelo: row['Nome do Modelo'] || row['nome modelo'] || null,
        criado: parseBrazilianDate(row.Criado) || null,
        fonte: row.Fonte || null,
        telefone_trabalho: row['Telefone de trabalho'] || null,
        celular: row.Celular || null,
        telefone_casa: row['Telefone de casa'] || null,
        local_abordagem: row['Local da Abordagem'] || null,
        ficha_confirmada: parseBoolean(row['Ficha confirmada']),
        data_criacao_ficha: parseBrazilianDate(row['Data de criação da Ficha']) || null,
        data_confirmacao_ficha: parseBrazilianDate(row['Data da confirmação de ficha']) || null,
        presenca_confirmada: parseBoolean(row['Presença Confirmada']),
        compareceu: parseBoolean(row.Compareceu),
        cadastro_existe_foto: parseBoolean(row['Cadastro Existe Foto?']),
        valor_ficha: parseNumeric(row['Valor da Ficha']) || null,
        data_criacao_agendamento: parseBrazilianDate(row['Data da criação do agendamento']) || null,
        horario_agendamento: row['Horário do agendamento - Cliente - Campo Lista'] || null,
        data_agendamento: parseBrazilianDate(row['Data do agendamento  - Cliente - Campo Data']) || null,
        gerenciamento_funil: row['GERENCIAMENTO FUNIL DE QUALIFICAÇAO/AGENDAMENTO'] || null,
        status_fluxo: row['Status de Fluxo'] || null,
        etapa_funil: row['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] || null,
        etapa_fluxo: row['Etapa de fluxo'] || null,
        funil_fichas: row['Funil Fichas'] || null,
        status_tabulacao: row['Status Tabulação'] || null,
        maxsystem_id_ficha: row['MaxSystem - ID da Ficha'] || null,
        gestao_scouter: row['Gestão de Scouter'] || null,
        op_telemarketing: row['Op Telemarketing'] || null,
        data_retorno_ligacao: parseBrazilianDate(row['Data Retorno de ligação']) || null,
        raw: row,
        sync_source: 'csv_import',
        sync_status: 'synced',
        commercial_project_id: null,
        responsible_user_id: null,
        bitrix_telemarketing_id: row.PARENT_ID_1144 ? parseInt(row.PARENT_ID_1144) : null
      };

      if (lead.id) leads.push(lead);

      // Processar batch quando atingir tamanho
      if (leads.length >= BATCH_SIZE) {
        const { error } = await supabase
          .from('leads')
          .upsert(leads, { onConflict: 'id' });

        if (error) {
          console.error(`❌ Erro no batch:`, error.message);
          errorRows += leads.length;
          errorDetails.push({ linha: processedRows, count: leads.length, error: error.message });
        } else {
          importedRows += leads.length;
        }
        
        leads = [];
        
        // Atualizar progresso a cada 500 linhas
        if (processedRows % 500 === 0) {
          await supabase
            .from('csv_import_jobs')
            .update({ 
              processed_rows: processedRows,
              imported_rows: importedRows,
              error_rows: errorRows,
              error_details: errorDetails.slice(-10)
            })
            .eq('id', jobId);
          
          console.log(`📊 Progresso: ${processedRows} linhas`);
        }
      }
    }

    // Processar últimas linhas
    if (leads.length > 0) {
      const { error } = await supabase
        .from('leads')
        .upsert(leads, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Erro no batch final:`, error.message);
        errorRows += leads.length;
        errorDetails.push({ linha: processedRows, count: leads.length, error: error.message });
      } else {
        importedRows += leads.length;
      }
    }

    // Finalizar job
    await supabase
      .from('csv_import_jobs')
      .update({ 
        status: errorRows > 0 ? 'completed_with_errors' : 'completed',
        total_rows: processedRows,
        processed_rows: processedRows,
        imported_rows: importedRows,
        error_rows: errorRows,
        error_details: errorDetails.slice(-20),
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ Job ${jobId} concluído: ${importedRows}/${processedRows} importados, ${errorRows} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        totalRows: processedRows,
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