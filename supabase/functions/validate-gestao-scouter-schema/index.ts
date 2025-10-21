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

    console.log('🔍 Buscando schema do TabuladorMax...');
    
    // Buscar campos do TabuladorMax usando RPC
    const { data: tabColumns, error: tabError } = await supabase.rpc('get_leads_table_columns');

    if (tabError) {
      console.error('❌ Erro ao buscar schema do TabuladorMax:', tabError);
      throw new Error(`Erro ao buscar campos do TabuladorMax: ${tabError.message}`);
    }

    const tabFieldNames = (tabColumns || []).map((col: any) => col.column_name);
    console.log(`✅ TabuladorMax: ${tabFieldNames.length} campos encontrados`);

    console.log('🔍 Buscando schema do Gestão Scouter...');

    // Buscar configuração do Gestão Scouter
    const { data: config } = await supabase
      .from('gestao_scouter_config')
      .select('project_url, anon_key')
      .eq('active', true)
      .maybeSingle();

    if (!config) {
      throw new Error('Configuração do Gestão Scouter não encontrada');
    }

    // Criar cliente para Gestão Scouter
    const gestaoClient = createClient(config.project_url, config.anon_key);

    // Buscar campos do Gestão Scouter usando RPC
    const { data: gestaoColumns, error: gestaoError } = await gestaoClient.rpc('get_leads_table_columns');

    if (gestaoError) {
      console.error('❌ Erro ao buscar schema do Gestão Scouter:', gestaoError);
      throw new Error(`Erro ao buscar campos do Gestão Scouter: ${gestaoError.message}`);
    }

    const gestaoFieldNames = (gestaoColumns || []).map((col: any) => col.column_name);
    console.log(`✅ Gestão Scouter: ${gestaoFieldNames.length} campos encontrados`);

    // Encontrar diferenças
    const missingInGestao = tabFieldNames.filter((f: string) => !gestaoFieldNames.includes(f));
    const missingInTab = gestaoFieldNames.filter((f: string) => !tabFieldNames.includes(f));

    console.log(`📊 Diferenças encontradas:`, {
      missingInGestao: missingInGestao.length,
      missingInTab: missingInTab.length
    });

    // Gerar SQL sugerido
    let suggestedSql = '';
    if (missingInGestao.length > 0) {
      suggestedSql = '-- SQL para adicionar campos faltantes no Gestão Scouter:\n\n';
      missingInGestao.forEach((field: string) => {
        suggestedSql += `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ${field} TEXT;\n`;
      });
      suggestedSql += '\n-- Recarregar cache do schema:\nNOTIFY pgrst, \'reload schema\';\n';
    } else {
      suggestedSql = '-- ✅ Schemas estão sincronizados';
    }

    const result: SchemaComparisonResult = {
      tabuladormax_fields: tabFieldNames,
      gestao_scouter_fields: gestaoFieldNames,
      missing_in_gestao_scouter: missingInGestao,
      missing_in_tabuladormax: missingInTab,
      suggested_sql: suggestedSql,
    };

    console.log('✅ Validação de schema concluída');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na validação de schema:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
