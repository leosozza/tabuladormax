import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BITRIX_WEBHOOK_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr'

// Fallback mapping - used when pipeline config not found
const DEFAULT_STATUS_TO_STAGE: Record<string, string> = {
  recepcao_cadastro: 'C1:NEW',
  ficha_preenchida: 'C1:UC_O2KDK6',
  atendimento_produtor: 'C1:EXECUTING',
  negocios_fechados: 'C1:WON',
  contrato_nao_fechado: 'C1:LOSE',
  analisar: 'C1:UC_MKIQ0S',
}

interface PipelineConfig {
  id: string;
  stage_mapping: {
    stages: Record<string, string>;
    reverse: Record<string, string>;
  };
}

// Get stage mapping from pipeline config
async function getStageMapping(supabase: any, pipelineId: string | null): Promise<Record<string, string>> {
  if (!pipelineId) {
    return DEFAULT_STATUS_TO_STAGE;
  }

  const { data: config } = await supabase
    .from('pipeline_configs')
    .select('stage_mapping')
    .eq('id', pipelineId)
    .maybeSingle();

  if (config?.stage_mapping?.reverse) {
    return config.stage_mapping.reverse;
  }

  return DEFAULT_STATUS_TO_STAGE;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { negotiation_id, deal_id, status, fields, pipeline_id } = await req.json()

    console.log(`[sync-deal-to-bitrix] Syncing deal ${deal_id}, status: ${status}, pipeline: ${pipeline_id}`)

    // Get deal info and pipeline_id
    let bitrixDealId: number | null = null
    let pipelineId: string | null = pipeline_id || null

    if (deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('bitrix_deal_id, category_id')
        .eq('id', deal_id)
        .single()

      if (deal) {
        bitrixDealId = deal.bitrix_deal_id
        if (!pipelineId && deal.category_id) {
          pipelineId = String(deal.category_id)
        }
      }
    }

    if (!bitrixDealId && negotiation_id) {
      const { data: negotiation } = await supabase
        .from('negotiations')
        .select('bitrix_deal_id, pipeline_id')
        .eq('id', negotiation_id)
        .single()

      if (negotiation) {
        bitrixDealId = negotiation.bitrix_deal_id
        if (!pipelineId && negotiation.pipeline_id) {
          pipelineId = negotiation.pipeline_id
        }
      }
    }

    if (!bitrixDealId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No Bitrix deal ID found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get dynamic stage mapping based on pipeline
    const statusToStage = await getStageMapping(supabase, pipelineId)

    // Prepare update fields
    const updateFields: Record<string, any> = { ...fields }

    // Map status to stage using dynamic mapping
    if (status && statusToStage[status]) {
      updateFields.STAGE_ID = statusToStage[status]
      console.log(`[sync-deal-to-bitrix] Mapping status "${status}" to stage "${statusToStage[status]}" (pipeline: ${pipelineId})`)
    }
    // Update in Bitrix
    const response = await fetch(`${BITRIX_WEBHOOK_URL}/crm.deal.update.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: bitrixDealId,
        fields: updateFields,
      }),
    })

    if (!response.ok) {
      throw new Error(`Bitrix API error: ${response.status}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error_description || result.error)
    }

    console.log(`[sync-deal-to-bitrix] Successfully updated deal ${bitrixDealId} with stage ${updateFields.STAGE_ID}`)

    return new Response(
      JSON.stringify({ success: true, bitrix_deal_id: bitrixDealId, stage: updateFields.STAGE_ID }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[sync-deal-to-bitrix] Error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
