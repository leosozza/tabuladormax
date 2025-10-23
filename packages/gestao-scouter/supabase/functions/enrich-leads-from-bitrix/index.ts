/**
 * Edge Function: Enriquecer Leads com dados do Bitrix24
 * Endpoint: POST /enrich-leads-from-bitrix
 * 
 * Funcionalidades:
 * - Buscar leads com campos NULL (scouter/projeto)
 * - Para cada lead, buscar PARENT_ID_1120 e PARENT_ID_1096 via Bitrix24
 * - Mapear IDs → Nomes usando tabelas de referência
 * - Copiar geolocalização do scouter se lead não tiver
 * - Atualizar leads no Supabase
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BITRIX_BASE = 'https://maxsystem.bitrix24.com.br/rest/9/ia31i2r3aenevk0g';
const RATE_LIMIT_DELAY_MS = 100; // Delay entre requests

interface EnrichResult {
  success: boolean;
  total_leads: number;
  processed: number;
  enriched: number;
  skipped: number;
  errors: number;
  error_details: any[];
  processing_time_ms: number;
}

/**
 * Buscar dados de um lead específico do Bitrix24
 */
async function fetchBitrixLead(leadId: string): Promise<any> {
  const url = `${BITRIX_BASE}/crm.lead.get?ID=${leadId}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar lead ${leadId}: ${response.status}`);
  }
  
  const data = await response.json();
  return data.result || null;
}

/**
 * Sleep helper para rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errorDetails: any[] = [];

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

    console.log('🚀 Iniciando enriquecimento de leads...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Pré-carregar tabelas de referência em cache
    console.log('📚 Carregando tabelas de referência...');
    
    const { data: projetos, error: projetosError } = await supabase
      .from('bitrix_projetos_comerciais')
      .select('id, title');
    
    if (projetosError) {
      throw new Error(`Erro ao carregar projetos: ${projetosError.message}`);
    }

    const { data: scouters, error: scoutersError } = await supabase
      .from('bitrix_scouters')
      .select('id, title, latitude, longitude, geolocalizacao');
    
    if (scoutersError) {
      throw new Error(`Erro ao carregar scouters: ${scoutersError.message}`);
    }

    const projetosMap = new Map((projetos || []).map(p => [p.id, p.title]));
    const scoutersMap = new Map((scouters || []).map(s => [s.id, {
      title: s.title,
      latitude: s.latitude,
      longitude: s.longitude,
      geolocalizacao: s.geolocalizacao
    }]));

    console.log(`✅ Cache: ${projetosMap.size} projetos, ${scoutersMap.size} scouters`);

    // 2. Buscar TODOS os leads com campos NULL (sem limite)
    const { data: leadsToEnrich, error: leadsError } = await supabase
      .from('leads')
      .select('id, scouter, projeto, latitude, longitude, bitrix_scouter_id, bitrix_projeto_id')
      .or('scouter.is.null,projeto.is.null,bitrix_scouter_id.is.null,bitrix_projeto_id.is.null');

    if (leadsError) {
      throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
    }

    const totalLeads = leadsToEnrich?.length || 0;
    console.log(`📋 ${totalLeads} leads precisam de enriquecimento`);

    if (totalLeads === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum lead para enriquecer',
          total_leads: 0,
          processed: 0,
          enriched: 0,
          skipped: 0,
          errors: 0,
          error_details: [],
          processing_time_ms: Date.now() - startTime
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let processed = 0;
    let enriched = 0;
    let skipped = 0;

    // 3. Processar leads em batches para evitar timeout
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(totalLeads / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalLeads);
      const batch = (leadsToEnrich || []).slice(batchStart, batchEnd);
      
      console.log(`📦 Processando batch ${batchIndex + 1}/${totalBatches} (leads ${batchStart + 1}-${batchEnd})`);

      // Processar cada lead do batch
      for (const lead of batch) {
      try {
        processed++;
        
        // Buscar dados do Bitrix24
        const bitrixData = await fetchBitrixLead(lead.id);
        
        if (!bitrixData) {
          console.warn(`⚠️ Lead ${lead.id} não encontrado no Bitrix24`);
          skipped++;
          continue;
        }

        // Extrair PARENT_IDs
        const projetoId = bitrixData.PARENT_ID_1120 ? parseInt(bitrixData.PARENT_ID_1120) : null;
        const scouterId = bitrixData.PARENT_ID_1096 ? parseInt(bitrixData.PARENT_ID_1096) : null;

        // Mapear nomes
        const projetoNome = projetoId ? projetosMap.get(projetoId) : null;
        const scouterData = scouterId ? scoutersMap.get(scouterId) : null;
        const scouterNome = scouterData?.title;

        // Preparar update
        const updates: any = {
          bitrix_projeto_id: projetoId,
          bitrix_scouter_id: scouterId,
          updated_at: new Date().toISOString()
        };

        if (projetoNome) {
          updates.projeto = projetoNome;
          updates.commercial_project_id = String(projetoId);
        }

        if (scouterNome) {
          updates.scouter = scouterNome;
        }

        // Copiar geolocalização do scouter se lead não tiver
        if (scouterData && (!lead.latitude || !lead.longitude)) {
          if (scouterData.latitude && scouterData.longitude) {
            updates.latitude = scouterData.latitude;
            updates.longitude = scouterData.longitude;
            if (scouterData.geolocalizacao) {
              updates.localizacao = scouterData.geolocalizacao;
            }
          }
        }

        // Atualizar lead
        const { error: updateError } = await supabase
          .from('leads')
          .update(updates)
          .eq('id', lead.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar lead ${lead.id}:`, updateError);
          errorDetails.push({
            lead_id: lead.id,
            error: updateError.message
          });
        } else {
          enriched++;
          
          if (processed % 10 === 0) {
            console.log(`📊 Progresso: ${processed}/${totalLeads} (${Math.round(processed / totalLeads * 100)}%)`);
          }
        }

        // Rate limiting
        await sleep(RATE_LIMIT_DELAY_MS);

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro ao processar lead ${lead.id}:`, message);
        errorDetails.push({
          lead_id: lead.id,
          error: message
        });
      }
    }
    
    console.log(`✅ Batch ${batchIndex + 1}/${totalBatches} concluído`);
  }

    const processingTime = Date.now() - startTime;

    const result: EnrichResult = {
      success: errorDetails.length === 0,
      total_leads: totalLeads,
      processed,
      enriched,
      skipped,
      errors: errorDetails.length,
      error_details: errorDetails.slice(0, 20), // Limitar a 20 erros
      processing_time_ms: processingTime
    };

    console.log('✅ Enriquecimento concluído:', result);

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
    
    const result: EnrichResult = {
      success: false,
      total_leads: 0,
      processed: 0,
      enriched: 0,
      skipped: 0,
      errors: 1,
      error_details: [{ error: message }],
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
