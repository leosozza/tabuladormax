import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';

const BITRIX_BASE_URL = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr';

interface JobConfig {
  filters?: {
    addressNull?: boolean;
    phoneNull?: boolean;
    valorNull?: boolean;
    responsibleNull?: boolean;
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
        return await createResyncJob(supabase, filters, batchSize, mappingId);
      
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
    query = query.is('address', null);
  }
  if (config?.filters?.phoneNull) {
    query = query.or('celular.is.null,telefone_casa.is.null,telefone_trabalho.is.null');
  }
  if (config?.filters?.valorNull) {
    query = query.is('valor_ficha', null);
  }
  if (config?.filters?.responsibleNull) {
    query = query.is('responsible', null);
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

  // Iniciar processamento em background
  processBatch(supabase, job.id).catch(err => {
    console.error('[createResyncJob] Background processing error:', err);
  });

  return new Response(
    JSON.stringify({ success: true, job }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processBatch(supabase: any, jobId: string) {
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

  // Marcar como running
  await supabase
    .from('lead_resync_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId);

  // Variáveis para acumular progresso
  let totalProcessed = initialJob.processed_leads || 0;
  let totalUpdated = initialJob.updated_leads || 0;
  let totalSkipped = initialJob.skipped_leads || 0;
  let totalErrors = initialJob.error_leads || 0;
  const errorDetails: any[] = [];
  let lastProcessedId = Number.MAX_SAFE_INTEGER; // Começar do maior ID (mais recente)
  let currentBatch = 0;
  const jobStartTime = Date.now();

  console.log(`
    ╔════════════════════════════════════════════════════════════════
    ║ [Job ${jobId}] INICIANDO RESINCRONIZAÇÃO
    ╠════════════════════════════════════════════════════════════════
    ║ Total de leads: ${initialJob.total_leads.toLocaleString()}
    ║ Batch size: ${initialJob.batch_size}
    ║ Mapeamento: ${initialJob.mapping_id || 'Padrão (bitrix_field_mappings)'}
    ║ Filtros: ${JSON.stringify(initialJob.filter_criteria)}
    ║ Ordem: ⬇️ MAIS RECENTE (ID maior) → MAIS ANTIGO (ID menor)
    ╚════════════════════════════════════════════════════════════════
  `);

  // Loop contínuo para processar todos os batches
  while (true) {
    // Buscar job atualizado para verificar status
    const { data: currentJob } = await supabase
      .from('lead_resync_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!currentJob || currentJob.status !== 'running') {
      console.log(`[processBatch] Job paused or cancelled, stopping loop. Status: ${currentJob?.status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job paused or cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batchSize = currentJob.batch_size || 50;
    
    // Buscar próximo lote de leads (do maior para o menor ID)
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .lt('id', lastProcessedId) // Processar leads com ID menor que o último (mais antigos)
      .order('id', { ascending: false }) // Ordenar do maior para o menor (mais recente → antigo)
      .limit(batchSize);

    // Aplicar filtros se configurados
    if (currentJob.filter_criteria?.addressNull) {
      leadsQuery = leadsQuery.is('address', null);
    }
    if (currentJob.filter_criteria?.phoneNull) {
      leadsQuery = leadsQuery.or('celular.is.null,telefone_casa.is.null,telefone_trabalho.is.null');
    }
    if (currentJob.filter_criteria?.valorNull) {
      leadsQuery = leadsQuery.is('valor_ficha', null);
    }
    if (currentJob.filter_criteria?.responsibleNull) {
      leadsQuery = leadsQuery.is('responsible', null);
    }

    const { data: leads, error: fetchError } = await leadsQuery;

    if (fetchError) {
      console.error('[processBatch] Error fetching leads:', fetchError);
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      console.log('[processBatch] ✅ Nenhum lead restante para processar');
      break;
    }

    const batchProgress = ((totalProcessed / initialJob.total_leads) * 100).toFixed(1);
    const elapsedTime = ((Date.now() - jobStartTime) / 1000).toFixed(1);
    console.log(`
      ┌─────────────────────────────────────────────────────────────
      │ [Batch ${currentBatch + 1}] Progresso: ${batchProgress}%
      ├─────────────────────────────────────────────────────────────
      │ Leads neste batch: ${leads.length}
      │ Processados: ${totalProcessed.toLocaleString()} / ${initialJob.total_leads.toLocaleString()}
      │ Atualizados: ${totalUpdated.toLocaleString()}
      │ Ignorados: ${totalSkipped.toLocaleString()}
      │ Erros: ${totalErrors.toLocaleString()}
      │ Last ID: ${lastProcessedId}
      │ Tempo decorrido: ${elapsedTime}s
      └─────────────────────────────────────────────────────────────
    `);

    // Buscar mapeamentos
    let mappings;
    if (currentJob.mapping_id) {
      console.log(`[processBatch] Buscando mapeamentos com ID: ${currentJob.mapping_id}`);
      
      // Primeiro tentar buscar por UUID em resync_field_mappings
      const { data: resyncMappings } = await supabase
        .from('resync_field_mappings')
        .select('*')
        .eq('id', currentJob.mapping_id)
        .eq('active', true);
      
      // Se não encontrar por UUID, tentar por mapping_name (fallback)
      if (!resyncMappings || resyncMappings.length === 0) {
        console.log(`[processBatch] Tentando buscar por mapping_name: ${currentJob.mapping_id}`);
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
      // Fallback: usar unified_field_config
      const { data: bitrixMappings } = await supabase
        .from('unified_field_config')
        .select('*')
        .eq('sync_active', true);
      mappings = bitrixMappings;
    }

    if (!mappings || mappings.length === 0) {
      console.error(`[processBatch] ❌ No active mappings found for mapping_id: ${currentJob.mapping_id}`);
    } else {
      console.log(`[processBatch] ✅ Found ${mappings.length} active mappings`);
    }

    // Processar cada lead
      for (const lead of leads) {
        const syncStartTime = Date.now(); // ✅ Capturar tempo de início
        
        try {
        // Buscar dados do Bitrix
        const bitrixResponse = await fetch(
          `${BITRIX_BASE_URL}/crm.lead.get.json?ID=${lead.id}`
        );
        
        if (!bitrixResponse.ok) {
          console.warn(`[processBatch] Bitrix API error for lead ${lead.id}: ${bitrixResponse.status}`);
          totalErrors++;
          totalProcessed++;
          errorDetails.push({
            lead_id: lead.id,
            error: `Bitrix API error: ${bitrixResponse.status}`,
            timestamp: new Date().toISOString(),
            type: 'api_error',
            batch: currentBatch + 1
          });
          continue;
        }

        const bitrixLead = await bitrixResponse.json();

        if (!bitrixLead.result) {
          console.warn(`[processBatch] No result from Bitrix for lead ${lead.id}`);
          totalSkipped++;
          totalProcessed++;
          continue;
        }

        // Mapear campos do Bitrix para TabuladorMax
        const mappedData: Record<string, any> = {};
        const transformErrors: string[] = [];
        
        console.log(`[processBatch] Lead ${lead.id}: Aplicando ${mappings?.length || 0} mapeamentos`);
        
        for (const mapping of mappings) {
          try {
            const bitrixValue = bitrixLead.result[mapping.bitrix_field];
            
            if (bitrixValue === null || bitrixValue === undefined || bitrixValue === '') {
              continue;
            }

            let transformedValue = bitrixValue;

            // FASE 1: Resolver PARENT_ID_1144 para nome do telemarketing
            if (mapping.bitrix_field === 'PARENT_ID_1144' && mapping.leads_column === 'responsible') {
              const telemarketingId = Number(bitrixValue);
              
              const { data: tmMapping } = await supabase
                .from('agent_telemarketing_mapping')
                .select('bitrix_telemarketing_name')
                .eq('bitrix_telemarketing_id', telemarketingId)
                .maybeSingle();
              
              if (tmMapping?.bitrix_telemarketing_name) {
                transformedValue = tmMapping.bitrix_telemarketing_name;
                console.log(`✅ Resolved telemarketing ID ${telemarketingId} → "${transformedValue}"`);
              } else {
                console.warn(`⚠️ Telemarketing ID ${telemarketingId} não encontrado em agent_telemarketing_mapping`);
                continue; // Pular se não encontrar
              }
            }
            // Aplicar outras transformações
            else if (mapping.transform_function) {
              try {
                if (mapping.transform_function === 'toNumber') {
                  transformedValue = parseFloat(String(bitrixValue).replace(',', '.'));
                } else if (mapping.transform_function === 'toDate') {
                  // Parsear data brasileira e extrair apenas yyyy-MM-dd
                  const parsed = parseBrazilianDate(bitrixValue);
                  transformedValue = parsed ? parsed.split('T')[0] : null;
                } else if (mapping.transform_function === 'toTimestamp') {
                  // Parsear timestamp brasileiro
                  transformedValue = parseBrazilianDate(bitrixValue);
                }
              } catch (transformError) {
                const errMsg = `Erro ao transformar ${mapping.bitrix_field}: ${transformError}`;
                transformErrors.push(errMsg);
                console.warn(`⚠️ ${errMsg}`);
                continue;
              }
            }

            if (transformedValue !== null && transformedValue !== undefined) {
              mappedData[mapping.leads_column] = transformedValue;
            }
          } catch (fieldError) {
            const errMsg = `Erro no campo ${mapping.bitrix_field}: ${fieldError}`;
            transformErrors.push(errMsg);
            console.warn(`⚠️ ${errMsg}`);
          }
        }

        // Se não há dados para atualizar, pular
        if (Object.keys(mappedData).length === 0) {
          console.log(`⚠️ Lead ${lead.id} ignorado (sem campos para atualizar)`);
          totalSkipped++;
          totalProcessed++;
          continue;
        }

        // FASE 4: Validar dados críticos antes de salvar
        if (mappedData.responsible) {
          // Se responsible for numérico, alertar e tentar corrigir
          if (/^\d+$/.test(String(mappedData.responsible))) {
            console.warn(`⚠️ Lead ${lead.id}: responsible="${mappedData.responsible}" é numérico! Deveria ser nome.`);
            
            // Tentar corrigir em tempo real
            const telemarketingId = Number(mappedData.responsible);
            const { data: tmMapping } = await supabase
              .from('agent_telemarketing_mapping')
              .select('bitrix_telemarketing_name')
              .eq('bitrix_telemarketing_id', telemarketingId)
              .maybeSingle();
            
            if (tmMapping) {
              mappedData.responsible = tmMapping.bitrix_telemarketing_name;
              console.log(`✅ Corrigido para: "${mappedData.responsible}"`);
            } else {
              delete mappedData.responsible; // Remove campo se não conseguir resolver
              console.warn(`⚠️ Não foi possível resolver telemarketing ID ${telemarketingId}, campo removido`);
            }
          }
        }

        console.log(`[processBatch] Lead ${lead.id}: ${Object.keys(mappedData).length} campos serão atualizados:`, Object.keys(mappedData).join(', '));

        // Atualizar lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            ...mappedData,
            last_sync_at: new Date().toISOString(),
            sync_status: 'synced'
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`[processBatch] Error updating lead ${lead.id}:`, updateError);
          totalErrors++;
          
          const errorMessage = updateError.message || JSON.stringify(updateError);
          const isPostgresError = errorMessage.includes('invalid input syntax');
          
          errorDetails.push({
            lead_id: lead.id,
            error: errorMessage,
            timestamp: new Date().toISOString(),
            type: isPostgresError ? 'database_error' : 'api_error',
            batch: currentBatch + 1,
            field_data: mappedData ? JSON.stringify(mappedData).substring(0, 500) : null,
            transform_errors: transformErrors.length > 0 ? transformErrors : null
          });
          
          // Manter apenas os últimos 100 erros para não sobrecarregar o banco
          if (errorDetails.length > 100) {
            errorDetails.splice(0, errorDetails.length - 100);
          }

          // ✅ Log do evento de sync com erro + tratamento de erro
          try {
            const { error: syncEventError } = await supabase.from('sync_events').insert({
              lead_id: lead.id,
              event_type: 'resync',
              direction: 'bitrix_to_supabase',
              status: 'error',
              error_message: errorMessage,
              sync_duration_ms: Date.now() - syncStartTime,
              field_mappings: {
                bitrix_to_supabase: Object.keys(mappedData || {}).map(key => ({
                  bitrix_field: mappings?.find((m: any) => m.leads_column === key)?.bitrix_field || 'unknown',
                  tabuladormax_field: key,
                  value: mappedData?.[key],
                  transformed: !!mappings?.find((m: any) => m.leads_column === key)?.transform_function
                }))
              },
              fields_synced_count: Object.keys(mappedData || {}).length
            });
            
            if (syncEventError) {
              console.error(`⚠️ Erro ao registrar sync_event (não fatal):`, syncEventError);
            }
          } catch (syncError) {
            console.error(`⚠️ Exceção ao registrar sync_event:`, syncError);
          }
        } else {
          totalUpdated++;
          console.log(`✅ Lead ${lead.id} atualizado com ${Object.keys(mappedData).length} campos`);
          
          // ✅ Log do evento de sync com sucesso + tratamento de erro
          try {
            const { error: syncEventError } = await supabase.from('sync_events').insert({
              lead_id: lead.id,
              event_type: 'resync',
              direction: 'bitrix_to_supabase',
              status: 'success',
              sync_duration_ms: Date.now() - syncStartTime,
              field_mappings: {
                bitrix_to_supabase: Object.keys(mappedData).map(key => ({
                  bitrix_field: mappings?.find((m: any) => m.leads_column === key)?.bitrix_field || 'unknown',
                  tabuladormax_field: key,
                  value: mappedData[key],
                  transformed: !!mappings?.find((m: any) => m.leads_column === key)?.transform_function
                }))
              },
              fields_synced_count: Object.keys(mappedData).length
            });
            
            if (syncEventError) {
              console.error(`⚠️ Erro ao registrar sync_event (não fatal):`, syncEventError);
            }
          } catch (syncError) {
            console.error(`⚠️ Exceção ao registrar sync_event:`, syncError);
          }
        }

        totalProcessed++;
      } catch (error) {
        console.error(`[processBatch] Error processing lead ${lead.id}:`, error);
        totalErrors++;
        totalProcessed++;
        
        errorDetails.push({
          lead_id: lead.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          type: 'processing_error',
          batch: currentBatch + 1
        });
        
        if (errorDetails.length > 100) {
          errorDetails.splice(0, errorDetails.length - 100);
        }
      }
    }

    // Atualizar último lead processado e progresso
    lastProcessedId = leads[leads.length - 1].id;
    currentBatch++;

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

  // Completar job
  console.log(`✅ [Job ${jobId}] COMPLETO - Total processado: ${totalProcessed}, Atualizados: ${totalUpdated}, Erros: ${totalErrors}`);
  
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
    JSON.stringify({ success: true, processed: totalProcessed }),
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

  // Reiniciar processamento
  processBatch(supabase, jobId).catch(err => {
    console.error('[resumeJob] Error:', err);
  });

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
