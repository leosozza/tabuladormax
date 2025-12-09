import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BitrixDeal {
  ID: string
  TITLE: string
  STAGE_ID: string
  CATEGORY_ID: string
  OPPORTUNITY: string
  CURRENCY_ID: string
  LEAD_ID: string
  CONTACT_ID: string
  COMPANY_ID: string
  ASSIGNED_BY_ID: string
  ASSIGNED_BY_NAME?: string
  DATE_CREATE: string
  DATE_MODIFY: string
  CLOSEDATE: string
  PHONE?: Array<{ VALUE: string }>
  EMAIL?: Array<{ VALUE: string }>
  [key: string]: any
}

const BITRIX_WEBHOOK_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr'

// Mapeamento de stages do Bitrix para status de negociação
// Status válidos: inicial, ficha_preenchida, atendimento_produtor, realizado, nao_realizado
const BITRIX_STAGE_TO_STATUS: Record<string, string> = {
  'NEW': 'inicial',
  'PREPARATION': 'ficha_preenchida',
  'PREPAYMENT_INVOICE': 'atendimento_produtor',
  'EXECUTING': 'atendimento_produtor',
  'FINAL_INVOICE': 'atendimento_produtor',
  'WON': 'realizado',
  'LOSE': 'nao_realizado',
  'APOLOGY': 'nao_realizado',
  // Stages da categoria 1 (Agenciamento)
  'C1:NEW': 'inicial',
  'C1:PREPARATION': 'ficha_preenchida',
  'C1:PREPAYMENT_INVOICE': 'atendimento_produtor',
  'C1:EXECUTING': 'atendimento_produtor',
  'C1:FINAL_INVOICE': 'atendimento_produtor',
  'C1:WON': 'realizado',
  'C1:LOSE': 'nao_realizado',
}

function mapBitrixStageToStatus(stageId: string | null): string {
  if (!stageId) return 'inicial'
  return BITRIX_STAGE_TO_STATUS[stageId] || 'inicial'
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

    const { action, deal_id, filters, limit } = await req.json()

    console.log(`[sync-deals] Action: ${action}, deal_id: ${deal_id}, filters:`, filters)

    if (action === 'sync_single' && deal_id) {
      // Sync a single deal
      const deal = await fetchDealFromBitrix(deal_id)
      if (deal) {
        const result = await upsertDealWithNegotiation(supabase, deal)
        return new Response(JSON.stringify({ success: true, deal: result.deal, negotiation: result.negotiation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: false, error: 'Deal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'sync_all' || action === 'sync_batch') {
      // Sync all deals or a batch
      const deals = await fetchDealsFromBitrix(filters, limit || 50)
      console.log(`[sync-deals] Fetched ${deals.length} deals from Bitrix`)

      const results = []
      let negotiationsCreated = 0
      
      for (const deal of deals) {
        try {
          const result = await upsertDealWithNegotiation(supabase, deal)
          results.push({ id: deal.ID, success: true, negotiationCreated: result.negotiationCreated })
          if (result.negotiationCreated) negotiationsCreated++
        } catch (error) {
          console.error(`[sync-deals] Error syncing deal ${deal.ID}:`, error)
          results.push({ id: deal.ID, success: false, error: String(error) })
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          synced: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          negotiationsCreated,
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'list') {
      // Just list deals from database
      const { data: deals, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(limit || 50)

      if (error) throw error

      return new Response(JSON.stringify({ success: true, deals }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[sync-deals] Error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function fetchDealFromBitrix(dealId: string): Promise<BitrixDeal | null> {
  try {
    const response = await fetch(`${BITRIX_WEBHOOK_URL}/crm.deal.get.json?id=${dealId}`)
    if (!response.ok) return null

    const data = await response.json()
    return data.result || null
  } catch (error) {
    console.error(`[sync-deals] Error fetching deal ${dealId}:`, error)
    return null
  }
}

async function fetchDealsFromBitrix(
  filters?: Record<string, any>,
  limit = 50
): Promise<BitrixDeal[]> {
  try {
    let url = `${BITRIX_WEBHOOK_URL}/crm.deal.list.json?select[]=*&order[DATE_CREATE]=DESC`

    // Add filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        url += `&filter[${key}]=${encodeURIComponent(String(value))}`
      })
    }

    console.log(`[sync-deals] Fetching deals with URL: ${url}`)

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Bitrix API error: ${response.status}`)

    const data = await response.json()
    const deals = (data.result || []).slice(0, limit)

    console.log(`[sync-deals] Got ${deals.length} deals from Bitrix API`)

    // Fetch assigned user names
    for (const deal of deals) {
      if (deal.ASSIGNED_BY_ID) {
        try {
          const userResponse = await fetch(
            `${BITRIX_WEBHOOK_URL}/user.get.json?ID=${deal.ASSIGNED_BY_ID}`
          )
          if (userResponse.ok) {
            const userData = await userResponse.json()
            if (userData.result?.[0]) {
              deal.ASSIGNED_BY_NAME = `${userData.result[0].NAME || ''} ${userData.result[0].LAST_NAME || ''}`.trim()
            }
          }
        } catch (e) {
          // Ignore user fetch errors
        }
      }

      // Fetch contact info if available
      if (deal.CONTACT_ID) {
        try {
          const contactResponse = await fetch(
            `${BITRIX_WEBHOOK_URL}/crm.contact.get.json?id=${deal.CONTACT_ID}`
          )
          if (contactResponse.ok) {
            const contactData = await contactResponse.json()
            if (contactData.result) {
              const contact = contactData.result
              deal.CLIENT_NAME = `${contact.NAME || ''} ${contact.LAST_NAME || ''}`.trim() || deal.TITLE
              deal.PHONE = contact.PHONE
              deal.EMAIL = contact.EMAIL
            }
          }
        } catch (e) {
          // Ignore contact fetch errors
        }
      }
    }

    return deals
  } catch (error) {
    console.error('[sync-deals] Error fetching deals:', error)
    return []
  }
}

async function upsertDealWithNegotiation(supabase: any, bitrixDeal: BitrixDeal) {
  // Try to find the local lead
  let leadId: number | null = null
  if (bitrixDeal.LEAD_ID) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', parseInt(bitrixDeal.LEAD_ID))
      .single()

    if (lead) {
      leadId = lead.id
    }
  }

  // Extract client info
  const clientName = bitrixDeal.CLIENT_NAME || bitrixDeal.TITLE || 'Cliente não identificado'
  const clientPhone = bitrixDeal.PHONE?.[0]?.VALUE || null
  const clientEmail = bitrixDeal.EMAIL?.[0]?.VALUE || null

  const dealData = {
    bitrix_deal_id: parseInt(bitrixDeal.ID),
    bitrix_lead_id: bitrixDeal.LEAD_ID ? parseInt(bitrixDeal.LEAD_ID) : null,
    lead_id: leadId,
    title: bitrixDeal.TITLE || 'Deal sem título',
    stage_id: bitrixDeal.STAGE_ID,
    category_id: bitrixDeal.CATEGORY_ID,
    opportunity: parseFloat(bitrixDeal.OPPORTUNITY) || 0,
    currency_id: bitrixDeal.CURRENCY_ID || 'BRL',
    contact_id: bitrixDeal.CONTACT_ID ? parseInt(bitrixDeal.CONTACT_ID) : null,
    company_id: bitrixDeal.COMPANY_ID ? parseInt(bitrixDeal.COMPANY_ID) : null,
    client_name: clientName,
    client_phone: clientPhone,
    client_email: clientEmail,
    assigned_by_id: bitrixDeal.ASSIGNED_BY_ID ? parseInt(bitrixDeal.ASSIGNED_BY_ID) : null,
    assigned_by_name: bitrixDeal.ASSIGNED_BY_NAME || null,
    created_date: bitrixDeal.DATE_CREATE ? new Date(bitrixDeal.DATE_CREATE).toISOString() : null,
    close_date: bitrixDeal.CLOSEDATE ? new Date(bitrixDeal.CLOSEDATE).toISOString() : null,
    date_modify: bitrixDeal.DATE_MODIFY ? new Date(bitrixDeal.DATE_MODIFY).toISOString() : null,
    raw: bitrixDeal,
    sync_status: 'synced',
    last_sync_at: new Date().toISOString(),
  }

  // Upsert by bitrix_deal_id
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .upsert(dealData, { onConflict: 'bitrix_deal_id' })
    .select()
    .single()

  if (dealError) throw dealError

  console.log(`[sync-deals] Upserted deal ${deal.id} (Bitrix ID: ${bitrixDeal.ID})`)

  // Check if negotiation already exists for this deal
  const { data: existingNegotiation } = await supabase
    .from('negotiations')
    .select('id, status')
    .eq('deal_id', deal.id)
    .maybeSingle()

  let negotiation = existingNegotiation
  let negotiationCreated = false

  if (!existingNegotiation) {
    // Create new negotiation
    const negotiationStatus = mapBitrixStageToStatus(bitrixDeal.STAGE_ID)
    const opportunityValue = parseFloat(bitrixDeal.OPPORTUNITY) || 0

    const negotiationData = {
      deal_id: deal.id,
      bitrix_deal_id: parseInt(bitrixDeal.ID),
      title: bitrixDeal.TITLE || 'Negociação sem título',
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      status: negotiationStatus,
      base_value: opportunityValue,
      total_value: opportunityValue,
      start_date: bitrixDeal.DATE_CREATE ? new Date(bitrixDeal.DATE_CREATE).toISOString() : new Date().toISOString(),
    }

    const { data: newNegotiation, error: negError } = await supabase
      .from('negotiations')
      .insert(negotiationData)
      .select()
      .single()

    if (negError) {
      console.error(`[sync-deals] Error creating negotiation for deal ${deal.id}:`, negError)
    } else {
      negotiation = newNegotiation
      negotiationCreated = true
      console.log(`[sync-deals] Created negotiation ${newNegotiation.id} for deal ${deal.id}`)
    }
  } else {
    console.log(`[sync-deals] Negotiation already exists for deal ${deal.id}: ${existingNegotiation.id}`)
  }

  return { deal, negotiation, negotiationCreated }
}
