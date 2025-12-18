// Edge Function para sincronizar negociações do Bitrix em massa
// Busca deals por stage_id e cria/atualiza negociações correspondentes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de Stage do Bitrix → Status da Negociação
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
  'C1:UC_O2KDK6': 'ficha_preenchida',
  'C1:UC_MKIQ0S': 'atendimento_produtor',
  'C1:PREPARATION': 'ficha_preenchida',
  'C1:PREPAYMENT_INVOICE': 'atendimento_produtor',
  'C1:EXECUTING': 'atendimento_produtor',
  'C1:FINAL_INVOICE': 'atendimento_produtor',
  'C1:WON': 'realizado',
  'C1:LOSE': 'nao_realizado',
};

interface SyncRequest {
  stage_ids?: string[];
  status?: string;
  limit?: number;
  full_sync?: boolean;  // Sincroniza TODOS os deals da categoria
  sync_all?: boolean;   // Alias para full_sync (backwards compat)
}

interface BitrixDeal {
  ID: string;
  TITLE: string;
  STAGE_ID: string;
  CATEGORY_ID: string;
  OPPORTUNITY: string;
  CURRENCY_ID: string;
  COMPANY_ID?: string;
  CONTACT_ID?: string;
  LEAD_ID?: string;
  ASSIGNED_BY_ID?: string;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
  CLOSEDATE?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🔄 [sync-negotiations-from-bitrix] Iniciando sincronização...');

  try {
    const body: SyncRequest = await req.json().catch(() => ({}));
    const { 
      stage_ids = [],
      status,
      limit: requestedLimit,
      full_sync = false,
      sync_all = false 
    } = body;

    // full_sync ou sync_all ativa sincronização completa
    const isFullSync = full_sync || sync_all;
    
    // Se full_sync, não limita. Caso contrário, usa limite (default 100)
    const limit = isFullSync ? 999999 : (requestedLimit || 100);

    console.log('📝 Parâmetros:', { stage_ids, status, limit, isFullSync });

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configuração do Bitrix
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';

    // Buscar deals do Bitrix
    const deals: BitrixDeal[] = [];
    let start = 0;
    const batchSize = 50;

    // Construir filtros para o Bitrix
    const filters: Record<string, any> = {
      'CATEGORY_ID': 1, // Categoria Agenciamento
    };

    // Se não é full_sync e tem stage_ids específicos, aplica filtro
    if (!isFullSync && stage_ids.length > 0) {
      filters['STAGE_ID'] = stage_ids;
    }

    console.log('🔍 Buscando deals do Bitrix com filtros:', filters);

    // Paginação completa para buscar todos os deals
    while (deals.length < limit) {
      const filterParams = new URLSearchParams();
      filterParams.append('start', String(start));
      
      // Adicionar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v, i) => filterParams.append(`filter[${key}][${i}]`, String(v)));
        } else {
          filterParams.append(`filter[${key}]`, String(value));
        }
      });

      // Campos a retornar
      const selectFields = ['ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID', 'OPPORTUNITY', 'CURRENCY_ID', 
                          'CONTACT_ID', 'COMPANY_ID', 'LEAD_ID', 'ASSIGNED_BY_ID', 
                          'DATE_CREATE', 'DATE_MODIFY', 'CLOSEDATE'];
      selectFields.forEach(field => filterParams.append('select[]', field));

      const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.deal.list?${filterParams.toString()}`;
      console.log(`📡 Requisição Bitrix (start=${start}):`, bitrixUrl.substring(0, 100) + '...');

      const response = await fetch(bitrixUrl);
      const data = await response.json();

      if (!data.result || data.result.length === 0) {
        console.log('📭 Nenhum deal retornado nesta página');
        break;
      }

      deals.push(...data.result);
      console.log(`📥 Recebidos ${data.result.length} deals (total: ${deals.length})`);

      if (!data.next || deals.length >= limit) {
        break;
      }

      start = data.next;
    }

    // Limitar ao máximo solicitado
    const dealsToProcess = deals.slice(0, limit);
    console.log(`📋 Total de deals a processar: ${dealsToProcess.length}`);

    // Processar cada deal
    const results = {
      total: dealsToProcess.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const deal of dealsToProcess) {
      try {
        console.log(`\n🔄 Processando deal ${deal.ID}: ${deal.TITLE} (stage: ${deal.STAGE_ID})`);

        // Buscar dados do contato se houver
        let clientName = deal.TITLE || `Deal #${deal.ID}`;
        let clientPhone = null;
        let clientEmail = null;

        if (deal.CONTACT_ID) {
          try {
            const contactUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.contact.get?ID=${deal.CONTACT_ID}`;
            const contactResponse = await fetch(contactUrl);
            const contactData = await contactResponse.json();
            
            if (contactData.result) {
              const contact = contactData.result;
              clientName = [contact.NAME, contact.LAST_NAME].filter(Boolean).join(' ') || clientName;
              
              if (Array.isArray(contact.PHONE) && contact.PHONE.length > 0) {
                clientPhone = contact.PHONE[0]?.VALUE;
              }
              if (Array.isArray(contact.EMAIL) && contact.EMAIL.length > 0) {
                clientEmail = contact.EMAIL[0]?.VALUE;
              }
            }
          } catch (e) {
            console.warn('⚠️ Erro ao buscar contato:', e);
          }
        }

        const bitrixDealId = parseInt(deal.ID);
        const negotiationStatus = BITRIX_STAGE_TO_STATUS[deal.STAGE_ID] || 'inicial';
        const baseValue = deal.OPPORTUNITY ? parseFloat(deal.OPPORTUNITY) : 0;

        // VERIFICAR SE JÁ EXISTE NEGOTIATION POR bitrix_deal_id (evitar duplicatas)
        const { data: existingNegotiationByBitrix } = await supabase
          .from('negotiations')
          .select('id, status, deal_id')
          .eq('bitrix_deal_id', bitrixDealId)
          .maybeSingle();

        if (existingNegotiationByBitrix) {
          // SEMPRE atualizar o deal primeiro com o stage atual do Bitrix
          await upsertDeal(supabase, deal, bitrixDealId, clientName, clientPhone, clientEmail);
          
          // Verificar se o status mudou
          const oldStatus = existingNegotiationByBitrix.status;
          const statusChanged = oldStatus !== negotiationStatus;
          
          // Atualizar negociação existente (encontrada por bitrix_deal_id)
          const updateData: Record<string, any> = {
            status: negotiationStatus,
            client_name: clientName,
            client_phone: clientPhone,
            client_email: clientEmail,
            updated_at: new Date().toISOString(),
          };

          if (baseValue > 0) {
            updateData.base_value = baseValue;
            updateData.total_value = baseValue;
          }

          const { error: updateNegError } = await supabase
            .from('negotiations')
            .update(updateData)
            .eq('id', existingNegotiationByBitrix.id);

          if (updateNegError) {
            console.warn('⚠️ Erro ao atualizar negociação:', updateNegError);
            results.errors++;
          } else {
            results.updated++;
            if (statusChanged) {
              console.log(`✅ Negociação atualizada: ${existingNegotiationByBitrix.id} (${oldStatus} → ${negotiationStatus}) [stage: ${deal.STAGE_ID}]`);
            } else {
              console.log(`✅ Negociação mantida: ${existingNegotiationByBitrix.id} (status: ${negotiationStatus}) [stage: ${deal.STAGE_ID}]`);
            }
          }

          results.details.push({
            bitrix_deal_id: deal.ID,
            title: deal.TITLE,
            status: negotiationStatus,
            action: 'updated',
            success: true,
          });

          continue;
        }

        // Se não existe negotiation por bitrix_deal_id, verificar/criar deal primeiro
        let dealId: string;

        const { data: existingDeal } = await supabase
          .from('deals')
          .select('id')
          .eq('bitrix_deal_id', bitrixDealId)
          .maybeSingle();

        if (existingDeal) {
          // Atualizar deal existente
          const { data: updatedDeal, error: updateError } = await supabase
            .from('deals')
            .update({
              title: deal.TITLE,
              stage_id: deal.STAGE_ID,
              category_id: deal.CATEGORY_ID,
              opportunity: deal.OPPORTUNITY ? parseFloat(deal.OPPORTUNITY) : null,
              client_name: clientName,
              client_phone: clientPhone,
              client_email: clientEmail,
              date_modify: deal.DATE_MODIFY ? new Date(deal.DATE_MODIFY).toISOString() : null,
              last_sync_at: new Date().toISOString(),
              sync_status: 'synced',
            })
            .eq('id', existingDeal.id)
            .select()
            .single();

          if (updateError) throw updateError;
          dealId = updatedDeal.id;
          console.log(`✅ Deal atualizado: ${dealId}`);
        } else {
          // Criar novo deal
          const dealData = {
            bitrix_deal_id: bitrixDealId,
            title: deal.TITLE || `Deal #${deal.ID}`,
            stage_id: deal.STAGE_ID,
            category_id: deal.CATEGORY_ID,
            opportunity: deal.OPPORTUNITY ? parseFloat(deal.OPPORTUNITY) : null,
            currency_id: deal.CURRENCY_ID,
            company_id: deal.COMPANY_ID ? parseInt(deal.COMPANY_ID) : null,
            contact_id: deal.CONTACT_ID ? parseInt(deal.CONTACT_ID) : null,
            bitrix_lead_id: deal.LEAD_ID ? parseInt(deal.LEAD_ID) : null,
            assigned_by_id: deal.ASSIGNED_BY_ID ? parseInt(deal.ASSIGNED_BY_ID) : null,
            created_date: deal.DATE_CREATE ? new Date(deal.DATE_CREATE).toISOString() : null,
            close_date: deal.CLOSEDATE && deal.CLOSEDATE !== '' ? new Date(deal.CLOSEDATE).toISOString() : null,
            date_modify: deal.DATE_MODIFY ? new Date(deal.DATE_MODIFY).toISOString() : null,
            client_name: clientName,
            client_phone: clientPhone,
            client_email: clientEmail,
            raw: deal,
            last_sync_at: new Date().toISOString(),
            sync_status: 'synced',
          };

          const { data: newDeal, error: insertError } = await supabase
            .from('deals')
            .insert(dealData)
            .select()
            .single();

          if (insertError) throw insertError;
          dealId = newDeal.id;
          console.log(`✅ Deal criado: ${dealId}`);
        }

        // Verificar novamente se existe negociação por deal_id (caso raro)
        const { data: existingNegByDeal } = await supabase
          .from('negotiations')
          .select('id, status')
          .eq('deal_id', dealId)
          .maybeSingle();

        if (existingNegByDeal) {
          // Atualizar negociação existente (encontrada por deal_id)
          const updateData: Record<string, any> = {
            bitrix_deal_id: bitrixDealId, // Garantir que bitrix_deal_id está preenchido
            status: negotiationStatus,
            client_name: clientName,
            client_phone: clientPhone,
            client_email: clientEmail,
            updated_at: new Date().toISOString(),
          };

          if (baseValue > 0) {
            updateData.base_value = baseValue;
            updateData.total_value = baseValue;
          }

          const { error: updateNegError } = await supabase
            .from('negotiations')
            .update(updateData)
            .eq('id', existingNegByDeal.id);

          if (updateNegError) {
            console.warn('⚠️ Erro ao atualizar negociação:', updateNegError);
            results.errors++;
          } else {
            results.updated++;
            console.log(`✅ Negociação atualizada (via deal_id): ${existingNegByDeal.id} (${existingNegByDeal.status} → ${negotiationStatus})`);
          }
        } else {
          // Criar nova negociação
          const negotiationData = {
            deal_id: dealId,
            bitrix_deal_id: bitrixDealId,
            title: deal.TITLE || `Negociação #${deal.ID}`,
            client_name: clientName,
            client_phone: clientPhone,
            client_email: clientEmail,
            status: negotiationStatus,
            base_value: baseValue,
            total_value: baseValue,
            start_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: newNegotiation, error: createNegError } = await supabase
            .from('negotiations')
            .insert(negotiationData)
            .select()
            .single();

          if (createNegError) {
            console.warn('⚠️ Erro ao criar negociação:', createNegError);
            results.errors++;
          } else {
            results.created++;
            console.log(`✅ Negociação criada: ${newNegotiation.id} (status: ${negotiationStatus})`);
          }
        }

        results.details.push({
          bitrix_deal_id: deal.ID,
          title: deal.TITLE,
          status: negotiationStatus,
          action: existingNegByDeal ? 'updated' : 'created',
          success: true,
        });

      } catch (error) {
        console.error(`❌ Erro ao processar deal ${deal.ID}:`, error);
        results.errors++;
        results.details.push({
          bitrix_deal_id: deal.ID,
          title: deal.TITLE,
          error: String(error),
          success: false,
        });
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n✅ [sync-negotiations-from-bitrix] Sincronização concluída em ${processingTime}ms`);
    console.log(`📊 Resultados: ${results.created} criadas, ${results.updated} atualizadas, ${results.skipped} puladas, ${results.errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [sync-negotiations-from-bitrix] Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        error: String(error),
        processingTime: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function para upsert deal
async function upsertDeal(
  supabase: any,
  deal: BitrixDeal, 
  bitrixDealId: number,
  clientName: string, 
  clientPhone: string | null, 
  clientEmail: string | null
) {
  const { data: existingDeal } = await supabase
    .from('deals')
    .select('id')
    .eq('bitrix_deal_id', bitrixDealId)
    .maybeSingle();

  const dealData = {
    title: deal.TITLE,
    stage_id: deal.STAGE_ID,
    category_id: deal.CATEGORY_ID,
    opportunity: deal.OPPORTUNITY ? parseFloat(deal.OPPORTUNITY) : null,
    client_name: clientName,
    client_phone: clientPhone,
    client_email: clientEmail,
    date_modify: deal.DATE_MODIFY ? new Date(deal.DATE_MODIFY).toISOString() : null,
    last_sync_at: new Date().toISOString(),
    sync_status: 'synced',
  };

  if (existingDeal) {
    await supabase
      .from('deals')
      .update(dealData)
      .eq('id', existingDeal.id);
  } else {
    await supabase
      .from('deals')
      .insert({
        bitrix_deal_id: bitrixDealId,
        ...dealData,
        currency_id: deal.CURRENCY_ID,
        company_id: deal.COMPANY_ID ? parseInt(deal.COMPANY_ID) : null,
        contact_id: deal.CONTACT_ID ? parseInt(deal.CONTACT_ID) : null,
        bitrix_lead_id: deal.LEAD_ID ? parseInt(deal.LEAD_ID) : null,
        assigned_by_id: deal.ASSIGNED_BY_ID ? parseInt(deal.ASSIGNED_BY_ID) : null,
        created_date: deal.DATE_CREATE ? new Date(deal.DATE_CREATE).toISOString() : null,
        close_date: deal.CLOSEDATE && deal.CLOSEDATE !== '' ? new Date(deal.CLOSEDATE).toISOString() : null,
        raw: deal,
      });
  }
}