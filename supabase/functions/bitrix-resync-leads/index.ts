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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, jobId, filters, batchSize } = await req.json();

    switch (action) {
      case 'create':
        return await createResyncJob(supabase, filters, batchSize);
      
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

async function createResyncJob(supabase: any, config: JobConfig, batchSize: number) {
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

  // Criar job
  const { data: job, error } = await supabase
    .from('lead_resync_jobs')
    .insert({
      status: 'pending',
      total_leads: count || 0,
      filter_criteria: config?.filters || {},
      batch_size: batchSize || 50,
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

  // Buscar mapeamentos ativos
  const { data: mappings } = await supabase
    .from('bitrix_field_mappings')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false });

  let updated = 0, skipped = 0, errors = 0;
  const errorDetails: any[] = [];

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
      const mappedData: any = {};
      let hasUpdates = false;

      for (const mapping of mappings || []) {
        const bitrixValue = bitrixLead[mapping.bitrix_field];
        
        if (!bitrixValue || bitrixValue === '') continue;

        let transformedValue = bitrixValue;

        // Transformações específicas
        switch (mapping.tabuladormax_field) {
          case 'valor_ficha':
            // "R$ 6,00" → 6.00
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
            transformedValue = new Date(bitrixValue).toISOString();
            break;
        }

        mappedData[mapping.tabuladormax_field] = transformedValue;
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorDetails.push({
        lead_id: lead.id,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      console.error(`Error processing lead ${lead.id}:`, error);
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
