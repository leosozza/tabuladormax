// Edge Function para sincronizar negociações do Bitrix em massa
// Busca deals por stage_id e cria/atualiza negociações correspondentes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de Stage do Bitrix → Status da Negociação
// Alinhado EXATAMENTE com Bitrix - Categoria 1 (Pinheiros)
const BITRIX_STAGE_TO_STATUS: Record<string, string> = {
  // Categoria 1 - Pinheiros (Stage IDs CORRETOS)
  'C1:NEW': 'recepcao_cadastro',           // "Recepção - Cadastro atendimento" (0 deals)
  'C1:UC_O2KDK6': 'ficha_preenchida',      // "Ficha Preenchida" (1 deal)
  'C1:EXECUTING': 'atendimento_produtor',  // "Atendimento Produtor" (0 deals)
  'C1:WON': 'negocios_fechados',           // "Negócios Fechados" (269 deals)
  'C1:LOSE': 'contrato_nao_fechado',       // "Contrato não fechado" (257 deals)
  'C1:UC_MKIQ0S': 'analisar',              // "Analisar" (846 deals)
  
  // Fallback para stages genéricos (outras categorias)
  'NEW': 'recepcao_cadastro',
  'PREPARATION': 'ficha_preenchida',
  'PREPAYMENT_INVOICE': 'atendimento_produtor',
  'EXECUTING': 'atendimento_produtor',
  'FINAL_INVOICE': 'atendimento_produtor',
  'WON': 'negocios_fechados',
  'LOSE': 'contrato_nao_fechado',
  'APOLOGY': 'contrato_nao_fechado',
};

interface SyncRequest {
  stage_ids?: string[];
  status?: string;
  limit?: number;
  full_sync?: boolean;  // Sincroniza TODOS os deals da categoria
  sync_all?: boolean;   // Alias para full_sync (backwards compat)
  sync_active_only?: boolean; // Modo inverso: busca negotiations ativas e verifica no Bitrix
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
      sync_all = false,
      sync_active_only = false
    } = body;

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configuração do Bitrix
    const bitrixDomain = 'maxsystem.bitrix24.com.br';
    const bitrixToken = Deno.env.get('BITRIX_REST_TOKEN') || '7/338m945lx9ifjjnr';

    // ========== MODO SYNC_ACTIVE_ONLY ==========
    // Busca negotiations locais com status ativo e verifica o stage atual no Bitrix
    if (sync_active_only) {
      console.log('🔄 [MODO SYNC_ACTIVE_ONLY] Buscando negotiations ativas locais...');
      
      const activeStatuses = ['recepcao_cadastro', 'ficha_preenchida', 'atendimento_produtor'];
      
      // Buscar todas as negotiations ativas que têm bitrix_deal_id
      const { data: activeNegotiations, error: fetchError } = await supabase
        .from('negotiations')
        .select('id, bitrix_deal_id, status, title')
        .in('status', activeStatuses)
        .not('bitrix_deal_id', 'is', null);
      
      if (fetchError) {
        throw new Error(`Erro ao buscar negotiations ativas: ${fetchError.message}`);
      }

      console.log(`📋 Encontradas ${activeNegotiations?.length || 0} negotiations ativas com bitrix_deal_id`);

      const results = {
        total: activeNegotiations?.length || 0,
        updated: 0,
        unchanged: 0,
        errors: 0,
        details: [] as any[],
      };

      // Para cada negotiation ativa, consultar o Bitrix
      for (const neg of activeNegotiations || []) {
        try {
          // Consultar deal no Bitrix
          const bitrixUrl = `https://${bitrixDomain}/rest/${bitrixToken}/crm.deal.get?ID=${neg.bitrix_deal_id}`;
          const response = await fetch(bitrixUrl);
          const data = await response.json();

          if (!data.result) {
            console.warn(`⚠️ Deal ${neg.bitrix_deal_id} não encontrado no Bitrix`);
            results.errors++;
            results.details.push({
              negotiation_id: neg.id,
              bitrix_deal_id: neg.bitrix_deal_id,
              error: 'Deal não encontrado no Bitrix',
            });
            continue;
          }

          const deal = data.result;
          const currentBitrixStage = deal.STAGE_ID;
          const newStatus = BITRIX_STAGE_TO_STATUS[currentBitrixStage] || 'recepcao_cadastro';
          const oldStatus = neg.status;

          // Atualizar deal local com o stage atual
          await supabase
            .from('deals')
            .update({
              stage_id: currentBitrixStage,
              date_modify: deal.DATE_MODIFY ? new Date(deal.DATE_MODIFY).toISOString() : null,
              last_sync_at: new Date().toISOString(),
            })
            .eq('bitrix_deal_id', neg.bitrix_deal_id);

          // Verificar se o status mudou
          if (oldStatus !== newStatus) {
            // Atualizar a negotiation
            const { error: updateError } = await supabase
              .from('negotiations')
              .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', neg.id);

            if (updateError) {
              console.error(`❌ Erro ao atualizar negotiation ${neg.id}:`, updateError);
              results.errors++;
            } else {
              results.updated++;
              console.log(`✅ ${neg.title}: ${oldStatus} → ${newStatus} [stage: ${currentBitrixStage}]`);
            }

            results.details.push({
              negotiation_id: neg.id,
              bitrix_deal_id: neg.bitrix_deal_id,
              title: neg.title,
              old_status: oldStatus,
              new_status: newStatus,
              bitrix_stage: currentBitrixStage,
              changed: true,
            });
          } else {
            results.unchanged++;
            console.log(`⏭️ ${neg.title}: mantido em ${oldStatus} [stage: ${currentBitrixStage}]`);
            
            results.details.push({
              negotiation_id: neg.id,
              bitrix_deal_id: neg.bitrix_deal_id,
              title: neg.title,
              status: oldStatus,
              bitrix_stage: currentBitrixStage,
              changed: false,
            });
          }
        } catch (error) {
          console.error(`❌ Erro ao processar negotiation ${neg.id}:`, error);
          results.errors++;
          results.details.push({
            negotiation_id: neg.id,
            bitrix_deal_id: neg.bitrix_deal_id,
            error: String(error),
          });
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`\n✅ [sync_active_only] Concluído em ${processingTime}ms`);
      console.log(`📊 Resultados: ${results.updated} atualizados, ${results.unchanged} sem mudança, ${results.errors} erros`);

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'sync_active_only',
          ...results,
          processingTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODO PADRÃO (buscar do Bitrix) ==========
    // full_sync ou sync_all ativa sincronização completa
    const isFullSync = full_sync || sync_all;
    
    // Se full_sync, não limita. Caso contrário, usa limite (default 100)
    const limit = isFullSync ? 999999 : (requestedLimit || 100);

    console.log('📝 Parâmetros:', { stage_ids, status, limit, isFullSync });

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
        const negotiationStatus = BITRIX_STAGE_TO_STATUS[deal.STAGE_ID] || 'recepcao_cadastro';
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

          const { error: updateError } = await supabase
            .from('negotiations')
            .update(updateData)
            .eq('id', existingNegByDeal.id);

          if (updateError) {
            console.warn('⚠️ Erro ao atualizar negociação:', updateError);
            results.errors++;
          } else {
            results.updated++;
            console.log(`✅ Negociação (por deal_id) atualizada: ${existingNegByDeal.id}`);
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
          discount_percentage: 0,
          discount_value: 0,
          final_value: baseValue,
          payment_methods: [],
          installments_number: 1,
          installment_value: baseValue,
          payment_frequency: 'monthly',
          additional_fees: 0,
          tax_percentage: 0,
          tax_value: 0,
          total_value: baseValue,
          negotiation_date: deal.DATE_CREATE ? new Date(deal.DATE_CREATE).toISOString() : new Date().toISOString(),
          items: [],
        };

        const { error: insertNegError } = await supabase
          .from('negotiations')
          .insert(negotiationData);

        if (insertNegError) {
          console.error('❌ Erro ao criar negociação:', insertNegError);
          results.errors++;
          results.details.push({
            bitrix_deal_id: deal.ID,
            title: deal.TITLE,
            error: insertNegError.message,
            action: 'create_failed',
          });
        } else {
          results.created++;
          console.log(`✅ Negociação criada para deal ${deal.ID}`);
          results.details.push({
            bitrix_deal_id: deal.ID,
            title: deal.TITLE,
            status: negotiationStatus,
            action: 'created',
            success: true,
          });
        }

      } catch (error) {
        console.error(`❌ Erro ao processar deal ${deal.ID}:`, error);
        results.errors++;
        results.details.push({
          bitrix_deal_id: deal.ID,
          title: deal.TITLE,
          error: String(error),
          action: 'error',
        });
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n✅ Sincronização concluída em ${processingTime}ms`);
    console.log(`📊 Resultados: ${results.created} criados, ${results.updated} atualizados, ${results.skipped} ignorados, ${results.errors} erros`);

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
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to upsert deal
async function upsertDeal(
  supabase: any,
  deal: BitrixDeal,
  bitrixDealId: number,
  clientName: string,
  clientPhone: string | null,
  clientEmail: string | null
) {
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

  const { error } = await supabase
    .from('deals')
    .upsert(dealData, { onConflict: 'bitrix_deal_id' });

  if (error) {
    console.warn('⚠️ Erro ao upsert deal:', error);
  }
}
