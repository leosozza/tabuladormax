/**
 * Edge Function: Enriquecer leads pendentes via Cron
 * Executado a cada 5 minutos para buscar leads com needs_enrichment=true
 * e enriquecer com dados do Bitrix24
 * 
 * Fluxo:
 * 1. Buscar leads com needs_enrichment=true
 * 2. Para cada lead, buscar dados no Bitrix24 diretamente
 * 3. Atualizar lead com nomes de projeto/scouter e geolocalização
 * 4. Sincronizar SPAs do Bitrix24 se encontrar novos IDs
 */

import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BITRIX_BASE = 'https://gestao.bitrix24.com.br/rest/1/ufxp0o8i5zmx9x5n';
const RATE_LIMIT_DELAY_MS = 100;

interface EnrichResult {
  success: boolean;
  total_pending: number;
  enriched: number;
  failed: number;
  spas_synced: { projetos: number; scouters: number };
  errors: string[];
  processing_time_ms: number;
}

/**
 * Buscar lead do Bitrix24 por ID
 */
async function fetchBitrixLead(leadId: string): Promise<any> {
  try {
    const url = `${BITRIX_BASE}/crm.lead.get.json?id=${leadId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.result || null;
  } catch (error) {
    console.error(`Erro ao buscar lead ${leadId} do Bitrix24:`, error);
    return null;
  }
}

/**
 * Sleep function para rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sincronizar SPAs do Bitrix24
 */
async function syncBitrixSPAs(supabase: any, entityTypeId: string, tableName: string): Promise<number> {
  let allItems: any[] = [];
  let start = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = `${BITRIX_BASE}/crm.item.list.json?entityTypeId=${entityTypeId}&start=${start}`;
    const response = await fetch(url);
    
    if (!response.ok) break;
    
    const data = await response.json();
    const items = data.result?.items || [];
    allItems = allItems.concat(items);
    
    if (data.next !== undefined && items.length === 50) {
      start = data.next;
      await sleep(100);
    } else {
      hasMore = false;
    }
  }
  
  if (allItems.length > 0) {
    const records = allItems.map(item => ({
      id: parseInt(item.id),
      title: item.title || item.name || '',
      raw_data: item,
      updated_at: new Date().toISOString()
    }));
    
    await supabase
      .from(tableName)
      .upsert(records, { onConflict: 'id' });
    
    return records.length;
  }
  
  return 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: string[] = [];
  let enriched = 0;
  let failed = 0;
  const newProjetoIds = new Set<number>();
  const newScouterIds = new Set<number>();

  try {
    console.log('🔄 Iniciando enriquecimento de leads pendentes...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar leads pendentes
    const { data: pendingLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, bitrix_projeto_id, bitrix_scouter_id, latitude, longitude')
      .eq('needs_enrichment', true)
      .limit(100); // Processar no máximo 100 por execução

    if (leadsError) {
      throw new Error(`Erro ao buscar leads pendentes: ${leadsError.message}`);
    }

    const totalPending = pendingLeads?.length || 0;
    console.log(`📋 ${totalPending} leads pendentes para enriquecimento`);

    if (totalPending === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total_pending: 0,
          enriched: 0,
          failed: 0,
          message: 'Nenhum lead pendente',
          processing_time_ms: Date.now() - startTime
        } as EnrichResult),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Carregar cache de SPAs
    const { data: projetos } = await supabase
      .from('bitrix_projetos_comerciais')
      .select('id, title');
    const projetosMap = new Map(projetos?.map(p => [p.id, p.title]) || []);

    const { data: scouters } = await supabase
      .from('bitrix_scouters')
      .select('id, title, latitude, longitude, geolocalizacao');
    const scoutersMap = new Map(scouters?.map(s => [s.id, s]) || []);

    // 3. Processar cada lead
    for (const lead of pendingLeads) {
      try {
        const updates: any = { needs_enrichment: false };
        let shouldSync = false;

        // Buscar dados do Bitrix24 se necessário
        const bitrixData = await fetchBitrixLead(String(lead.id));
        
        if (bitrixData) {
          // Extrair IDs do Bitrix24
          const projetoId = bitrixData.PARENT_ID_1120 ? parseInt(bitrixData.PARENT_ID_1120) : null;
          const scouterId = bitrixData.PARENT_ID_1096 ? parseInt(bitrixData.PARENT_ID_1096) : null;

          // Processar projeto
          if (projetoId) {
            if (projetosMap.has(projetoId)) {
              updates.projeto = projetosMap.get(projetoId);
              updates.commercial_project_id = String(projetoId);
            } else {
              newProjetoIds.add(projetoId);
              shouldSync = true;
            }
            updates.bitrix_projeto_id = projetoId;
          }

          // Processar scouter
          if (scouterId) {
            if (scoutersMap.has(scouterId)) {
              const scouter = scoutersMap.get(scouterId);
              updates.scouter = scouter.title;
              
              // Copiar geolocalização se necessário
              if ((!lead.latitude || !lead.longitude) && scouter.latitude && scouter.longitude) {
                updates.latitude = scouter.latitude;
                updates.longitude = scouter.longitude;
                if (scouter.geolocalizacao) {
                  updates.localizacao = scouter.geolocalizacao;
                }
              }
            } else {
              newScouterIds.add(scouterId);
              shouldSync = true;
            }
            updates.bitrix_scouter_id = scouterId;
          }
        }

        // Atualizar lead
        const { error: updateError } = await supabase
          .from('leads')
          .update(updates)
          .eq('id', lead.id);

        if (updateError) {
          console.error(`Erro ao atualizar lead ${lead.id}:`, updateError);
          errors.push(`Lead ${lead.id}: ${updateError.message}`);
          failed++;
        } else {
          enriched++;
          console.log(`✅ Lead ${lead.id} enriquecido com sucesso`);
        }

        // Rate limiting
        await sleep(RATE_LIMIT_DELAY_MS);

      } catch (error) {
        console.error(`Erro ao processar lead ${lead.id}:`, error);
        errors.push(`Lead ${lead.id}: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }

    // 4. Sincronizar SPAs se encontramos novos IDs
    let projetosSynced = 0;
    let scoutersSynced = 0;

    if (newProjetoIds.size > 0 || newScouterIds.size > 0) {
      console.log(`🔄 Sincronizando SPAs: ${newProjetoIds.size} projetos e ${newScouterIds.size} scouters novos`);
      
      if (newProjetoIds.size > 0) {
        projetosSynced = await syncBitrixSPAs(supabase, '176', 'bitrix_projetos_comerciais');
      }
      
      if (newScouterIds.size > 0) {
        scoutersSynced = await syncBitrixSPAs(supabase, '178', 'bitrix_scouters');
      }
    }

    const result: EnrichResult = {
      success: failed === 0,
      total_pending: totalPending,
      enriched,
      failed,
      spas_synced: { projetos: projetosSynced, scouters: scoutersSynced },
      errors: errors.slice(0, 10),
      processing_time_ms: Date.now() - startTime
    };

    console.log(`✅ Enriquecimento concluído:`, result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro fatal no enriquecimento:', message);
    
    return new Response(
      JSON.stringify({
        success: false,
        total_pending: 0,
        enriched,
        failed,
        spas_synced: { projetos: 0, scouters: 0 },
        errors: [message],
        processing_time_ms: Date.now() - startTime
      } as EnrichResult),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
