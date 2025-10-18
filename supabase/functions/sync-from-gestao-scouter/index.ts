import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function para receber atualizações do projeto gestao-scouter
 * e sincronizar de volta para a tabela leads do TabuladorMax.
 * 
 * Esta função deve ser chamada por um webhook ou trigger do gestao-scouter
 * quando um lead é atualizado lá.
 * 
 * Payload esperado: { lead: {...}, source: 'gestao_scouter' }
 * Loop prevention: ignora se source === 'tabuladormax' ou 'supabase'
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

    const body = await req.json();
    
    // Backward compatibility: Accept both 'lead' and legacy 'ficha' keys
    // During transition window, if 'ficha' is present and 'lead' is not, use 'ficha'
    const lead = body.lead || body.ficha;
    const source = body.source;
    
    console.log('sync-from-gestao-scouter: Recebendo atualização', { 
      leadId: lead?.id, 
      source,
      legacyKey: body.ficha && !body.lead ? 'ficha' : 'lead'
    });

    // Validar se o lead tem ID
    if (!lead?.id) {
      throw new Error('ID do lead é obrigatório');
    }

    // Evitar loop de sincronização - se a origem já é TabuladorMax, ignora
    // Loop prevention: early return if source indicates this came from TabuladorMax
    if (source === 'tabuladormax' || source === 'supabase') {
      console.log('sync-from-gestao-scouter: Ignorando - origem é tabuladormax');
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored - source is tabuladormax' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados do lead para upsert no TabuladorMax
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
      sync_source: 'gestao_scouter', // Marca origem para evitar loop
      sync_status: 'synced'
    };

    console.log('🔄 Atualizando lead no TabuladorMax:', {
      leadId: lead.id
    });

    // Verificar se existe um lead com ID e aplicar resolução de conflitos baseada em updated_at
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, updated_at')
      .eq('id', lead.id)
      .maybeSingle();

    // Se o lead existe e o lead do gestao-scouter é mais antigo, ignorar a atualização
    if (existingLead && lead.updated_at) {
      const existingDate = new Date(existingLead.updated_at);
      const leadDate = new Date(lead.updated_at);
      
      if (leadDate < existingDate) {
        console.log('⏭️ Ignorando atualização - lead mais antigo que lead existente:', {
          leadId: lead.id,
          existingDate: existingLead.updated_at,
          leadDate: lead.updated_at
        });
        
        try {
          await supabase.from('sync_events').insert({
            event_type: 'update',
            direction: 'gestao_scouter_to_supabase',
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
      console.error('❌ Erro ao atualizar lead no TabuladorMax:', {
        error: leadError,
        leadId: lead.id,
        errorDetails: leadError.details,
        errorHint: leadError.hint,
        errorCode: leadError.code
      });
      throw new Error(`Erro ao atualizar lead: ${leadError.message} (code: ${leadError.code})`);
    }

    console.log('✅ Lead atualizado com sucesso no TabuladorMax:', leadResult?.id);

    // Registrar evento de sincronização com detalhes
    try {
      await supabase.from('sync_events').insert({
        event_type: 'update',
        direction: 'gestao_scouter_to_supabase',
        lead_id: lead.id,
        status: 'success',
        sync_duration_ms: Date.now() - startTime,
        error_message: JSON.stringify({
          action: 'sync_from_gestao_scouter',
          lead_name: lead.name,
          sync_source: 'gestao_scouter',
          timestamp: new Date().toISOString()
        })
      });
    } catch (syncError) {
      console.error('❌ Erro ao registrar sync_event:', syncError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead sincronizado do gestao-scouter para TabuladorMax com sucesso',
        leadId: leadResult?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ sync-from-gestao-scouter: Erro', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Registrar erro de sincronização
    try {
      const body = await req.clone().json().catch(() => ({ lead: null, ficha: null }));
      const lead = body.lead || body.ficha;
      if (lead?.id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        try {
          await supabase.from('sync_events').insert({
            event_type: 'update',
            direction: 'gestao_scouter_to_supabase',
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
