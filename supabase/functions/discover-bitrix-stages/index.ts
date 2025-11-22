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

    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '9/85e3cex48z1zc0qp';
    
    console.log('🔍 Discovering Bitrix stages for entity type 1096 (Scouters)...');

    // Buscar todas as status/stages para entity type 1096
    const statusUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.status.list.json?filter[ENTITY_ID]=DYNAMIC_1096_STAGE_20`;
    
    console.log('Fetching from:', statusUrl);
    const statusResponse = await fetch(statusUrl);
    
    if (!statusResponse.ok) {
      throw new Error(`HTTP error ${statusResponse.status} from Bitrix API`);
    }

    const statusData = await statusResponse.json();
    
    if (!statusData.result) {
      console.log('No stages found, trying alternative query...');
      
      // Tentar buscar scouters reais para ver seus stageIds
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
              uniqueStages.set(item.stageId, {
                id: item.stageId,
                name: `Stage ${item.stageId}`,
                count: 1
              });
            }
          }
        });
        
        const stages = Array.from(uniqueStages.values());
        
        console.log(`Found ${stages.length} unique stages from ${itemsData.result.items.length} scouters`);
        
        return new Response(
          JSON.stringify({
            success: true,
            method: 'from_items',
            stages: stages.map(s => ({
              STATUS_ID: s.id,
              NAME: s.name,
              ENTITY_ID: 'DYNAMIC_1096_STAGE_20',
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
    }

    const stages = statusData.result || [];
    
    console.log(`✅ Found ${stages.length} stages`);
    stages.forEach((stage: any) => {
      console.log(`  - ${stage.STATUS_ID}: ${stage.NAME} (Sort: ${stage.SORT})`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        method: 'from_status_list',
        stages,
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
