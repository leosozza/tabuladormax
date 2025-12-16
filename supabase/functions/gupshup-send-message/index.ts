// ============================================
// Gupshup Send Message - Envia mensagens de texto
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
}

interface SendTemplateRequest {
  phone_number: string;
  template_id: string;
  variables: string[];
  bitrix_id?: string;
  conversation_id?: number;
  sender_name?: string;
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
    const { action = 'send_message' } = body;

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
      return await handleSendTemplate(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName);
    } else {
      return await handleSendMessage(supabase, body, gupshupApiKey, gupshupSourceNumber, gupshupAppName, senderName);
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

async function handleSendMessage(
  supabase: any,
  body: SendMessageRequest,
  apiKey: string,
  sourceNumber: string,
  appName: string,
  senderName: string
) {
  const { phone_number, message, bitrix_id, conversation_id } = body;

  if (!phone_number || !message) {
    return new Response(
      JSON.stringify({ error: 'phone_number e message são obrigatórios' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Normalizar telefone
  const normalizedPhone = phone_number.replace(/\D/g, '');
  
  console.log(`📤 Enviando mensagem para ${normalizedPhone}`);

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
        metadata: responseData,
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
        message: 'Mensagem enviada com sucesso'
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
  senderName: string
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
  const normalizedPhone = phone_number.replace(/\D/g, '');
  
  console.log(`📤 Enviando template ${template.element_name} para ${normalizedPhone}`);

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
        metadata: { ...responseData, template, variables },
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
        message: 'Template enviado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    throw new Error(responseData.message || 'Erro ao enviar template');
  }
}
