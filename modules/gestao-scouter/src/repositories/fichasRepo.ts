/**
 * DEPRECATED: Este arquivo é mantido apenas para compatibilidade
 * Use src/repositories/leadsRepo.ts para todas as novas funcionalidades
 */

import { supabase } from '@/integrations/supabase/client';

export async function fetchLeadsFromDB(filters?: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}) {
  console.log('⚠️ [fichasRepo] DEPRECATED - Use leadsRepo.ts');
  console.log('🔍 [fichasRepo] Redirecionando para tabela "leads"');
  
  let q = supabase
    .from("leads")
    .select("id, scouter, commercial_project_id, criado, valor_ficha, raw, deleted")
    .or('deleted.is.false,deleted.is.null');
    
  if (filters?.start) {
    q = q.gte("criado", filters.start);
  }
  if (filters?.end) {
    q = q.lte("criado", filters.end);
  }
  if (filters?.scouter) {
    q = q.eq("scouter", filters.scouter);
  }
  if (filters?.projeto) {
    q = q.eq("commercial_project_id", filters.projeto);
  }
  
  const { data, error } = await q;
  
  if (error) {
    console.error('❌ [fichasRepo] Erro:', error);
    throw error;
  }
  
  return data || [];
}
