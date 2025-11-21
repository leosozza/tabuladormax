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

      const response = await fetch(
        `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversation_id}/messages`,
        {
          headers: {
            'api_access_token': chatwootToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Chatwoot API error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch messages', details: error }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const messages = await response.json();
      console.log('✅ Messages fetched:', messages.length);

      return new Response(
        JSON.stringify({ messages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send message or template
    console.log('📤 Sending message to conversation:', conversation_id);
    console.log('Content:', content);
    console.log('Template:', template_params);

    let body: any = {
      message_type: 'outgoing',
    };

    // Send WhatsApp template (Gupshup BBCode format)
    if (template_params) {
      const { templateId, variables } = template_params;
      
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
      
      console.log('📝 Construindo template BBCode:', template.element_name);
      
      // Construir conteúdo no formato BBCode do Gupshup
      let templateContent = '[template]\n';
      templateContent += '[type]text[/type]\n';
      
      // Adicionar variáveis
      for (const variable of variables) {
        templateContent += `[var]${variable}[/var]\n`;
      }
      
      templateContent += `[id]${templateId}[/id]\n`;
      templateContent += '[/template]';
      
      body.content = templateContent;
      
      console.log('📤 Template BBCode construído:', templateContent);
    } else if (content) {
      // Send regular text message
      body.content = content;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either content or template_params is required for sending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversation_id}/messages`,
      {
        method: 'POST',
        headers: {
          'api_access_token': chatwootToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

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

  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
