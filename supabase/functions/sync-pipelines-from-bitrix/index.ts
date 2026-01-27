// Edge Function para sincronizar pipelines do Bitrix automaticamente
// Busca todas as categorias de deals e seus stages, criando mapeamentos automáticos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento automático baseado em keywords nos nomes dos stages
function autoMapStage(stageName: string, stageId: string): string {
  const name = stageName.toUpperCase();
  
  // Ordem importa - mais específico primeiro
  if (name.includes('RECEPCAO') || name.includes('RECEPÇÃO') || name.includes('CADASTRO') || stageId.includes(':NEW')) {
    return 'recepcao_cadastro';
  }
  if (name.includes('FICHA') || name.includes('PREENCH') || stageId.includes('PREPARAT')) {
    return 'ficha_preenchida';
  }
  if (name.includes('PRODUTOR') || name.includes('ATENDIMENTO') || stageId.includes('EXECUT')) {
    return 'atendimento_produtor';
  }
  if (name.includes('FECHAD') || name.includes('GANHO') || name.includes('CONTRATO FECHADO') || stageId.includes(':WON')) {
    return 'negocios_fechados';
  }
  if (name.includes('NÃO FECHADO') || name.includes('NAO FECHADO') || name.includes('PERDIDO') || stageId.includes(':LOSE')) {
    return 'contrato_nao_fechado';
  }
  
  // Default para stages não mapeados
  return 'analisar';
}

interface BitrixCategory {
  ID: string;
  NAME: string;
  SORT?: string;
}

interface BitrixStage {
  STATUS_ID: string;
  NAME: string;
  SORT?: string;
  SEMANTICS?: string; // 'S' for success, 'F' for failure, 'P' for process
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🔄 [sync-pipelines-from-bitrix] Iniciando descoberta de pipelines...');

  try {
    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configuração do Bitrix
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';
    const bitrixWebhook = `https://${bitrixDomain}/rest/${bitrixToken}`;

    // ========== 1. Buscar todas as categorias de deals ==========
    console.log('📋 Buscando categorias de deals do Bitrix...');
    
    const categoriesResponse = await fetch(
      `${bitrixWebhook}/crm.dealcategory.list`,
      { method: 'GET' }
    );

    if (!categoriesResponse.ok) {
      throw new Error(`Erro ao buscar categorias: ${categoriesResponse.status}`);
    }

    const categoriesData = await categoriesResponse.json();
    
    if (categoriesData.error) {
      throw new Error(`Erro Bitrix: ${categoriesData.error_description || categoriesData.error}`);
    }

    // Adicionar a categoria 0 (default) que não aparece na lista
    const categories: BitrixCategory[] = [
      { ID: '0', NAME: 'Pipeline Padrão' },
      ...(categoriesData.result || [])
    ];

    console.log(`✅ Encontradas ${categories.length} categorias de deals`);

    const results = {
      total: categories.length,
      created: 0,
      updated: 0,
      errors: 0,
      pipelines: [] as any[],
    };

    // ========== 2. Para cada categoria, buscar stages ==========
    for (const category of categories) {
      try {
        console.log(`\n🔄 Processando categoria ${category.ID}: ${category.NAME}`);

        // Buscar stages desta categoria usando crm.dealcategory.stage.list
        const stagesResponse = await fetch(
          `${bitrixWebhook}/crm.dealcategory.stage.list?ID=${category.ID}`,
          { method: 'GET' }
        );

        if (!stagesResponse.ok) {
          console.warn(`⚠️ Erro ao buscar stages da categoria ${category.ID}: ${stagesResponse.status}`);
          results.errors++;
          continue;
        }

        const stagesData = await stagesResponse.json();
        
        if (stagesData.error) {
          console.warn(`⚠️ Erro Bitrix ao buscar stages: ${stagesData.error_description || stagesData.error}`);
          results.errors++;
          continue;
        }

        const stages: BitrixStage[] = stagesData.result || [];
        console.log(`  📊 Encontrados ${stages.length} stages`);

        // ========== 3. Criar mapeamento automático ==========
        const stageMapping: Record<string, string> = {};
        const reverseMapping: Record<string, string> = {};

        for (const stage of stages) {
          const internalStatus = autoMapStage(stage.NAME, stage.STATUS_ID);
          stageMapping[stage.STATUS_ID] = internalStatus;
          
          // Reverse mapping - preferir stages com SEMANTICS específico
          // 'S' = success (WON), 'F' = failure (LOSE), 'P' = process
          if (!reverseMapping[internalStatus] || 
              (stage.SEMANTICS === 'S' && internalStatus === 'negocios_fechados') ||
              (stage.SEMANTICS === 'F' && internalStatus === 'contrato_nao_fechado') ||
              stage.STATUS_ID.includes(':NEW')) {
            reverseMapping[internalStatus] = stage.STATUS_ID;
          }

          console.log(`    - ${stage.STATUS_ID}: "${stage.NAME}" → ${internalStatus}`);
        }

        // ========== 4. Upsert na tabela pipeline_configs ==========
        const pipelineData = {
          id: category.ID,
          name: category.NAME,
          description: `Pipeline ${category.NAME} sincronizada do Bitrix`,
          stage_mapping: {
            stages: stageMapping,
            reverse: reverseMapping,
          },
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        const { data: existingConfig } = await supabase
          .from('pipeline_configs')
          .select('id')
          .eq('id', category.ID)
          .maybeSingle();

        if (existingConfig) {
          // Update
          const { error: updateError } = await supabase
            .from('pipeline_configs')
            .update(pipelineData)
            .eq('id', category.ID);

          if (updateError) {
            console.error(`❌ Erro ao atualizar pipeline ${category.ID}:`, updateError);
            results.errors++;
          } else {
            results.updated++;
            console.log(`✅ Pipeline ${category.NAME} atualizada`);
          }
        } else {
          // Insert
          const { error: insertError } = await supabase
            .from('pipeline_configs')
            .insert({
              ...pipelineData,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`❌ Erro ao criar pipeline ${category.ID}:`, insertError);
            results.errors++;
          } else {
            results.created++;
            console.log(`✅ Pipeline ${category.NAME} criada`);
          }
        }

        results.pipelines.push({
          id: category.ID,
          name: category.NAME,
          stages_count: stages.length,
          stages: stages.map(s => ({ id: s.STATUS_ID, name: s.NAME })),
        });

      } catch (error) {
        console.error(`❌ Erro ao processar categoria ${category.ID}:`, error);
        results.errors++;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n✅ [sync-pipelines-from-bitrix] Concluído em ${processingTime}ms`);
    console.log(`📊 Resultados: ${results.created} criadas, ${results.updated} atualizadas, ${results.errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
