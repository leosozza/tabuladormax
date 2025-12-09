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
  BEGINDATE: string
  COMMENTS: string
  PHONE?: Array<{ VALUE: string }>
  EMAIL?: Array<{ VALUE: string }>
  CLIENT_NAME?: string
  // Campos personalizados do Bitrix (UF_CRM_*)
  [key: string]: any
}

const BITRIX_WEBHOOK_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr'

// Stages que devem ser EXCLUÍDOS (deals convertidos/finalizados)
const EXCLUDED_STAGES = ['C1:WON', 'C1:LOSE', 'WON', 'LOSE']

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
  'C1:NEW': 'inicial',                    // Recepção - Cadastro atendimento
  'C1:UC_O2KDK6': 'ficha_preenchida',     // Fichas Preenchidas
  'C1:UC_MKIQ0S': 'atendimento_produtor', // Atendimento Produtor
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

// Extrai métodos de pagamento do deal
function extractPaymentMethods(deal: BitrixDeal): any {
  const methods: any[] = []
  
  // Campo de tipo de pagamento
  if (deal['UF_CRM_1762880287']) {
    methods.push({ type: deal['UF_CRM_1762880287'], label: 'Tipo Pagamento' })
  }
  
  // Forma de pagamento
  if (deal['UF_CRM_1763145001890']) {
    methods.push({ type: 'parcelas', details: deal['UF_CRM_1763145001890'] })
  }
  
  return methods.length > 0 ? methods : null
}

// Extrai número de parcelas
function extractInstallments(deal: BitrixDeal): number | null {
  // Campo de quantidade de parcelas
  const parcelas = deal['UF_CRM_1763145001'] || deal['UF_CRM_PARCELAS']
  if (parcelas) {
    const num = parseInt(String(parcelas))
    return isNaN(num) ? null : num
  }
  return null
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

    const { action, deal_id, filters, limit, excludeConverted = true } = await req.json()

    console.log(`[sync-deals] Action: ${action}, deal_id: ${deal_id}, filters:`, filters, `excludeConverted: ${excludeConverted}`)

    if (action === 'sync_single' && deal_id) {
      // Sync a single deal
      const deal = await fetchDealFromBitrix(deal_id)
      if (deal) {
        // Check if should exclude converted deals
        if (excludeConverted && EXCLUDED_STAGES.includes(deal.STAGE_ID)) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Deal is converted/closed and excluded from sync',
            stage: deal.STAGE_ID
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        
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
      // Sync all deals or a batch - with filter for non-converted only
      const deals = await fetchDealsFromBitrix(filters, limit || 50, excludeConverted)
      console.log(`[sync-deals] Fetched ${deals.length} deals from Bitrix (excludeConverted: ${excludeConverted})`)

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
          excludedStages: EXCLUDED_STAGES,
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
  limit = 50,
  excludeConverted = true
): Promise<BitrixDeal[]> {
  try {
    let url = `${BITRIX_WEBHOOK_URL}/crm.deal.list.json?select[]=*&order[DATE_CREATE]=DESC`

    // Add filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        url += `&filter[${key}]=${encodeURIComponent(String(value))}`
      })
    }

    // Exclude converted/closed stages
    if (excludeConverted) {
      EXCLUDED_STAGES.forEach(stage => {
        url += `&filter[!STAGE_ID][]=${encodeURIComponent(stage)}`
      })
    }

    console.log(`[sync-deals] Fetching deals with URL: ${url}`)

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Bitrix API error: ${response.status}`)

    const data = await response.json()
    const deals = (data.result || []).slice(0, limit)

    console.log(`[sync-deals] Got ${deals.length} deals from Bitrix API`)

    // Fetch assigned user names and contact info
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

  // Try to find the producer by PARENT_ID_1156
  let producerId: string | null = null
  const bitrixProducerId = bitrixDeal['PARENT_ID_1156']
  if (bitrixProducerId) {
    console.log(`[sync-deals] Deal ${bitrixDeal.ID} has PARENT_ID_1156: ${bitrixProducerId}`)
    const { data: producer } = await supabase
      .from('producers')
      .select('id')
      .eq('bitrix_id', parseInt(String(bitrixProducerId)))
      .single()

    if (producer) {
      producerId = producer.id
      console.log(`[sync-deals] Linked to producer: ${producerId}`)
    } else {
      console.log(`[sync-deals] Producer not found for bitrix_id: ${bitrixProducerId}`)
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
    producer_id: producerId,
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
    raw: bitrixDeal, // Salva TODOS os campos do Bitrix
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

  console.log(`[sync-deals] Upserted deal ${deal.id} (Bitrix ID: ${bitrixDeal.ID}, Stage: ${bitrixDeal.STAGE_ID})`)

  // Check if negotiation already exists for this deal
  const { data: existingNegotiation } = await supabase
    .from('negotiations')
    .select('id, status')
    .eq('deal_id', deal.id)
    .maybeSingle()

  let negotiation = existingNegotiation
  let negotiationCreated = false

  if (!existingNegotiation) {
    // Create new negotiation with all mapped fields
    const negotiationStatus = mapBitrixStageToStatus(bitrixDeal.STAGE_ID)
    const opportunityValue = parseFloat(bitrixDeal.OPPORTUNITY) || 0

    // Extract additional fields from Bitrix deal
    const clientDocument = bitrixDeal['UF_CRM_1762868654'] || null // CPF
    const paymentMethods = extractPaymentMethods(bitrixDeal)
    const installmentsCount = extractInstallments(bitrixDeal)
    const firstInstallmentDate = bitrixDeal['UF_CRM_1763145001890'] || null

    const negotiationData: any = {
      deal_id: deal.id,
      bitrix_deal_id: parseInt(bitrixDeal.ID),
      title: bitrixDeal.TITLE || 'Negociação sem título',
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      client_document: clientDocument,
      status: negotiationStatus,
      base_value: opportunityValue,
      total_value: opportunityValue,
      start_date: bitrixDeal.BEGINDATE 
        ? new Date(bitrixDeal.BEGINDATE).toISOString() 
        : (bitrixDeal.DATE_CREATE ? new Date(bitrixDeal.DATE_CREATE).toISOString() : new Date().toISOString()),
      end_date: bitrixDeal.CLOSEDATE ? new Date(bitrixDeal.CLOSEDATE).toISOString() : null,
      notes: bitrixDeal.COMMENTS || null,
    }

    // Only add optional fields if they have values
    if (paymentMethods) negotiationData.payment_methods = paymentMethods
    if (installmentsCount) negotiationData.installments_count = installmentsCount
    if (firstInstallmentDate) negotiationData.first_installment_date = firstInstallmentDate

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
      console.log(`[sync-deals] Created negotiation ${newNegotiation.id} for deal ${deal.id} (status: ${negotiationStatus})`)
    }
  } else {
    console.log(`[sync-deals] Negotiation already exists for deal ${deal.id}: ${existingNegotiation.id}`)
  }

  return { deal, negotiation, negotiationCreated }
}
