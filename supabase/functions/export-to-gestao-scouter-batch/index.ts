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
  nome?: string | null;
  responsavel?: string | null;
  idade?: string | null;
  scouter?: string | null;
  foto?: string | null;
  modificado?: string | null;
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
  ultima_sincronizacao: string;
  origem_sincronizacao: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, startDate, endDate, fieldMappings, jobId } = await req.json();

    if (action === 'create') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Não autorizado');
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) throw new Error('Usuário não autenticado');

      const { data: config } = await supabase
        .from('gestao_scouter_config')
        .select('*')
        .eq('active', true)
        .eq('sync_enabled', true)
        .maybeSingle();

      if (!config) {
        throw new Error('Configuração do gestao-scouter não encontrada ou inativa');
      }

      const { data: newJob, error: jobError } = await supabase
        .from('gestao_scouter_export_jobs')
        .insert({
          start_date: startDate,
          end_date: endDate || null,
          status: 'pending',
          field_mappings: fieldMappings || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      processBatchExport(newJob.id);

      return new Response(
        JSON.stringify({ success: true, jobId: newJob.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'pause') {
      await supabase
        .from('gestao_scouter_export_jobs')
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

    if (action === 'resume') {
      await supabase
        .from('gestao_scouter_export_jobs')
        .update({ status: 'pending', paused_at: null })
        .eq('id', jobId);

      processBatchExport(jobId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset') {
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

      await supabase
        .from('gestao_scouter_export_errors')
        .delete()
        .eq('job_id', jobId);

      processBatchExport(jobId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
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
    console.error('❌ Variáveis de ambiente não configuradas');
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

  const { data: config } = await supabase
    .from('gestao_scouter_config')
    .select('*')
    .eq('active', true)
    .eq('sync_enabled', true)
    .maybeSingle();

  if (!config || !config.project_url || !config.anon_key) {
    await supabase.from('gestao_scouter_export_jobs').update({
      status: 'failed',
      pause_reason: 'Configuração do gestao-scouter não encontrada ou incompleta'
    }).eq('id', jobId);
    return;
  }

  const gestaoScouterClient = createClient(config.project_url, config.anon_key);

  await supabase.from('gestao_scouter_export_jobs').update({
    status: 'running',
    started_at: job.started_at || new Date().toISOString(),
  }).eq('id', jobId);

  console.log('🚀 Iniciando exportação resiliente do job:', jobId);

  let processingDate = job.processing_date || job.start_date;
  let totalProcessed = job.total_leads || 0;
  let totalExported = job.exported_leads || 0;
  let totalErrors = job.error_leads || 0;

  const BATCH_SIZE = 100;

  // Helper function to filter out empty fields
  const filterEmptyFields = (data: Partial<LeadData>, includeControlFields: boolean = true): LeadData => {
    const filtered: Partial<LeadData> = { id: data.id };
    
    Object.entries(data).forEach(([key, value]) => {
      // Keep fields with real values (not null, undefined, or empty string)
      if (value !== null && value !== undefined && value !== '') {
        (filtered as any)[key] = value;
      }
    });
    
    // Only add control fields if they were originally present OR if we have very few fields OR explicitly requested
    if (includeControlFields && ('ultima_sincronizacao' in data || Object.keys(filtered).length < 5)) {
      filtered.ultima_sincronizacao = new Date().toISOString();
    }
    if (includeControlFields && ('origem_sincronizacao' in data || Object.keys(filtered).length < 5)) {
      filtered.origem_sincronizacao = 'batch_export';
    }
    
    return filtered as LeadData;
  };

  const prepareLeadData = (lead: Lead, fieldMappings: Record<string, string> | null): LeadData => {
    const allFields: LeadData = {
      id: lead.id,
      nome: lead.name || null,
      scouter: lead.scouter,
      responsavel: lead.responsible,
      idade: lead.age,
      foto: lead.photo_url,
      modificado: lead.date_modify ? new Date(lead.date_modify).toISOString() : null,
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
      op_telemarketing: lead.op_telemarketing,
      data_retorno_ligacao: lead.data_retorno_ligacao ? new Date(lead.data_retorno_ligacao).toISOString() : null,
      ultima_sincronizacao: new Date().toISOString(),
      origem_sincronizacao: 'batch_export',
    };

    if (!fieldMappings) {
      return filterEmptyFields(allFields);
    }

    const mappedData: Partial<LeadData> = {
      id: allFields.id,
      ultima_sincronizacao: allFields.ultima_sincronizacao,
      origem_sincronizacao: allFields.origem_sincronizacao,
    };

    Object.entries(fieldMappings).forEach(([gestaoField, leadField]) => {
      if (leadField in lead) {
        const value = (lead as unknown as Record<string, unknown>)[leadField];
        
        if (leadField === 'date_modify' || leadField === 'updated_at' || leadField === 'criado' || 
            leadField === 'data_criacao_ficha' || leadField === 'data_confirmacao_ficha' ||
            leadField === 'data_criacao_agendamento' || leadField === 'data_retorno_ligacao') {
          (mappedData as unknown as Record<string, unknown>)[gestaoField] = 
            value ? new Date(value as string).toISOString() : null;
        } else {
          (mappedData as unknown as Record<string, unknown>)[gestaoField] = value;
        }
      }
    });

    return filterEmptyFields(mappedData as LeadData);
  };

  // Helper para tentar upsert com retry automático em caso de campo inválido
  const resilientUpsert = async (leadData: LeadData, leadId: string): Promise<{
    success: boolean;
    ignoredFields: string[];
    isNewRecord: boolean;
    error?: unknown;
  }> => {
    const ignoredFields: string[] = [];
    let currentData = { ...leadData };
    const MAX_RETRIES = 10;
    let retryCount = 0;

    // ✨ Verificar se lead já existe no Gestão Scouter
    const { data: existingLead } = await gestaoScouterClient
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .maybeSingle();
    
    const isNewRecord = !existingLead;

    while (true) {
      retryCount++;
      if (retryCount > MAX_RETRIES) {
        console.error('❌ Excedido número máximo de tentativas - possível loop infinito');
        return { 
          success: false, 
          ignoredFields,
          isNewRecord,
          error: { message: 'Máximo de tentativas excedido - possível loop infinito' } 
        };
      }

      const { error, status } = await gestaoScouterClient
        .from('leads')
        .upsert(currentData, { onConflict: 'id', ignoreDuplicates: false });

      if (!error) {
        return { success: true, ignoredFields, isNewRecord };
      }

      // TRATAR ERRO DE RLS PRIMEIRO (42501) - NÃO É RECUPERÁVEL
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        console.error('🚨 ERRO RLS 42501 - Política incorreta no Gestão Scouter!', {
          leadId,
          fields: Object.keys(currentData),
          message: error.message,
          hint: 'Verifique se as políticas RLS no Gestão Scouter tem: USING (true) WITH CHECK (true)',
          sql_check: 'SELECT * FROM pg_policies WHERE tablename = \'leads\''
        });
        
        // Registrar erro detalhado
        await supabase.from('gestao_scouter_export_errors').insert({
          job_id: jobId,
          lead_id: parseInt(leadId),
          lead_snapshot: leadData,
          fields_sent: currentData,
          error_message: `RLS Error: ${error.message}`,
          error_details: error,
          response_status: 403,
          ignored_fields: ignoredFields.length > 0 ? ignoredFields : null
        });
        
        // NÃO fazer retry - erro de RLS não é recuperável
        return { success: false, ignoredFields, isNewRecord, error };
      }

      // Se erro for PGRST204 (campo não existe no schema cache), remover campo e tentar novamente
      if (error.code === 'PGRST204' || 
          error.message?.includes('schema cache') || 
          error.message?.includes('column') || 
          error.message?.includes('does not exist')) {
        
        // Extrair nome do campo do erro (suporta aspas simples e duplas)
        const fieldMatch = error.message.match(/column ['"]([^'"]+)['"]/i) || 
                           error.message.match(/['"]([^'"]+)['"] column/i);
        
        console.log('🔍 Erro de schema detectado:', {
          code: error.code,
          message: error.message,
          fieldMatch: fieldMatch ? fieldMatch[1] : 'não detectado',
          retryAttempt: retryCount,
          leadId
        });

        if (fieldMatch && fieldMatch[1]) {
          const problematicField = fieldMatch[1];
          console.warn(`⚠️ Campo '${problematicField}' não existe no Gestão Scouter, removendo e tentando novamente`);
          
          delete (currentData as unknown as Record<string, unknown>)[problematicField];
          ignoredFields.push(problematicField);
          
          // Tentar novamente sem o campo problemático
          continue;
        } else {
          console.error('❌ Não foi possível extrair campo problemático do erro:', error.message);
        }
      }

      // Outro tipo de erro, não é recuperável
      return { success: false, ignoredFields, isNewRecord, error };
    }
  };

  while (true) {
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

    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .gte('updated_at', `${processingDate}T00:00:00`)
      .lt('updated_at', `${processingDate}T23:59:59.999`)
      .order('updated_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (fetchError) {
      await supabase.from('gestao_scouter_export_jobs').update({
        status: 'failed',
        pause_reason: `Erro ao buscar leads: ${fetchError.message}`
      }).eq('id', jobId);
      return;
    }

    if (!leads || leads.length === 0) {
      await supabase.from('gestao_scouter_export_jobs').update({
        last_completed_date: processingDate,
      }).eq('id', jobId);

      const nextDate = new Date(processingDate);
      nextDate.setDate(nextDate.getDate() - 1);
      processingDate = nextDate.toISOString().split('T')[0];

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

    let exportedCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      const startTime = Date.now();
      
      try {
        const leadData = prepareLeadData(lead, job.field_mappings);
        const result = await resilientUpsert(leadData, lead.id);
        const duration = Date.now() - startTime;

        await supabase.from('sync_events').insert({
          event_type: result.isNewRecord ? 'insert' : 'update',
          direction: 'supabase_to_gestao_scouter',
          lead_id: lead.id,
          status: result.success ? 'success' : 'error',
          sync_duration_ms: duration,
          error_message: result.error ? String(result.error) : null
        });

        if (result.success) {
          exportedCount++;
          
          const operationType = result.isNewRecord ? 'criado' : 'atualizado';
          if (result.ignoredFields.length > 0) {
            console.log(`⚠️ Lead ${lead.id} ${operationType} com ${result.ignoredFields.length} campo(s) ignorado(s): ${result.ignoredFields.join(', ')}`);
          } else {
            console.log(`✅ Lead ${lead.id} ${operationType} com sucesso`);
          }
        } else {
          errorCount++;

          await supabase.from('gestao_scouter_export_errors').insert({
            job_id: jobId,
            lead_id: lead.id,
            lead_snapshot: lead,
            fields_sent: leadData,
            ignored_fields: result.ignoredFields.length > 0 ? result.ignoredFields : null,
            error_message: result.error instanceof Error ? result.error.message : String(result.error),
            error_details: result.error,
          });
        }
      } catch (err) {
        errorCount++;

        await supabase.from('sync_events').insert({
          event_type: 'update',
          direction: 'supabase_to_gestao_scouter',
          lead_id: lead.id,
          status: 'error',
          error_message: err instanceof Error ? err.message : String(err)
        });

        await supabase.from('gestao_scouter_export_errors').insert({
          job_id: jobId,
          lead_id: lead.id,
          lead_snapshot: lead,
          fields_sent: prepareLeadData(lead, job.field_mappings),
          error_message: err instanceof Error ? err.message : String(err),
          error_details: err instanceof Error ? { stack: err.stack } : { raw: String(err) },
        });
      }
    }

    totalProcessed += leads.length;
    totalExported += exportedCount;
    totalErrors += errorCount;

    await supabase.from('gestao_scouter_export_jobs').update({
      total_leads: totalProcessed,
      exported_leads: totalExported,
      error_leads: totalErrors,
      processing_date: processingDate,
      last_completed_date: processingDate,
    }).eq('id', jobId);

    console.log(`✅ ${exportedCount} leads exportados de ${processingDate}`);

    if (leads.length < BATCH_SIZE) {
      const nextDate = new Date(processingDate);
      nextDate.setDate(nextDate.getDate() - 1);
      processingDate = nextDate.toISOString().split('T')[0];

      if (job.end_date && processingDate < job.end_date) {
        await supabase.from('gestao_scouter_export_jobs').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);

        console.log('✅ Exportação CONCLUÍDA!');
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
