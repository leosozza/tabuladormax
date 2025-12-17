// ============================================
// Gupshup Webhook - Recebe mensagens e status
// Com detecção de loops e integração com Bot IA
// + Vinculação automática de leads por telefone
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

// Bitrix configuration (com fallback para valores padrão)
const BITRIX_DOMAIN = Deno.env.get('BITRIX_DOMAIN') || 'maxsystem.bitrix24.com.br';
const BITRIX_WEBHOOK_TOKEN = Deno.env.get('BITRIX_WEBHOOK_TOKEN') || '338m945lx9ifjjnr';
const BITRIX_USER_ID = Deno.env.get('BITRIX_USER_ID') || '7';

// Normalização consistente
function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11 && digits[2] === '9') return `55${digits}`;
  return digits;
}

// ============================================
// Buscar lead no Bitrix pelo ID
// ============================================
async function fetchLeadFromBitrix(leadId: number): Promise<any> {
  try {
    const url = `https://${BITRIX_DOMAIN}/rest/${BITRIX_USER_ID}/${BITRIX_WEBHOOK_TOKEN}/crm.lead.get?id=${leadId}`;
    console.log(`🔍 Buscando lead ${leadId} no Bitrix...`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Erro ao buscar lead no Bitrix:', data.error);
      return null;
    }
    
    console.log(`✅ Lead ${leadId} encontrado no Bitrix. PARENT_ID_1144: ${data.result?.PARENT_ID_1144}`);
    return data.result;
  } catch (error) {
    console.error('❌ Erro ao buscar lead no Bitrix:', error);
    return null;
  }
}

// ============================================
// Buscar lead no Bitrix pelo telefone
// ============================================
async function searchBitrixByPhone(phone: string): Promise<any> {
  try {
    // Normalizar telefone para comparação
    const normalizedSearch = normalizePhone(phone);
    const last9Digits = normalizedSearch.slice(-9);
    console.log(`🔍 Buscando lead no Bitrix por telefone: ${normalizedSearch} (últimos 9: ${last9Digits})`);

    const url = `https://${BITRIX_DOMAIN}/rest/${BITRIX_USER_ID}/${BITRIX_WEBHOOK_TOKEN}/crm.lead.list`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { '%PHONE': last9Digits },
        select: ['ID', 'NAME', 'TITLE', 'PARENT_ID_1144', 'PHONE', 'STATUS_ID', 'SOURCE_ID']
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Erro ao buscar por telefone no Bitrix:', data.error);
      return null;
    }

    if (data.result && data.result.length > 0) {
      // VALIDAR se o telefone do lead realmente corresponde ao telefone buscado
      for (const lead of data.result) {
        const phones = lead.PHONE || [];
        for (const phoneObj of phones) {
          const leadPhoneNormalized = normalizePhone(phoneObj.VALUE || '');
          // Verificar se os últimos 9 dígitos coincidem
          if (leadPhoneNormalized.slice(-9) === last9Digits) {
            console.log(`✅ Lead encontrado e VALIDADO no Bitrix: ID ${lead.ID} - ${lead.TITLE || lead.NAME} (telefone: ${phoneObj.VALUE})`);
            return lead;
          }
        }
      }
      
      console.log(`⚠️ ${data.result.length} leads encontrados no Bitrix mas NENHUM com telefone correspondente ao ${normalizedSearch}`);
      return null;
    }

    console.log('⚠️ Nenhum lead encontrado no Bitrix por telefone');
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar por telefone no Bitrix:', error);
    return null;
  }
}

// ============================================
// Download media do Gupshup e fazer upload para Supabase Storage
// ============================================
async function downloadAndUploadMedia(
  supabase: any,
  gupshupMediaUrl: string,
  mediaType: string,
  phoneNumber: string
): Promise<string | null> {
  try {
    const GUPSHUP_API_KEY = Deno.env.get('GUPSHUP_API_KEY');
    
    if (!GUPSHUP_API_KEY || !gupshupMediaUrl) {
      console.log('⚠️ Sem API key ou URL de mídia, mantendo URL original');
      return null;
    }

    console.log(`📥 Baixando mídia do Gupshup: ${gupshupMediaUrl.substring(0, 50)}...`);

    // Fazer request autenticado ao Gupshup para baixar a mídia
    const response = await fetch(gupshupMediaUrl, {
      headers: {
        'apikey': GUPSHUP_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`❌ Erro ao baixar mídia: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();
    
    // Determinar extensão do arquivo
    let extension = 'bin';
    if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) extension = 'jpg';
    else if (contentType.includes('image/png')) extension = 'png';
    else if (contentType.includes('image/webp')) extension = 'webp';
    else if (contentType.includes('audio/ogg') || contentType.includes('audio/opus')) extension = 'ogg';
    else if (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3')) extension = 'mp3';
    else if (contentType.includes('video/mp4')) extension = 'mp4';
    else if (contentType.includes('application/pdf')) extension = 'pdf';
    else if (mediaType === 'image') extension = 'jpg';
    else if (mediaType === 'audio') extension = 'ogg';
    else if (mediaType === 'video') extension = 'mp4';
    else if (mediaType === 'document') extension = 'pdf';
    else if (mediaType === 'sticker') extension = 'webp';

    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedPhone = phoneNumber.replace(/\D/g, '').slice(-9);
    const filename = `${mediaType}_${sanitizedPhone}_${timestamp}.${extension}`;
    const path = `inbound/${filename}`;

    console.log(`📤 Fazendo upload para Storage: ${path}`);

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(path, blob, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Erro ao fazer upload para Storage:', error);
      return null;
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(data.path);

    console.log(`✅ Mídia salva no Storage: ${publicUrl.substring(0, 60)}...`);
    return publicUrl;
  } catch (error) {
    console.error('❌ Erro ao processar mídia:', error);
    return null;
  }
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

  // Buscar na tabela leads - PRIORIZAR phone_normalized exato
  let { data: lead } = await supabase
    .from('leads')
    .select('id, conversation_id, commercial_project_id, bitrix_telemarketing_id')
    .eq('phone_normalized', normalizedPhone)
    .maybeSingle();

  // Se não encontrou por phone_normalized exato, tentar busca mais ampla
  if (!lead) {
    const last9Digits = normalizedPhone.slice(-9);
    const { data: leadByPartial } = await supabase
      .from('leads')
      .select('id, conversation_id, commercial_project_id, bitrix_telemarketing_id, phone_normalized, celular')
      .or(`celular.ilike.%${last9Digits}%,telefone_casa.ilike.%${last9Digits}%,telefone_trabalho.ilike.%${last9Digits}%`)
      .limit(10);
    
    // Validar os resultados - verificar se o telefone realmente corresponde
    if (leadByPartial && leadByPartial.length > 0) {
      for (const candidateLead of leadByPartial) {
        const leadPhoneNorm = normalizePhone(candidateLead.phone_normalized || candidateLead.celular || '');
        if (leadPhoneNorm.slice(-9) === last9Digits) {
          lead = candidateLead;
          console.log(`✅ Lead ${candidateLead.id} encontrado por busca parcial validada`);
          break;
        }
      }
      if (!lead && leadByPartial.length > 0) {
        console.log(`⚠️ ${leadByPartial.length} leads encontrados mas nenhum com telefone validado para ${normalizedPhone}`);
      }
    }
  }

  if (lead) {
    bitrixId = bitrixId || lead.id.toString();
    conversationId = conversationId || lead.conversation_id;
    commercialProjectId = lead.commercial_project_id;
    bitrixTelemarketingId = lead.bitrix_telemarketing_id;

    // ============================================
    // VINCULAÇÃO AUTOMÁTICA: Se lead existe mas não tem agente vinculado
    // ============================================
    if (!bitrixTelemarketingId) {
      console.log(`🔗 Lead ${lead.id} encontrado mas sem agente vinculado. Buscando no Bitrix...`);
      
      const bitrixLead = await fetchLeadFromBitrix(lead.id);
      
      if (bitrixLead?.PARENT_ID_1144) {
        const newTelemarketingId = parseInt(bitrixLead.PARENT_ID_1144);
        console.log(`✅ Vinculando lead ${lead.id} ao agente ${newTelemarketingId}`);
        
        // Atualizar lead no Supabase
        await supabase
          .from('leads')
          .update({ 
            bitrix_telemarketing_id: newTelemarketingId,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);
        
        bitrixTelemarketingId = newTelemarketingId;
      }
    }
  } else {
    // ============================================
    // VINCULAÇÃO AUTOMÁTICA: Lead não existe no Supabase, buscar no Bitrix
    // ============================================
    console.log(`🔍 Lead não encontrado no Supabase. Buscando no Bitrix por telefone: ${normalizedPhone}`);
    
    const bitrixLead = await searchBitrixByPhone(normalizedPhone);
    
    if (bitrixLead) {
      const bitrixLeadId = parseInt(bitrixLead.ID);
      console.log(`✅ Lead encontrado no Bitrix: ${bitrixLeadId} - ${bitrixLead.TITLE || bitrixLead.NAME}`);
      
      // Verificar se já existe no Supabase pelo ID do Bitrix
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, bitrix_telemarketing_id')
        .eq('id', bitrixLeadId)
        .maybeSingle();
      
      if (existingLead) {
        // Lead existe, atualizar telefone e agente se necessário
        lead = existingLead;
        bitrixId = existingLead.id.toString();
        
        const updateData: any = {};
        if (!existingLead.bitrix_telemarketing_id && bitrixLead.PARENT_ID_1144) {
          updateData.bitrix_telemarketing_id = parseInt(bitrixLead.PARENT_ID_1144);
          bitrixTelemarketingId = parseInt(bitrixLead.PARENT_ID_1144);
        }
        
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          await supabase.from('leads').update(updateData).eq('id', bitrixLeadId);
          console.log(`✅ Lead ${bitrixLeadId} atualizado com agente ${bitrixTelemarketingId}`);
        }
      } else {
        // Lead não existe no Supabase, criar
        console.log(`📝 Criando lead ${bitrixLeadId} no Supabase...`);
        
        const newLead = {
          id: bitrixLeadId,
          name: bitrixLead.NAME || bitrixLead.TITLE || 'Sem nome',
          celular: normalizedPhone,
          phone_normalized: normalizedPhone,
          bitrix_telemarketing_id: bitrixLead.PARENT_ID_1144 ? parseInt(bitrixLead.PARENT_ID_1144) : null,
          etapa: bitrixLead.STATUS_ID,
          fonte: bitrixLead.SOURCE_ID,
          sync_source: 'gupshup_webhook',
          last_sync_at: new Date().toISOString(),
        };
        
        const { error: createError } = await supabase.from('leads').insert(newLead);
        
        if (!createError) {
          lead = newLead as any;
          bitrixId = bitrixLeadId.toString();
          bitrixTelemarketingId = newLead.bitrix_telemarketing_id;
          console.log(`✅ Lead ${bitrixLeadId} criado e vinculado ao agente ${bitrixTelemarketingId}`);
        } else {
          console.error(`❌ Erro ao criar lead: ${createError.message}`);
        }
      }
    }
  }

  // Extrair conteúdo da mensagem
  let content = '';
  let messageType = 'text';
  let mediaUrl = '';
  let mediaType = '';
  let originalMediaUrl = '';

  if (payload.type === 'text') {
    content = payload.payload?.text || '';
  } else if (payload.type === 'image') {
    messageType = 'image';
    originalMediaUrl = payload.payload?.url || '';
    content = payload.payload?.caption || '[Imagem]';
    mediaType = 'image';
  } else if (payload.type === 'audio') {
    messageType = 'audio';
    originalMediaUrl = payload.payload?.url || '';
    content = '[Áudio]';
    mediaType = 'audio';
  } else if (payload.type === 'video') {
    messageType = 'video';
    originalMediaUrl = payload.payload?.url || '';
    content = payload.payload?.caption || '[Vídeo]';
    mediaType = 'video';
  } else if (payload.type === 'document') {
    messageType = 'document';
    originalMediaUrl = payload.payload?.url || '';
    content = '[Documento]';
    mediaType = 'document';
  } else if (payload.type === 'sticker') {
    messageType = 'sticker';
    originalMediaUrl = payload.payload?.url || '';
    content = '[Sticker]';
    mediaType = 'sticker';
  } else if (payload.type === 'quick_reply' || payload.type === 'button_reply') {
    // Cliente clicou em botão de template
    messageType = 'button_reply';
    content = (payload.payload as any)?.text || (payload.payload as any)?.postbackText || '[Botão clicado]';
    console.log(`👆 Cliente clicou no botão: "${content}"`);
    
    // 🔄 VERIFICAR FLOW TRIGGERS
    await checkAndExecuteFlowTrigger(supabase, supabaseUrl, supabaseServiceKey, {
      triggerType: 'button_click',
      buttonText: content,
      phoneNumber: normalizedPhone,
      leadId: lead?.id || null,
      conversationId: conversationId,
      commercialProjectId: commercialProjectId
    });
  }

  // Download e upload de mídia para Supabase Storage
  if (originalMediaUrl && mediaType) {
    const uploadedUrl = await downloadAndUploadMedia(supabase, originalMediaUrl, mediaType, normalizedPhone);
    mediaUrl = uploadedUrl || originalMediaUrl; // Fallback para URL original se falhar
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
// ============================================
// Verificar e executar Flow Triggers
// ============================================
async function checkAndExecuteFlowTrigger(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  params: {
    triggerType: 'button_click' | 'keyword';
    buttonText?: string;
    keyword?: string;
    phoneNumber: string;
    leadId: number | null;
    conversationId: number | null;
    commercialProjectId: string | null;
  }
) {
  try {
    console.log(`🔍 Verificando triggers para ${params.triggerType}: "${params.buttonText || params.keyword}"`);
    
    // Buscar triggers ativos
    const { data: triggers, error } = await supabase
      .from('flow_triggers')
      .select('id, flow_id, trigger_config')
      .eq('trigger_type', params.triggerType)
      .eq('ativo', true);
    
    if (error) {
      console.error('❌ Erro ao buscar triggers:', error);
      return;
    }
    
    if (!triggers || triggers.length === 0) {
      console.log('ℹ️ Nenhum trigger ativo encontrado');
      return;
    }
    
    console.log(`📋 ${triggers.length} triggers encontrados para ${params.triggerType}`);
    
    for (const trigger of triggers) {
      const config = trigger.trigger_config || {};
      let matches = false;
      
      if (params.triggerType === 'button_click') {
        const buttonText = (config.button_text || '').toLowerCase().trim();
        const exactMatch = config.exact_match ?? false;
        const inputText = (params.buttonText || '').toLowerCase().trim();
        
        matches = exactMatch 
          ? inputText === buttonText
          : inputText.includes(buttonText) || buttonText.includes(inputText);
        
        console.log(`🔎 Comparando "${inputText}" com "${buttonText}" (exact: ${exactMatch}) = ${matches}`);
      } else if (params.triggerType === 'keyword') {
        const keyword = (config.keyword || '').toLowerCase().trim();
        const inputText = (params.keyword || '').toLowerCase().trim();
        matches = inputText.includes(keyword);
      }
      
      if (matches && params.leadId) {
        console.log(`🚀 MATCH! Disparando flow ${trigger.flow_id} para lead ${params.leadId}`);
        
        // Criar registro do run antes de disparar
        const { data: flowRun } = await supabase
          .from('flows_runs')
          .insert({
            flow_id: trigger.flow_id,
            lead_id: params.leadId,
            phone_number: params.phoneNumber,
            status: 'triggered',
            trigger_type: params.triggerType,
            trigger_value: params.buttonText || params.keyword,
            logs: [{ 
              timestamp: new Date().toISOString(), 
              message: `Trigger acionado por: "${params.buttonText || params.keyword}"`,
              level: 'info'
            }]
          })
          .select('id')
          .single();
        
        // Executar flow em background (não bloqueia o webhook)
        fetch(`${supabaseUrl}/functions/v1/flows-executor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            flowId: trigger.flow_id,
            leadId: params.leadId,
            context: {
              phone_number: params.phoneNumber,
              button_clicked: params.buttonText,
              keyword_matched: params.keyword,
              trigger_type: params.triggerType,
              conversation_id: params.conversationId,
              commercial_project_id: params.commercialProjectId,
              triggered_at: new Date().toISOString()
            }
          })
        }).then(async (res) => {
          if (res.ok) {
            const result = await res.json();
            console.log(`✅ Flow ${trigger.flow_id} executado com sucesso:`, result.runId);
          } else {
            console.error(`❌ Erro ao executar flow ${trigger.flow_id}:`, await res.text());
          }
        }).catch(err => {
          console.error(`❌ Erro ao disparar flow ${trigger.flow_id}:`, err);
        });
        
        // Dispara apenas o primeiro flow que der match (evita múltiplos disparos)
        break;
      }
    }
  } catch (err) {
    console.error('❌ Erro em checkAndExecuteFlowTrigger:', err);
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

  // 🔍 Verificar se a mensagem já existe no banco pelo gupshup_message_id
  const { data: existingMessage } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('gupshup_message_id', messageId)
    .maybeSingle();

  // 📝 Se NÃO existir pelo messageId, tentar encontrar mensagem PENDENTE pelo telefone
  if (!existingMessage && (statusType === 'sent' || statusType === 'delivered' || statusType === 'read' || statusType === 'failed')) {
    console.log(`📝 Mensagem não encontrada por ID, buscando pendente por telefone: ${destination}`);
    
    // Buscar mensagem pendente criada nos últimos 5 minutos para este telefone
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: pendingMessage } = await supabase
      .from('whatsapp_messages')
      .select('id, content, template_name, bitrix_id, conversation_id, metadata')
      .eq('phone_number', destination)
      .eq('direction', 'outbound')
      .eq('status', 'pending')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (pendingMessage) {
      // ✅ ENCONTROU! Atualizar a mensagem pendente com o status real e gupshup_message_id
      console.log(`✅ Mensagem pendente encontrada (ID: ${pendingMessage.id}), atualizando com status: ${statusType}`);
      
      const updateData: any = {
        gupshup_message_id: messageId,
        status: statusMap[statusType] || statusType,
        metadata: {
          ...(pendingMessage.metadata || {}),
          gupshup_callback: payload,
          status_updated_at: new Date().toISOString()
        }
      };
      
      if (statusType === 'delivered' || statusType === 'read') {
        updateData.delivered_at = new Date().toISOString();
      }
      if (statusType === 'read') {
        updateData.read_at = new Date().toISOString();
      }
      if (statusType === 'failed') {
        updateData.metadata.error_code = payload.payload?.code;
        updateData.metadata.error_reason = payload.payload?.reason;
      }
      
      const { error: updateError } = await supabase
        .from('whatsapp_messages')
        .update(updateData)
        .eq('id', pendingMessage.id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar mensagem pendente:', updateError);
      } else {
        console.log(`✅ Mensagem pendente atualizada: ${statusType} (template: ${pendingMessage.template_name})`);
      }
      return;
    }
    
    // Se não encontrou mensagem pendente, criar como automação Bitrix (fallback)
    console.log(`⚠️ Nenhuma mensagem pendente encontrada, criando como automação Bitrix...`);
    
    // Buscar lead pelo telefone de destino (últimos 9 dígitos)
    const phoneDigits = destination.replace(/\D/g, '').slice(-9);
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, conversation_id')
      .or(`celular.ilike.%${phoneDigits}%,telefone_casa.ilike.%${phoneDigits}%,phone_normalized.ilike.%${phoneDigits}%`)
      .order('criado', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Criar mensagem como enviada por automação
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: destination,
        bitrix_id: lead?.id?.toString() || null,
        conversation_id: lead?.conversation_id || null,
        gupshup_message_id: messageId,
        direction: 'outbound',
        message_type: 'template',
        content: '[📋 Template enviado via automação Bitrix]',
        template_name: 'bitrix_automation',
        status: statusMap[statusType] || statusType,
        sent_by: 'bitrix_automation',
        sender_name: 'Automação Bitrix',
        delivered_at: statusType === 'delivered' || statusType === 'read' ? new Date().toISOString() : null,
        read_at: statusType === 'read' ? new Date().toISOString() : null,
        metadata: {
          ...payload,
          source: 'bitrix_automation_fallback',
          note: 'Mensagem detectada via callback - nenhuma pendente encontrada',
          detected_at: new Date().toISOString()
        }
      });
    
    if (insertError) {
      console.error('❌ Erro ao registrar mensagem de automação Bitrix:', insertError);
    } else {
      console.log(`✅ Mensagem de automação Bitrix registrada para ${destination} (lead: ${lead?.id || 'não encontrado'})`);
    }
    return;
  }

  // Se a mensagem existe, fazer update normal
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
