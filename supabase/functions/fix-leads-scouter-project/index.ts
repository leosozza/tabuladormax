// Edge Function para corrigir leads existentes com Scouter e Projeto Comercial
// Preenche campos que estão NULL mas têm dados no raw do Bitrix
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action = 'fix', batchSize = 200, fixType = 'both' } = body;
    // fixType: 'scouter', 'project', 'both'

    if (action === 'status') {
      // Retornar estatísticas de leads com campos NULL
      const [scouterStats, projectStats] = await Promise.all([
        // Leads com scouter NULL mas PARENT_ID_1096 no raw
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('scouter', null)
          .not('raw->PARENT_ID_1096', 'is', null),
        
        // Leads com commercial_project_id NULL mas PARENT_ID_1120 no raw
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('commercial_project_id', null)
          .not('raw->PARENT_ID_1120', 'is', null)
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            scouters_to_fix: scouterStats.count || 0,
            projects_to_fix: projectStats.count || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AÇÃO: Corrigir leads em lote
    const results = {
      scouters_fixed: 0,
      scouters_not_found: 0,
      projects_fixed: 0,
      projects_not_found: 0,
      errors: 0
    };

    // 1. CORRIGIR SCOUTERS
    if (fixType === 'scouter' || fixType === 'both') {
      console.log('🔧 Corrigindo Scouters...');
      
      // Buscar leads com scouter NULL mas com PARENT_ID_1096 no raw
      const { data: leadsToFixScouter } = await supabase
        .from('leads')
        .select('id, raw')
        .is('scouter', null)
        .not('raw->PARENT_ID_1096', 'is', null)
        .limit(batchSize);

      if (leadsToFixScouter && leadsToFixScouter.length > 0) {
        // Extrair IDs únicos de scouters
        const scouterIds = [...new Set(
          leadsToFixScouter
            .map((l: any) => l.raw?.PARENT_ID_1096)
            .filter(Boolean)
            .map(Number)
        )];

        // Buscar nomes dos scouters de uma vez
        const { data: spaEntities } = await supabase
          .from('bitrix_spa_entities')
          .select('bitrix_item_id, title')
          .eq('entity_type_id', 1096)
          .in('bitrix_item_id', scouterIds);

        const scouterMap = new Map<number, string>();
        (spaEntities || []).forEach((e: any) => {
          scouterMap.set(e.bitrix_item_id, e.title);
        });

        // Atualizar leads
        for (const lead of leadsToFixScouter) {
          const scouterId = Number(lead.raw?.PARENT_ID_1096);
          const scouterName = scouterMap.get(scouterId);

          if (scouterName) {
            const { error } = await supabase
              .from('leads')
              .update({ 
                scouter: scouterName,
                gestao_scouter: scouterName 
              })
              .eq('id', lead.id);

            if (error) {
              console.error(`❌ Erro ao atualizar lead ${lead.id}:`, error);
              results.errors++;
            } else {
              results.scouters_fixed++;
            }
          } else {
            // Usar fallback
            const fallbackName = `Scouter ID ${scouterId}`;
            await supabase
              .from('leads')
              .update({ 
                scouter: fallbackName,
                gestao_scouter: fallbackName 
              })
              .eq('id', lead.id);
            results.scouters_not_found++;
          }
        }
      }
    }

    // 2. CORRIGIR PROJETOS COMERCIAIS
    if (fixType === 'project' || fixType === 'both') {
      console.log('🔧 Corrigindo Projetos Comerciais...');
      
      // Buscar leads com commercial_project_id NULL mas com PARENT_ID_1120 no raw
      const { data: leadsToFixProject } = await supabase
        .from('leads')
        .select('id, raw')
        .is('commercial_project_id', null)
        .not('raw->PARENT_ID_1120', 'is', null)
        .limit(batchSize);

      if (leadsToFixProject && leadsToFixProject.length > 0) {
        // Extrair IDs únicos de projetos
        const projectCodes = [...new Set(
          leadsToFixProject
            .map((l: any) => String(l.raw?.PARENT_ID_1120))
            .filter(Boolean)
        )];

        // Buscar projetos comerciais de uma vez
        const { data: projects } = await supabase
          .from('commercial_projects')
          .select('id, code, name')
          .in('code', projectCodes)
          .eq('active', true);

        const projectMap = new Map<string, { id: string; name: string }>();
        (projects || []).forEach((p: any) => {
          projectMap.set(p.code, { id: p.id, name: p.name });
        });

        // Atualizar leads
        for (const lead of leadsToFixProject) {
          const projectCode = String(lead.raw?.PARENT_ID_1120);
          const project = projectMap.get(projectCode);

          if (project) {
            const { error } = await supabase
              .from('leads')
              .update({ 
                commercial_project_id: project.id,
                projeto_comercial: project.name
              })
              .eq('id', lead.id);

            if (error) {
              console.error(`❌ Erro ao atualizar lead ${lead.id}:`, error);
              results.errors++;
            } else {
              results.projects_fixed++;
            }
          } else {
            results.projects_not_found++;
          }
        }
      }
    }

    // Log resultado
    console.log(`
      ╔════════════════════════════════════════════════════════════════
      ║ ✅ CORREÇÃO DE LEADS CONCLUÍDA
      ╠════════════════════════════════════════════════════════════════
      ║ Scouters corrigidos: ${results.scouters_fixed}
      ║ Scouters não encontrados (fallback): ${results.scouters_not_found}
      ║ Projetos corrigidos: ${results.projects_fixed}
      ║ Projetos não encontrados: ${results.projects_not_found}
      ║ Erros: ${results.errors}
      ╚════════════════════════════════════════════════════════════════
    `);

    // Registrar evento
    await supabase.from('sync_events').insert({
      event_type: 'fix_leads_scouter_project',
      direction: 'internal',
      status: results.errors === 0 ? 'success' : 'partial_success',
      fields_synced_count: results.scouters_fixed + results.projects_fixed,
      error_message: results.errors > 0 ? `${results.errors} erros` : null
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        message: `Corrigidos: ${results.scouters_fixed} scouters, ${results.projects_fixed} projetos`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
