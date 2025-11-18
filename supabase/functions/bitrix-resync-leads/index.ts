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
  // Buscar job
  const { data: job, error: jobError } = await supabase
    .from('lead_resync_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error('Job not found:', jobId);
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Se não estiver rodando, marcar como running
  if (job.status === 'pending') {
    await supabase
      .from('lead_resync_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);
  }

  if (job.status !== 'running') {
    return new Response(
      JSON.stringify({ error: 'Job is not running' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Buscar próximo lote de leads
  let query = supabase
    .from('leads')
    .select('id')
    .gt('id', job.last_processed_lead_id || 0)
    .order('id', { ascending: true })
    .limit(job.batch_size);

  // Aplicar filtros
  if (job.filter_criteria?.addressNull) {
    query = query.is('address', null);
  }
  if (job.filter_criteria?.phoneNull) {
    query = query.or('celular.is.null,telefone_casa.is.null,telefone_trabalho.is.null');
  }
  if (job.filter_criteria?.valorNull) {
    query = query.is('valor_ficha', null);
  }

  const { data: leads, error: leadsError } = await query;

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
    return new Response(
      JSON.stringify({ error: leadsError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!leads || leads.length === 0) {
    // Completar job
    await supabase
      .from('lead_resync_jobs')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({ success: true, message: 'Job completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Buscar mapeamentos ativos (usar resync_field_mappings se mapping_id fornecido)
  let mappings;
  if (job.mapping_id) {
    // Usar mapeamentos específicos da resincronização
    const { data } = await supabase
      .from('resync_field_mappings')
      .select('*')
      .eq('mapping_id', job.mapping_id)
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

  let updated = 0, skipped = 0, errors = 0;
  const errorDetails: any[] = [];

  // Processar cada lead
  for (const lead of leads) {
    let mappedData: any = {}; // Declarar fora do try para acessar no catch
    
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
      mappedData = {};
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
        const sourceField = job.mapping_id ? mapping.bitrix_field : mapping.bitrix_field;
        const targetField = job.mapping_id ? mapping.leads_column : mapping.tabuladormax_field;
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
          case 'compareceu':
          case 'cadastro_existe_foto':
            transformedValue = bitrixValue !== 'Aguardando' && bitrixValue !== 'NAO';
            break;
          
          case 'criado':
          case 'date_modify':
          case 'data_criacao_ficha':
          case 'data_criacao_agendamento':
            transformedValue = new Date(bitrixValue).toISOString();
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
        skipped++;
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

      updated++;

      // Log em sync_events
      await supabase.from('sync_events').insert({
        lead_id: lead.id,
        event_type: 'resync',
        direction: 'bitrix_to_tabuladormax',
        status: 'success'
      });

    } catch (error) {
      errors++;
      
      // Logging detalhado de erros PostgreSQL
      let errorMessage = 'Unknown error';
      let errorCode = null;
      let errorDetails = null;
      let errorHint = null;
      let failedField = null;
      
      if (error && typeof error === 'object') {
        const pgError = error as any;
        errorCode = pgError.code;
        errorMessage = pgError.message || errorMessage;
        errorDetails = pgError.details;
        errorHint = pgError.hint;
        
        // Tentar identificar o campo que causou o erro
        if (errorMessage.includes('invalid input syntax for type uuid')) {
          const match = errorMessage.match(/invalid input syntax for type uuid: "([^"]+)"/);
          if (match) {
            failedField = Object.keys(mappedData || {}).find(key => 
              mappedData[key] === match[1]
            );
          }
        }
      }
      
      const detailedError = {
        lead_id: lead.id,
        error: errorMessage,
        error_code: errorCode,
        error_details: errorDetails,
        error_hint: errorHint,
        failed_field: failedField,
        failed_value: failedField ? mappedData?.[failedField] : null,
        timestamp: new Date().toISOString()
      };
      
      errorDetails.push(detailedError);
      
      // Log em sync_events com detalhes
      await supabase.from('sync_events').insert({
        lead_id: lead.id,
        event_type: 'resync',
        direction: 'bitrix_to_tabuladormax',
        status: 'error',
        error_message: `[${errorCode}] ${errorMessage}${failedField ? ` (Campo: ${failedField} | Valor: ${mappedData?.[failedField]})` : ''}`
      });
      
      console.error(`❌ Error processing lead ${lead.id}:`, detailedError);
    }
  }

  // Atualizar progresso do job
  const currentErrorDetails = job.error_details || [];
  await supabase
    .from('lead_resync_jobs')
    .update({
      processed_leads: job.processed_leads + leads.length,
      updated_leads: job.updated_leads + updated,
      skipped_leads: job.skipped_leads + skipped,
      error_leads: job.error_leads + errors,
      last_processed_lead_id: leads[leads.length - 1].id,
      current_batch: job.current_batch + 1,
      error_details: [...currentErrorDetails, ...errorDetails]
    })
    .eq('id', jobId);

  return new Response(
    JSON.stringify({ success: true, updated, skipped, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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
    .update({ status: 'running' })
    .eq('id', jobId);

  if (error) throw error;

  // Continuar processamento
  processBatch(supabase, jobId).catch(console.error);

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
