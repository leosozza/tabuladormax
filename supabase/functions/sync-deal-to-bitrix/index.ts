import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BITRIX_WEBHOOK_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr'

// Map negotiation status to Bitrix deal stage
const STATUS_TO_STAGE: Record<string, string> = {
  draft: 'NEW',
  in_progress: 'PREPARATION',
  pending_approval: 'PREPAYMENT_INVOICE',
  approved: 'WON',
  rejected: 'LOSE',
  completed: 'WON',
  cancelled: 'APOLOGY',
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

    const { negotiation_id, deal_id, status, fields } = await req.json()

    console.log(`[sync-deal-to-bitrix] Syncing deal ${deal_id}, status: ${status}`)

    // Get deal info
    let bitrixDealId: number | null = null

    if (deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('bitrix_deal_id')
        .eq('id', deal_id)
        .single()

      if (deal) {
        bitrixDealId = deal.bitrix_deal_id
      }
    }

    if (!bitrixDealId && negotiation_id) {
      const { data: negotiation } = await supabase
        .from('negotiations')
        .select('bitrix_deal_id')
        .eq('id', negotiation_id)
        .single()

      if (negotiation) {
        bitrixDealId = negotiation.bitrix_deal_id
      }
    }

    if (!bitrixDealId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No Bitrix deal ID found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update fields
    const updateFields: Record<string, any> = { ...fields }

    // Map status to stage
    if (status && STATUS_TO_STAGE[status]) {
      updateFields.STAGE_ID = STATUS_TO_STAGE[status]
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

    console.log(`[sync-deal-to-bitrix] Successfully updated deal ${bitrixDealId}`)

    return new Response(
      JSON.stringify({ success: true, bitrix_deal_id: bitrixDealId }),
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
