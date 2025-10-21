import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Type definitions
interface Lead {
  id: string;
  name?: string | null;
  responsible?: string | null;
  age?: string | null;
  scouter?: string | null;
  photo_url?: string | null;
  date_modify?: string | null;
  raw?: unknown;
  updated_at?: string | null;
  bitrix_telemarketing_id?: string | null;
  commercial_project_id?: string | null;
  responsible_user_id?: string | null;
  celular?: string | null;
  telefone_trabalho?: string | null;
  telefone_casa?: string | null;
  etapa?: string | null;
  fonte?: string | null;
  criado?: string | null;
  nome_modelo?: string | null;
  local_abordagem?: string | null;
  ficha_confirmada?: boolean | null;
  data_criacao_ficha?: string | null;
  data_confirmacao_ficha?: string | null;
  presenca_confirmada?: boolean | null;
  compareceu?: boolean | null;
  cadastro_existe_foto?: boolean | null;
  valor_ficha?: number | null;
  data_criacao_agendamento?: string | null;
  horario_agendamento?: string | null;
  data_agendamento?: string | null;
  gerenciamento_funil?: string | null;
  status_fluxo?: string | null;
  etapa_funil?: string | null;
  etapa_fluxo?: string | null;
  funil_fichas?: string | null;
  status_tabulacao?: string | null;
  maxsystem_id_ficha?: string | null;
  gestao_scouter?: string | null;
  op_telemarketing?: string | null;
  data_retorno_ligacao?: string | null;
}

// Estrutura compatível com Gestão Scouter
interface LeadData {
  id: string;
  nome?: string | null; // name -> nome
  responsavel?: string | null; // responsible -> responsavel
  idade?: string | null; // age -> idade
  scouter?: string | null;
  foto?: string | null; // photo_url -> foto
  modificado?: string | null; // date_modify -> modificado
  telefone?: string | null;
  celular?: string | null;
  telefone_trabalho?: string | null;
  telefone_casa?: string | null;
  etapa?: string | null;
  fonte?: string | null;
  criado?: string | null;
  nome_modelo?: string | null;
  local_abordagem?: string | null;
  ficha_confirmada?: boolean | null;
  data_criacao_ficha?: string | null;
  data_confirmacao_ficha?: string | null;
  presenca_confirmada?: boolean | null;
  compareceu?: boolean | null;
  cadastro_existe_foto?: boolean | null;
  valor_ficha?: number | null;
  data_criacao_agendamento?: string | null;
  horario_agendamento?: string | null;
  data_agendamento?: string | null;
  gerenciamento_funil?: string | null;
  status_fluxo?: string | null;
  etapa_funil?: string | null;
  etapa_fluxo?: string | null;
  funil_fichas?: string | null;
  status_tabulacao?: string | null;
  maxsystem_id_ficha?: string | null;
  op_telemarketing?: string | null;
  data_retorno_ligacao?: string | null;
  ultima_sincronizacao: string; // last_sync_at -> ultima_sincronizacao
  origem_sincronizacao: string; // sync_source -> origem_sincronizacao
}

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variáveis de ambiente não configuradas');
      return new Response(
        JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, jobId, startDate, endDate, fieldsSelected, fieldMappings } = await req.json();

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
          fields_selected: fieldsSelected || null, // Backward compatibility - Array de campos selecionados ou null = todos
          field_mappings: fieldMappings || null, // NEW - Object mapping gestao fields to tabuladormax fields
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

    if (action === 'reset') {
      // Reset job counters to reprocess everything
      await supabase
        .from('gestao_scouter_export_jobs')
        .update({
          status: 'pending',
          processing_date: null,
          last_completed_date: null,
          total_leads: 0,
          exported_leads: 0,
          error_leads: 0,
          pause_reason: null,
          paused_at: null,
          started_at: null,
          completed_at: null,
        })
        .eq('id', jobId);

      // Clear errors for this job
      await supabase
        .from('gestao_scouter_export_errors')
        .delete()
        .eq('job_id', jobId);

      // Start processing again
      processBatchExport(jobId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Only allow deleting paused jobs
      const { data: job } = await supabase
        .from('gestao_scouter_export_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (job?.status !== 'paused') {
        return new Response(
          JSON.stringify({ error: 'Apenas jobs pausados podem ser excluídos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('gestao_scouter_export_jobs')
        .delete()
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não configuradas para processBatchExport');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

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
    console.error('❌ Configuração do gestao-scouter não encontrada');
    await supabase.from('gestao_scouter_export_jobs').update({
      status: 'failed',
      pause_reason: 'Configuração do gestao-scouter não encontrada ou inativa'
    }).eq('id', jobId);
    return;
  }
  
  // Validar configuração
  if (!config.project_url || !config.anon_key) {
    console.error('❌ Configuração incompleta:', {
      hasUrl: !!config.project_url,
      hasKey: !!config.anon_key
    });
    await supabase.from('gestao_scouter_export_jobs').update({
      status: 'failed',
      pause_reason: 'Configuração do gestao-scouter incompleta (falta project_url ou anon_key)'
    }).eq('id', jobId);
    return;
  }
  
  console.log('✅ Configuração encontrada:', {
    projectUrl: config.project_url,
    jobId
  });

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

  // Helper function to prepare lead data - supports both field selection and field mapping
  const prepareLeadData = (lead: Lead, fieldsSelected: string[] | null, fieldMappings: Record<string, string> | null): LeadData => {
    // Mapear apenas os campos que realmente existem no Gestão Scouter
    // Baseado na estrutura básica: id, nome, scouter, projeto, etc.
    const allFields: LeadData = {
      id: lead.id,
      nome: lead.name || null, // 'name' no TabuladorMax -> 'nome' no Gestão Scouter
      scouter: lead.scouter,
      foto: lead.photo_url || null, // 'photo_url' -> 'foto'
      idade: lead.age || null, // 'age' -> 'idade'
      telefone: lead.celular || lead.telefone_trabalho || lead.telefone_casa || null,
      celular: lead.celular,
      telefone_trabalho: lead.telefone_trabalho,
      telefone_casa: lead.telefone_casa,
      responsavel: lead.responsible || null, // 'responsible' -> 'responsavel'
      etapa: lead.etapa,
      fonte: lead.fonte,
      criado: lead.criado ? new Date(lead.criado).toISOString() : null,
      modificado: lead.date_modify ? new Date(lead.date_modify).toISOString() : (lead.updated_at ? new Date(lead.updated_at).toISOString() : null),
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
      op_telemarketing: lead.op_telemarketing,
      data_retorno_ligacao: lead.data_retorno_ligacao ? new Date(lead.data_retorno_ligacao).toISOString() : null,
      ultima_sincronizacao: new Date().toISOString(),
      origem_sincronizacao: 'tabuladormax'
    };

    // NEW: Handle field mappings (priority over fieldsSelected)
    if (fieldMappings && Object.keys(fieldMappings).length > 0) {
      const mappedData: Partial<LeadData> = {
        id: allFields.id,
        modificado: allFields.modificado,
        origem_sincronizacao: allFields.origem_sincronizacao,
        ultima_sincronizacao: allFields.ultima_sincronizacao,
      };

      // Apply field mappings: gestaoField -> tabuladormaxField
      Object.entries(fieldMappings).forEach(([gestaoField, tabField]) => {
        // Remove 'tab_' prefix from tabuladormax field name to match Lead interface
        const leadField = tabField.replace('tab_', '');
        
        // Map the value from Lead to LeadData using the mapping
        if (leadField in lead) {
          const value = (lead as unknown as Record<string, unknown>)[leadField];
          
          // Handle date conversions and special mappings
          if (gestaoField === 'nome') {
            (mappedData as unknown as Record<string, unknown>)['nome'] = value;
          } else if (gestaoField === 'responsavel') {
            (mappedData as unknown as Record<string, unknown>)['responsavel'] = value;
          } else if (gestaoField === 'idade') {
            (mappedData as unknown as Record<string, unknown>)['idade'] = value;
          } else if (gestaoField === 'foto') {
            (mappedData as unknown as Record<string, unknown>)['foto'] = value;
          } else if (leadField === 'date_modify' || leadField === 'updated_at' || leadField === 'criado' || 
                     leadField === 'data_criacao_ficha' || leadField === 'data_confirmacao_ficha' ||
                     leadField === 'data_criacao_agendamento' || leadField === 'data_retorno_ligacao') {
            // Convert dates to ISO string
            (mappedData as unknown as Record<string, unknown>)[gestaoField] = 
              value ? new Date(value as string).toISOString() : null;
          } else {
            (mappedData as unknown as Record<string, unknown>)[gestaoField] = value;
          }
        }
      });

      return mappedData as LeadData;
    }

    // LEGACY: Handle fieldsSelected (backward compatibility)
    if (!fieldsSelected || fieldsSelected.length === 0) {
      return allFields;
    }

    // Filter to only selected fields, but always include id and sync metadata
    const selectedData: Partial<LeadData> = {
      id: allFields.id,
      modificado: allFields.modificado,
      origem_sincronizacao: allFields.origem_sincronizacao,
      ultima_sincronizacao: allFields.ultima_sincronizacao,
    };

    fieldsSelected.forEach(field => {
      if (field in allFields) {
        (selectedData as unknown as Record<string, unknown>)[field] = (allFields as unknown as Record<string, unknown>)[field];
      }
    });

    return selectedData as LeadData;
  };

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
        // Preparar dados da ficha usando field mappings ou campos selecionados
        const leadData = prepareLeadData(lead, job.fields_selected, job.field_mappings);

        // Fazer upsert na tabela leads
        const { error: upsertError, status: responseStatus } = await gestaoScouterClient
          .from('leads')
          .upsert(leadData, { 
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
          console.error(`❌ Erro ao exportar lead ${lead.id}:`, {
            error: upsertError,
            errorMessage: upsertError.message,
            errorCode: upsertError.code,
            errorDetails: upsertError.details,
            errorHint: upsertError.hint,
            leadId: lead.id,
            leadName: lead.name
          });
          errorCount++;

          // Log detalhado do erro na nova tabela
          try {
            await supabase.from('gestao_scouter_export_errors').insert({
              job_id: jobId,
              lead_id: lead.id,
              lead_snapshot: lead, // Snapshot completo do lead
              fields_sent: leadData, // Campos que foram enviados
              error_message: upsertError.message,
              error_details: {
                code: upsertError.code,
                details: upsertError.details,
                hint: upsertError.hint,
              },
              response_status: responseStatus || null,
            });
          } catch (logErr) {
            console.error('❌ Erro ao registrar erro detalhado:', logErr);
          }
        } else {
          exportedCount++;
        }
      } catch (err) {
        console.error('❌ Erro ao processar lead:', err);
        errorCount++;

        // Registrar erro
        try {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          
          await supabase.from('sync_events').insert({
            event_type: 'update',
            direction: 'supabase_to_gestao_scouter',
            lead_id: lead.id,
            status: 'error',
            error_message: errorMessage
          });

          // Log detalhado do erro
          await supabase.from('gestao_scouter_export_errors').insert({
            job_id: jobId,
            lead_id: lead.id,
            lead_snapshot: lead,
            fields_sent: prepareLeadData(lead, job.fields_selected, job.field_mappings),
            error_message: errorMessage,
            error_details: err instanceof Error ? { stack: err.stack } : { raw: String(err) },
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
