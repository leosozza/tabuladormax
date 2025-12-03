import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  conversation_id: number;
  content?: string;
  template_params?: {
    templateId: string;
    variables: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const chatwootBaseUrl = Deno.env.get('CHATWOOT_BASE_URL')!;
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN')!;
    const chatwootAccountId = Deno.env.get('CHATWOOT_ACCOUNT_ID')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { conversation_id, content, template_params, action } = await req.json();

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: 'conversation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch messages
    if (action === 'fetch' || (!content && !template_params)) {
      console.log('📥 Fetching messages for conversation:', conversation_id);
      console.log('🔗 Chatwoot URL:', `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversation_id}/messages`);

      try {
        // Adicionar timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversation_id}/messages`,
          {
            headers: {
              'api_access_token': chatwootToken,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          console.error('❌ Chatwoot API error:', error);
          
          // If conversation not found (404), return success with found: false
          if (response.status === 404) {
            console.info('ℹ️ Conversa não encontrada no Chatwoot:', conversation_id);
            return new Response(
              JSON.stringify({ 
                found: false,
                reason: 'conversation_not_found',
                conversation_id,
                messages: []
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // For other errors, return error details
          return new Response(
            JSON.stringify({ error: 'Failed to fetch messages', details: error }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const messages = await response.json();
        console.log('✅ Messages fetched:', messages?.payload?.length || 0, 'messages');
        console.log('📬 Conversation inbox_id:', messages?.meta?.inbox_id || 'N/A');

        // Atualizar last_customer_message_at baseado nas mensagens recebidas
        if (messages?.payload?.length > 0) {
          // Filtrar mensagens incoming (message_type: 0 = incoming do cliente)
          const incomingMessages = messages.payload.filter((msg: any) => msg.message_type === 0);
          
          if (incomingMessages.length > 0) {
            // Encontrar a mensagem mais recente do cliente
            const latestCustomerMessage = incomingMessages.reduce((latest: any, msg: any) => {
              return msg.created_at > latest.created_at ? msg : latest;
            }, incomingMessages[0]);
            
            const lastCustomerMessageAt = new Date(latestCustomerMessage.created_at * 1000).toISOString();
            
            console.log('📨 Última mensagem do cliente:', lastCustomerMessageAt);
            
            // Atualizar no Supabase
            const { error: updateError } = await supabase
              .from('chatwoot_contacts')
              .update({ last_customer_message_at: lastCustomerMessageAt })
              .eq('conversation_id', conversation_id);
            
            if (updateError) {
              console.error('⚠️ Erro ao atualizar last_customer_message_at:', updateError);
            } else {
              console.log('✅ last_customer_message_at atualizado para conversa', conversation_id);
            }
          } else {
            console.log('ℹ️ Nenhuma mensagem do cliente encontrada na conversa');
          }
        }

        return new Response(
          JSON.stringify({ found: true, messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: any) {
        console.error('❌ Erro de conexão com Chatwoot:', fetchError.message);
        
        // Verificar se é timeout ou connection refused
        const isTimeout = fetchError.name === 'AbortError';
        const isConnectionError = fetchError.message?.includes('Connection refused') || 
                                  fetchError.message?.includes('ECONNREFUSED') ||
                                  fetchError.message?.includes('os error 111');
        
        let errorMessage = 'Erro ao conectar com servidor Chatwoot';
        if (isTimeout) {
          errorMessage = 'Timeout ao conectar com servidor Chatwoot (10s)';
        } else if (isConnectionError) {
          errorMessage = 'Servidor Chatwoot inacessível. Verifique se o servidor está online e acessível.';
        }
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: fetchError.message,
            chatwootUrl: chatwootBaseUrl,
            suggestion: 'Verifique se o servidor Chatwoot está rodando e acessível pela rede'
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send message or template
    console.log('📤 Sending message to conversation:', conversation_id);
    console.log('Content:', content);
    console.log('Template:', template_params);

    let body: any = {
      message_type: 'outgoing',
    };

    // Send WhatsApp template directly via Gupshup API
    if (template_params) {
      const { templateId, variables } = template_params;
      const gupshupApiKey = Deno.env.get('GUPSHUP_API_KEY');
      const gupshupAppId = Deno.env.get('GUPSHUP_APP_ID');

      if (!gupshupApiKey || !gupshupAppId) {
        console.error('❌ Credenciais Gupshup não configuradas');
        return new Response(
          JSON.stringify({ error: 'Credenciais Gupshup não configuradas' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Buscar template do banco para validação
      const { data: template, error: templateError } = await supabase
        .from('gupshup_templates')
        .select('*')
        .eq('template_id', templateId)
        .single();
      
      if (templateError || !template) {
        console.error('❌ Template não encontrado:', templateId);
        return new Response(
          JSON.stringify({ error: 'Template não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar contato para obter número de telefone
      const { data: contact, error: contactError } = await supabase
        .from('chatwoot_contacts')
        .select('phone_number, name')
        .eq('conversation_id', conversation_id)
        .single();

      if (contactError || !contact?.phone_number) {
        console.error('❌ Contato não encontrado para conversation_id:', conversation_id);
        return new Response(
          JSON.stringify({ error: 'Número de telefone não encontrado para esta conversa' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Formatar número (remover + e espaços)
      const phoneNumber = contact.phone_number.replace(/[+\s\-()]/g, '');
      
      console.log('📝 Enviando template via Gupshup:', template.element_name);
      console.log('📱 Destinatário:', phoneNumber);
      console.log('📋 Variáveis:', variables);

      // Enviar diretamente para Gupshup API
      const gupshupUrl = 'https://api.gupshup.io/wa/api/v1/template/msg';
      
      const formData = new URLSearchParams();
      formData.append('channel', 'whatsapp');
      formData.append('source', gupshupAppId);
      formData.append('destination', phoneNumber);
      formData.append('template', JSON.stringify({
        id: template.template_id,
        params: variables || []
      }));
      formData.append('src.name', gupshupAppId);

      try {
        const gupshupResponse = await fetch(gupshupUrl, {
          method: 'POST',
          headers: {
            'apikey': gupshupApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const gupshupData = await gupshupResponse.json();
        console.log('📨 Resposta Gupshup:', JSON.stringify(gupshupData));

        if (gupshupData.status === 'submitted' || gupshupResponse.ok) {
          console.log('✅ Template enviado com sucesso via Gupshup');
          return new Response(
            JSON.stringify({ 
              success: true, 
              gupshup_response: gupshupData,
              template_name: template.element_name,
              destination: phoneNumber
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error('❌ Erro Gupshup:', gupshupData);
          return new Response(
            JSON.stringify({ 
              error: gupshupData.message || 'Erro ao enviar template via Gupshup',
              details: gupshupData
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (gupshupError: any) {
        console.error('❌ Erro de conexão com Gupshup:', gupshupError.message);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao conectar com API Gupshup',
            details: gupshupError.message
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (content) {
      // Send regular text message
      body.content = content;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either content or template_params is required for sending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Adicionar timeout de 10 segundos para envio
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversation_id}/messages`,
        {
          method: 'POST',
          headers: {
            'api_access_token': chatwootToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Chatwoot send error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send message', details: error }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      console.log('✅ Message sent successfully');

      return new Response(
        JSON.stringify({ success: true, message: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError: any) {
      console.error('❌ Erro de conexão ao enviar mensagem:', fetchError.message);
      
      const isTimeout = fetchError.name === 'AbortError';
      const isConnectionError = fetchError.message?.includes('Connection refused') || 
                                fetchError.message?.includes('ECONNREFUSED') ||
                                fetchError.message?.includes('os error 111');
      
      let errorMessage = 'Erro ao enviar mensagem via Chatwoot';
      if (isTimeout) {
        errorMessage = 'Timeout ao enviar mensagem via Chatwoot (10s)';
      } else if (isConnectionError) {
        errorMessage = 'Servidor Chatwoot inacessível. Verifique se o servidor está online.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: fetchError.message,
          chatwootUrl: chatwootBaseUrl
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
