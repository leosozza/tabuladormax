// Repositório para Dashboard - Dados do Supabase
// 
// ⚠️ FONTE ÚNICA: Tabela 'leads'
// ================================
// Este repositório busca dados exclusivamente da tabela 'leads' do Supabase.
// Todos os dashboards e visualizações devem usar esta fonte centralizada.
import { supabase } from '@/lib/supabase-helper';
import type { LeadDataPoint } from '@/types/lead';

export interface DashboardDataResult {
  data: LeadDataPoint[];
  missingFields: string[];
}

/**
 * Busca dados do dashboard da tabela 'leads' com filtros
 * 
 * ⚠️ IMPORTANTE: Esta função busca EXCLUSIVAMENTE da tabela 'leads'
 * 
 * @param filters - Filtros de período, scouter e projeto
 * @returns Dados de leads para exibição em dashboard
 */
export async function getDashboardData(filters: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}): Promise<DashboardDataResult> {
  console.log('🔍 [dashboardRepo] Iniciando busca de dados do dashboard');
  console.log('🗂️  [dashboardRepo] Tabela: "leads"');
  console.log('🗂️  [dashboardRepo] Filtros:', filters);
  
  let query = supabase
    .from('leads')
    .select('*')
    .or('deleted.is.false,deleted.is.null'); // Excluir registros deletados

  // Aplicar filtros usando 'criado' (coluna de data)
  if (filters.start) {
    console.log('📅 [dashboardRepo] Filtro data início:', filters.start);
    query = query.gte('criado', filters.start);
  }
  if (filters.end) {
    console.log('📅 [dashboardRepo] Filtro data fim:', filters.end);
    query = query.lte('criado', filters.end);
  }
  if (filters.scouter) {
    console.log('👤 [dashboardRepo] Filtro scouter:', filters.scouter);
    query = query.ilike('scouter', `%${filters.scouter}%`);
  }
  if (filters.projeto) {
    console.log('📁 [dashboardRepo] Filtro projeto:', filters.projeto);
    query = query.eq('commercial_project_id', filters.projeto);
  }

  // Ordenar por 'criado' (coluna de data)
  const { data, error } = await query.order('criado', { ascending: false });

  if (error) {
    console.error('❌ [dashboardRepo] Erro ao buscar dados do dashboard:', error);
    throw error;
  }

  console.log(`✅ [dashboardRepo] ${data?.length || 0} registros retornados da tabela "leads"`);

  return {
    data: (data || []) as LeadDataPoint[],
    missingFields: []
  };
}