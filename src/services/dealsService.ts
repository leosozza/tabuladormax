// Deals Service - Manage deals synced from Bitrix24

import { supabase } from '@/integrations/supabase/client';

export interface Deal {
  id: string;
  bitrix_deal_id: number;
  bitrix_lead_id: number | null;
  lead_id: number | null;
  title: string;
  stage_id: string | null;
  category_id: string | null;
  opportunity: number;
  currency_id: string;
  contact_id: number | null;
  company_id: number | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  assigned_by_id: number | null;
  assigned_by_name: string | null;
  producer_id: string | null;
  created_date: string | null;
  close_date: string | null;
  date_modify: string | null;
  raw: any;
  sync_status: string;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

export interface DealFilters {
  stage_id?: string;
  producer_id?: string;
  has_negotiation?: boolean;
  search?: string;
}

/**
 * List deals from database
 */
export async function listDeals(filters?: DealFilters): Promise<Deal[]> {
  let query = supabase
    .from('deals')
    .select('*')
    .order('created_date', { ascending: false });

  if (filters?.stage_id) {
    query = query.eq('stage_id', filters.stage_id);
  }

  if (filters?.producer_id) {
    query = query.eq('producer_id', filters.producer_id);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching deals:', error);
    throw new Error('Erro ao buscar deals');
  }

  return (data || []) as Deal[];
}

/**
 * Get a single deal by ID
 */
export async function getDeal(id: string): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error('Erro ao buscar deal');
  }

  return data as Deal;
}

/**
 * Get deal by Bitrix Deal ID
 */
export async function getDealByBitrixId(bitrixDealId: number): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('bitrix_deal_id', bitrixDealId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Erro ao buscar deal');
  }

  return data as Deal;
}

/**
 * Assign deal to a producer
 */
export async function assignDealToProducer(dealId: string, producerId: string): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .update({ producer_id: producerId })
    .eq('id', dealId)
    .select()
    .single();

  if (error) {
    throw new Error('Erro ao atribuir deal ao produtor');
  }

  return data as Deal;
}

/**
 * Sync deals from Bitrix via Edge Function
 */
export async function syncDealsFromBitrix(filters?: Record<string, any>): Promise<{
  synced: number;
  failed: number;
}> {
  const { data, error } = await supabase.functions.invoke('sync-deals-from-bitrix', {
    body: {
      action: 'sync_all',
      filters,
      limit: 100,
    },
  });

  if (error) {
    throw new Error('Erro ao sincronizar deals do Bitrix');
  }

  return {
    synced: data.synced || 0,
    failed: data.failed || 0,
  };
}

/**
 * Sync a single deal from Bitrix
 */
export async function syncSingleDeal(bitrixDealId: number): Promise<Deal | null> {
  const { data, error } = await supabase.functions.invoke('sync-deals-from-bitrix', {
    body: {
      action: 'sync_single',
      deal_id: String(bitrixDealId),
    },
  });

  if (error) {
    throw new Error('Erro ao sincronizar deal do Bitrix');
  }

  return data.deal || null;
}

/**
 * Get deals pending negotiation (no negotiation created yet)
 */
export async function getDealsAwaitingNegotiation(): Promise<Deal[]> {
  // Get all deals
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('*')
    .order('created_date', { ascending: false });

  if (dealsError) throw new Error('Erro ao buscar deals');

  // Get deals that already have negotiations
  const { data: negotiations, error: negError } = await supabase
    .from('negotiations')
    .select('deal_id');

  if (negError) throw new Error('Erro ao buscar negociações');

  const dealsWithNegotiation = new Set(negotiations?.map((n) => n.deal_id) || []);

  // Filter out deals that already have negotiations
  return (deals || []).filter((deal) => !dealsWithNegotiation.has(deal.id)) as Deal[];
}

/**
 * Update deal stage and sync to Bitrix
 */
export async function updateDealStage(dealId: string, stageId: string): Promise<void> {
  // Update locally
  const { error: updateError } = await supabase
    .from('deals')
    .update({ stage_id: stageId })
    .eq('id', dealId);

  if (updateError) throw new Error('Erro ao atualizar etapa do deal');

  // Sync to Bitrix
  await supabase.functions.invoke('sync-deal-to-bitrix', {
    body: {
      deal_id: dealId,
      fields: { STAGE_ID: stageId },
    },
  });
}
