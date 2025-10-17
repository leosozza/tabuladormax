import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function para receber atualizações do projeto gestao-scouter
 * e sincronizar de volta para a tabela leads do TabuladorMax.
 * 
 * Esta função deve ser chamada por um webhook ou trigger do gestao-scouter
 * quando uma ficha é atualizada lá.
 */
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

    const { ficha, source } = await req.json();
    
    console.log('sync-from-gestao-scouter: Recebendo atualização', { 
      fichaId: ficha?.id, 
      source 
    });

    // Validar se a ficha tem ID
    if (!ficha?.id) {
      throw new Error('ID da ficha é obrigatório');
    }

    // Evitar loop de sincronização - se a origem já é TabuladorMax, ignora
    if (source === 'tabuladormax' || source === 'supabase') {
      console.log('sync-from-gestao-scouter: Ignorando - origem é tabuladormax');
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored - source is tabuladormax' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados do lead (espelho da ficha)
    const leadData = {
      id: ficha.id,
      name: ficha.name,
      responsible: ficha.responsible,
      age: ficha.age,
      address: ficha.address,
      scouter: ficha.scouter,
      photo_url: ficha.photo_url,
      date_modify: ficha.date_modify || new Date().toISOString(),
      raw: ficha.raw,
      updated_at: new Date().toISOString(),
      // Campos adicionais
      bitrix_telemarketing_id: ficha.bitrix_telemarketing_id,
      commercial_project_id: ficha.commercial_project_id,
      responsible_user_id: ficha.responsible_user_id,
      celular: ficha.celular,
      telefone_trabalho: ficha.telefone_trabalho,
      telefone_casa: ficha.telefone_casa,
      etapa: ficha.etapa,
      fonte: ficha.fonte,
      criado: ficha.criado,
      nome_modelo: ficha.nome_modelo,
      local_abordagem: ficha.local_abordagem,
      ficha_confirmada: ficha.ficha_confirmada,
      data_criacao_ficha: ficha.data_criacao_ficha,
      data_confirmacao_ficha: ficha.data_confirmacao_ficha,
      presenca_confirmada: ficha.presenca_confirmada,
      compareceu: ficha.compareceu,
      cadastro_existe_foto: ficha.cadastro_existe_foto,
      valor_ficha: ficha.valor_ficha,
      data_criacao_agendamento: ficha.data_criacao_agendamento,
      horario_agendamento: ficha.horario_agendamento,
      data_agendamento: ficha.data_agendamento,
      gerenciamento_funil: ficha.gerenciamento_funil,
      status_fluxo: ficha.status_fluxo,
      etapa_funil: ficha.etapa_funil,
      etapa_fluxo: ficha.etapa_fluxo,
      funil_fichas: ficha.funil_fichas,
      status_tabulacao: ficha.status_tabulacao,
      maxsystem_id_ficha: ficha.maxsystem_id_ficha,
      gestao_scouter: ficha.gestao_scouter,
      op_telemarketing: ficha.op_telemarketing,
      data_retorno_ligacao: ficha.data_retorno_ligacao,
      last_sync_at: new Date().toISOString(),
      sync_source: 'gestao_scouter', // Marca origem para evitar loop
      sync_status: 'synced'
    };

    console.log('🔄 Atualizando lead no TabuladorMax:', {
      leadId: ficha.id
    });

    // Fazer upsert na tabela leads do TabuladorMax
    const { data: leadResult, error: leadError } = await supabase
      .from('leads')
      .upsert(leadData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (leadError) {
      console.error('❌ Erro ao atualizar lead no TabuladorMax:', leadError);
      throw new Error(`Erro ao atualizar lead: ${leadError.message}`);
    }

    console.log('✅ Lead atualizado com sucesso no TabuladorMax:', leadResult?.id);

    // Registrar evento de sincronização
    await supabase.from('sync_events').insert({
      event_type: 'update',
      direction: 'gestao_scouter_to_supabase',
      lead_id: ficha.id,
      status: 'success',
      sync_duration_ms: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Ficha sincronizada do gestao-scouter para TabuladorMax com sucesso',
        leadId: leadResult?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ sync-from-gestao-scouter: Erro', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Registrar erro de sincronização
    try {
      const { ficha } = await req.clone().json().catch(() => ({ ficha: null }));
      if (ficha?.id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from('sync_events').insert({
          event_type: 'update',
          direction: 'gestao_scouter_to_supabase',
          lead_id: ficha.id,
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
