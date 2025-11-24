import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BITRIX_DOMAIN = Deno.env.get('BITRIX_DOMAIN') || 'maxsystem.bitrix24.com.br';
const BITRIX_USER_ID = Deno.env.get('BITRIX_USER_ID') || '7';
const BITRIX_WEBHOOK_TOKEN = Deno.env.get('BITRIX_WEBHOOK_TOKEN') || '338m945lx9ifjjnr';
const BITRIX_BASE_URL = `https://${BITRIX_DOMAIN}/rest/${BITRIX_USER_ID}/${BITRIX_WEBHOOK_TOKEN}`;

interface BitrixMessage {
  id: string;
  text: string;
  date: string;
  senderid: string;
  params?: {
    type?: string;
    class?: string;
  };
}

interface ChatMessage {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  created_at: number;
  sender?: {
    id: number;
    name: string;
    type: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sessionId, chatId, leadId, message } = await req.json();
    console.log('📥 Bitrix OpenLine request:', { action, sessionId, chatId, leadId });

    if (action === 'fetch') {
      // Buscar histórico de mensagens
      console.log('🔍 Fetching messages for session:', sessionId);
      
      const response = await fetch(
        `${BITRIX_BASE_URL}/imopenlines.session.history.get`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ SESSION_ID: sessionId })
        }
      );

      const data = await response.json();
      console.log('📨 Bitrix response:', data);

      if (!data.result || !data.result.message) {
        throw new Error('Formato de resposta inválido do Bitrix');
      }

      // Transformar mensagens para formato da interface
      const messages: ChatMessage[] = Object.values(data.result.message as Record<string, BitrixMessage>).map((msg) => ({
        id: parseInt(msg.id, 10),
        content: msg.text,
        message_type: msg.senderid === "0" ? 'incoming' : 'outgoing',
        created_at: new Date(msg.date).getTime() / 1000,
        sender: {
          id: parseInt(msg.senderid, 10),
          name: msg.senderid === "0" ? 'Cliente' : 'Agente',
          type: msg.params?.type || 'user'
        }
      }));

      console.log(`✅ ${messages.length} mensagens processadas`);

      return new Response(
        JSON.stringify({ messages }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (action === 'send') {
      // Enviar mensagem via OpenLine CRM
      console.log('📤 Sending message:', { chatId, leadId, messageLength: message?.length });
      
      const response = await fetch(
        `${BITRIX_BASE_URL}/imopenlines.crm.message.add`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            CRM_ENTITY_TYPE: 'lead',
            CRM_ENTITY: parseInt(leadId, 10),
            USER_ID: parseInt(BITRIX_USER_ID, 10),
            CHAT_ID: chatId,
            MESSAGE: message
          })
        }
      );

      const data = await response.json();
      console.log('📨 Bitrix send response:', data);

      if (data.error) {
        throw new Error(`Bitrix API error: ${data.error_description || data.error}`);
      }

      if (data.result) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            messageId: data.result 
          }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      throw new Error('Erro ao enviar mensagem - resposta inválida');
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }), 
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Erro no Bitrix OpenLine:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
