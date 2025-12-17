// ============================================
// Gupshup Webhook - Recebe mensagens e status
// Com detecção de loops e integração com Bot IA
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Rate limit settings
const LOOP_DETECTION_WINDOW_SECONDS = 60;
const LOOP_DETECTION_THRESHOLD = 20;
const AUTO_BLOCK_THRESHOLD = 60;

// Normalização consistente
function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11 && digits[2] === '9') return `55${digits}`;
  return digits;
}

interface GupshupMessagePayload {
  id: string;
  source: string;
  type: string;
  payload: {
    text?: string;
    caption?: string;
    url?: string;
    type?: string;
  };
  sender?: {
    phone: string;
    name?: string;
  };
  context?: {
    gsId?: string;
  };
}

interface GupshupEvent {
  app: string;
  timestamp: number;
  version: number;
  type: 'message' | 'message-event' | 'user-event';
  payload: GupshupMessagePayload | {
    id: string;
    gsId?: string;
    destination: string;
    type: 'sent' | 'delivered' | 'read' | 'failed' | 'enqueued';
    payload?: {
      ts?: number;
      code?: string;
      reason?: string;
    };
  };
}

interface BotConfig {
  is_enabled: boolean;
  commercial_project_id: string;
  bot_name: string;
  personality: string;
  welcome_message: string;
  fallback_message: string;
  transfer_keywords: string[];
  max_messages_before_transfer: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response('Webhook OK', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    console.log('📨 Gupshup webhook recebido:', JSON.stringify(body, null, 2));

    const event: GupshupEvent = body;

    if (event.type === 'message') {
      await handleInboundMessage(supabase, event, supabaseUrl, supabaseServiceKey);
    } else if (event.type === 'message-event') {
      await handleMessageEvent(supabase, event);
    } else if (event.type === 'user-event') {
      console.log('👤 User event recebido:', event);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no gupshup-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// Loop Detection Helper
// ============================================
async function checkForLoop(supabase: any, phoneNumber: string, eventType: string): Promise<{ blocked: boolean; loopDetected: boolean }> {
  try {
    const { data, error } = await supabase.rpc('detect_webhook_loop', {
      p_phone_number: phoneNumber,
      p_event_type: eventType,
      p_time_window_seconds: LOOP_DETECTION_WINDOW_SECONDS,
      p_threshold: LOOP_DETECTION_THRESHOLD
    });

    if (error) {
      console.error('❌ Erro ao verificar loop:', error);
      return { blocked: false, loopDetected: false };
    }

    if (data?.blocked) {
      console.log(`🚫 Número ${phoneNumber} já está bloqueado`);
      return { blocked: true, loopDetected: false };
    }

    if (data?.loop_detected) {
      console.warn(`⚠️ LOOP DETECTADO para ${phoneNumber}: ${data.count} eventos em ${LOOP_DETECTION_WINDOW_SECONDS}s`);
      
      if (data.should_block || data.count >= AUTO_BLOCK_THRESHOLD) {
        console.error(`🔴 AUTO-BLOQUEIO ATIVADO para ${phoneNumber}: ${data.count} eventos`);
        await supabase.rpc('emergency_block_number', {
          p_phone_number: phoneNumber,
          p_reason: `Loop automático detectado: ${data.count} eventos em ${LOOP_DETECTION_WINDOW_SECONDS}s`,
          p_duration_hours: 24
        });
        return { blocked: true, loopDetected: true };
      }
      
      return { blocked: false, loopDetected: true };
    }

    return { blocked: false, loopDetected: false };
  } catch (err) {
    console.error('❌ Erro na detecção de loop:', err);
    return { blocked: false, loopDetected: false };
  }
}

// ============================================
// Criar notificação para telemarketing
// ============================================
async function createNotification(
  supabase: any,
  bitrixTelemarketingId: number,
  type: 'new_message' | 'bot_transfer' | 'urgent' | 'window_closing',
  title: string,
  message: string | null,
  leadId: number | null,
  phoneNumber: string | null,
  conversationId: number | null,
  commercialProjectId: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { error } = await supabase
      .from('telemarketing_notifications')
      .insert({
        bitrix_telemarketing_id: bitrixTelemarketingId,
        commercial_project_id: commercialProjectId,
        type,
        title,
        message,
        lead_id: leadId,
        phone_number: phoneNumber,
        conversation_id: conversationId,
        metadata,
      });

    if (error) {
      console.error('❌ Erro ao criar notificação:', error);
    } else {
      console.log(`🔔 Notificação criada: ${type} para telemarketing ${bitrixTelemarketingId}`);
    }
  } catch (err) {
    console.error('❌ Erro ao criar notificação:', err);
  }
}

// ============================================
// Enviar mensagem via Gupshup
// ============================================
async function sendGupshupMessage(phoneNumber: string, message: string) {
  const GUPSHUP_API_KEY = Deno.env.get('GUPSHUP_API_KEY');
  const GUPSHUP_APP_NAME = Deno.env.get('GUPSHUP_APP_NAME');
  const GUPSHUP_SOURCE_NUMBER = Deno.env.get('GUPSHUP_SOURCE_NUMBER');

  if (!GUPSHUP_API_KEY || !GUPSHUP_APP_NAME || !GUPSHUP_SOURCE_NUMBER) {
    console.error('❌ Configurações do Gupshup não encontradas');
    return null;
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
    console.log('📤 Resposta Gupshup:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem Gupshup:', error);
    return null;
  }
}

// ============================================
// Processar mensagem com Bot IA
// ============================================
async function processBotResponse(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  phoneNumber: string,
  message: string,
  botConfig: BotConfig,
  leadId: number | null,
  conversationId: number | null,
  bitrixTelemarketingId: number | null,
  mediaUrl?: string,
  mediaType?: string
): Promise<{ responded: boolean; transferred: boolean; response?: string }> {
  try {
    console.log(`🤖 Processando mensagem com bot para ${phoneNumber}`, { mediaType });

    // Chamar edge function do bot
    const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-bot-respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        message,
        phone_number: phoneNumber,
        project_id: botConfig.commercial_project_id,
        lead_id: leadId,
        conversation_id: conversationId,
        media_url: mediaUrl,
        media_type: mediaType,
      }),
    });

    if (!response.ok) {
      console.error('❌ Erro ao chamar bot:', await response.text());
      return { responded: false, transferred: false };
    }

    const result = await response.json();
    console.log('🤖 Resposta do bot:', result);

    // Se o bot deve transferir para humano
    if (result.should_transfer) {
      console.log('🔄 Bot transferindo para humano');
      
      // Criar notificação de transferência
      if (bitrixTelemarketingId) {
        await createNotification(
          supabase,
          bitrixTelemarketingId,
          'bot_transfer',
          '🤖 Bot transferiu conversa',
          `${result.transfer_reason || 'Cliente precisa de atendimento humano'}. Última mensagem: "${message?.substring(0, 100) || mediaType || 'mídia'}"`,
          leadId,
          phoneNumber,
          conversationId,
          botConfig.commercial_project_id,
          { transfer_reason: result.transfer_reason, original_message: message, media_type: mediaType }
        );
      }

      return { responded: false, transferred: true };
    }

    // Se o bot deve responder
    if (result.should_respond && result.response) {
      // Enviar resposta via Gupshup
      const sendResult = await sendGupshupMessage(phoneNumber, result.response);
      
      if (sendResult?.status === 'submitted') {
        // Salvar resposta do bot no banco
        await supabase
          .from('whatsapp_messages')
          .insert({
            phone_number: phoneNumber,
            bitrix_id: leadId?.toString(),
            conversation_id: conversationId,
            gupshup_message_id: sendResult.messageId,
            direction: 'outbound',
            message_type: 'text',
            content: result.response,
            status: 'sent',
            sender_name: botConfig.bot_name || 'Bot IA',
            metadata: { 
              bot_response: true, 
              bot_name: botConfig.bot_name,
              original_media_type: mediaType,
              ai_provider: result.ai_provider,
              ai_model: result.ai_model,
            },
          });

        console.log(`✅ Bot respondeu: "${result.response.substring(0, 50)}..."`);
        return { responded: true, transferred: false, response: result.response };
      }
    }

    return { responded: false, transferred: false };
  } catch (error) {
    console.error('❌ Erro ao processar bot:', error);
    return { responded: false, transferred: false };
  }
}

// ============================================
// Handle Inbound Message
// ============================================
async function handleInboundMessage(supabase: any, event: GupshupEvent, supabaseUrl: string, supabaseServiceKey: string) {
  const payload = event.payload as GupshupMessagePayload;
  
  const phoneNumberRaw = payload.source || payload.sender?.phone;
  if (!phoneNumberRaw) {
    console.error('❌ Telefone não encontrado no payload');
    return;
  }

  const normalizedPhone = normalizePhone(phoneNumberRaw);
  if (!normalizedPhone) {
    console.error('❌ Telefone normalizado inválido:', phoneNumberRaw);
    return;
  }

  // 🛡️ Verificar loop antes de processar
  const { blocked } = await checkForLoop(supabase, normalizedPhone, 'inbound');
  if (blocked) {
    console.log(`🚫 Ignorando mensagem de número bloqueado: ${normalizedPhone}`);
    return;
  }

  console.log(`📱 Mensagem recebida de ${normalizedPhone}`);

  // Buscar informações do contato/lead
  const { data: contact } = await supabase
    .from('chatwoot_contacts')
    .select('bitrix_id, conversation_id')
    .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+${normalizedPhone}`)
    .maybeSingle();

  let bitrixId = contact?.bitrix_id;
  let conversationId = contact?.conversation_id;
  let commercialProjectId: string | null = null;
  let bitrixTelemarketingId: number | null = null;

  // Buscar na tabela leads
  const { data: lead } = await supabase
    .from('leads')
    .select('id, conversation_id, commercial_project_id, bitrix_telemarketing_id')
    .or(`celular.ilike.%${normalizedPhone.slice(-9)}%,telefone_casa.ilike.%${normalizedPhone.slice(-9)}%,telefone_trabalho.ilike.%${normalizedPhone.slice(-9)}%`)
    .maybeSingle();

  if (lead) {
    bitrixId = bitrixId || lead.id.toString();
    conversationId = conversationId || lead.conversation_id;
    commercialProjectId = lead.commercial_project_id;
    bitrixTelemarketingId = lead.bitrix_telemarketing_id;
  }

  // Extrair conteúdo da mensagem
  let content = '';
  let messageType = 'text';
  let mediaUrl = '';
  let mediaType = '';

  if (payload.type === 'text') {
    content = payload.payload?.text || '';
  } else if (payload.type === 'image') {
    messageType = 'image';
    mediaUrl = payload.payload?.url || '';
    content = payload.payload?.caption || '[Imagem]';
    mediaType = 'image';
  } else if (payload.type === 'audio') {
    messageType = 'audio';
    mediaUrl = payload.payload?.url || '';
    content = '[Áudio]';
    mediaType = 'audio';
  } else if (payload.type === 'video') {
    messageType = 'video';
    mediaUrl = payload.payload?.url || '';
    content = payload.payload?.caption || '[Vídeo]';
    mediaType = 'video';
  } else if (payload.type === 'document') {
    messageType = 'document';
    mediaUrl = payload.payload?.url || '';
    content = '[Documento]';
    mediaType = 'document';
  } else if (payload.type === 'sticker') {
    messageType = 'sticker';
    mediaUrl = payload.payload?.url || '';
    content = '[Sticker]';
    mediaType = 'sticker';
  }

  // Inserir mensagem no banco
  const { error: insertError } = await supabase
    .from('whatsapp_messages')
    .insert({
      phone_number: normalizedPhone,
      bitrix_id: bitrixId,
      conversation_id: conversationId,
      gupshup_message_id: payload.id,
      direction: 'inbound',
      message_type: messageType,
      content: content,
      status: 'delivered',
      sender_name: payload.sender?.name || normalizedPhone,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      metadata: payload,
    });

  if (insertError) {
    console.error('❌ Erro ao inserir mensagem:', insertError);
    return;
  }

  console.log(`✅ Mensagem salva para ${bitrixId || normalizedPhone}`);

  // Atualizar chatwoot_contacts
  if (contact?.bitrix_id) {
    await supabase
      .from('chatwoot_contacts')
      .update({
        last_customer_message_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
        last_message_direction: 'inbound',
        unread_count: (contact.unread_count || 0) + 1,
      })
      .eq('bitrix_id', contact.bitrix_id);
  }

  // ============================================
  // INTEGRAÇÃO COM BOT IA
  // ============================================
  if (commercialProjectId) {
    // Verificar se o bot está ativo para este projeto
    const { data: botConfig } = await supabase
      .from('whatsapp_bot_config')
      .select('*')
      .eq('commercial_project_id', commercialProjectId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (botConfig) {
      console.log(`🤖 Bot ativo para projeto ${commercialProjectId}`);

      // Processar com o bot (agora suporta texto, áudio, imagem, etc.)
      const supportedTypes = ['text', 'audio', 'image', 'video', 'document'];
      if (supportedTypes.includes(messageType)) {
        const botResult = await processBotResponse(
          supabase,
          supabaseUrl,
          supabaseServiceKey,
          normalizedPhone,
          content,
          botConfig,
          lead?.id || null,
          conversationId,
          bitrixTelemarketingId,
          mediaUrl || undefined,
          mediaType || undefined
        );

        // Se o bot respondeu, não criar notificação de nova mensagem
        if (botResult.responded) {
          console.log('✅ Bot respondeu automaticamente');
          return;
        }

        // Se o bot transferiu, a notificação já foi criada
        if (botResult.transferred) {
          console.log('🔄 Bot transferiu para humano - notificação criada');
          return;
        }
      }
    }
  }

  // ============================================
  // CRIAR NOTIFICAÇÃO PARA TELEMARKETING
  // (se não foi tratado pelo bot)
  // ============================================
  if (bitrixTelemarketingId) {
    await createNotification(
      supabase,
      bitrixTelemarketingId,
      'new_message',
      '💬 Nova mensagem recebida',
      `${payload.sender?.name || normalizedPhone}: "${content.substring(0, 100)}"`,
      lead?.id || null,
      normalizedPhone,
      conversationId,
      commercialProjectId,
      { message_type: messageType, has_media: !!mediaUrl }
    );
  }
}

// ============================================
// Handle Message Event (status updates)
// ============================================
async function handleMessageEvent(supabase: any, event: GupshupEvent) {
  const payload = event.payload as {
    id: string;
    gsId?: string;
    destination: string;
    type: 'sent' | 'delivered' | 'read' | 'failed' | 'enqueued';
    payload?: {
      ts?: number;
      code?: string;
      reason?: string;
    };
  };

  const messageId = payload.gsId || payload.id;
  const statusType = payload.type;
  const destination = normalizePhone(payload.destination || '');

  // 🛡️ IGNORAR EVENTOS ENQUEUED COMPLETAMENTE
  if (statusType === 'enqueued') {
    console.log(`⏭️ Ignorando evento enqueued para ${destination}`);
    return;
  }

  // 🛡️ Verificar loop de status updates
  if (destination) {
    const { blocked, loopDetected } = await checkForLoop(supabase, destination, `status_${statusType}`);
    if (blocked) {
      console.log(`🚫 Ignorando status update de número bloqueado: ${destination}`);
      return;
    }
    if (loopDetected) {
      console.warn(`⚠️ Loop de status updates detectado para ${destination}`);
    }
  }

  console.log(`📊 Status update: ${statusType} para mensagem ${messageId}`);

  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed',
  };

  const updateData: any = {
    status: statusMap[statusType] || statusType,
    metadata: payload,
  };

  if (statusType === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  } else if (statusType === 'read') {
    updateData.read_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('whatsapp_messages')
    .update(updateData)
    .eq('gupshup_message_id', messageId);

  if (error) {
    console.error('❌ Erro ao atualizar status:', error);
  } else {
    console.log(`✅ Status atualizado: ${statusType}`);
  }
}
