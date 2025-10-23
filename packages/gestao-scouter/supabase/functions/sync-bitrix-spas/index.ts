/**
 * Edge Function: Sincronizar SPAs do Bitrix24
 * Endpoint: POST /sync-bitrix-spas
 * 
 * Funcionalidades:
 * - Buscar Projetos Comerciais (entityTypeId=1120)
 * - Buscar Scouters (entityTypeId=1096) com campos customizados
 * - UPSERT em tabelas de referência
 * - Retornar estatísticas de sincronização
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BITRIX_BASE = 'https://maxsystem.bitrix24.com.br/rest/9/ia31i2r3aenevk0g';
// IDs corretos das entidades SPAs no Bitrix24
const PROJETOS_SPA_ID = '1120'; // Projetos Comerciais
const SCOUTERS_SPA_ID = '1096'; // Scouters

// Campos customizados do Bitrix24
const FIELD_CHAVE = 'ufCrm32_1739219729812';
const FIELD_GEO = 'ufCrm32_1759247700';

interface SyncResult {
  success: boolean;
  projetos: {
    total: number;
    synced: number;
  };
  scouters: {
    total: number;
    synced: number;
  };
  errors: any[];
  processing_time_ms: number;
}

/**
 * Parser de geolocalização do formato "lat,lng"
 */
function parseGeolocalizacao(geoStr: string | null): { lat: number | null; lng: number | null } {
  if (!geoStr) return { lat: null, lng: null };
  
  const match = geoStr.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return { lat: null, lng: null };
  
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: null, lng: null };
  }
  
  return { lat, lng };
}

/**
 * Buscar SPAs do Bitrix24 com paginação completa
 */
async function fetchBitrixSPA(entityTypeId: string): Promise<{ items: any[], total: number }> {
  let allItems: any[] = [];
  let start = 0;
  let hasMore = true;
  let totalRecords = 0;
  
  console.log(`📡 Buscando SPAs do Bitrix24: entityTypeId=${entityTypeId}`);
  
  while (hasMore) {
    const url = `${BITRIX_BASE}/crm.item.list.json?entityTypeId=${entityTypeId}&start=${start}`;
    
    console.log(`🔍 Requisição: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar SPAs: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log completo da resposta
    console.log(`📦 Resposta Bitrix24:`, JSON.stringify({
      total: data.total,
      next: data.next,
      itemsCount: data.result?.items?.length || 0
    }));
    
    if (!data.result || !data.result.items) {
      throw new Error('Resposta inválida do Bitrix24');
    }
    
    // Capturar total na primeira requisição
    if (start === 0) {
      totalRecords = data.total || 0;
      console.log(`📊 Total de registros disponíveis: ${totalRecords}`);
    }
    
    const items = data.result.items;
    allItems = allItems.concat(items);
    
    const currentPage = Math.floor(start / 50) + 1;
    const estimatedPages = Math.ceil(totalRecords / 50);
    console.log(`✅ Página ${currentPage}/${estimatedPages}: ${items.length} registros | Acumulado: ${allItems.length}/${totalRecords}`);
    
    // Bitrix24 retorna "next" quando há próxima página
    if (data.next !== undefined) {
      start = data.next;
      // Rate limiting entre requisições
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      hasMore = false;
      console.log(`✅ Sincronização completa: ${allItems.length} de ${totalRecords} registros`);
    }
  }
  
  return { items: allItems, total: totalRecords };
}

/**
 * Sincronizar Projetos Comerciais
 */
async function syncProjetos(supabase: any): Promise<{ total: number; synced: number }> {
  console.log('🔄 Sincronizando Projetos Comerciais...');
  
  const { items, total } = await fetchBitrixSPA(PROJETOS_SPA_ID);
  
  if (items.length === 0) {
    console.log('⚠️ Nenhum projeto encontrado no Bitrix24');
    return { total: 0, synced: 0 };
  }
  
  const projetos = items.map(item => ({
    id: parseInt(item.id),
    title: item.title || `Projeto ${item.id}`,
    raw_data: item,
    updated_at: new Date().toISOString()
  }));
  
  const { data, error } = await supabase
    .from('bitrix_projetos_comerciais')
    .upsert(projetos, { onConflict: 'id' })
    .select('id');
  
  if (error) {
    console.error('❌ Erro ao sincronizar projetos:', error);
    throw error;
  }
  
  console.log(`✅ ${data?.length || 0} projetos sincronizados de ${total} disponíveis`);
  return { total, synced: data?.length || 0 };
}

/**
 * Sincronizar Scouters
 */
async function syncScouters(supabase: any): Promise<{ total: number; synced: number }> {
  console.log('🔄 Sincronizando Scouters...');
  
  const { items, total } = await fetchBitrixSPA(SCOUTERS_SPA_ID);
  
  if (items.length === 0) {
    console.log('⚠️ Nenhum scouter encontrado no Bitrix24');
    return { total: 0, synced: 0 };
  }
  
  const scouters = items.map(item => {
    const chave = item[FIELD_CHAVE] || null;
    const geoStr = item[FIELD_GEO] || null;
    const { lat, lng } = parseGeolocalizacao(geoStr);
    
    return {
      id: parseInt(item.id),
      title: item.title || `Scouter ${item.id}`,
      chave,
      geolocalizacao: geoStr,
      latitude: lat,
      longitude: lng,
      raw_data: item,
      updated_at: new Date().toISOString()
    };
  });
  
  const { data, error } = await supabase
    .from('bitrix_scouters')
    .upsert(scouters, { onConflict: 'id' })
    .select('id');
  
  if (error) {
    console.error('❌ Erro ao sincronizar scouters:', error);
    throw error;
  }
  
  console.log(`✅ ${data?.length || 0} scouters sincronizados de ${total} disponíveis`);
  return { total, synced: data?.length || 0 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: any[] = [];

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🚀 Iniciando sincronização de SPAs do Bitrix24...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sincronizar Projetos
    let projetosResult = { total: 0, synced: 0 };
    try {
      projetosResult = await syncProjetos(supabase);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Erro ao sincronizar projetos:', message);
      errors.push({ entity: 'projetos', error: message });
    }

    // Sincronizar Scouters
    let scoutersResult = { total: 0, synced: 0 };
    try {
      scoutersResult = await syncScouters(supabase);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Erro ao sincronizar scouters:', message);
      errors.push({ entity: 'scouters', error: message });
    }

    const processingTime = Date.now() - startTime;

    const result: SyncResult = {
      success: errors.length === 0,
      projetos: projetosResult,
      scouters: scoutersResult,
      errors,
      processing_time_ms: processingTime
    };

    console.log('✅ Sincronização concluída:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro fatal:', message);
    
    const result: SyncResult = {
      success: false,
      projetos: { total: 0, synced: 0 },
      scouters: { total: 0, synced: 0 },
      errors: [{ error: message }],
      processing_time_ms: Date.now() - startTime
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
