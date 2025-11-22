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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔍 Discovering Bitrix stages for entity type 1096 (Scouters)...');

    // MÉTODO PRIORITÁRIO: Buscar stages diretamente do banco de dados local (bitrix_spa_entities)
    console.log('Consultando bitrix_spa_entities para descobrir stages reais...');
    
    const { data: spaEntities, error: spaError } = await supabase
      .from('bitrix_spa_entities')
      .select('stage_id, title')
      .eq('entity_type_id', 1096)
      .not('stage_id', 'is', null);

    if (spaError) {
      console.error('Erro ao consultar bitrix_spa_entities:', spaError);
    }

    if (spaEntities && spaEntities.length > 0) {
      // Agrupar por stage_id e contar scouters
      const stagesMap = new Map<string, { id: string; name: string; count: number; examples: string[] }>();
      
      for (const entity of spaEntities) {
        if (entity.stage_id) {
          if (!stagesMap.has(entity.stage_id)) {
            // Formatar nome da stage de forma mais amigável
            const stageName = entity.stage_id
              .replace('DT1096_', '')
              .replace(':', ' - ')
              .replace(/_/g, ' ');
            
            stagesMap.set(entity.stage_id, {
              id: entity.stage_id,
              name: stageName,
              count: 0,
              examples: []
            });
          }
          const stage = stagesMap.get(entity.stage_id)!;
          stage.count++;
          if (stage.examples.length < 3) {
            stage.examples.push(entity.title);
          }
        }
      }

      const stages = Array.from(stagesMap.values());
      
      console.log(`✅ Descobertas ${stages.length} stages únicas de ${spaEntities.length} scouters`);
      stages.forEach(s => {
        console.log(`  - ${s.id}: ${s.name} (${s.count} scouters)`);
      });

      return new Response(
        JSON.stringify({
          success: true,
          method: 'from_spa_entities',
          stages: stages.map(s => ({
            STATUS_ID: s.id,
            NAME: s.name,
            ENTITY_ID: 'DYNAMIC_1096',
            SORT: 100,
            scouter_count: s.count,
            examples: s.examples
          })),
          total: stages.length,
          total_scouters: spaEntities.length,
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // FALLBACK: Se não houver dados locais, consultar o Bitrix diretamente
    console.log('Nenhum dado local encontrado, consultando Bitrix API...');
    
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '9/85e3cex48z1zc0qp';
    const itemsUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.item.list.json?entityTypeId=1096&select[]=id&select[]=title&select[]=stageId`;
    
    const itemsResponse = await fetch(itemsUrl);
    const itemsData = await itemsResponse.json();
    
    if (itemsData.result && itemsData.result.items) {
      const uniqueStages = new Map<string, { id: string; name: string; count: number }>();
      
      itemsData.result.items.forEach((item: any) => {
        if (item.stageId) {
          if (uniqueStages.has(item.stageId)) {
            uniqueStages.get(item.stageId)!.count++;
          } else {
            const stageName = item.stageId
              .replace('DT1096_', '')
              .replace(':', ' - ')
              .replace(/_/g, ' ');
            
            uniqueStages.set(item.stageId, {
              id: item.stageId,
              name: stageName,
              count: 1
            });
          }
        }
      });
      
      const stages = Array.from(uniqueStages.values());
      
      console.log(`✅ Descobertas ${stages.length} stages do Bitrix de ${itemsData.result.items.length} scouters`);
      
      return new Response(
        JSON.stringify({
          success: true,
          method: 'from_bitrix_api',
          stages: stages.map(s => ({
            STATUS_ID: s.id,
            NAME: s.name,
            ENTITY_ID: 'DYNAMIC_1096',
            SORT: 100,
            scouter_count: s.count
          })),
          total: stages.length,
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    throw new Error('Nenhuma stage encontrada no banco local ou no Bitrix');
  } catch (error) {
    console.error('Error discovering Bitrix stages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
