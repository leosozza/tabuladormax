import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

const BITRIX_BASE_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr';

// 🔧 FASE 1: Mapeamento de IDs de enumeração do Bitrix para valores boolean
const BITRIX_ENUM_TO_BOOLEAN: Record<string, Record<string, boolean | null>> = {
  'UF_CRM_1745431662': { // Cadastro Existe Foto?
    '5492': true,   // SIM
    '5494': false,  // NAO
  },
  'UF_CRM_1737378043893': { // Ficha confirmada
    '1878': true,   // Sim
    '1880': null,   // Aguardando (incerto, converter para null)
    '4892': false,  // Não confirmada
  },
  'UF_CRM_CONFIRME_FICHAS': { // Enviar confirmação de fichas
    '8976': true,   // Sim
    '8978': false,  // Não
  },
};

// Mapeamento reverso: campo Supabase → campo Bitrix
const SUPABASE_TO_BITRIX_ENUM: Record<string, string> = {
  'cadastro_existe_foto': 'UF_CRM_1745431662',
  'ficha_confirmada': 'UF_CRM_1737378043893',
};

// Mapeamento de campos que são do tipo "money" no Bitrix
const BITRIX_MONEY_FIELDS: Record<string, string> = {
  'valor_ficha': 'UF_CRM_VALORFICHA',
};

// 🔧 FASE 2: Função de conversão inteligente de enumeração → boolean
interface ConversionResult {
  converted: boolean | null;
  hasError: boolean;
  errorMsg?: string;
}

function convertBitrixEnumToBoolean(
  bitrixField: string,
  value: any
): ConversionResult {
  // Se o campo tem mapeamento de enumeração
  if (BITRIX_ENUM_TO_BOOLEAN[bitrixField]) {
    const enumMap = BITRIX_ENUM_TO_BOOLEAN[bitrixField];
    const valueStr = String(value).trim();
    
    // Tentar mapear pelo ID da enumeração
    if (enumMap.hasOwnProperty(valueStr)) {
      return {
        converted: enumMap[valueStr],
        hasError: false
      };
    }
    
    // Se não encontrou no mapeamento, registrar erro
    return {
      converted: null,
      hasError: true,
      errorMsg: `ID de enumeração "${valueStr}" não encontrado no mapeamento de ${bitrixField}. IDs válidos: ${Object.keys(enumMap).join(', ')}`
    };
  }
  
  // Se não tem mapeamento, tentar conversão padrão (para campos boolean nativos)
  const valueStr = String(value).trim();
  if (valueStr === '1' || valueStr.toLowerCase() === 'true') {
    return { converted: true, hasError: false };
  }
  if (valueStr === '0' || valueStr.toLowerCase() === 'false' || valueStr === '') {
    return { converted: false, hasError: false };
  }
  
  // Conversão falhou
  return {
    converted: null,
    hasError: true,
    errorMsg: `Valor "${value}" não pode ser convertido para boolean (campo ${bitrixField})`
  };
}

/**
 * Converte valores para integer (arredonda decimais)
 * @param value - Valor a ser convertido
 * @returns Valor inteiro ou null
 */
function toInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const valueStr = String(value).trim();
  const parsed = parseFloat(valueStr);
  
  if (isNaN(parsed)) {
    console.warn(`⚠️ toInteger: Valor não numérico: "${valueStr}"`);
    return null;
  }
  
  const rounded = Math.round(parsed);
  console.log(`🔢 toInteger: "${valueStr}" → ${rounded}`);
  return rounded;
}

/**
 * Converte valores de moeda do Bitrix (formato "valor|MOEDA") para numérico
 * @param value - Valor recebido do Bitrix (ex: "6|BRL", "10.50|USD")
 * @returns Objeto com valor convertido e status de erro
 */
function convertBitrixMoneyToNumeric(
  value: any
): { converted: number | null; hasError: boolean; errorMsg?: string } {
  
  if (value === null || value === undefined || value === '') {
    return { converted: null, hasError: false };
  }
  
  const valueStr = String(value).trim();
  
  // Formato esperado: "valor|MOEDA" (ex: "6|BRL", "10.50|USD")
  if (valueStr.includes('|')) {
    const parts = valueStr.split('|');
    const numericPart = parts[0].trim();
    const currency = parts[1]?.trim();
    
    const parsed = parseFloat(numericPart);
    
    if (isNaN(parsed)) {
      return {
        converted: null,
        hasError: true,
        errorMsg: `Valor de moeda inválido: "${valueStr}" (parte numérica não é número)`
      };
    }
    
    console.log(`💰 Convertendo moeda: "${valueStr}" → ${parsed} (${currency})`);
    return { converted: parsed, hasError: false };
  }
  
  // Se não tem pipe, tentar converter diretamente
  const parsed = parseFloat(valueStr);
  
  if (isNaN(parsed)) {
    return {
      converted: null,
      hasError: true,
      errorMsg: `Valor numérico inválido: "${valueStr}"`
    };
  }
  
  return { converted: parsed, hasError: false };
}

interface JobConfig {
  filters?: {
    addressNull?: boolean;
    phoneNull?: boolean;
    valorNull?: boolean;
    responsibleNull?: boolean;
    dateFrom?: string;
    dateTo?: string;
  };
  batchSize?: number;
  maxLeads?: number;
  mappingId?: string;
}

// Função para parsear datas brasileiras (dd/MM/yyyy HH:mm:ss ou dd/MM/yyyy)
const parseBrazilianDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  try {
    // Formato brasileiro completo: dd/MM/yyyy HH:mm:ss
    const matchFull = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (matchFull) {
      const [, day, month, year, hour, minute, second] = matchFull;
      const isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      return isoDate;
    }
    
    // Formato brasileiro apenas data: dd/MM/yyyy
    const matchDate = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchDate) {
      const [, day, month, year] = matchDate;
      const isoDate = `${year}-${month}-${day}T00:00:00Z`;
      return isoDate;
    }
    
    // Fallback: tentar parsear como ISO ou outro formato padrão
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString();
      return isoDate;
    }
    
    console.warn(`⚠️ Não foi possível parsear data: "${dateStr}"`);
    return null;
  } catch (error) {
    console.error(`❌ Erro ao parsear data: "${dateStr}"`, error);
    return null;
  }
};

// ✅ Função auxiliar para resolver nomes de entidades SPA
async function resolveSpaEntityName(
  supabase: any,
  entityTypeId: number,
  bitrixItemId: number | null
): Promise<string | null> {
  if (!bitrixItemId) return null;
  
  const { data, error } = await supabase
    .from('bitrix_spa_entities')
    .select('title')
    .eq('entity_type_id', entityTypeId)
    .eq('bitrix_item_id', bitrixItemId)
    .maybeSingle();
  
  if (error || !data) {
    console.warn(`⚠️ SPA ${entityTypeId}/${bitrixItemId} não encontrada`);
    return null;
  }
  
  return data.title?.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, jobId, filters, batchSize, mappingId } = await req.json();

    switch (action) {
      case 'create':
        return await createResyncJob(supabase, { filters }, batchSize, mappingId);
      
      case 'process':
        return await processBatch(supabase, jobId);
      
      case 'pause':
        return await pauseJob(supabase, jobId);
      
      case 'resume':
        return await resumeJob(supabase, jobId);
      
      case 'cancel':
        return await cancelJob(supabase, jobId);
      
      case 'delete':
        return await deleteJob(supabase, jobId);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createResyncJob(supabase: any, config: JobConfig, batchSize: number, mappingId?: string) {
  const authHeader = supabase.headers?.['Authorization'];
  const userId = authHeader ? await getUserIdFromToken(supabase, authHeader) : null;

  // Contar total de leads que serão processados
  let query = supabase.from('leads').select('id', { count: 'exact', head: true });

  if (config?.filters?.addressNull) {
    query = query.or('address.is.null,address.eq.');
  }
  if (config?.filters?.phoneNull) {
    query = query.or('celular.is.null,celular.eq.,telefone_casa.is.null,telefone_casa.eq.,telefone_trabalho.is.null,telefone_trabalho.eq.');
  }
  if (config?.filters?.valorNull) {
    query = query.or('valor_ficha.is.null,valor_ficha.eq.0');
  }
  if (config?.filters?.responsibleNull) {
    query = query.or('responsible.is.null,responsible.eq.');
  }
  if (config?.filters?.dateFrom) {
    query = query.gte('criado', config.filters.dateFrom);
  }
  if (config?.filters?.dateTo) {
    const endDate = new Date(config.filters.dateTo);
    endDate.setHours(23, 59, 59, 999);
    query = query.lte('criado', endDate.toISOString());
  }

  const { count, error: countError } = await query;

  if (countError || count === null) {
    console.error('Error counting leads:', countError);
    return new Response(
      JSON.stringify({ error: 'Failed to count leads' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Criar job
  const { data: job, error: insertError } = await supabase
    .from('lead_resync_jobs')
    .insert({
      total_leads: count,
      batch_size: batchSize,
      filter_criteria: config?.filters,
      status: 'pending',
      created_by: userId,
      mapping_id: mappingId
    })
    .select()
    .single();

  if (insertError || !job) {
    console.error('Error creating job:', insertError);
    return new Response(
      JSON.stringify({ error: 'Failed to create job' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, job }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processBatch(supabase: any, jobId: string) {
  const MAX_BATCHES_PER_CALL = 5; // Processar máximo 5 batches por chamada (~250 leads)
  
  const { data: initialJob, error: jobError } = await supabase
    .from('lead_resync_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !initialJob) {
    console.error('Job not found:', jobId);
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Marcar como running (se estava pending)
  if (initialJob.status === 'pending') {
    await supabase
      .from('lead_resync_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);
  }

  // Variáveis para acumular progresso
  let totalProcessed = initialJob.processed_leads || 0;
  let totalUpdated = initialJob.updated_leads || 0;
  let totalSkipped = initialJob.skipped_leads || 0;
  let totalErrors = initialJob.error_leads || 0;
  const errorDetails: any[] = initialJob.error_details || [];
  let lastProcessedId = initialJob.last_processed_lead_id || Number.MAX_SAFE_INTEGER;
  let currentBatch = initialJob.current_batch || 0;
  const callStartTime = Date.now();
  let batchesProcessedInThisCall = 0;

  console.log(`
    ╔════════════════════════════════════════════════════════════════
    ║ [Job ${jobId}] RESINCRONIZAÇÃO ITERATIVA
    ╠════════════════════════════════════════════════════════════════
    ║ Total de leads: ${initialJob.total_leads.toLocaleString()}
    ║ Já processados: ${totalProcessed.toLocaleString()}
    ║ Batch size: ${initialJob.batch_size}
    ║ Max batches/call: ${MAX_BATCHES_PER_CALL}
    ╚════════════════════════════════════════════════════════════════
  `);

  // Loop limitado - processar apenas MAX_BATCHES_PER_CALL batches
  while (batchesProcessedInThisCall < MAX_BATCHES_PER_CALL) {
    const batchStartTime = Date.now();
    
    // Buscar job atualizado para verificar status
    const { data: currentJob } = await supabase
      .from('lead_resync_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!currentJob || currentJob.status !== 'running') {
      console.log(`[processBatch] Job paused or cancelled. Status: ${currentJob?.status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job paused or cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batchSize = currentJob.batch_size || 50;
    
    // 📦 FASE 1: Buscar leads do Supabase
    let leadsQuery = supabase
      .from('leads')
      .select('id,name')
      .lt('id', lastProcessedId)
      .order('id', { ascending: false })
      .limit(batchSize);

    // Aplicar filtros
    if (currentJob.filter_criteria?.addressNull) {
      leadsQuery = leadsQuery.or('address.is.null,address.eq.');
    }
    if (currentJob.filter_criteria?.phoneNull) {
      leadsQuery = leadsQuery.or('celular.is.null,celular.eq.,telefone_casa.is.null,telefone_casa.eq.,telefone_trabalho.is.null,telefone_trabalho.eq.');
    }
    if (currentJob.filter_criteria?.valorNull) {
      leadsQuery = leadsQuery.or('valor_ficha.is.null,valor_ficha.eq.0');
    }
    if (currentJob.filter_criteria?.responsibleNull) {
      leadsQuery = leadsQuery.or('responsible.is.null,responsible.eq.');
    }
    if (currentJob.filter_criteria?.dateFrom) {
      leadsQuery = leadsQuery.gte('criado', currentJob.filter_criteria.dateFrom);
    }
    if (currentJob.filter_criteria?.dateTo) {
      const endDate = new Date(currentJob.filter_criteria.dateTo);
      endDate.setHours(23, 59, 59, 999);
      leadsQuery = leadsQuery.lte('criado', endDate.toISOString());
    }

    const { data: leads, error: fetchError } = await leadsQuery;

    if (fetchError) {
      console.error('[processBatch] Error fetching leads:', fetchError);
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      console.log('[processBatch] ✅ Nenhum lead restante - JOB COMPLETO');
      
      // Completar job
      const totalTime = ((Date.now() - callStartTime) / 1000).toFixed(1);
      console.log(`
        ╔════════════════════════════════════════════════════════════════
        ║ ✅ JOB COMPLETO
        ╠════════════════════════════════════════════════════════════════
        ║ Processados: ${totalProcessed.toLocaleString()}
        ║ Atualizados: ${totalUpdated.toLocaleString()}
        ║ Ignorados: ${totalSkipped.toLocaleString()}
        ║ Erros: ${totalErrors.toLocaleString()}
        ║ Tempo desta chamada: ${totalTime}s
        ╚════════════════════════════════════════════════════════════════
      `);
      
      await supabase
        .from('lead_resync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_leads: totalProcessed,
          updated_leads: totalUpdated,
          skipped_leads: totalSkipped,
          error_leads: totalErrors,
          error_details: errorDetails
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          needs_more_calls: false,
          processed: totalProcessed,
          batches_in_call: batchesProcessedInThisCall
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batchProgress = ((totalProcessed / initialJob.total_leads) * 100).toFixed(1);
    console.log(`
      ┌─────────────────────────────────────────────────────────────
      │ [Batch ${currentBatch + 1}] ${batchProgress}% - ${leads.length} leads
      └─────────────────────────────────────────────────────────────
    `);

    // 🔧 FASE 2: Buscar Bitrix Batch + Pre-load
    const leadIds = leads.map((l: any) => l.id);
    
    // 2.1: Batch request para Bitrix
    const batchCommands: Record<string, string> = {};
    leadIds.forEach((id: number, idx: number) => {
      batchCommands[`lead_${idx}`] = `crm.lead.get?ID=${id}`;
    });

    const bitrixBatchResponse = await fetch(
      `${BITRIX_BASE_URL}/batch.json`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: batchCommands })
      }
    );

    if (!bitrixBatchResponse.ok) {
      throw new Error(`Bitrix batch API error: ${bitrixBatchResponse.status}`);
    }

    const bitrixBatchData = await bitrixBatchResponse.json();
    const bitrixResults = bitrixBatchData.result?.result || {};

    // 2.2: Extrair todos os SPA IDs necessários
    const spaIds = {
      scouters: new Set<number>(),
      projetos: new Set<number>(),
      telemarketing: new Set<number>()
    };

    Object.values(bitrixResults).forEach((bitrixLead: any) => {
      const parent1096 = bitrixLead?.PARENT_ID_1096;
      const parent1120 = bitrixLead?.PARENT_ID_1120;
      const parent1144 = bitrixLead?.PARENT_ID_1144;
      
      if (parent1096) spaIds.scouters.add(Number(parent1096));
      if (parent1120) spaIds.projetos.add(Number(parent1120));
      if (parent1144) spaIds.telemarketing.add(Number(parent1144));
    });

    // 2.3: Pre-load SPAs (1 query total)
    const allSpaIds = [
      ...Array.from(spaIds.scouters),
      ...Array.from(spaIds.projetos),
      ...Array.from(spaIds.telemarketing)
    ];

    let spaMap = new Map<string, string>();
    
    if (allSpaIds.length > 0) {
      const { data: spaEntities } = await supabase
        .from('bitrix_spa_entities')
        .select('entity_type_id, bitrix_item_id, title')
        .in('bitrix_item_id', allSpaIds);

      if (spaEntities) {
        spaEntities.forEach((e: any) => {
          const key = `${e.entity_type_id}_${e.bitrix_item_id}`;
          spaMap.set(key, e.title);
        });
      }
    }

    // 2.4: Pre-load Telemarketing mappings (1 query)
    const tmIds = Array.from(spaIds.telemarketing);
    let tmMap = new Map<number, string>();
    
    if (tmIds.length > 0) {
      const { data: tmMappings } = await supabase
        .from('agent_telemarketing_mapping')
        .select('bitrix_telemarketing_id, bitrix_telemarketing_name')
        .in('bitrix_telemarketing_id', tmIds);

      if (tmMappings) {
        tmMappings.forEach((t: any) => {
          tmMap.set(t.bitrix_telemarketing_id, t.bitrix_telemarketing_name);
        });
      }
    }

    // 2.5: Buscar mapeamentos
    let mappings;
    if (currentJob.mapping_id) {
      const { data: resyncMappings } = await supabase
        .from('resync_field_mappings')
        .select('*')
        .eq('id', currentJob.mapping_id)
        .eq('active', true);
      
      if (!resyncMappings || resyncMappings.length === 0) {
        const { data: nameBasedMappings } = await supabase
          .from('resync_field_mappings')
          .select('*')
          .eq('mapping_name', currentJob.mapping_id)
          .eq('active', true);
        mappings = nameBasedMappings;
      } else {
        mappings = resyncMappings;
      }
    } else {
      const { data: bitrixMappings } = await supabase
        .from('unified_field_config')
        .select('*')
        .eq('sync_active', true);
      mappings = bitrixMappings;
    }

    if (!mappings || mappings.length === 0) {
      console.warn(`[processBatch] ⚠️ No mappings found`);
      mappings = [];
    }

    // 🔄 FASE 3: Processar leads em paralelo
    const processedResults = await Promise.all(
      leads.map(async (lead: any) => {
        try {
          const leadIdx = leadIds.indexOf(lead.id);
          const bitrixLead = bitrixResults[`lead_${leadIdx}`];

          if (!bitrixLead) {
            return {
              id: lead.id,
              status: 'skipped',
              error: 'No Bitrix data'
            };
          }

          // Resolver SPAs
          const scouterId = bitrixLead.PARENT_ID_1096 ? Number(bitrixLead.PARENT_ID_1096) : null;
          const projectId = bitrixLead.PARENT_ID_1120 ? Number(bitrixLead.PARENT_ID_1120) : null;
          const tmId = bitrixLead.PARENT_ID_1144 ? Number(bitrixLead.PARENT_ID_1144) : null;

          const scouterName = scouterId ? spaMap.get(`1096_${scouterId}`) : null;
          const projectName = projectId ? spaMap.get(`1120_${projectId}`) : null;
          const tmName = tmId ? spaMap.get(`1144_${tmId}`) : null;
          const responsibleName = tmId ? tmMap.get(tmId) : null;

          // Mapear campos
          const mappedData: Record<string, any> = {};
          const SPA_NAME_FIELDS = ['scouter', 'gestao_scouter', 'telemarketing', 'projeto_comercial'];

          for (const mapping of mappings) {
            try {
              if (SPA_NAME_FIELDS.includes(mapping.leads_column)) continue;

              const bitrixValue = bitrixLead[mapping.bitrix_field];
              if (bitrixValue === null || bitrixValue === undefined || bitrixValue === '') continue;

              let transformedValue = bitrixValue;

              // Transformações
              if (mapping.transform_function) {
                if (mapping.transform_function === 'toNumber') {
                  transformedValue = parseFloat(String(bitrixValue).replace(',', '.'));
                } else if (mapping.transform_function === 'toInteger') {
                  transformedValue = toInteger(bitrixValue);
                } else if (mapping.transform_function === 'toDate') {
                  const parsed = parseBrazilianDate(bitrixValue);
                  transformedValue = parsed ? parsed.split('T')[0] : null;
                } else if (mapping.transform_function === 'toTimestamp') {
                  transformedValue = parseBrazilianDate(bitrixValue);
                }
              }

              if (transformedValue !== null && transformedValue !== undefined) {
                mappedData[mapping.leads_column] = transformedValue;
              }
            } catch (err) {
              console.warn(`Field mapping error for ${mapping.bitrix_field}:`, err);
            }
          }

          // Adicionar SPAs
          if (scouterName) {
            mappedData['scouter'] = scouterName;
            mappedData['gestao_scouter'] = scouterName;
          }
          if (projectName) {
            mappedData['projeto_comercial'] = projectName;
          }
          if (tmName) {
            mappedData['telemarketing'] = tmName;
          }
          if (responsibleName) {
            mappedData['responsible'] = responsibleName;
          }

          // Conversões especiais
          const booleanFields = ['cadastro_existe_foto', 'presenca_confirmada', 'compareceu', 'ficha_confirmada'];
          for (const field of booleanFields) {
            if (mappedData[field] !== undefined && mappedData[field] !== null) {
              const bitrixField = SUPABASE_TO_BITRIX_ENUM[field];
              if (bitrixField) {
                const conversion = convertBitrixEnumToBoolean(bitrixField, mappedData[field]);
                mappedData[field] = conversion.converted;
              }
            }
          }

          // Conversão de moeda
          if (mappedData.valor_ficha !== undefined && mappedData.valor_ficha !== null) {
            const conversion = convertBitrixMoneyToNumeric(mappedData.valor_ficha);
            mappedData.valor_ficha = conversion.converted;
          }

          if (Object.keys(mappedData).length === 0) {
            return {
              id: lead.id,
              status: 'skipped',
              error: 'No fields to update'
            };
          }

          return {
            id: lead.id,
            status: 'success',
            data: {
              ...mappedData,
              last_sync_at: new Date().toISOString(),
              sync_status: 'synced',
              sync_errors: null,
              has_sync_errors: false
            }
          };

        } catch (error) {
          return {
            id: lead.id,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    // 💾 FASE 4: Batch Update no Supabase
    const successfulUpdates = processedResults.filter(r => r.status === 'success' && r.data);
    const skippedLeads = processedResults.filter(r => r.status === 'skipped');
    const errorLeads = processedResults.filter(r => r.status === 'error');

    if (successfulUpdates.length > 0) {
      const updateData = successfulUpdates.map(r => ({
        id: r.id,
        ...r.data
      }));

      const { error: upsertError } = await supabase
        .from('leads')
        .upsert(updateData, { onConflict: 'id' });

      if (upsertError) {
        console.error('[processBatch] Batch upsert error:', upsertError);
        totalErrors += successfulUpdates.length;
      } else {
        totalUpdated += successfulUpdates.length;
        console.log(`✅ Updated ${successfulUpdates.length} leads`);
      }
    }

    totalSkipped += skippedLeads.length;
    totalErrors += errorLeads.length;
    totalProcessed += leads.length;

    // 📊 FASE 5: Batch Insert sync_events
    const syncEvents = processedResults.map(r => ({
      lead_id: r.id,
      event_type: 'resync',
      direction: 'bitrix_to_supabase',
      status: r.status === 'success' ? 'success' : r.status === 'error' ? 'error' : 'skipped',
      error_message: r.error || null,
      sync_duration_ms: Date.now() - batchStartTime,
      fields_synced_count: r.data ? Object.keys(r.data).length - 4 : 0
    }));

    await supabase.from('sync_events').insert(syncEvents).catch((err: any) => {
      console.warn('Failed to insert sync_events:', err);
    });

    // Adicionar erros
    errorLeads.forEach(e => {
      if (errorDetails.length < 100) {
        errorDetails.push({
          lead_id: e.id,
          error: e.error,
          timestamp: new Date().toISOString(),
          type: 'processing_error',
          batch: currentBatch + 1
        });
      }
    });

    // Atualizar progresso
    lastProcessedId = leads[leads.length - 1].id;
    currentBatch++;
    batchesProcessedInThisCall++;

    const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    console.log(`⚡ Batch ${batchesProcessedInThisCall}/${MAX_BATCHES_PER_CALL} completed in ${batchTime}s - Updated: ${successfulUpdates.length}, Skipped: ${skippedLeads.length}, Errors: ${errorLeads.length}`);

    await supabase
      .from('lead_resync_jobs')
      .update({
        processed_leads: totalProcessed,
        updated_leads: totalUpdated,
        skipped_leads: totalSkipped,
        error_leads: totalErrors,
        last_processed_lead_id: lastProcessedId,
        current_batch: currentBatch,
        error_details: errorDetails,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }

  // Chegou ao limite de batches por chamada - retornar needs_more_calls: true
  const callTime = ((Date.now() - callStartTime) / 1000).toFixed(1);
  console.log(`
    ╔════════════════════════════════════════════════════════════════
    ║ 🔄 CHAMADA COMPLETA (mais chamadas necessárias)
    ╠════════════════════════════════════════════════════════════════
    ║ Batches processados: ${batchesProcessedInThisCall}
    ║ Total processado: ${totalProcessed.toLocaleString()} / ${initialJob.total_leads.toLocaleString()}
    ║ Progresso: ${((totalProcessed / initialJob.total_leads) * 100).toFixed(1)}%
    ║ Tempo desta chamada: ${callTime}s
    ╚════════════════════════════════════════════════════════════════
  `);

  return new Response(
    JSON.stringify({ 
      success: true, 
      needs_more_calls: true,
      processed: totalProcessed,
      total: initialJob.total_leads,
      batches_in_call: batchesProcessedInThisCall
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function pauseJob(supabase: any, jobId: string) {
  await supabase
    .from('lead_resync_jobs')
    .update({ 
      status: 'paused',
      paused_at: new Date().toISOString()
    })
    .eq('id', jobId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function resumeJob(supabase: any, jobId: string) {
  await supabase
    .from('lead_resync_jobs')
    .update({ 
      status: 'running',
      paused_at: null
    })
    .eq('id', jobId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelJob(supabase: any, jobId: string) {
  await supabase
    .from('lead_resync_jobs')
    .update({ 
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('id', jobId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteJob(supabase: any, jobId: string) {
  // Só permitir deletar jobs que não estão rodando
  const { data: job } = await supabase
    .from('lead_resync_jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  if (job && ['running', 'pending'].includes(job.status)) {
    return new Response(
      JSON.stringify({ error: 'Cannot delete running or pending job' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await supabase
    .from('lead_resync_jobs')
    .delete()
    .eq('id', jobId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserIdFromToken(supabase: any, authHeader: string): Promise<string | null> {
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Error getting user from token:', error);
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('Error parsing auth token:', error);
    return null;
  }
}
