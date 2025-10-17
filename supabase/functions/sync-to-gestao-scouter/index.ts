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

    // Preparar dados da ficha (espelho da tabela leads)
    const fichaData = {
      id: lead.id,
      name: lead.name,
      responsible: lead.responsible,
      age: lead.age,
      address: lead.address,
      scouter: lead.scouter,
      photo_url: lead.photo_url,
      date_modify: lead.date_modify,
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
      criado: lead.criado,
      nome_modelo: lead.nome_modelo,
      local_abordagem: lead.local_abordagem,
      ficha_confirmada: lead.ficha_confirmada,
      data_criacao_ficha: lead.data_criacao_ficha,
      data_confirmacao_ficha: lead.data_confirmacao_ficha,
      presenca_confirmada: lead.presenca_confirmada,
      compareceu: lead.compareceu,
      cadastro_existe_foto: lead.cadastro_existe_foto,
      valor_ficha: lead.valor_ficha,
      data_criacao_agendamento: lead.data_criacao_agendamento,
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
      data_retorno_ligacao: lead.data_retorno_ligacao,
      last_sync_at: new Date().toISOString(),
      sync_source: 'tabuladormax' // Marca origem para evitar loop
    };

    console.log('🔄 Sincronizando com gestao-scouter:', {
      leadId: lead.id,
      projectUrl: config.project_url
    });

    // Fazer upsert na tabela fichas do gestao-scouter
    const { data: fichaResult, error: fichaError } = await gestaoScouterClient
      .from('fichas')
      .upsert(fichaData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (fichaError) {
      console.error('❌ Erro ao sincronizar com gestao-scouter:', fichaError);
      throw new Error(`Erro ao sincronizar: ${fichaError.message}`);
    }

    console.log('✅ Ficha sincronizada com sucesso no gestao-scouter:', fichaResult?.id);

    // Atualizar status de sincronização no TabuladorMax
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
        sync_source: 'supabase' // Marca para evitar loop
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('⚠️ Erro ao atualizar status no TabuladorMax:', updateError);
    }

    // Registrar evento de sincronização
    await supabase.from('sync_events').insert({
      event_type: 'update',
      direction: 'supabase_to_gestao_scouter',
      lead_id: lead.id,
      status: 'success',
      sync_duration_ms: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead sincronizado com gestao-scouter com sucesso',
        leadId: lead.id,
        fichaId: fichaResult?.id
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
        
        await supabase.from('sync_events').insert({
          event_type: 'update',
          direction: 'supabase_to_gestao_scouter',
          lead_id: lead.id,
          status: 'error',
          error_message: errorMessage
        });
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
