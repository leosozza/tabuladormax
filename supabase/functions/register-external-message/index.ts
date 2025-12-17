// ============================================
// Register External Message - Registra mensagens enviadas por sistemas externos (n8n, etc)
// Para que apareçam no histórico do WhatsApp do agente
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RegisterMessageRequest {
  phone_number: string;
  message?: string;
  message_type?: 'text' | 'template' | 'image' | 'audio' | 'video' | 'document';
  template_name?: string;
  media_url?: string;
  bitrix_id?: string;
  conversation_id?: number;
  contact_id?: number;
  sender_name?: string;
  source?: string; // Ex: 'n8n', 'bitrix', 'automation'
  gupshup_message_id?: string;
  metadata?: Record<string, any>;
}

function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11 && digits[2] === '9') return `55${digits}`;
  if (digits.length === 10) return `55${digits}`;
  return digits;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: RegisterMessageRequest = await req.json();
    
    console.log('📝 Registrando mensagem externa:', JSON.stringify(body, null, 2));

    const { 
      phone_number, 
      message, 
      message_type = 'text',
      template_name,
      media_url,
      bitrix_id, 
      conversation_id,
      contact_id,
      sender_name = 'Sistema',
      source = 'external',
      gupshup_message_id,
      metadata = {}
    } = body;

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'phone_number é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = normalizePhone(phone_number);
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ error: 'phone_number inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tentar encontrar o bitrix_id se não foi fornecido
    let resolvedBitrixId = bitrix_id;
    let resolvedConversationId = conversation_id;
    let resolvedContactId = contact_id;

    if (!resolvedBitrixId) {
      // Buscar por telefone no chatwoot_contacts
      const { data: contact } = await supabase
        .from('chatwoot_contacts')
        .select('bitrix_id, conversation_id, contact_id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (contact) {
        resolvedBitrixId = contact.bitrix_id;
        resolvedConversationId = resolvedConversationId || contact.conversation_id;
        resolvedContactId = resolvedContactId || contact.contact_id;
        console.log(`✅ Contato encontrado: bitrix_id=${resolvedBitrixId}`);
      } else {
        // Tentar buscar na tabela leads pelo telefone
        const { data: lead } = await supabase
          .from('leads')
          .select('id, conversation_id, contact_id')
          .or(`celular.ilike.%${normalizedPhone.slice(-9)}%`)
          .maybeSingle();

        if (lead) {
          resolvedBitrixId = lead.id.toString();
          resolvedConversationId = resolvedConversationId || lead.conversation_id;
          resolvedContactId = resolvedContactId || lead.contact_id;
          console.log(`✅ Lead encontrado: id=${lead.id}`);
        }
      }
    }

    // Determinar o conteúdo da mensagem
    let content = message || '';
    if (message_type === 'template' && template_name) {
      content = `[Template: ${template_name}]${message ? ` - ${message}` : ''}`;
    }

    // Inserir mensagem no banco
    const { data: insertedMessage, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: normalizedPhone,
        bitrix_id: resolvedBitrixId,
        conversation_id: resolvedConversationId,
        contact_id: resolvedContactId,
        gupshup_message_id: gupshup_message_id || `ext_${Date.now()}`,
        direction: 'outbound',
        message_type: message_type,
        content: content,
        media_url: media_url,
        status: 'sent',
        sent_by: source,
        sender_name: sender_name,
        metadata: { 
          ...metadata, 
          source,
          template_name,
          registered_externally: true,
          registered_at: new Date().toISOString()
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao registrar mensagem:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar mensagem', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar last_message no chatwoot_contacts
    if (resolvedBitrixId) {
      const messagePreview = content.substring(0, 100) || (media_url ? `[${message_type}]` : '[mensagem]');
      
      await supabase
        .from('chatwoot_contacts')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messagePreview,
          last_message_direction: 'outbound',
        })
        .eq('bitrix_id', resolvedBitrixId);

      console.log(`✅ chatwoot_contacts atualizado para bitrix_id=${resolvedBitrixId}`);
    }

    console.log(`✅ Mensagem registrada com sucesso: id=${insertedMessage.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: insertedMessage.id,
        bitrix_id: resolvedBitrixId,
        conversation_id: resolvedConversationId,
        phone_number: normalizedPhone,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no register-external-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
