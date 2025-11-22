import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting scouters status synchronization...');

    // 1. Buscar scouters do bitrix_spa_entities com stage_id
    const { data: bitrixScouters, error: fetchError } = await supabase
      .from('bitrix_spa_entities')
      .select('bitrix_item_id, title, stage_id')
      .eq('entity_type_id', 1096)
      .not('stage_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching bitrix scouters:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${bitrixScouters?.length || 0} scouters with stage_id`);

    let updated = 0;
    let skipped = 0;
    let errors: string[] = [];

    if (bitrixScouters && bitrixScouters.length > 0) {
      for (const bitrixScouter of bitrixScouters) {
        // 2. Mapear stage_id para app_status
        const { data: mapping, error: mappingError } = await supabase
          .from('bitrix_stage_mapping')
          .select('app_status')
          .eq('entity_type_id', 1096)
          .eq('stage_id', bitrixScouter.stage_id)
          .maybeSingle();

        if (mappingError) {
          console.error(`Error fetching mapping for ${bitrixScouter.stage_id}:`, mappingError);
          errors.push(`Erro ao buscar mapeamento para stage ${bitrixScouter.stage_id}`);
          continue;
        }

        if (!mapping) {
          console.warn(`No mapping found for stage_id: ${bitrixScouter.stage_id}`);
          errors.push(`Stage ID ${bitrixScouter.stage_id} não mapeado (Scouter: ${bitrixScouter.title})`);
          skipped++;
          continue;
        }

        // 3. Atualizar status na tabela scouters
        const { error: updateError } = await supabase
          .from('scouters')
          .update({ 
            status: mapping.app_status,
            updated_at: new Date().toISOString()
          })
          .eq('bitrix_id', bitrixScouter.bitrix_item_id);

        if (updateError) {
          console.error(`Error updating scouter ${bitrixScouter.bitrix_item_id}:`, updateError);
          errors.push(`Erro ao atualizar scouter ${bitrixScouter.title}: ${updateError.message}`);
        } else {
          console.log(`✓ Updated scouter ${bitrixScouter.title} to status: ${mapping.app_status}`);
          updated++;
        }
      }
    }

    const result = {
      success: true,
      total: bitrixScouters?.length || 0,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    };

    console.log('Synchronization completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Fatal error in sync-scouters-status:', error);
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
