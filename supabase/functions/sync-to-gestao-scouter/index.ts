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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead, source } = await req.json();
    
    console.log('sync-to-gestao-scouter: Recebendo requisição', { 
      leadId: lead?.id, 
      source 
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
      console.error('❌ Erro ao buscar configuração:', configError);
      throw new Error(`Erro ao buscar configuração: ${configError.message}`);
    }

    if (!config) {
      console.log('⚠️ Sincronização com gestao-scouter desabilitada');
      return new Response(
        JSON.stringify({ success: true, message: 'Gestao-scouter sync disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente para o projeto gestao-scouter
    const gestaoScouterClient = createClient(
      config.project_url,
      config.anon_key
    );

    // Preparar dados do lead para sincronizar com gestao-scouter
    // Loop prevention: sync_source marca que a atualização vem do TabuladorMax
    const leadData = {
      id: lead.id,
      name: lead.name,
      responsible: lead.responsible,
      age: lead.age,
      address: lead.address,
      scouter: lead.scouter,
      photo_url: lead.photo_url,
      date_modify: lead.date_modify ? new Date(lead.date_modify).toISOString() : (lead.updated_at ? new Date(lead.updated_at).toISOString() : null),
      raw: lead.raw,
      updated_at: new Date().toISOString(),
      // Campos adicionais
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
      sync_source: 'tabuladormax' // Marca origem para evitar loop
    };

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
      console.error('❌ Erro ao sincronizar com gestao-scouter:', {
        error: leadError,
        leadId: lead.id,
        errorDetails: leadError.details,
        errorHint: leadError.hint,
        errorCode: leadError.code
      });
      throw new Error(`Erro ao sincronizar: ${leadError.message} (code: ${leadError.code})`);
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
