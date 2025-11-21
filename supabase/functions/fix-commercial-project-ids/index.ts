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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('🔧 Iniciando correção de commercial_project_id...');
    
    // Buscar todos os leads com PARENT_ID_1120 no raw
    const { data: allLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, raw, commercial_project_id, projeto_comercial')
      .not('raw', 'is', null);

    if (fetchError) {
      throw new Error(`Erro ao buscar leads: ${fetchError.message}`);
    }

    console.log(`📊 Total de leads encontrados: ${allLeads?.length || 0}`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const lead of allLeads || []) {
      try {
        const raw = lead.raw as any;
        const parentId = raw?.PARENT_ID_1120 ? Number(raw.PARENT_ID_1120) : null;

        if (!parentId) {
          skipped++;
          continue;
        }

        console.log(`🔍 Lead ${lead.id}: PARENT_ID_1120=${parentId}`);

        // Buscar entidade SPA
        const { data: spaEntity, error: spaError } = await supabase
          .from('bitrix_spa_entities')
          .select('bitrix_item_id, title')
          .eq('entity_type_id', 1120)
          .eq('bitrix_item_id', parentId)
          .maybeSingle();

        if (spaError) {
          console.error(`❌ Erro ao buscar SPA para lead ${lead.id}:`, spaError);
          errors++;
          errorDetails.push({ lead_id: lead.id, error: `SPA error: ${spaError.message}` });
          continue;
        }

        if (!spaEntity) {
          console.warn(`⚠️ SPA não encontrado para lead ${lead.id} (PARENT_ID_1120=${parentId})`);
          skipped++;
          continue;
        }

        console.log(`✅ SPA encontrado: ${spaEntity.title} (${spaEntity.bitrix_item_id})`);

        // Buscar UUID do projeto na tabela commercial_projects
        const { data: project, error: projectError } = await supabase
          .from('commercial_projects')
          .select('id, name')
          .eq('code', String(spaEntity.bitrix_item_id))
          .eq('active', true)
          .maybeSingle();

        if (projectError) {
          console.error(`❌ Erro ao buscar projeto para lead ${lead.id}:`, projectError);
          errors++;
          errorDetails.push({ lead_id: lead.id, error: `Project error: ${projectError.message}` });
          continue;
        }

        if (!project) {
          console.warn(`⚠️ Projeto não encontrado para code=${spaEntity.bitrix_item_id} (lead ${lead.id})`);
          skipped++;
          continue;
        }

        // Verificar se já está correto
        if (lead.commercial_project_id === project.id) {
          console.log(`✓ Lead ${lead.id} já tem o projeto correto: ${project.name}`);
          skipped++;
          continue;
        }

        // Atualizar lead
        console.log(`🔄 Atualizando lead ${lead.id}: ${lead.commercial_project_id} → ${project.id} (${project.name})`);
        
        const { error: updateError } = await supabase
          .from('leads')
          .update({ 
            commercial_project_id: project.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar lead ${lead.id}:`, updateError);
          errors++;
          errorDetails.push({ lead_id: lead.id, error: `Update error: ${updateError.message}` });
          continue;
        }

        console.log(`✅ Lead ${lead.id} atualizado com sucesso`);
        fixed++;

      } catch (leadError: any) {
        console.error(`❌ Erro ao processar lead ${lead.id}:`, leadError);
        errors++;
        errorDetails.push({ lead_id: lead.id, error: leadError.message });
      }
    }

    const summary = {
      success: true,
      total_leads: allLeads?.length || 0,
      fixed,
      skipped,
      errors,
      error_details: errorDetails.length > 0 ? errorDetails : undefined
    };

    console.log('📊 Resumo da correção:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
