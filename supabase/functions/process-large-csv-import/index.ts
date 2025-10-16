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
          // ✅ Campos já mapeados
          id: row.ID ? parseInt(row.ID) : null,
          name: row['Nome do Lead'] || row.NAME || null,
          age: row.Idade ? parseInt(row.Idade) : null,
          address: row['Localização'] || row.ADDRESS || null,
          photo_url: row['Foto do modelo'] || null,
          responsible: row['Responsável'] || null,
          scouter: row.Scouter || null,
          date_modify: new Date().toISOString(),
          
          // ❌ NOVOS CAMPOS - 1. Informações Básicas
          etapa: row.Etapa || null,
          nome_modelo: row['Nome do Modelo'] || row['nome modelo'] || null,
          criado: parseBrazilianDate(row.Criado) || null,
          fonte: row.Fonte || null,
          
          // ❌ NOVOS CAMPOS - 2. Contatos
          telefone_trabalho: row['Telefone de trabalho'] || null,
          celular: row.Celular || null,
          telefone_casa: row['Telefone de casa'] || null,
          
          // ❌ NOVOS CAMPOS - 3. Endereço
          local_abordagem: row['Local da Abordagem'] || null,
          
          // ❌ NOVOS CAMPOS - 4. Modelo/Ficha
          ficha_confirmada: parseBoolean(row['Ficha confirmada']),
          data_criacao_ficha: parseBrazilianDate(row['Data de criação da Ficha']) || null,
          data_confirmacao_ficha: parseBrazilianDate(row['Data da confirmação de ficha']) || null,
          presenca_confirmada: parseBoolean(row['Presença Confirmada']),
          compareceu: parseBoolean(row.Compareceu),
          cadastro_existe_foto: parseBoolean(row['Cadastro Existe Foto?']),
          valor_ficha: parseNumeric(row['Valor da Ficha']) || null,
          
          // ❌ NOVOS CAMPOS - 5. Agendamento
          data_criacao_agendamento: parseBrazilianDate(row['Data da criação do agendamento']) || null,
          horario_agendamento: row['Horário do agendamento - Cliente - Campo Lista'] || null,
          data_agendamento: parseBrazilianDate(row['Data do agendamento  - Cliente - Campo Data']) || null,
          
          // ❌ NOVOS CAMPOS - 6. Fluxo/Funil
          gerenciamento_funil: row['GERENCIAMENTO FUNIL DE QUALIFICAÇAO/AGENDAMENTO'] || null,
          status_fluxo: row['Status de Fluxo'] || null,
          etapa_funil: row['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] || null,
          etapa_fluxo: row['Etapa de fluxo'] || null,
          funil_fichas: row['Funil Fichas'] || null,
          status_tabulacao: row['Status Tabulação'] || null,
          
          // ❌ NOVOS CAMPOS - 7. MaxSystem/Integrações
          maxsystem_id_ficha: row['MaxSystem - ID da Ficha'] || null,
          
          // ❌ NOVOS CAMPOS - 8. Gestão/Projetos
          gestao_scouter: row['Gestão de Scouter'] || null,
          op_telemarketing: row['Op Telemarketing'] || null,
          
          // ❌ NOVOS CAMPOS - 9. Outros
          data_retorno_ligacao: parseBrazilianDate(row['Data Retorno de ligação']) || null,
          
          // ✅ Campos técnicos
          raw: row,
          sync_source: 'csv_import',
          sync_status: 'synced',
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
