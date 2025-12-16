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

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization');
    let senderName = 'Operador';
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        senderName = profile?.display_name || user.email?.split('@')[0] || 'Operador';
      }
    }

    if (action === 'send_template') {
      return await handleSendTemplate(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName, source);
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
