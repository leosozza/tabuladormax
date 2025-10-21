import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS headers
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Validar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variáveis de ambiente não configuradas:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead, source } = await req.json();
    
    // Validar payload
    if (!lead || !lead.id) {
      console.error('❌ Payload inválido - lead ou lead.id ausente');
      throw new Error('Payload inválido: lead e lead.id são obrigatórios');
    }
    
    console.log('🔄 sync-to-gestao-scouter: Recebendo requisição', { 
      leadId: lead.id, 
      leadName: lead.name,
      source,
      timestamp: new Date().toISOString()
    });

    // Evitar loop de sincronização
    if (source === 'gestao_scouter' || source === 'gestao-scouter') {
      console.log('sync-to-gestao-scouter: Ignorando - origem é gestao-scouter');
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored - source is gestao-scouter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração do gestao-scouter
    const { data: config, error: configError } = await supabase
      .from('gestao_scouter_config')
      .select('project_url, anon_key, sync_enabled, active')
      .eq('active', true)
      .eq('sync_enabled', true)
      .maybeSingle();

    if (configError) {
      console.error('❌ Erro ao buscar configuração:', {
        error: configError,
        message: configError.message,
        code: configError.code,
        details: configError.details
      });
      throw new Error(`Erro ao buscar configuração: ${configError.message}`);
    }

    if (!config) {
      console.log('⚠️ Sincronização com gestao-scouter desabilitada ou sem configuração ativa');
      return new Response(
        JSON.stringify({ success: true, message: 'Gestao-scouter sync disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validar configuração
    if (!config.project_url || !config.anon_key) {
      console.error('❌ Configuração incompleta:', {
        hasUrl: !!config.project_url,
        hasKey: !!config.anon_key
      });
      throw new Error('Configuração do gestao-scouter incompleta (falta project_url ou anon_key)');
    }
    
    console.log('✅ Configuração do gestao-scouter encontrada:', {
      projectUrl: config.project_url,
      syncEnabled: config.sync_enabled,
      active: config.active
    });

    // Criar cliente para o projeto gestao-scouter
    const gestaoScouterClient = createClient(
      config.project_url,
      config.anon_key
    );

    // Preparar dados do lead para sincronizar com gestao-scouter
    // Loop prevention: sync_source marca que a atualização vem do TabuladorMax
    // Filtra apenas campos que têm valor para evitar problemas de schema
    const buildLeadData = (leadSource: any) => {
      const data: Record<string, any> = {
        id: leadSource.id,
        updated_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        sync_source: 'tabuladormax' // Marca origem para evitar loop
      };
      
      // Adicionar campos opcionais apenas se tiverem valor
      const optionalFields = {
        name: leadSource.name,
        responsible: leadSource.responsible,
        age: leadSource.age,
        address: leadSource.address,
        scouter: leadSource.scouter,
        photo_url: leadSource.photo_url,
        date_modify: leadSource.date_modify ? new Date(leadSource.date_modify).toISOString() : (leadSource.updated_at ? new Date(leadSource.updated_at).toISOString() : null),
        raw: leadSource.raw,
        bitrix_telemarketing_id: leadSource.bitrix_telemarketing_id,
        commercial_project_id: leadSource.commercial_project_id,
        responsible_user_id: leadSource.responsible_user_id,
        celular: leadSource.celular,
        telefone_trabalho: leadSource.telefone_trabalho,
        telefone_casa: leadSource.telefone_casa,
        etapa: leadSource.etapa,
        fonte: leadSource.fonte,
        criado: leadSource.criado ? new Date(leadSource.criado).toISOString() : null,
        nome_modelo: leadSource.nome_modelo,
        local_abordagem: leadSource.local_abordagem,
        ficha_confirmada: leadSource.ficha_confirmada,
        data_criacao_ficha: leadSource.data_criacao_ficha ? new Date(leadSource.data_criacao_ficha).toISOString() : null,
        data_confirmacao_ficha: leadSource.data_confirmacao_ficha ? new Date(leadSource.data_confirmacao_ficha).toISOString() : null,
        presenca_confirmada: leadSource.presenca_confirmada,
        compareceu: leadSource.compareceu,
        cadastro_existe_foto: leadSource.cadastro_existe_foto,
        valor_ficha: leadSource.valor_ficha,
        data_criacao_agendamento: leadSource.data_criacao_agendamento ? new Date(leadSource.data_criacao_agendamento).toISOString() : null,
        horario_agendamento: leadSource.horario_agendamento,
        data_agendamento: leadSource.data_agendamento,
        gerenciamento_funil: leadSource.gerenciamento_funil,
        status_fluxo: leadSource.status_fluxo,
        etapa_funil: leadSource.etapa_funil,
        etapa_fluxo: leadSource.etapa_fluxo,
        funil_fichas: leadSource.funil_fichas,
        status_tabulacao: leadSource.status_tabulacao,
        maxsystem_id_ficha: leadSource.maxsystem_id_ficha,
        gestao_scouter: leadSource.gestao_scouter,
        op_telemarketing: leadSource.op_telemarketing,
        data_retorno_ligacao: leadSource.data_retorno_ligacao ? new Date(leadSource.data_retorno_ligacao).toISOString() : null,
      };
      
      // Adiciona apenas campos com valor definido
      for (const [key, value] of Object.entries(optionalFields)) {
        if (value !== undefined && value !== null) {
          data[key] = value;
        }
      }
      
      return data;
    };

    const leadData = buildLeadData(lead);

    console.log('🔄 Sincronizando com gestao-scouter:', {
      leadId: lead.id,
      projectUrl: config.project_url
    });

    // Verificar se existe um lead com ID e aplicar resolução de conflitos baseada em updated_at
    const { data: existingLead } = await gestaoScouterClient
      .from('leads')
      .select('id, updated_at')
      .eq('id', lead.id)
      .maybeSingle();

    // Se o lead existe no gestao-scouter e o lead local é mais antigo, ignorar a atualização
    if (existingLead && lead.updated_at) {
      const existingDate = new Date(existingLead.updated_at);
      const leadDate = new Date(lead.updated_at);
      
      if (leadDate < existingDate) {
        console.log('⏭️ Ignorando sincronização - lead mais antigo que lead existente:', {
          leadId: lead.id,
          existingDate: existingLead.updated_at,
          leadDate: lead.updated_at
        });
        
        try {
          await supabase.from('sync_events').insert({
            event_type: 'update',
            direction: 'supabase_to_gestao_scouter',
            lead_id: lead.id,
            status: 'success',
            error_message: 'Skipped - older version',
            sync_duration_ms: Date.now() - startTime
          });
        } catch (syncError) {
          console.error('❌ Erro ao registrar sync_event:', syncError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Lead ignorado - versão mais antiga que o lead existente',
            skipped: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fazer upsert na tabela leads do gestao-scouter
    const { data: leadResult, error: leadError } = await gestaoScouterClient
      .from('leads')
      .upsert(leadData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (leadError) {
      // Verificar se é um erro de schema cache (coluna não encontrada)
      const isSchemaCacheError = leadError.message?.includes('schema cache') || 
                                  leadError.message?.includes('column') ||
                                  leadError.code === 'PGRST204' ||
                                  leadError.code === '42703';
      
      console.error('❌ Erro ao sincronizar com gestao-scouter:', {
        error: leadError,
        leadId: lead.id,
        leadName: lead.name,
        errorMessage: leadError.message,
        errorDetails: leadError.details,
        errorHint: leadError.hint,
        errorCode: leadError.code,
        isSchemaCacheError,
        projectUrl: config.project_url,
        timestamp: new Date().toISOString(),
        fieldsAttempted: Object.keys(leadData)
      });
      
      // Se é erro de schema, fornecer mensagem mais útil
      if (isSchemaCacheError) {
        const schemaErrorMsg = `Schema mismatch detected: ${leadError.message}. ` +
          `This may indicate that the Gestão Scouter database schema is out of sync. ` +
          `Please ensure the 'leads' table in Gestão Scouter has all required columns. ` +
          `You may need to run the schema update SQL from the integration instructions.`;
        
        console.error('💡 Schema Error Details:', {
          suggestion: schemaErrorMsg,
          fieldsInPayload: Object.keys(leadData),
          recommendedAction: 'Update Gestão Scouter schema to match TabuladorMax schema'
        });
      }
      
      // Registrar erro detalhado
      try {
        await supabase.from('sync_events').insert({
          event_type: 'update',
          direction: 'supabase_to_gestao_scouter',
          lead_id: lead.id,
          status: 'error',
          error_message: isSchemaCacheError 
            ? `Schema mismatch: ${leadError.message}. Please update Gestão Scouter schema.`
            : `${leadError.message} (code: ${leadError.code}, hint: ${leadError.hint || 'N/A'})`,
          sync_duration_ms: Date.now() - startTime
        });
      } catch (syncErr) {
        console.error('❌ Erro ao registrar sync_event de erro:', syncErr);
      }
      
      throw new Error(isSchemaCacheError 
        ? `Schema mismatch: ${leadError.message}. Please update Gestão Scouter database schema.`
        : `Erro ao sincronizar: ${leadError.message} (code: ${leadError.code})`);
    }

    console.log('✅ Lead sincronizado com sucesso no gestao-scouter:', leadResult?.id);

    // Atualizar status de sincronização no TabuladorMax
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
        sync_source: 'supabase', // Marca para evitar loop
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('⚠️ Erro ao atualizar status no TabuladorMax:', updateError);
    }

    // Registrar evento de sincronização com detalhes
    try {
      await supabase.from('sync_events').insert({
        event_type: 'update',
        direction: 'supabase_to_gestao_scouter',
        lead_id: lead.id,
        status: 'success',
        sync_duration_ms: Date.now() - startTime,
        error_message: JSON.stringify({
          action: 'sync_to_gestao_scouter',
          lead_name: lead.name,
          sync_source: 'supabase',
          timestamp: new Date().toISOString()
        })
      });
    } catch (syncError) {
      console.error('❌ Erro ao registrar sync_event:', syncError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead sincronizado com gestao-scouter com sucesso',
        leadId: lead.id,
        gestaoScouterLeadId: leadResult?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ sync-to-gestao-scouter: Erro', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Registrar erro de sincronização
    try {
      const { lead } = await req.clone().json().catch(() => ({ lead: null }));
      if (lead?.id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        try {
          await supabase.from('sync_events').insert({
            event_type: 'update',
            direction: 'supabase_to_gestao_scouter',
            lead_id: lead.id,
            status: 'error',
            error_message: errorMessage
          });
        } catch (syncError) {
          console.error('❌ Erro ao registrar sync_event de erro:', syncError);
        }
      }
    } catch (logError) {
      console.error('Erro ao registrar evento de erro:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
