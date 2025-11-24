import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

interface DiagnosticStats {
  totalLeadsWithRaw: number;
  leadsWithNullScouter: number;
  leadsWithNullFonte: number;
  leadsWithNullEtapa: number;
  leadsWithNullProject: number;
  leadsNeedingUpdate: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, filters } = await req.json();

    if (action === 'start') {
      return await startReprocessing(supabase, filters);
    } else if (action === 'stats') {
      return await getReprocessStats(supabase);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getReprocessStats(supabase: any): Promise<Response> {
  console.log('📊 Coletando estatísticas de leads...');

  // Fontes que DEVEM ter scouter
  const fontesComScouter = ['Scouter - Fichas', 'Scouters', 'Chamadas'];

  // Contar leads com raw mas com campos importantes NULL
  const { data: leadsWithProblem, error: countError } = await supabase
    .from('leads')
    .select('id, scouter, fonte, fonte_normalizada, etapa, commercial_project_id, raw')
    .not('raw', 'is', null);

  if (countError) {
    throw new Error(`Erro ao contar leads: ${countError.message}`);
  }

  const stats: DiagnosticStats = {
    totalLeadsWithRaw: leadsWithProblem?.length || 0,
    // Contar apenas leads de fontes que DEVEM ter scouter
    leadsWithNullScouter: leadsWithProblem?.filter((l: any) => 
      !l.scouter && fontesComScouter.includes(l.fonte_normalizada)
    ).length || 0,
    leadsWithNullFonte: leadsWithProblem?.filter((l: any) => !l.fonte).length || 0,
    leadsWithNullEtapa: leadsWithProblem?.filter((l: any) => !l.etapa).length || 0,
    leadsWithNullProject: leadsWithProblem?.filter((l: any) => !l.commercial_project_id).length || 0,
    // Considerar scouter NULL problema apenas para fontes específicas
    leadsNeedingUpdate: leadsWithProblem?.filter((l: any) => 
      (!l.scouter && fontesComScouter.includes(l.fonte_normalizada)) ||
      !l.fonte || 
      !l.etapa || 
      !l.commercial_project_id
    ).length || 0
  };

  console.log('✅ Estatísticas coletadas:', stats);

  return new Response(
    JSON.stringify(stats),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function startReprocessing(supabase: any, filters: any): Promise<Response> {
  console.log('🚀 Iniciando re-processamento via database function...');
  console.log('🔍 Filtros:', filters);
  
  // Chamar função do banco que faz tudo de uma vez
  const { data, error } = await supabase.rpc('reprocess_leads_from_raw_bulk', {
    p_only_missing_fields: filters?.onlyMissingFields || false,
    p_date_from: filters?.dateFrom || null,
    p_date_to: filters?.dateTo || null
  });
  
  if (error) {
    console.error('❌ Erro ao re-processar:', error);
    throw new Error(`Erro ao re-processar: ${error.message}`);
  }
  
  console.log('✅ Re-processamento concluído:', data);
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
