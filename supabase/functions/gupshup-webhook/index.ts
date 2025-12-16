// ============================================
// Gupshup Webhook - Recebe mensagens e status
// Com detecção de loops de sistemas externos
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
const AUTO_BLOCK_THRESHOLD = 60; // Auto-block after 60 events/minute

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Permitir GET para verificação do webhook
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

    // Processar diferentes tipos de eventos
    if (event.type === 'message') {
      // Mensagem recebida do cliente (inbound)
      await handleInboundMessage(supabase, event);
    } else if (event.type === 'message-event') {
      // Status de mensagem (sent, delivered, read, failed)
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
      
      // Auto-block if threshold is very high
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

async function handleInboundMessage(supabase: any, event: GupshupEvent) {
  const payload = event.payload as GupshupMessagePayload;
  
  // Extrair telefone do cliente
  const phoneNumber = payload.source || payload.sender?.phone;
  if (!phoneNumber) {
    console.error('❌ Telefone não encontrado no payload');
    return;
  }

  // Normalizar telefone (remover +)
  const normalizedPhone = phoneNumber.replace(/\D/g, '');

  // 🛡️ Verificar loop antes de processar
  const { blocked } = await checkForLoop(supabase, normalizedPhone, 'inbound');
  if (blocked) {
    console.log(`🚫 Ignorando mensagem de número bloqueado: ${normalizedPhone}`);
    return;
  }

  console.log(`📱 Mensagem recebida de ${normalizedPhone}`);

  // Buscar bitrix_id pelo telefone
  const { data: contact } = await supabase
    .from('chatwoot_contacts')
    .select('bitrix_id, conversation_id')
    .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+${normalizedPhone}`)
    .maybeSingle();

  // Também buscar na tabela leads
  let bitrixId = contact?.bitrix_id;
  let conversationId = contact?.conversation_id;

  if (!bitrixId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, conversation_id')
      .or(`celular.ilike.%${normalizedPhone.slice(-9)}%,telefone_casa.ilike.%${normalizedPhone.slice(-9)}%,telefone_trabalho.ilike.%${normalizedPhone.slice(-9)}%`)
      .maybeSingle();

    if (lead) {
      bitrixId = lead.id.toString();
      conversationId = lead.conversation_id || conversationId;
    }
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

  // Atualizar last_customer_message_at no chatwoot_contacts para janela 24h
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
}

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
  const destination = payload.destination?.replace(/\D/g, '') || '';

  // 🛡️ Verificar loop de status updates
  if (destination) {
    const { blocked, loopDetected } = await checkForLoop(supabase, destination, `status_${statusType}`);
    if (blocked) {
      console.log(`🚫 Ignorando status update de número bloqueado: ${destination}`);
      return;
    }
    if (loopDetected) {
      console.warn(`⚠️ Loop de status updates detectado para ${destination}, mas continuando processamento`);
    }
  }

  console.log(`📊 Status update: ${statusType} para mensagem ${messageId}`);

  // Mapear status
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed',
    'enqueued': 'enqueued',
  };

  const updateData: any = {
    status: statusMap[statusType] || statusType,
    metadata: payload,
  };

  // Adicionar timestamps específicos
  if (statusType === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  } else if (statusType === 'read') {
    updateData.read_at = new Date().toISOString();
  }

  // Atualizar mensagem pelo gupshup_message_id
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
