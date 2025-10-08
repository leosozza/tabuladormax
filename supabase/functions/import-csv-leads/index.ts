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
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  
  return rows;
}

function mapCSVRowToLead(row: CSVRow): any {
  // Mapeia campos principais
  const lead: any = {
    id: row.ID ? parseInt(row.ID) : null,
    name: row.NAME || row.TITLE || null,
    age: row.UF_IDADE ? parseInt(row.UF_IDADE) : null,
    address: row.UF_LOCAL || row.ADDRESS || null,
    photo_url: row.UF_PHOTO || row.PHOTO || null,
    responsible: row.UF_RESPONSAVEL || row.ASSIGNED_BY_NAME || null,
    scouter: row.UF_SCOUTER || null,
    date_modify: row.DATE_MODIFY || new Date().toISOString(),
    sync_source: 'csv_import',
    sync_status: 'synced',
    raw: row, // Armazena TODOS os campos do CSV
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
