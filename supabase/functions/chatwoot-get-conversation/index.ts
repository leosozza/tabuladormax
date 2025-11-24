import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: 'conversation_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CHATWOOT_BASE_URL = Deno.env.get('CHATWOOT_BASE_URL');
    const CHATWOOT_API_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN');
    const CHATWOOT_ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID');

    if (!CHATWOOT_BASE_URL || !CHATWOOT_API_TOKEN || !CHATWOOT_ACCOUNT_ID) {
      console.error('❌ Variáveis de ambiente do Chatwoot não configuradas');
      return new Response(
        JSON.stringify({ error: 'Configuração do Chatwoot incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Buscando conversa ${conversation_id} no Chatwoot...`);

    // Buscar dados da conversa
    const conversationUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}`;
    const conversationResponse = await fetch(conversationUrl, {
      headers: {
        'api_access_token': CHATWOOT_API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!conversationResponse.ok) {
      const errorText = await conversationResponse.text();
      console.error(`❌ Chatwoot API error ${conversationResponse.status}:`, errorText);
      
      // Retornar 404 para indicar que conversa não existe (não é erro fatal)
      if (conversationResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Conversa não encontrada no Chatwoot',
            conversation_id 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Outros erros são fatais
      throw new Error(`Chatwoot API error: ${conversationResponse.status} - ${errorText}`);
    }

    const conversationData = await conversationResponse.json();
    console.log(`✅ Conversa encontrada:`, {
      id: conversationData.id,
      contact_id: conversationData.meta?.sender?.id,
      status: conversationData.status,
    });

    const contact_id = conversationData.meta?.sender?.id;
    const contact = conversationData.meta?.sender;

    if (!contact_id || !contact) {
      console.error('❌ Dados do contato não encontrados na conversa');
      return new Response(
        JSON.stringify({ error: 'Contato não encontrado na conversa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = {
      conversation_id: conversationData.id,
      contact_id: contact_id,
      name: contact.name || '',
      phone_number: contact.phone_number || '',
      email: contact.email || '',
      thumbnail: contact.thumbnail || contact.custom_attributes?.foto || '',
      custom_attributes: contact.custom_attributes || {},
      additional_attributes: contact.additional_attributes || {},
      last_activity_at: contact.last_activity_at,
    };

    console.log(`✅ Dados da conversa processados:`, result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar conversa do Chatwoot:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
