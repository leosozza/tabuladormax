import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  [key: string]: string;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Detectar delimitador (vírgula ou ponto e vírgula)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  
  // Parse com suporte a campos entre aspas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };
  
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index].replace(/^"|"$/g, '');
      });
      rows.push(row);
    }
  }
  
  return rows;
}

// Converte data brasileira (DD/MM/YYYY HH:MM:SS) para ISO
function parseBrazilianDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  try {
    // Formato: DD/MM/YYYY HH:MM:SS
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    
    // Tenta outros formatos
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

function mapCSVRowToLead(row: CSVRow): any {
  // Mapeia campos principais do Bitrix
  const rawDate = row.Modificado || row['Modificado'] || row.DATE_MODIFY || row.Criado || row['Data de criação da Ficha'];
  
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
  
  const lead: any = {
    // ✅ Campos já mapeados (mantidos)
    id: row.ID ? parseInt(row.ID) : null,
    name: row['Nome do Lead'] || row.NAME || row.TITLE || null,
    age: row.Idade || row['Idade do Modelo'] || row.UF_IDADE ? parseInt(row.Idade || row['Idade do Modelo'] || row.UF_IDADE) : null,
    address: row['Localização'] || row.UF_LOCAL || row.ADDRESS || null,
    photo_url: row['Foto do modelo'] || row['Foto do Modelo - Link'] || row.UF_PHOTO || row.PHOTO || null,
    responsible: row['Responsável'] || row.UF_RESPONSAVEL || row.ASSIGNED_BY_NAME || null,
    scouter: row.Scouter || row.UF_SCOUTER || null,
    date_modify: parseBrazilianDate(rawDate) || new Date().toISOString(),
    
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
    
    // ✅ Campos técnicos (mantidos)
    sync_source: 'csv_import',
    sync_status: 'synced',
    raw: row, // ✅ Preserva TODOS os 168 campos originais
  };

  return lead;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvData } = await req.json();
    
    if (!csvData) {
      return new Response(
        JSON.stringify({ error: 'CSV data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing CSV data...');
    const rows = parseCSV(csvData);
    
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid rows found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${rows.length} leads...`);
    
    // Processar em lotes de 1000
    const BATCH_SIZE = 1000;
    let imported = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const leads = batch.map(mapCSVRowToLead).filter(lead => lead.id);
      
      if (leads.length === 0) continue;

      console.log(`Inserting batch ${i / BATCH_SIZE + 1}: ${leads.length} leads`);
      
      const { data, error } = await supabase
        .from('leads')
        .upsert(leads, { onConflict: 'id' });

      if (error) {
        console.error('Error inserting batch:', error);
        errors += leads.length;
        errorDetails.push({
          batch: i / BATCH_SIZE + 1,
          error: error.message,
          count: leads.length
        });
      } else {
        imported += leads.length;
        console.log(`Batch ${i / BATCH_SIZE + 1} imported successfully`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: rows.length,
        imported,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing CSV:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
