import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number } = await req.json();

    if (!phone_number) {
      throw new Error('phone_number é obrigatório');
    }

    const gupshupApiKey = Deno.env.get('GUPSHUP_API_KEY');
    const gupshupAppId = Deno.env.get('GUPSHUP_APP_ID');

    if (!gupshupApiKey || !gupshupAppId) {
      throw new Error('GUPSHUP_API_KEY ou GUPSHUP_APP_ID não configurados');
    }

    console.log(`🔍 Buscando conversa no Gupshup para telefone: ${phone_number}`);
    
    // NOTA: Endpoint do Gupshup pode variar. Verificar documentação oficial.
    // Por enquanto, retornar como não disponível até configurar endpoint correto
    console.warn('⚠️ Gupshup: Endpoint não configurado. Precisa validar API Gupshup.');
    
    return new Response(
      JSON.stringify({ 
        found: false,
        available: false,
        reason: 'service_disabled',
        message: 'Busca no Gupshup temporariamente desabilitada (endpoint não validado)',
        phone_number,
        details: 'Configure o endpoint correto da API Gupshup para habilitar esta funcionalidade'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

    /* CÓDIGO ORIGINAL COMENTADO - Reativar após validar endpoint Gupshup
    
    // Endpoint alternativo: pode ser /app/api/conversation ou /wa/api/v1/msg
    const gupshupUrl = `https://api.gupshup.io/wa/api/v1/users/${gupshupAppId}/conversations?phone=${encodeURIComponent(phone_number)}`;
    
    const response = await fetch(gupshupUrl, {
      method: 'GET',
      headers: {
        'apikey': gupshupApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gupshup API error ${response.status}:`, errorText);
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Nenhuma conversa encontrada no Gupshup',
            phone_number 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`Gupshup API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('📦 Resposta Gupshup:', JSON.stringify(data, null, 2));

    if (!data.conversations || data.conversations.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhuma conversa encontrada no Gupshup',
          phone_number 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const latestConversation = data.conversations[0];
    
    const result = {
      conversation_id: latestConversation.id,
      contact_id: latestConversation.contactId || null,
      phone_number: phone_number,
      name: latestConversation.name || null,
      last_message_at: latestConversation.lastMessageTime || null,
      source: 'gupshup',
    };

    console.log('✅ Conversa encontrada no Gupshup:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    */

  } catch (error) {
    console.error('❌ Erro ao buscar conversa no Gupshup:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
