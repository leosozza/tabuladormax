import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    console.log('🔍 Buscando campos do TabuladorMax...');
    
    // Buscar campos do TabuladorMax
    const tabResponse = await fetch(
      `${supabaseUrl}/functions/v1/get-gestao-scouter-fields`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ source: 'tabuladormax' }),
      }
    );

    if (!tabResponse.ok) {
      const errorText = await tabResponse.text();
      console.error('❌ Erro ao buscar campos do TabuladorMax:', errorText);
      throw new Error(`Erro ao buscar campos do TabuladorMax: ${errorText}`);
    }

    const tabData = await tabResponse.json();
    const tabFieldNames = tabData.fields?.map((f: any) => f.name) || [];
    console.log(`✅ TabuladorMax: ${tabFieldNames.length} campos encontrados`);

    console.log('🔍 Buscando campos do Gestão Scouter...');

    // Buscar campos do Gestão Scouter
    const gestaoResponse = await fetch(
      `${supabaseUrl}/functions/v1/get-gestao-scouter-fields`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ source: 'gestao_scouter' }),
      }
    );

    if (!gestaoResponse.ok) {
      const errorText = await gestaoResponse.text();
      console.error('❌ Erro ao buscar campos do Gestão Scouter:', errorText);
      throw new Error(`Erro ao buscar campos do Gestão Scouter: ${errorText}`);
    }

    const gestaoData = await gestaoResponse.json();
    const gestaoFieldNames = gestaoData.fields?.map((f: any) => f.name) || [];
    console.log(`✅ Gestão Scouter: ${gestaoFieldNames.length} campos encontrados`);

    // Encontrar diferenças
    const missingInGestao = tabFieldNames.filter((f: string) => !gestaoFieldNames.includes(f));
    const missingInTab = gestaoFieldNames.filter((f: string) => !tabFieldNames.includes(f));

    console.log(`📊 Diferenças: ${missingInGestao.length} faltando no Gestão Scouter, ${missingInTab.length} faltando no TabuladorMax`);

    // Gerar SQL sugerido
    let suggestedSql = '';
    if (missingInGestao.length > 0) {
      suggestedSql = '-- SQL para adicionar campos faltantes no Gestão Scouter:\n\n';
      missingInGestao.forEach((field: string) => {
        suggestedSql += `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ${field} TEXT;\n`;
      });
      suggestedSql += '\n-- Recarregar cache do schema:\nNOTIFY pgrst, \'reload schema\';\n';
    } else {
      suggestedSql = '-- Schemas estão sincronizados';
    }

    const result: SchemaComparisonResult = {
      tabuladormax_fields: tabFieldNames,
      gestao_scouter_fields: gestaoFieldNames,
      missing_in_gestao_scouter: missingInGestao,
      missing_in_tabuladormax: missingInTab,
      suggested_sql: suggestedSql,
    };

    console.log('✅ Validação de schema concluída com sucesso');

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
