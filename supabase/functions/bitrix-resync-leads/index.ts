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
      console.log(`✅ Data brasileira parseada: "${dateStr}" → "${isoDate}"`);
      return isoDate;
    }
    
    // Formato brasileiro apenas data: dd/MM/yyyy
    const matchDate = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchDate) {
      const [, day, month, year] = matchDate;
      const isoDate = `${year}-${month}-${day}T00:00:00Z`;
      console.log(`✅ Data brasileira parseada: "${dateStr}" → "${isoDate}"`);
      return isoDate;
    }
    
    // Fallback: tentar parsear como ISO ou outro formato padrão
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString();
      console.log(`✅ Data ISO parseada: "${dateStr}" → "${isoDate}"`);
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

  const { count } = await query;

  // Criar job com mapping_id
  const { data: job, error } = await supabase
    .from('lead_resync_jobs')
    .insert({
      status: 'pending',
      total_leads: count || 0,
      filter_criteria: config?.filters || {},
      batch_size: batchSize || 50,
      mapping_id: mappingId || null,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  // Iniciar processamento em background
  processBatch(supabase, job.id).catch(console.error);

  return new Response(
    JSON.stringify({ success: true, job }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processBatch(supabase: any, jobId: string) {
  console.log(`[processBatch] Starting batch processing for job ${jobId}`);
  
  // Buscar job inicial
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
  let currentBatch = initialJob.current_batch || 0;
  let lastProcessedId = initialJob.last_processed_lead_id || 0;
  let errorDetails: any[] = initialJob.error_details || [];

  // Loop contínuo para processar todos os batches
  while (true) {
    console.log(`[processBatch] Starting batch ${currentBatch + 1}, last ID: ${lastProcessedId}`);

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
    
    // Buscar próximo lote de leads
    let query = supabase
      .from('leads')
      .select('id')
      .gt('id', lastProcessedId)
      .order('id', { ascending: true })
      .limit(batchSize);

    // Aplicar filtros se configurados
    if (currentJob.filter_criteria?.addressNull) {
      query = query.is('address', null);
    }
    if (currentJob.filter_criteria?.phoneNull) {
      query = query.or('celular.is.null,telefone_casa.is.null,telefone_trabalho.is.null');
    }
    if (currentJob.filter_criteria?.valorNull) {
      query = query.is('valor_ficha', null);
    }
    if (currentJob.filter_criteria?.responsibleNull) {
      query = query.is('responsible', null);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      await supabase
        .from('lead_resync_jobs')
        .update({ 
          status: 'failed', 
          error_details: [...errorDetails, { error: leadsError.message, timestamp: new Date().toISOString() }]
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!leads || leads.length === 0) {
      // Completar job
      console.log(`[processBatch] No more leads, completing job. Total processed: ${totalProcessed}`);
      await supabase
        .from('lead_resync_jobs')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          processed_leads: totalProcessed,
          updated_leads: totalUpdated,
          skipped_leads: totalSkipped,
          error_leads: totalErrors,
          current_batch: currentBatch,
          error_details: errorDetails
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ success: true, message: 'Job completed', total_processed: totalProcessed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[processBatch] Processing ${leads.length} leads in batch ${currentBatch + 1}`);

    // Buscar mapeamentos ativos (usar resync_field_mappings se mapping_id fornecido)
    let mappings;
    if (currentJob.mapping_id) {
      // Usar mapeamentos específicos da resincronização
      const { data } = await supabase
        .from('resync_field_mappings')
        .select('*')
        .eq('mapping_name', currentJob.mapping_id)
        .eq('active', true)
        .order('priority', { ascending: false });
      mappings = data;
    } else {
      // Fallback para mapeamentos bitrix_field_mappings
      const { data } = await supabase
        .from('bitrix_field_mappings')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });
      mappings = data;
    }

    let batchUpdated = 0, batchSkipped = 0, batchErrors = 0;

    // Processar cada lead
    for (const lead of leads) {
      try {
        // Buscar dados no Bitrix
        const bitrixResponse = await fetch(
          `${BITRIX_BASE_URL}/crm.lead.get.json?id=${lead.id}`
        );

        if (!bitrixResponse.ok) {
          throw new Error(`Bitrix API returned ${bitrixResponse.status}`);
        }

        const bitrixData = await bitrixResponse.json();
        
        if (!bitrixData.result) {
          throw new Error('No result from Bitrix');
        }

        const bitrixLead = bitrixData.result;

        // Aplicar mapeamentos
        let mappedData: any = {};
        let hasUpdates = false;

        // Campos UUID que precisam de validação especial
        const uuidFields = ['responsible_user_id', 'commercial_project_id', 'analisado_por'];
        
        // Função auxiliar para validar UUID
        const isValidUUID = (value: any): boolean => {
          if (!value || typeof value !== 'string') return false;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(value);
        };

        for (const mapping of mappings || []) {
          const sourceField = currentJob.mapping_id ? mapping.bitrix_field : mapping.bitrix_field;
          const targetField = currentJob.mapping_id ? mapping.leads_column : mapping.tabuladormax_field;
          const bitrixValue = bitrixLead[sourceField];
          
          if (!bitrixValue || bitrixValue === '') continue;

          let transformedValue = bitrixValue;

          // Transformações específicas
          switch (targetField) {
            case 'valor_ficha':
              transformedValue = parseFloat(
                String(bitrixValue).replace('R$', '').replace(',', '.').trim()
              );
              break;
            
            case 'ficha_confirmada':
            case 'presenca_confirmada':
            case 'cadastro_existe_foto':
              transformedValue = bitrixValue !== 'Aguardando' && bitrixValue !== 'NAO';
              break;
            
            case 'criado':
            case 'date_modify':
            case 'data_criacao_ficha':
            case 'data_criacao_agendamento':
            case 'data_confirmacao_ficha':
            case 'data_retorno_ligacao':
            case 'data_analise':
            case 'compareceu':
              transformedValue = parseBrazilianDate(bitrixValue);
              if (!transformedValue) {
                console.warn(`⚠️ Data inválida ignorada para ${targetField}: "${bitrixValue}"`);
                continue;
              }
              break;
            
            case 'data_agendamento':
              // data_agendamento é do tipo date (não timestamp), então extrair apenas yyyy-MM-dd
              const parsedAgendamento = parseBrazilianDate(bitrixValue);
              if (parsedAgendamento) {
                transformedValue = parsedAgendamento.split('T')[0];
                console.log(`✅ Data de agendamento parseada: "${bitrixValue}" → "${transformedValue}"`);
              } else {
                console.warn(`⚠️ Data de agendamento inválida ignorada: "${bitrixValue}"`);
                continue;
              }
              break;
          }

          // Validação UUID
          if (uuidFields.includes(targetField) && !isValidUUID(transformedValue)) {
            console.warn(`⚠️ Ignorando valor não-UUID para ${targetField}: "${transformedValue}"`);
            continue;
          }

          mappedData[targetField] = transformedValue;
          hasUpdates = true;
        }

        if (!hasUpdates) {
          batchSkipped++;
          totalSkipped++;
          continue;
        }

        // Atualizar lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            ...mappedData,
            sync_status: 'synced',
            sync_source: 'bitrix_resync',
            last_sync_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (updateError) throw updateError;

        batchUpdated++;
        totalUpdated++;

        // Log em sync_events
        await supabase.from('sync_events').insert({
          lead_id: lead.id,
          event_type: 'resync',
          direction: 'bitrix_to_tabuladormax',
          status: 'success'
        });

      } catch (error) {
        batchErrors++;
        totalErrors++;
        
        // Logging detalhado de erros PostgreSQL
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isPostgresError = errorMessage.includes('invalid input syntax') || 
                               errorMessage.includes('violates') ||
                               errorMessage.includes('constraint');
        
        if (isPostgresError) {
          console.error(`❌ PostgreSQL Error para lead ${lead.id}:`, errorMessage);
          
          // Adicionar detalhes do erro
          errorDetails.push({
            lead_id: lead.id,
            error: errorMessage,
            timestamp: new Date().toISOString(),
            type: 'database_error'
          });
        } else {
          console.error(`Error processing lead ${lead.id}:`, error);
          
          errorDetails.push({
            lead_id: lead.id,
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
        }

        // Log em sync_events
        await supabase.from('sync_events').insert({
          lead_id: lead.id,
          event_type: 'resync',
          direction: 'bitrix_to_tabuladormax',
          status: 'error',
          error_message: errorMessage
        });
      }

      // Atualizar last_processed_lead_id
      lastProcessedId = lead.id;
    }

    // Incrementar contador de batch e total processado
    currentBatch++;
    totalProcessed += leads.length;

    // Atualizar job com progresso atual
    await supabase
      .from('lead_resync_jobs')
      .update({
        processed_leads: totalProcessed,
        updated_leads: totalUpdated,
        skipped_leads: totalSkipped,
        error_leads: totalErrors,
        current_batch: currentBatch,
        last_processed_lead_id: lastProcessedId,
        error_details: errorDetails
      })
      .eq('id', jobId);

    console.log(`[processBatch] Batch ${currentBatch} completed: ${batchUpdated} updated, ${batchSkipped} skipped, ${batchErrors} errors`);
  }
}

async function pauseJob(supabase: any, jobId: string) {
  const { error } = await supabase
    .from('lead_resync_jobs')
    .update({ 
      status: 'paused',
      paused_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function resumeJob(supabase: any, jobId: string) {
  const { error } = await supabase
    .from('lead_resync_jobs')
    .update({ 
      status: 'running',
      paused_at: null
    })
    .eq('id', jobId);

  if (error) throw error;

  // Reiniciar processamento
  processBatch(supabase, jobId).catch(console.error);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelJob(supabase: any, jobId: string) {
  const { data: job } = await supabase
    .from('lead_resync_jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  if (!job || job.status === 'completed' || job.status === 'cancelled') {
    throw new Error('Job cannot be cancelled');
  }

  const { error } = await supabase
    .from('lead_resync_jobs')
    .update({ 
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Cancelled by user'
    })
    .eq('id', jobId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteJob(supabase: any, jobId: string) {
  const { data: job } = await supabase
    .from('lead_resync_jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  if (!job) {
    throw new Error('Job not found');
  }

  if (job.status === 'running' || job.status === 'pending') {
    throw new Error('Cannot delete running or pending job');
  }

  const { error } = await supabase
    .from('lead_resync_jobs')
    .delete()
    .eq('id', jobId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserIdFromToken(supabase: any, authHeader: string): Promise<string | null> {
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || null;
  } catch {
    return null;
  }
}
