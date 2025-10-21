import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchemaComparisonResult {
  tabuladormax_fields: string[];
  gestao_scouter_fields: string[];
  missing_in_gestao_scouter: string[];
  missing_in_tabuladormax: string[];
  suggested_sql: string;
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

    // Get TabuladorMax schema
    const { data: tabFields, error: tabError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'leads')
      .order('column_name');

    if (tabError) throw tabError;

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

    // Get Gestão Scouter schema
    const { data: gestaoFields, error: gestaoError } = await gestaoClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'leads')
      .order('column_name');

    if (gestaoError) throw gestaoError;

    const tabFieldNames = (tabFields || []).map((f: { column_name: string }) => f.column_name);
    const gestaoFieldNames = (gestaoFields || []).map((f: { column_name: string }) => f.column_name);

    // Find differences
    const missingInGestao = tabFieldNames.filter(f => !gestaoFieldNames.includes(f));
    const missingInTab = gestaoFieldNames.filter(f => !tabFieldNames.includes(f));

    // Generate SQL to add missing columns
    let suggestedSql = '';
    if (missingInGestao.length > 0) {
      suggestedSql = '-- SQL para adicionar campos faltantes no Gestão Scouter:\n\n';
      missingInGestao.forEach(field => {
        suggestedSql += `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ${field} TEXT;\n`;
      });
      suggestedSql += '\n-- Recarregar cache do schema:\nNOTIFY pgrst, \'reload schema\';\n';
    }

    const result: SchemaComparisonResult = {
      tabuladormax_fields: tabFieldNames,
      gestao_scouter_fields: gestaoFieldNames,
      missing_in_gestao_scouter: missingInGestao,
      missing_in_tabuladormax: missingInTab,
      suggested_sql: suggestedSql || '-- Schemas estão sincronizados',
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
