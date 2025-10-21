import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FieldInfo {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { source } = await req.json();

    if (source === 'gestao_scouter') {
      // Get Gestão Scouter config
      const { data: config } = await supabase
        .from('gestao_scouter_config')
        .select('*')
        .eq('active', true)
        .maybeSingle();

      if (!config) {
        throw new Error('Configuração do Gestão Scouter não encontrada');
      }

      // Create client for Gestão Scouter
      const gestaoClient = createClient(config.project_url, config.anon_key);

      // Get schema
      const { data: columns, error } = await gestaoClient
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'leads')
        .order('ordinal_position');

      if (error) throw error;

      const fields: FieldInfo[] = (columns || []).map((col: { column_name: string; data_type: string; is_nullable: string }) => ({
        name: col.column_name,
        label: formatLabel(col.column_name),
        type: col.data_type,
        required: col.is_nullable === 'NO',
      }));

      return new Response(
        JSON.stringify({ fields }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Get TabuladorMax fields
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'leads')
        .order('ordinal_position');

      if (error) throw error;

      const fields: FieldInfo[] = (columns || []).map((col: { column_name: string; data_type: string; is_nullable: string }) => ({
        name: col.column_name,
        label: formatLabel(col.column_name),
        type: col.data_type,
        required: col.is_nullable === 'NO',
      }));

      return new Response(
        JSON.stringify({ fields }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatLabel(columnName: string): string {
  return columnName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}
