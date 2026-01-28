// ============================================
// AI Window Proactive - Mensagens proativas quando janela expirando
// Executado via cron a cada 15 minutos
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GUPSHUP_API_KEY = Deno.env.get('GUPSHUP_API_KEY');
const GUPSHUP_APP_NAME = Deno.env.get('GUPSHUP_APP_NAME');
const GUPSHUP_SOURCE_NUMBER = Deno.env.get('GUPSHUP_SOURCE_NUMBER');

async function sendGupshupMessage(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string }> {
  if (!GUPSHUP_API_KEY || !GUPSHUP_APP_NAME || !GUPSHUP_SOURCE_NUMBER) {
    console.error('❌ Configurações do Gupshup não encontradas');
    return { success: false };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('channel', 'whatsapp');
    formData.append('source', GUPSHUP_SOURCE_NUMBER);
    formData.append('destination', phoneNumber);
    formData.append('src.name', GUPSHUP_APP_NAME);
    formData.append('message', JSON.stringify({ type: 'text', text: message }));

    const response = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': GUPSHUP_API_KEY,
      },
      body: formData.toString(),
    });

    const result = await response.json();
    
    if (result.status === 'submitted') {
      console.log(`✅ Mensagem proativa enviada para ${phoneNumber}`);
      return { success: true, messageId: result.messageId };
    }
    
    console.error(`❌ Erro ao enviar mensagem proativa: ${JSON.stringify(result)}`);
    return { success: false };
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem Gupshup:', error);
    return { success: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('🔄 Iniciando verificação de mensagens proativas...');

    // 1. Buscar agentes com window_proactive_enabled = true
    const { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('id, name, window_proactive_message, window_proactive_hours, auto_respond_filters')
      .eq('is_active', true)
      .eq('window_proactive_enabled', true);

    if (agentsError) {
      console.error('❌ Erro ao buscar agentes:', agentsError);
      throw agentsError;
    }

    if (!agents?.length) {
      console.log('ℹ️ Nenhum agente com mensagem proativa ativa');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum agente proativo ativo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 ${agents.length} agentes com mensagem proativa ativa`);

    let totalSent = 0;
    let totalSkipped = 0;

    for (const agent of agents) {
      const hoursThreshold = agent.window_proactive_hours || 2;
      const proactiveMessage = agent.window_proactive_message || 
        'Olá! Só passando para ver se você tem alguma dúvida ou se posso ajudar com algo mais. 😊';
      
      const filters = agent.auto_respond_filters || {};
      const etapas = filters.etapas || [];

      // 2. Buscar conversas com janela próxima de expirar
      // Janela fecha 24h após última mensagem inbound
      // Queremos conversas onde: now() > last_inbound_at + (24h - hoursThreshold)
      const thresholdTime = new Date();
      thresholdTime.setHours(thresholdTime.getHours() - (24 - hoursThreshold));

      // Buscar da materialized view
      const { data: conversations, error: convError } = await supabase
        .from('mv_whatsapp_conversation_stats')
        .select('phone_number, bitrix_id, last_inbound_at, last_outbound_at, etapa, is_closed')
        .eq('is_closed', false)
        .eq('is_window_open', true)
        .lte('last_inbound_at', thresholdTime.toISOString())
        .order('last_inbound_at', { ascending: true })
        .limit(50);

      if (convError) {
        console.error(`❌ Erro ao buscar conversas para agente ${agent.name}:`, convError);
        continue;
      }

      if (!conversations?.length) {
        console.log(`ℹ️ Agente ${agent.name}: Nenhuma conversa com janela próxima de expirar`);
        continue;
      }

      console.log(`📱 Agente ${agent.name}: ${conversations.length} conversas candidatas`);

      for (const conv of conversations) {
        // Verificar filtros de etapa
        if (etapas.length > 0 && conv.etapa && !etapas.includes(conv.etapa)) {
          console.log(`⏭️ Pulando ${conv.phone_number}: etapa ${conv.etapa} não está nos filtros`);
          totalSkipped++;
          continue;
        }

        // Verificar se já enviou mensagem proativa hoje para este número
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: existingLog } = await supabase
          .from('ai_auto_response_log')
          .select('id')
          .eq('phone_number', conv.phone_number)
          .eq('agent_id', agent.id)
          .eq('trigger_type', 'window_proactive')
          .gte('created_at', todayStart.toISOString())
          .limit(1);

        if (existingLog?.length) {
          console.log(`⏭️ Pulando ${conv.phone_number}: já recebeu mensagem proativa hoje`);
          totalSkipped++;
          continue;
        }

        // Verificar se a última mensagem foi do operador (não reenviamos se ainda aguardando resposta do cliente)
        if (conv.last_outbound_at && conv.last_inbound_at) {
          const lastOutbound = new Date(conv.last_outbound_at);
          const lastInbound = new Date(conv.last_inbound_at);
          
          if (lastOutbound > lastInbound) {
            console.log(`⏭️ Pulando ${conv.phone_number}: última mensagem foi nossa, aguardando cliente`);
            totalSkipped++;
            continue;
          }
        }

        // Enviar mensagem proativa
        const startTime = Date.now();
        const sendResult = await sendGupshupMessage(conv.phone_number, proactiveMessage);
        const responseTime = Date.now() - startTime;

        if (sendResult.success) {
          // Salvar mensagem no banco
          await supabase
            .from('whatsapp_messages')
            .insert({
              phone_number: conv.phone_number,
              bitrix_id: conv.bitrix_id,
              direction: 'outbound',
              message_type: 'text',
              content: proactiveMessage,
              status: 'sent',
              sender_name: `${agent.name} (Proativo)`,
              gupshup_message_id: sendResult.messageId,
              metadata: { 
                proactive: true,
                agent_id: agent.id,
                agent_name: agent.name,
                trigger: 'window_expiring'
              },
            });

          // Registrar no log de auto-resposta
          await supabase
            .from('ai_auto_response_log')
            .insert({
              agent_id: agent.id,
              phone_number: conv.phone_number,
              bitrix_id: conv.bitrix_id,
              trigger_type: 'window_proactive',
              output_message: proactiveMessage,
              response_time_ms: responseTime,
            });

          totalSent++;
          console.log(`✅ Mensagem proativa enviada para ${conv.phone_number} (agente: ${agent.name})`);
        }
      }
    }

    console.log(`🏁 Finalizado: ${totalSent} mensagens enviadas, ${totalSkipped} puladas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: totalSent, 
        skipped: totalSkipped 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no ai-window-proactive:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
