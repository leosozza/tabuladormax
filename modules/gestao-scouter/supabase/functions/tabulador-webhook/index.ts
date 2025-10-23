/**
 * Edge Function: Webhook para receber dados em lote do TabuladorMax
 * Endpoint: POST /tabulador-webhook
 * 
 * Funcionalidades:
 * - Receber dados em lote via POST
 * - Validar dados recebidos
 * - Prevenir duplicação
 * - Registrar logs de sincronização
 * - Retornar status detalhado
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookPayload {
  api_key: string;
  source: 'TabuladorMax';
  timestamp: string;
  records: any[];
  sync_metadata?: {
    batch_id?: string;
    total_batches?: number;
    batch_number?: number;
  };
}

interface ProcessingResult {
  success: boolean;
  total_received: number;
  inserted: number;
  updated: number;
  duplicates_skipped: number;
  errors: number;
  error_details: any[];
  processing_time_ms: number;
  batch_id?: string;
}

/**
 * Valida se o registro tem campos obrigatórios
 */
function validateRecord(record: any): { valid: boolean; error?: string } {
  if (!record.id) {
    return { valid: false, error: 'Campo obrigatório: id' };
  }
  if (!record.nome || record.nome.trim() === '') {
    return { valid: false, error: 'Campo obrigatório: nome' };
  }
  return { valid: true };
}

/**
 * Normaliza data para formato ISO string
 */
function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Extrai data de atualização com fallback para outros campos
 */
function getUpdatedAtDate(lead: any): string {
  // Prioridade: updated_at -> updated -> modificado -> criado -> now
  const dateValue = lead.updated_at || lead.updated || lead.modificado || lead.criado;
  return normalizeDate(dateValue) || new Date().toISOString();
}

/**
 * Normaliza um lead do TabuladorMax para ficha
 */
function normalizeLeadToFicha(lead: any): any {
  const now = new Date().toISOString();
  
  return {
    id: String(lead.id),
    nome: lead.nome?.trim() || 'Sem nome',
    telefone: lead.telefone,
    email: lead.email,
    idade: lead.idade ? String(lead.idade) : null,
    
    // ✅ NOVO: Processar PARENT_IDs do Bitrix24
    bitrix_projeto_id: lead.PARENT_ID_1120 ? parseInt(lead.PARENT_ID_1120) : null,
    bitrix_scouter_id: lead.PARENT_ID_1096 ? parseInt(lead.PARENT_ID_1096) : null,
    
    // Manter campos legados para compatibilidade
    projeto: lead.projeto,
    scouter: lead.scouter,
    commercial_project_id: lead.PARENT_ID_1120 ? String(lead.PARENT_ID_1120) : null,
    
    supervisor: lead.supervisor,
    localizacao: lead.localizacao,
    latitude: lead.latitude,
    longitude: lead.longitude,
    local_da_abordagem: lead.local_da_abordagem,
    criado: normalizeDate(lead.criado),
    valor_ficha: lead.valor_ficha,
    etapa: lead.etapa,
    ficha_confirmada: lead.ficha_confirmada,
    foto: lead.foto,
    modelo: lead.modelo,
    tabulacao: lead.tabulacao,
    agendado: lead.agendado,
    compareceu: lead.compareceu,
    confirmado: lead.confirmado,
    cadastro_existe_foto: lead.cadastro_existe_foto,
    presenca_confirmada: lead.presenca_confirmada,
    raw: lead,
    updated_at: getUpdatedAtDate(lead),
    deleted: false,
    // Metadado de sincronização
    sync_source: 'TabuladorMax',
    last_synced_at: now
  };
}

/**
 * Verifica autenticação via API key
 */
function validateApiKey(apiKey: string | null): boolean {
  const validApiKey = Deno.env.get('TABULADOR_API_KEY');
  
  if (!validApiKey) {
    console.warn('TABULADOR_API_KEY não configurada');
    return true; // Permitir em dev se não configurada
  }
  
  return apiKey === validApiKey;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errorDetails: any[] = [];

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse do body
    const payload: WebhookPayload = await req.json();

    // Validar API key
    const apiKey = req.headers.get('x-api-key') || payload.api_key;
    if (!validateApiKey(apiKey)) {
      return new Response(
        JSON.stringify({ 
          error: 'API key inválida',
          hint: 'Forneça uma API key válida no header x-api-key ou no corpo da requisição'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar payload
    if (!payload.records || !Array.isArray(payload.records)) {
      return new Response(
        JSON.stringify({ 
          error: 'Payload inválido',
          hint: 'O campo "records" deve ser um array de registros'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (payload.records.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Nenhum registro para processar',
          total_received: 0,
          inserted: 0,
          updated: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📥 Recebendo ${payload.records.length} registros do ${payload.source}`);
    if (payload.sync_metadata?.batch_id) {
      console.log(`📦 Batch: ${payload.sync_metadata.batch_number}/${payload.sync_metadata.total_batches} (ID: ${payload.sync_metadata.batch_id})`);
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Processar registros
    const validRecords = [];
    const invalidRecords = [];

    for (const record of payload.records) {
      const validation = validateRecord(record);
      if (validation.valid) {
        validRecords.push(normalizeLeadToFicha(record));
      } else {
        invalidRecords.push({
          record_id: record.id || 'unknown',
          error: validation.error
        });
        errorDetails.push({
          id: record.id,
          error: validation.error
        });
      }
    }

    console.log(`✅ ${validRecords.length} válidos, ❌ ${invalidRecords.length} inválidos`);

    let inserted = 0;
    let updated = 0;
    let duplicatesSkipped = 0;

    // Processar em lotes de 500 para evitar timeout
    const BATCH_SIZE = 500;
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      
      try {
        // Verificar quais IDs já existem
        const ids = batch.map(r => r.id);
        const { data: existingRecords } = await supabase
          .from('leads')
          .select('id, updated_at')
          .in('id', ids);

        const existingIds = new Set(existingRecords?.map(r => r.id) || []);
        const existingMap = new Map(existingRecords?.map(r => [r.id, r.updated_at]) || []);

        // Separar novos e updates
        const toInsert = [];
        const toUpdate = [];

        for (const record of batch) {
          if (existingIds.has(record.id)) {
            // Comparar timestamps para evitar sobrescrever dados mais recentes
            const existingTimestamp = new Date(existingMap.get(record.id) || 0).getTime();
            const newTimestamp = new Date(record.updated_at).getTime();
            
            if (newTimestamp > existingTimestamp) {
              toUpdate.push(record);
            } else {
              duplicatesSkipped++;
            }
          } else {
            toInsert.push(record);
          }
        }

        // Inserir novos
        if (toInsert.length > 0) {
          const { data, error } = await supabase
            .from('leads')
            .insert(toInsert)
            .select('id, bitrix_projeto_id, bitrix_scouter_id, latitude, longitude');

          if (error) {
            console.error('Erro ao inserir fichas:', error);
            console.error('Detalhes do erro:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            console.error('Amostra de registro com erro:', JSON.stringify(toInsert[0], null, 2));
            errorDetails.push({
              batch_start: i,
              batch_size: toInsert.length,
              operation: 'insert',
              error: error.message,
              error_details: {
                code: error.code,
                details: error.details,
                hint: error.hint
              }
            });
          } else {
            inserted += data?.length || 0;
            
            // ✅ ABORDAGEM HÍBRIDA: Enriquecer leads inseridos com nomes das SPAs
            if (data && data.length > 0) {
              for (const lead of data) {
                if (lead.bitrix_projeto_id || lead.bitrix_scouter_id) {
                  const updates: any = {};
                  let enrichmentFailed = false;
                  
                  try {
                    // Buscar nome do projeto
                    if (lead.bitrix_projeto_id) {
                      const { data: projeto } = await supabase
                        .from('bitrix_projetos_comerciais')
                        .select('title')
                        .eq('id', lead.bitrix_projeto_id)
                        .single();
                      if (projeto) {
                        updates.projeto = projeto.title;
                        updates.commercial_project_id = String(lead.bitrix_projeto_id);
                      } else {
                        enrichmentFailed = true;
                      }
                    }
                    
                    // Buscar nome do scouter e copiar geolocalização se necessário
                    if (lead.bitrix_scouter_id) {
                      const { data: scouter } = await supabase
                        .from('bitrix_scouters')
                        .select('title, latitude, longitude, geolocalizacao')
                        .eq('id', lead.bitrix_scouter_id)
                        .single();
                      if (scouter) {
                        updates.scouter = scouter.title;
                        
                        // Copiar geolocalização do scouter se lead não tiver
                        if ((!lead.latitude || !lead.longitude) && scouter.latitude && scouter.longitude) {
                          updates.latitude = scouter.latitude;
                          updates.longitude = scouter.longitude;
                          if (scouter.geolocalizacao) {
                            updates.localizacao = scouter.geolocalizacao;
                          }
                        }
                      } else {
                        enrichmentFailed = true;
                      }
                    }
                    
                    // Se o enriquecimento falhou (IDs não encontrados), marcar para cron
                    if (enrichmentFailed) {
                      updates.needs_enrichment = true;
                      console.log(`⏳ Lead ${lead.id} marcado para enriquecimento via cron`);
                    } else {
                      updates.needs_enrichment = false;
                    }
                    
                    // Aplicar updates se houver
                    if (Object.keys(updates).length > 0) {
                      await supabase
                        .from('leads')
                        .update(updates)
                        .eq('id', lead.id);
                    }
                  } catch (error) {
                    // Se houver erro, marcar para enriquecimento posterior
                    console.error(`Erro ao enriquecer lead ${lead.id}:`, error);
                    await supabase
                      .from('leads')
                      .update({ needs_enrichment: true })
                      .eq('id', lead.id);
                  }
                }
              }
            }
          }
        }

        // Atualizar existentes
        if (toUpdate.length > 0) {
          for (const record of toUpdate) {
            const { error } = await supabase
              .from('leads')
              .update(record)
              .eq('id', record.id);

            if (error) {
              console.error(`Erro ao atualizar ficha ${record.id}:`, error);
              console.error('Detalhes do erro:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
              });
              errorDetails.push({
                id: record.id,
                operation: 'update',
                error: error.message,
                error_details: {
                  code: error.code,
                  details: error.details,
                  hint: error.hint
                }
              });
            } else {
              updated++;
            }
          }
        }

      } catch (error) {
        console.error(`Erro ao processar lote ${i}-${i + BATCH_SIZE}:`, error);
        errorDetails.push({
          batch_start: i,
          batch_size: batch.length,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Registrar log de sincronização
    const processingTime = Date.now() - startTime;
    
    try {
      const { error: logError } = await supabase
        .from('sync_logs')
        .insert({
          sync_direction: 'tabulador_to_gestao',
          records_synced: inserted + updated,
          records_failed: invalidRecords.length + errorDetails.length,
          errors: errorDetails.length > 0 ? { errors: errorDetails } : null,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          metadata: {
            batch_id: payload.sync_metadata?.batch_id,
            source: payload.source,
            total_received: payload.records.length,
            inserted,
            updated,
            duplicates_skipped: duplicatesSkipped
          }
        });
      
      if (logError) {
        console.error('Erro ao registrar log de sincronização:', logError);
      }
    } catch (error) {
      console.error('Erro ao inserir sync_logs:', error);
    }

    // Atualizar status de sincronização
    try {
      const { error: statusError } = await supabase
        .from('sync_status')
        .upsert({
          id: 'tabulador_max',
          project_name: 'tabulador_max',
          last_sync_at: new Date().toISOString(),
          last_sync_success: errorDetails.length === 0,
          total_records: inserted + updated,
          last_error: errorDetails.length > 0 ? JSON.stringify(errorDetails.slice(0, 5)) : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (statusError) {
        console.error('Erro ao atualizar status de sincronização:', statusError);
      }
    } catch (error) {
      console.error('Erro ao atualizar sync_status:', error);
    }

    const result: ProcessingResult = {
      success: errorDetails.length === 0,
      total_received: payload.records.length,
      inserted,
      updated,
      duplicates_skipped: duplicatesSkipped,
      errors: invalidRecords.length + errorDetails.length,
      error_details: errorDetails.slice(0, 10), // Limitar a 10 erros
      processing_time_ms: processingTime,
      batch_id: payload.sync_metadata?.batch_id
    };

    console.log(`✅ Processamento concluído:`, result);

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
    
    const result: ProcessingResult = {
      success: false,
      total_received: 0,
      inserted: 0,
      updated: 0,
      duplicates_skipped: 0,
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
