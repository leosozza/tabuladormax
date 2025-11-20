import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, jobId, startDate, endDate } = await req.json();

    if (action === 'create') {
      // Obter usuário autenticado
      const authHeader = req.headers.get('Authorization')!;
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Não autenticado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar novo job
      const { data: job, error } = await supabase
        .from('bitrix_import_jobs')
        .insert({
          start_date: startDate || '2024-10-14',
          end_date: endDate || null,
          status: 'pending',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar job:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Job criado:', job.id);

      // Iniciar processamento em background
      processBatchJob(job.id);

      return new Response(
        JSON.stringify({ success: true, jobId: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'resume') {
      await supabase
        .from('bitrix_import_jobs')
        .update({ status: 'running', pause_reason: null })
        .eq('id', jobId);

      processBatchJob(jobId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'pause') {
      await supabase
        .from('bitrix_import_jobs')
        .update({ 
          status: 'paused', 
          pause_reason: 'Manual',
          paused_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processBatchJob(jobId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: job } = await supabase
    .from('bitrix_import_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job) {
    console.error('Job não encontrado:', jobId);
    return;
  }

  // Marcar como running
  await supabase.from('bitrix_import_jobs').update({
    status: 'running',
    started_at: job.started_at || new Date().toISOString(),
  }).eq('id', jobId);

  console.log('🚀 Iniciando processamento do job:', jobId);

  let processingDate = job.processing_date || job.start_date;
  let totalProcessed = job.total_leads || 0;
  let totalImported = job.imported_leads || 0;
  let totalErrors = job.error_leads || 0;

  while (true) {
    // Verificar se job foi pausado
    const { data: currentJob } = await supabase
      .from('bitrix_import_jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (currentJob?.status === 'paused') {
      console.log('⏸️ Job pausado manualmente');
      return;
    }

    console.log(`📅 Processando leads de ${processingDate}...`);

    // Buscar leads do dia atual do Bitrix
    const bitrixUrl = buildBitrixUrlByDate(processingDate);
    const response = await fetch(bitrixUrl);
    const data = await response.json();

    const leads = data.result || [];

    if (leads.length === 0) {
      console.log(`✅ Data ${processingDate} concluída (0 leads)`);

      // Marcar data como concluída
      await supabase.from('bitrix_import_jobs').update({
        last_completed_date: processingDate,
      }).eq('id', jobId);

      // Ir para o dia anterior
      const nextDate = new Date(processingDate);
      nextDate.setDate(nextDate.getDate() - 1);
      processingDate = nextDate.toISOString().split('T')[0];

      // Verificar se chegou ao fim
      if (job.end_date && processingDate < job.end_date) {
        await supabase.from('bitrix_import_jobs').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);

        console.log('✅ Importação CONCLUÍDA!');
        return;
      }

      continue;
    }

    // Processar leads do dia
    let importedCount = 0;
    let errorCount = 0;

    for (const bitrixLead of leads) {
      try {
        // Correção 3: Buscar commercial_project_id do Bitrix ou usar NULL
        const commercialProjectCode = bitrixLead.UF_CRM_1731003158 || null;
        let commercial_project_id = null;

        if (commercialProjectCode) {
          const { data: project } = await supabase
            .from('commercial_projects')
            .select('id')
            .eq('code', commercialProjectCode)
            .maybeSingle();
          
          commercial_project_id = project?.id || null;
        }

        const leadData = {
          id: Number(bitrixLead.ID),
          name: bitrixLead.NAME || bitrixLead.TITLE,
          age: bitrixLead.UF_CRM_1730995460866 ? Number(bitrixLead.UF_CRM_1730995460866) : null,
          address: bitrixLead.UF_CRM_1730995452611,
          photo_url: bitrixLead.UF_CRM_1730995486349,
          responsible: bitrixLead.UF_CRM_1730995472155,
          scouter: bitrixLead.UF_CRM_1730995479506,
          date_modify: bitrixLead.DATE_MODIFY,
          commercial_project_id,
          raw: bitrixLead,
          sync_source: 'bitrix',
          sync_status: 'synced',
          last_sync_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('leads')
          .upsert(leadData, { onConflict: 'id' });

        // Sincronizar foto se presente (em background)
        if (bitrixLead.UF_CRM_ID_FOTO) {
          console.log(`🖼️ Lead ${bitrixLead.ID} possui UF_CRM_ID_FOTO: ${bitrixLead.UF_CRM_ID_FOTO}`);
          
          supabase.functions.invoke('bitrix-photo-sync', {
            body: { leadId: Number(bitrixLead.ID) }
          }).catch((photoErr: any) => {
            console.warn(`⚠️ Erro ao sincronizar foto do lead ${bitrixLead.ID}:`, photoErr);
          });
        }

        // Correção 4: Melhorar tratamento de erros ao registrar sync_event
        try {
          const { error: syncError } = await supabase.from('sync_events').insert({
            event_type: 'create',
            direction: 'bitrix_to_supabase',
            lead_id: Number(bitrixLead.ID),
            status: error ? 'error' : 'success',
            sync_duration_ms: null,
            error_message: error ? error.message : null
          });

          if (syncError) {
            console.error('❌ Erro ao registrar sync_event:', syncError);
          }
        } catch (syncErr) {
          console.error('❌ Exceção ao criar sync_event:', syncErr);
        }

        if (error) {
          console.error(`❌ Erro ao importar lead ${bitrixLead.ID}:`, error);
          errorCount++;
        } else {
          importedCount++;
        }
      } catch (err) {
        console.error('❌ Erro ao processar lead:', err);
        errorCount++;
      }
    }

    totalProcessed += leads.length;
    totalImported += importedCount;
    totalErrors += errorCount;

    // Atualizar progresso
    await supabase.from('bitrix_import_jobs').update({
      total_leads: totalProcessed,
      imported_leads: totalImported,
      error_leads: totalErrors,
      processing_date: processingDate,
    }).eq('id', jobId);

    console.log(`✅ ${importedCount} leads importados de ${processingDate} (total: ${totalImported})`);

    // Correção 2: Sempre marcar a data como concluída após processar todos os leads
    await supabase.from('bitrix_import_jobs').update({
      last_completed_date: processingDate,
    }).eq('id', jobId);

    // Ir para o dia anterior
    const nextDate = new Date(processingDate);
    nextDate.setDate(nextDate.getDate() - 1);
    processingDate = nextDate.toISOString().split('T')[0];

    // Correção 3: Logs de debug
    console.log(`📊 Status do processamento:`, {
      processingDate,
      lastCompleted: processingDate,
      endDate: job.end_date,
      shouldStop: job.end_date ? processingDate < job.end_date : false,
      totalImported,
      totalErrors
    });

    // CORREÇÃO CRÍTICA: Lógica de finalização estava INVERTIDA!
    // Se processingDate < end_date: ainda não chegou no fim, CONTINUAR
    // Se processingDate >= end_date OU não tem end_date: PARAR
    if (job.end_date && processingDate < job.end_date) {
      console.log('🛑 Chegou no limite (end_date). Finalizando importação.');
      await supabase.from('bitrix_import_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);

      console.log('✅ Importação CONCLUÍDA!');
      return;
    }

    // Delay de 500ms entre requisições
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function buildBitrixUrlByDate(date: string): string {
  const baseUrl = 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.list.json';
  return `${baseUrl}?select[]=*&order[DATE_MODIFY]=DESC&filter[>=DATE_MODIFY]=${date} 00:00:00&filter[<=DATE_MODIFY]=${date} 23:59:59`;
}
