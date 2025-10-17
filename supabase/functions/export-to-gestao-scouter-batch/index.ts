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

      // Verificar se configuração do gestao-scouter está ativa
      const { data: config } = await supabase
        .from('gestao_scouter_config')
        .select('*')
        .eq('active', true)
        .eq('sync_enabled', true)
        .maybeSingle();

      if (!config) {
        return new Response(
          JSON.stringify({ error: 'Configuração do gestao-scouter não encontrada ou inativa' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar novo job
      const { data: job, error } = await supabase
        .from('gestao_scouter_export_jobs')
        .insert({
          start_date: startDate || new Date().toISOString().split('T')[0],
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

      console.log('✅ Job de exportação criado:', job.id);

      // Iniciar processamento em background
      processBatchExport(job.id);

      return new Response(
        JSON.stringify({ success: true, jobId: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'resume') {
      await supabase
        .from('gestao_scouter_export_jobs')
        .update({ status: 'running', pause_reason: null })
        .eq('id', jobId);

      processBatchExport(jobId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'pause') {
      await supabase
        .from('gestao_scouter_export_jobs')
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

async function processBatchExport(jobId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: job } = await supabase
    .from('gestao_scouter_export_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job) {
    console.error('Job não encontrado:', jobId);
    return;
  }

  // Buscar configuração do gestao-scouter
  const { data: config } = await supabase
    .from('gestao_scouter_config')
    .select('*')
    .eq('active', true)
    .eq('sync_enabled', true)
    .maybeSingle();

  if (!config) {
    await supabase.from('gestao_scouter_export_jobs').update({
      status: 'failed',
      pause_reason: 'Configuração do gestao-scouter não encontrada'
    }).eq('id', jobId);
    return;
  }

  // Criar cliente para gestao-scouter
  const gestaoScouterClient = createClient(
    config.project_url,
    config.anon_key
  );

  // Marcar como running
  await supabase.from('gestao_scouter_export_jobs').update({
    status: 'running',
    started_at: job.started_at || new Date().toISOString(),
  }).eq('id', jobId);

  console.log('🚀 Iniciando exportação do job:', jobId);

  let processingDate = job.processing_date || job.start_date;
  let totalProcessed = job.total_leads || 0;
  let totalExported = job.exported_leads || 0;
  let totalErrors = job.error_leads || 0;

  const BATCH_SIZE = 100; // Processar 100 leads por vez

  while (true) {
    // Verificar se job foi pausado
    const { data: currentJob } = await supabase
      .from('gestao_scouter_export_jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (currentJob?.status === 'paused') {
      console.log('⏸️ Job pausado manualmente');
      return;
    }

    console.log(`📅 Exportando leads de ${processingDate}...`);

    // Buscar leads do dia atual do TabuladorMax
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .gte('updated_at', `${processingDate}T00:00:00`)
      .lt('updated_at', `${processingDate}T23:59:59.999`)
      .order('updated_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Erro ao buscar leads:', fetchError);
      await supabase.from('gestao_scouter_export_jobs').update({
        status: 'failed',
        pause_reason: `Erro ao buscar leads: ${fetchError.message}`
      }).eq('id', jobId);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log(`✅ Data ${processingDate} concluída (0 leads)`);

      // Marcar data como concluída
      await supabase.from('gestao_scouter_export_jobs').update({
        last_completed_date: processingDate,
      }).eq('id', jobId);

      // Ir para o dia anterior
      const nextDate = new Date(processingDate);
      nextDate.setDate(nextDate.getDate() - 1);
      processingDate = nextDate.toISOString().split('T')[0];

      // Verificar se chegou ao fim
      if (job.end_date && processingDate < job.end_date) {
        await supabase.from('gestao_scouter_export_jobs').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);

        console.log('✅ Exportação CONCLUÍDA!');
        return;
      }

      continue;
    }

    // Exportar leads para gestao-scouter
    let exportedCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      const startTime = Date.now();
      
      try {
        // Preparar dados da ficha
        const fichaData = {
          id: lead.id,
          name: lead.name,
          responsible: lead.responsible,
          age: lead.age,
          address: lead.address,
          scouter: lead.scouter,
          photo_url: lead.photo_url,
          date_modify: lead.date_modify ? new Date(lead.date_modify).toISOString() : (lead.updated_at ? new Date(lead.updated_at).toISOString() : null),
          raw: lead.raw,
          updated_at: lead.updated_at ? new Date(lead.updated_at).toISOString() : new Date().toISOString(),
          bitrix_telemarketing_id: lead.bitrix_telemarketing_id,
          commercial_project_id: lead.commercial_project_id,
          responsible_user_id: lead.responsible_user_id,
          celular: lead.celular,
          telefone_trabalho: lead.telefone_trabalho,
          telefone_casa: lead.telefone_casa,
          etapa: lead.etapa,
          fonte: lead.fonte,
          criado: lead.criado ? new Date(lead.criado).toISOString() : null,
          nome_modelo: lead.nome_modelo,
          local_abordagem: lead.local_abordagem,
          ficha_confirmada: lead.ficha_confirmada,
          data_criacao_ficha: lead.data_criacao_ficha ? new Date(lead.data_criacao_ficha).toISOString() : null,
          data_confirmacao_ficha: lead.data_confirmacao_ficha ? new Date(lead.data_confirmacao_ficha).toISOString() : null,
          presenca_confirmada: lead.presenca_confirmada,
          compareceu: lead.compareceu,
          cadastro_existe_foto: lead.cadastro_existe_foto,
          valor_ficha: lead.valor_ficha,
          data_criacao_agendamento: lead.data_criacao_agendamento ? new Date(lead.data_criacao_agendamento).toISOString() : null,
          horario_agendamento: lead.horario_agendamento,
          data_agendamento: lead.data_agendamento,
          gerenciamento_funil: lead.gerenciamento_funil,
          status_fluxo: lead.status_fluxo,
          etapa_funil: lead.etapa_funil,
          etapa_fluxo: lead.etapa_fluxo,
          funil_fichas: lead.funil_fichas,
          status_tabulacao: lead.status_tabulacao,
          maxsystem_id_ficha: lead.maxsystem_id_ficha,
          gestao_scouter: lead.gestao_scouter,
          op_telemarketing: lead.op_telemarketing,
          data_retorno_ligacao: lead.data_retorno_ligacao ? new Date(lead.data_retorno_ligacao).toISOString() : null,
          last_sync_at: new Date().toISOString(),
          sync_source: 'tabuladormax'
        };

        // Fazer upsert na tabela fichas
        const { error: upsertError } = await gestaoScouterClient
          .from('fichas')
          .upsert(fichaData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        const duration = Date.now() - startTime;

        // Registrar evento de sincronização
        try {
          await supabase.from('sync_events').insert({
            event_type: 'update',
            direction: 'supabase_to_gestao_scouter',
            lead_id: lead.id,
            status: upsertError ? 'error' : 'success',
            sync_duration_ms: duration,
            error_message: upsertError ? upsertError.message : null
          });
        } catch (syncErr) {
          console.error('❌ Erro ao registrar sync_event:', syncErr);
        }

        if (upsertError) {
          console.error(`❌ Erro ao exportar lead ${lead.id}:`, upsertError);
          errorCount++;
        } else {
          exportedCount++;
        }
      } catch (err) {
        console.error('❌ Erro ao processar lead:', err);
        errorCount++;

        // Registrar erro
        try {
          await supabase.from('sync_events').insert({
            event_type: 'update',
            direction: 'supabase_to_gestao_scouter',
            lead_id: lead.id,
            status: 'error',
            error_message: err instanceof Error ? err.message : 'Erro desconhecido'
          });
        } catch (syncErr) {
          console.error('❌ Erro ao registrar sync_event de erro:', syncErr);
        }
      }
    }

    totalProcessed += leads.length;
    totalExported += exportedCount;
    totalErrors += errorCount;

    // Atualizar progresso
    await supabase.from('gestao_scouter_export_jobs').update({
      total_leads: totalProcessed,
      exported_leads: totalExported,
      error_leads: totalErrors,
      processing_date: processingDate,
    }).eq('id', jobId);

    console.log(`✅ ${exportedCount} leads exportados de ${processingDate} (total: ${totalExported})`);

    // Marcar data como concluída
    await supabase.from('gestao_scouter_export_jobs').update({
      last_completed_date: processingDate,
    }).eq('id', jobId);

    // Se processou menos que BATCH_SIZE, significa que acabou os leads daquele dia
    if (leads.length < BATCH_SIZE) {
      // Ir para o dia anterior
      const nextDate = new Date(processingDate);
      nextDate.setDate(nextDate.getDate() - 1);
      processingDate = nextDate.toISOString().split('T')[0];

      console.log(`📊 Status do processamento:`, {
        processingDate,
        lastCompleted: processingDate,
        endDate: job.end_date,
        shouldStop: job.end_date ? processingDate < job.end_date : false,
        totalExported,
        totalErrors
      });

      // Verificar se chegou ao fim
      if (job.end_date && processingDate < job.end_date) {
        console.log('🛑 Chegou no limite (end_date). Finalizando exportação.');
        await supabase.from('gestao_scouter_export_jobs').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);

        console.log('✅ Exportação CONCLUÍDA!');
        return;
      }
    }

    // Delay de 500ms entre lotes
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
