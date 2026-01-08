// ============================================
// Gupshup Send Message - Com Rate Limiting Anti-Loop
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendMessageRequest {
  phone_number: string;
  message: string;
  bitrix_id?: string;
  conversation_id?: number;
  sender_name?: string;
  source?: string;
}

interface SendTemplateRequest {
  phone_number: string;
  template_id: string;
  variables: string[];
  bitrix_id?: string;
  conversation_id?: number;
  sender_name?: string;
  source?: string;
}

interface SendMediaRequest {
  phone_number: string;
  media_type: 'image' | 'video' | 'audio' | 'document';
  media_url: string;
  caption?: string;
  filename?: string;
  bitrix_id?: string;
  conversation_id?: number;
  source?: string;
}

interface SendLocationRequest {
  phone_number: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  bitrix_id?: string;
  conversation_id?: number;
  source?: string;
}

// Função para gerar hash simples do conteúdo
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Normalização consistente (evita enviar +15... como se fosse +1...)
function normalizeDestinationPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';

  // Já tem DDI Brasil
  if (digits.startsWith('55')) return digits;

  // Provável celular BR: DDD(2) + 9 + 8 dígitos = 11 (ex: 15 9xxxx xxxx)
  if (digits.length === 11 && digits[2] === '9') return `55${digits}`;

  // Mantém como está (outros países / formatos)
  return digits;
}

async function checkBlockedNumber(
  supabase: any,
  phoneNumber: string
): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase
      .from('blocked_numbers')
      .select('blocked_until, unblocked_at, reason')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao consultar bloqueio:', error);
      return { blocked: false };
    }

    if (!data) return { blocked: false };

    const isUnblocked = !!data.unblocked_at;
    const isExpired = data.blocked_until ? new Date(data.blocked_until) <= new Date() : false;

    if (!isUnblocked && !isExpired) {
      return { blocked: true, reason: data.reason || 'Número bloqueado' };
    }

    return { blocked: false };
  } catch (err) {
    console.error('❌ Erro no checkBlockedNumber:', err);
    return { blocked: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gupshupApiKey = Deno.env.get('GUPSHUP_API_KEY')!;
    const gupshupSourceNumber = Deno.env.get('GUPSHUP_SOURCE_NUMBER')!;
    const gupshupAppName = Deno.env.get('GUPSHUP_APP_NAME')!;

    if (!gupshupApiKey || !gupshupSourceNumber || !gupshupAppName) {
      throw new Error('Gupshup credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { action = 'send_message', source = 'tabulador' } = body;

    // 🔐 Verificar autenticação (usuário ou chamada interna)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('🚫 Requisição sem Authorization bloqueada (gupshup-send-message)');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar se é chamada interna (service key) - reutiliza variável do escopo externo
    // Verificar se é chamada interna (service key)
    const isInternalCall = token === supabaseServiceKey;
    
    let senderName = 'Sistema';
    
    if (isInternalCall) {
      // ✅ Chamada interna autorizada (flows-executor, webhooks, etc)
      console.log(`🔑 Chamada interna autorizada (source: ${source})`);
      senderName = body.sender_name || 'Flow Automático';
    } else {
      // Verificar usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.warn('🚫 Token inválido bloqueado (gupshup-send-message)', { userError: userError?.message });
        return new Response(
          JSON.stringify({ error: 'Não autorizado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      senderName = user.email?.split('@')[0] || 'Operador';
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      senderName = profile?.display_name || senderName;
    }

    if (action === 'send_template') {
      return await handleSendTemplate(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName, source);
    } else if (action === 'send_media') {
      return await handleSendMedia(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName, source);
    } else if (action === 'send_interactive') {
      return await handleSendInteractive(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName, source);
    } else if (action === 'send_location') {
      return await handleSendLocation(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName, source);
    } else {
      return await handleSendMessage(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName, source);
    }

  } catch (error) {
    console.error('❌ Erro em gupshup-send-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// Verificação de Rate Limiting
// ============================================
async function checkRateLimit(
  supabase: any,
  phoneNumber: string,
  messageContent: string,
  source: string
): Promise<{ blocked: boolean; reason?: string; alertType?: string; count?: number; rateLimitInfo?: any }> {
  const messageHash = simpleHash(messageContent);
  const contentPreview = messageContent.substring(0, 100);

  try {
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_message_rate_limit', {
        p_phone_number: phoneNumber,
        p_message_hash: messageHash,
        p_content_preview: contentPreview,
        p_source: source
      });

    if (rateLimitError) {
      console.error('❌ Erro ao verificar rate limit:', rateLimitError);
      // Continuar mesmo com erro no rate limit (fail open)
      return { blocked: false };
    }

    if (rateLimitResult?.blocked) {
      console.warn(`🚫 Mensagem bloqueada por rate limit: ${rateLimitResult.reason}`);
      
      // Registrar mensagem bloqueada
      await supabase.from('message_rate_limits').insert({
        phone_number: phoneNumber,
        message_hash: messageHash,
        content_preview: contentPreview,
        source: source,
        blocked: true,
        block_reason: rateLimitResult.reason
      });

      return {
        blocked: true,
        reason: rateLimitResult.reason,
        alertType: rateLimitResult.alert_type,
        count: rateLimitResult.count
      };
    }

    console.log(`✅ Rate limit OK: ${rateLimitResult?.minute_count || 0}/5 min, ${rateLimitResult?.hour_count || 0}/30 hora`);
    
    return {
      blocked: false,
      rateLimitInfo: {
        minuteCount: rateLimitResult?.minute_count || 0,
        hourCount: rateLimitResult?.hour_count || 0
      }
    };
  } catch (err) {
    console.error('❌ Erro ao verificar rate limit (catch):', err);
    return { blocked: false };
  }
}

async function handleSendMessage(
  supabase: any,
  body: SendMessageRequest,
  apiKey: string,
  sourceNumber: string,
  appName: string,
  senderName: string,
  source: string
) {
  const { phone_number, message, bitrix_id, conversation_id } = body;

  if (!phone_number || !message) {
    return new Response(
      JSON.stringify({ error: 'phone_number e message são obrigatórios' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Normalizar telefone
  const normalizedPhone = normalizeDestinationPhone(phone_number);
  if (!normalizedPhone) {
    return new Response(
      JSON.stringify({ error: 'phone_number inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 🛑 Bloqueio explícito (corta loops mesmo se o rate-limit falhar)
  const blockCheck = await checkBlockedNumber(supabase, normalizedPhone);
  if (blockCheck.blocked) {
    console.warn(`🚫 Envio bloqueado (blocked_numbers) para ${normalizedPhone}: ${blockCheck.reason}`);
    return new Response(
      JSON.stringify({ error: blockCheck.reason, blocked: true }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`📤 Enviando mensagem para ${normalizedPhone}`);

  // ============================================
  // RATE LIMITING CHECK
  // ============================================
  const rateLimitCheck = await checkRateLimit(supabase, normalizedPhone, message, source);
  
  if (rateLimitCheck.blocked) {
    return new Response(
      JSON.stringify({
        error: rateLimitCheck.reason,
        blocked: true,
        alertType: rateLimitCheck.alertType,
        count: rateLimitCheck.count
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Enviar via Gupshup (session message)
  const gupshupUrl = 'https://api.gupshup.io/wa/api/v1/msg';
  
  const formData = new URLSearchParams();
  formData.append('channel', 'whatsapp');
  formData.append('source', sourceNumber);
  formData.append('destination', normalizedPhone);
  formData.append('message', JSON.stringify({ type: 'text', text: message }));
  formData.append('src.name', appName);

  const response = await fetch(gupshupUrl, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseData = await response.json();
  console.log('📨 Gupshup response:', responseData);

  if (responseData.status === 'submitted' || response.ok) {
    // Salvar mensagem no banco
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: normalizedPhone,
        bitrix_id: bitrix_id,
        conversation_id: conversation_id,
        gupshup_message_id: responseData.messageId,
        direction: 'outbound',
        message_type: 'text',
        content: message,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: senderName,
        metadata: { ...responseData, source },
      });

    if (insertError) {
      console.error('❌ Erro ao salvar mensagem:', insertError);
    }

    // Atualizar last_message no chatwoot_contacts
    if (bitrix_id) {
      await supabase
        .from('chatwoot_contacts')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
          last_message_direction: 'outbound',
        })
        .eq('bitrix_id', bitrix_id);
    }

    console.log(`✅ Mensagem enviada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messageId,
        message: 'Mensagem enviada com sucesso',
        rateLimitInfo: rateLimitCheck.rateLimitInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    throw new Error(responseData.message || 'Erro ao enviar mensagem');
  }
}

// ============================================
// SEND MEDIA (Image, Video, Audio, Document)
// ============================================
async function handleSendMedia(
  supabase: any,
  body: SendMediaRequest,
  apiKey: string,
  sourceNumber: string,
  appName: string,
  senderName: string,
  source: string
) {
  const { phone_number, media_type, media_url, caption, filename, bitrix_id, conversation_id } = body;

  if (!phone_number || !media_type || !media_url) {
    return new Response(
      JSON.stringify({ error: 'phone_number, media_type e media_url são obrigatórios' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Normalizar telefone
  const normalizedPhone = normalizeDestinationPhone(phone_number);
  if (!normalizedPhone) {
    return new Response(
      JSON.stringify({ error: 'phone_number inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 🛑 Bloqueio explícito
  const blockCheck = await checkBlockedNumber(supabase, normalizedPhone);
  if (blockCheck.blocked) {
    console.warn(`🚫 Envio bloqueado (blocked_numbers) para ${normalizedPhone}: ${blockCheck.reason}`);
    return new Response(
      JSON.stringify({ error: blockCheck.reason, blocked: true }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`📤 Enviando ${media_type} para ${normalizedPhone}`);

  // Rate limit check
  const rateLimitCheck = await checkRateLimit(supabase, normalizedPhone, `media:${media_type}:${media_url}`, source);
  
  if (rateLimitCheck.blocked) {
    return new Response(
      JSON.stringify({
        error: rateLimitCheck.reason,
        blocked: true,
        alertType: rateLimitCheck.alertType,
        count: rateLimitCheck.count
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build Gupshup message payload based on media type
  let messagePayload: any;

  switch (media_type) {
    case 'image':
      messagePayload = {
        type: 'image',
        originalUrl: media_url,
        previewUrl: media_url,
        caption: caption || ''
      };
      break;
    case 'video':
      messagePayload = {
        type: 'video',
        url: media_url,
        caption: caption || ''
      };
      break;
    case 'audio':
      messagePayload = {
        type: 'audio',
        url: media_url
      };
      break;
    case 'document':
      messagePayload = {
        type: 'file',
        url: media_url,
        filename: filename || 'documento'
      };
      break;
    default:
      return new Response(
        JSON.stringify({ error: 'media_type inválido. Use: image, video, audio ou document' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }

  // Enviar via Gupshup
  const gupshupUrl = 'https://api.gupshup.io/wa/api/v1/msg';
  
  const formData = new URLSearchParams();
  formData.append('channel', 'whatsapp');
  formData.append('source', sourceNumber);
  formData.append('destination', normalizedPhone);
  formData.append('message', JSON.stringify(messagePayload));
  formData.append('src.name', appName);

  const response = await fetch(gupshupUrl, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseData = await response.json();
  console.log('📨 Gupshup media response:', responseData);

  if (responseData.status === 'submitted' || response.ok) {
    // Salvar mensagem no banco
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: normalizedPhone,
        bitrix_id: bitrix_id,
        conversation_id: conversation_id,
        gupshup_message_id: responseData.messageId,
        direction: 'outbound',
        message_type: media_type,
        content: caption || `[${media_type}]`,
        media_url: media_url,
        media_type: media_type,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: senderName,
        metadata: { ...responseData, source, filename },
      });

    if (insertError) {
      console.error('❌ Erro ao salvar mensagem de mídia:', insertError);
    }

    // Atualizar last_message no chatwoot_contacts
    if (bitrix_id) {
      const previewText = caption 
        ? `📎 ${caption.substring(0, 80)}` 
        : `📎 ${media_type === 'image' ? 'Imagem' : media_type === 'video' ? 'Vídeo' : media_type === 'audio' ? 'Áudio' : 'Documento'}`;
      
      await supabase
        .from('chatwoot_contacts')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: previewText,
          last_message_direction: 'outbound',
        })
        .eq('bitrix_id', bitrix_id);
    }

    console.log(`✅ Mídia enviada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messageId,
        message: 'Mídia enviada com sucesso',
        rateLimitInfo: rateLimitCheck.rateLimitInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    throw new Error(responseData.message || 'Erro ao enviar mídia');
  }
}

async function handleSendTemplate(
  supabase: any,
  body: SendTemplateRequest,
  apiKey: string,
  sourceNumber: string,
  appName: string,
  senderName: string,
  source: string
) {
  const { phone_number, template_id, variables = [], bitrix_id, conversation_id } = body;

  if (!phone_number || !template_id) {
    return new Response(
      JSON.stringify({ error: 'phone_number e template_id são obrigatórios' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Buscar template
  const { data: template, error: templateError } = await supabase
    .from('gupshup_templates')
    .select('*')
    .eq('id', template_id)
    .single();

  if (templateError || !template) {
    return new Response(
      JSON.stringify({ error: 'Template não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Normalizar telefone
  const normalizedPhone = normalizeDestinationPhone(phone_number);
  if (!normalizedPhone) {
    return new Response(
      JSON.stringify({ error: 'phone_number inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 🛑 Bloqueio explícito (corta loops mesmo se o rate-limit falhar)
  const blockCheck = await checkBlockedNumber(supabase, normalizedPhone);
  if (blockCheck.blocked) {
    console.warn(`🚫 Template bloqueado (blocked_numbers) para ${normalizedPhone}: ${blockCheck.reason}`);
    return new Response(
      JSON.stringify({ error: blockCheck.reason, blocked: true }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`📤 Enviando template ${template.element_name} para ${normalizedPhone}`);

  // ============================================
  // RATE LIMITING CHECK
  // ============================================
  const messageContent = `template:${template.element_name}:${variables.join(',')}`;
  const rateLimitCheck = await checkRateLimit(supabase, normalizedPhone, messageContent, source);
  
  if (rateLimitCheck.blocked) {
    return new Response(
      JSON.stringify({
        error: rateLimitCheck.reason,
        blocked: true,
        alertType: rateLimitCheck.alertType,
        count: rateLimitCheck.count
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Enviar via Gupshup (template message)
  const gupshupUrl = 'https://api.gupshup.io/wa/api/v1/template/msg';
  
  const formData = new URLSearchParams();
  formData.append('channel', 'whatsapp');
  formData.append('source', sourceNumber);
  formData.append('destination', normalizedPhone);
  formData.append('template', JSON.stringify({
    id: template.template_id,
    params: variables
  }));
  formData.append('src.name', appName);

  const response = await fetch(gupshupUrl, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseData = await response.json();
  console.log('📨 Gupshup template response:', responseData);

  if (responseData.status === 'submitted' || response.ok) {
    // Construir conteúdo do template com variáveis
    let content = template.template_body;
    variables.forEach((value, index) => {
      content = content.replace(`{{${index + 1}}}`, value);
    });

    // Salvar mensagem no banco
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: normalizedPhone,
        bitrix_id: bitrix_id,
        conversation_id: conversation_id,
        gupshup_message_id: responseData.messageId,
        direction: 'outbound',
        message_type: 'template',
        content: content,
        template_name: template.element_name,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: senderName,
        metadata: { ...responseData, template, variables, source },
      });

    if (insertError) {
      console.error('❌ Erro ao salvar mensagem:', insertError);
    }

    // Atualizar last_message no chatwoot_contacts
    if (bitrix_id) {
      await supabase
        .from('chatwoot_contacts')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `[Template] ${template.display_name}`,
          last_message_direction: 'outbound',
        })
        .eq('bitrix_id', bitrix_id);
    }

    console.log(`✅ Template enviado com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messageId,
        message: 'Template enviado com sucesso',
        rateLimitInfo: rateLimitCheck.rateLimitInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    throw new Error(responseData.message || 'Erro ao enviar template');
  }
}

// ============================================
// SEND INTERACTIVE (Quick Reply Buttons)
// ============================================
interface SendInteractiveRequest {
  phone_number: string;
  message_text: string;
  buttons: Array<{ id: string; title: string }>;
  header?: string;
  footer?: string;
  bitrix_id?: string;
  conversation_id?: number;
  source?: string;
}

async function handleSendInteractive(
  supabase: any,
  body: SendInteractiveRequest,
  apiKey: string,
  sourceNumber: string,
  appName: string,
  senderName: string,
  source: string
) {
  const { phone_number, message_text, buttons, header, footer, bitrix_id, conversation_id } = body;

  if (!phone_number || !message_text || !buttons || buttons.length === 0) {
    return new Response(
      JSON.stringify({ error: 'phone_number, message_text e buttons são obrigatórios' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (buttons.length > 3) {
    return new Response(
      JSON.stringify({ error: 'Máximo de 3 botões permitidos por mensagem Quick Reply' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Normalizar telefone
  const normalizedPhone = normalizeDestinationPhone(phone_number);
  if (!normalizedPhone) {
    return new Response(
      JSON.stringify({ error: 'phone_number inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 🛑 Bloqueio explícito
  const blockCheck = await checkBlockedNumber(supabase, normalizedPhone);
  if (blockCheck.blocked) {
    console.warn(`🚫 Envio bloqueado (blocked_numbers) para ${normalizedPhone}: ${blockCheck.reason}`);
    return new Response(
      JSON.stringify({ error: blockCheck.reason, blocked: true }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`📤 Enviando mensagem interativa (${buttons.length} botões) para ${normalizedPhone}`);

  // Rate limit check
  const messageContent = `interactive:${message_text}:${buttons.map(b => b.title).join(',')}`;
  const rateLimitCheck = await checkRateLimit(supabase, normalizedPhone, messageContent, source);
  
  if (rateLimitCheck.blocked) {
    return new Response(
      JSON.stringify({
        error: rateLimitCheck.reason,
        blocked: true,
        alertType: rateLimitCheck.alertType,
        count: rateLimitCheck.count
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Montar payload Quick Reply do Gupshup
  const messagePayload: any = {
    type: 'quick_reply',
    content: {
      type: 'text',
      text: message_text
    },
    options: buttons.map(btn => ({
      type: 'text',
      title: btn.title.substring(0, 20), // Limite de 20 caracteres por título
      postbackText: btn.id || btn.title
    }))
  };

  // Adicionar header se fornecido
  if (header) {
    messagePayload.content.header = header;
  }

  // Enviar via Gupshup
  const gupshupUrl = 'https://api.gupshup.io/wa/api/v1/msg';
  
  const formData = new URLSearchParams();
  formData.append('channel', 'whatsapp');
  formData.append('source', sourceNumber);
  formData.append('destination', normalizedPhone);
  formData.append('message', JSON.stringify(messagePayload));
  formData.append('src.name', appName);

  const response = await fetch(gupshupUrl, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseData = await response.json();
  console.log('📨 Gupshup interactive response:', responseData);

  if (responseData.status === 'submitted' || response.ok) {
    // Construir preview do conteúdo
    const contentPreview = `${message_text}\n\n🔘 ${buttons.map(b => b.title).join(' | ')}`;

    // Salvar mensagem no banco
    // sent_by precisa respeitar o CHECK constraint whatsapp_messages_sent_by_check
    const allowedSentBy = ['bitrix', 'tabulador', 'operador', 'gupshup', 'bitrix_automation'];
    const sentBy = allowedSentBy.includes(source) ? source : 'bitrix_automation';

    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: normalizedPhone,
        bitrix_id: bitrix_id,
        conversation_id: conversation_id,
        gupshup_message_id: responseData.messageId,
        direction: 'outbound',
        message_type: 'interactive',
        content: contentPreview,
        status: 'sent',
        sent_by: sentBy,
        sender_name: senderName,
        metadata: {
          ...responseData,
          source,
          buttons,
          message_text,
          header,
          footer,
          interactive_type: 'quick_reply'
        },
      });

    if (insertError) {
      console.error('❌ Erro ao salvar mensagem interativa:', insertError);
    }

    // Atualizar last_message no chatwoot_contacts
    if (bitrix_id) {
      await supabase
        .from('chatwoot_contacts')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `🔘 ${message_text.substring(0, 80)}...`,
          last_message_direction: 'outbound',
        })
        .eq('bitrix_id', bitrix_id);
    }

    console.log(`✅ Mensagem interativa enviada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messageId,
        message: 'Mensagem interativa enviada com sucesso',
        rateLimitInfo: rateLimitCheck.rateLimitInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    throw new Error(responseData.message || 'Erro ao enviar mensagem interativa');
  }
}

// ============================================
// SEND LOCATION
// ============================================
async function handleSendLocation(
  supabase: any,
  body: SendLocationRequest,
  apiKey: string,
  sourceNumber: string,
  appName: string,
  senderName: string,
  source: string
) {
  const { phone_number, latitude, longitude, name, address, bitrix_id, conversation_id } = body;

  if (!phone_number || latitude === undefined || longitude === undefined) {
    return new Response(
      JSON.stringify({ error: 'phone_number, latitude e longitude são obrigatórios' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Normalizar telefone
  const normalizedPhone = normalizeDestinationPhone(phone_number);
  if (!normalizedPhone) {
    return new Response(
      JSON.stringify({ error: 'phone_number inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 🛑 Bloqueio explícito
  const blockCheck = await checkBlockedNumber(supabase, normalizedPhone);
  if (blockCheck.blocked) {
    console.warn(`🚫 Envio bloqueado (blocked_numbers) para ${normalizedPhone}: ${blockCheck.reason}`);
    return new Response(
      JSON.stringify({ error: blockCheck.reason, blocked: true }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`📤 Enviando localização para ${normalizedPhone}: ${latitude}, ${longitude}`);

  // Rate limit check
  const messageContent = `location:${latitude},${longitude}`;
  const rateLimitCheck = await checkRateLimit(supabase, normalizedPhone, messageContent, source);
  
  if (rateLimitCheck.blocked) {
    return new Response(
      JSON.stringify({
        error: rateLimitCheck.reason,
        blocked: true,
        alertType: rateLimitCheck.alertType,
        count: rateLimitCheck.count
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Montar payload de localização do Gupshup
  const messagePayload = {
    type: 'location',
    location: {
      longitude: longitude,
      latitude: latitude,
      name: name || 'Localização',
      address: address || `${latitude}, ${longitude}`
    }
  };

  // Enviar via Gupshup
  const gupshupUrl = 'https://api.gupshup.io/wa/api/v1/msg';
  
  const formData = new URLSearchParams();
  formData.append('channel', 'whatsapp');
  formData.append('source', sourceNumber);
  formData.append('destination', normalizedPhone);
  formData.append('message', JSON.stringify(messagePayload));
  formData.append('src.name', appName);

  const response = await fetch(gupshupUrl, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseData = await response.json();
  console.log('📨 Gupshup location response:', responseData);

  if (responseData.status === 'submitted' || response.ok) {
    // Construir preview do conteúdo
    const contentPreview = name 
      ? `📍 ${name}${address ? ` - ${address}` : ''}`
      : `📍 ${address || `${latitude}, ${longitude}`}`;

    // Salvar mensagem no banco
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: normalizedPhone,
        bitrix_id: bitrix_id,
        conversation_id: conversation_id,
        gupshup_message_id: responseData.messageId,
        direction: 'outbound',
        message_type: 'location',
        content: contentPreview,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: senderName,
        metadata: { 
          ...responseData, 
          source,
          latitude,
          longitude,
          location_name: name,
          location_address: address
        },
      });

    if (insertError) {
      console.error('❌ Erro ao salvar mensagem de localização:', insertError);
    }

    // Atualizar last_message no chatwoot_contacts
    if (bitrix_id) {
      await supabase
        .from('chatwoot_contacts')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: contentPreview.substring(0, 100),
          last_message_direction: 'outbound',
        })
        .eq('bitrix_id', bitrix_id);
    }

    console.log(`✅ Localização enviada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messageId,
        message: 'Localização enviada com sucesso',
        rateLimitInfo: rateLimitCheck.rateLimitInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    throw new Error(responseData.message || 'Erro ao enviar localização');
  }
}
