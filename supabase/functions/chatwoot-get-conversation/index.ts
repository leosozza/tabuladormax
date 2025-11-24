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
    const { conversation_id, contact_id, phone_number } = await req.json();

    if (!conversation_id && !contact_id && !phone_number) {
      return new Response(
        JSON.stringify({ error: 'conversation_id, contact_id ou phone_number é obrigatório' }),
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

    // === MODO 1: Buscar por conversation_id ===
    if (conversation_id) {
      console.log(`🔍 Buscando conversa ${conversation_id} no Chatwoot...`);

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
        
        throw new Error(`Chatwoot API error: ${conversationResponse.status} - ${errorText}`);
      }

      const conversationData = await conversationResponse.json();
      const contact = conversationData.meta?.sender;

      if (!contact) {
        console.error('❌ Dados do contato não encontrados na conversa');
        return new Response(
          JSON.stringify({ error: 'Contato não encontrado na conversa' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = {
        conversation_id: conversationData.id,
        contact_id: contact.id,
        name: contact.name || '',
        phone_number: contact.phone_number || '',
        email: contact.email || '',
        thumbnail: contact.thumbnail || contact.custom_attributes?.foto || '',
        custom_attributes: contact.custom_attributes || {},
        additional_attributes: contact.additional_attributes || {},
        last_activity_at: contact.last_activity_at,
      };

      console.log(`✅ Conversa encontrada por ID:`, result);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === MODO 2: Buscar por contact_id ===
    if (contact_id) {
      console.log(`🔍 Buscando conversas do contato ${contact_id}...`);
      
      const conversationsUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contact_id}/conversations`;
      const response = await fetch(conversationsUrl, {
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar conversas do contato: ${response.status}`, errorText);
        return new Response(
          JSON.stringify({ error: 'Contato não encontrado', contact_id }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = await response.json();
      const conversations = data.payload || [];
      
      // Priorizar conversa aberta, senão pegar a mais recente
      const activeConversation = conversations.find((c: any) => c.status === 'open') || conversations[0];
      
      if (!activeConversation) {
        console.error('❌ Nenhuma conversa encontrada para o contato');
        return new Response(
          JSON.stringify({ error: 'Nenhuma conversa encontrada', contact_id }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar dados completos da conversa
      const conversationUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${activeConversation.id}`;
      const conversationResponse = await fetch(conversationUrl, {
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      const conversationData = await conversationResponse.json();
      const contact = conversationData.meta?.sender;

      const result = {
        conversation_id: activeConversation.id,
        contact_id: contact_id,
        name: contact?.name || '',
        phone_number: contact?.phone_number || '',
        email: contact?.email || '',
        thumbnail: contact?.thumbnail || contact?.custom_attributes?.foto || '',
        custom_attributes: contact?.custom_attributes || {},
        additional_attributes: contact?.additional_attributes || {},
        last_activity_at: contact?.last_activity_at,
      };

      console.log(`✅ Conversa encontrada por contact_id:`, result);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === MODO 3: Buscar por telefone ===
    if (phone_number) {
      console.log(`🔍 Buscando contato por telefone: ${phone_number}`);
      
      // Buscar contato
      const searchUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${encodeURIComponent(phone_number)}`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`❌ Erro ao buscar contato por telefone: ${searchResponse.status}`, errorText);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar contato', phone_number }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const searchData = await searchResponse.json();
      const contact = searchData.payload?.[0];
      
      if (!contact) {
        console.error('❌ Nenhum contato encontrado com este telefone');
        return new Response(
          JSON.stringify({ error: 'Contato não encontrado', phone_number }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ Contato encontrado: ${contact.id}`);
      
      // Buscar conversas desse contato
      const conversationsUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contact.id}/conversations`;
      const convResponse = await fetch(conversationsUrl, {
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      if (!convResponse.ok) {
        const errorText = await convResponse.text();
        console.error(`❌ Erro ao buscar conversas: ${convResponse.status}`, errorText);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar conversas do contato' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const convData = await convResponse.json();
      const conversations = convData.payload || [];
      
      // Priorizar conversa aberta, senão pegar a mais recente
      const activeConversation = conversations.find((c: any) => c.status === 'open') || conversations[0];
      
      if (!activeConversation) {
        console.error('❌ Nenhuma conversa encontrada para o contato');
        return new Response(
          JSON.stringify({ error: 'Nenhuma conversa encontrada', phone_number }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = {
        conversation_id: activeConversation.id,
        contact_id: contact.id,
        name: contact.name || '',
        phone_number: contact.phone_number || phone_number,
        email: contact.email || '',
        thumbnail: contact.thumbnail || contact.custom_attributes?.foto || '',
        custom_attributes: contact.custom_attributes || {},
        additional_attributes: contact.additional_attributes || {},
        last_activity_at: contact.last_activity_at,
      };

      console.log(`✅ Conversa encontrada por telefone:`, result);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se chegou aqui, nenhum parâmetro válido foi fornecido
    return new Response(
      JSON.stringify({ error: 'Nenhum método de busca disponível' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar conversa do Chatwoot:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
