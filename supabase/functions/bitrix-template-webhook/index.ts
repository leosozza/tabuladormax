import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BitrixTemplateWebhook {
  phone_number: string;
  template_name: string;
  variables?: string[];
  bitrix_id?: string;
  conversation_id?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📥 Webhook bitrix-template recebido');

  try {
    let phone_number: string = '';
    let template_name: string = '';
    let variables: string[] = [];
    let bitrix_id: string | undefined;
    let conversation_id: number | undefined;

    // Aceitar GET (query params) ou POST (JSON body)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      phone_number = url.searchParams.get('phone_number') || '';
      template_name = url.searchParams.get('template_name') || '';
      bitrix_id = url.searchParams.get('bitrix_id') || undefined;
      
      // Variáveis podem vir como: variables=Var1,Var2,Var3
      const varsParam = url.searchParams.get('variables');
      if (varsParam) {
        variables = varsParam.split(',').map(v => v.trim());
      }
      
      // Ou como var1=X&var2=Y&var3=Z (até 10 variáveis)
      for (let i = 1; i <= 10; i++) {
        const varValue = url.searchParams.get(`var${i}`);
        if (varValue && !varsParam) {
          variables.push(varValue);
        }
      }
      
      const convId = url.searchParams.get('conversation_id');
      if (convId) conversation_id = parseInt(convId, 10);
      
      console.log('📋 Parâmetros GET:', JSON.stringify({ phone_number, template_name, variables, bitrix_id, conversation_id }));
    } else {
      // POST com JSON body (mantém compatibilidade)
      const body: BitrixTemplateWebhook = await req.json();
      phone_number = body.phone_number;
      template_name = body.template_name;
      variables = body.variables || [];
      bitrix_id = body.bitrix_id;
      conversation_id = body.conversation_id;
      
      console.log('📋 Dados POST:', JSON.stringify({ phone_number, template_name, variables, bitrix_id, conversation_id }));
    }

    // Validações
    if (!phone_number || !template_name) {
      console.error('❌ Campos obrigatórios ausentes');
      return new Response(
        JSON.stringify({ error: 'phone_number e template_name são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar telefone
    const normalizedPhone = normalizePhone(phone_number);
    console.log(`📞 Telefone normalizado: ${normalizedPhone}`);

    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar template pelo element_name
    const { data: template, error: templateError } = await supabase
      .from('gupshup_templates')
      .select('*')
      .eq('element_name', template_name)
      .single();

    if (templateError || !template) {
      console.warn(`⚠️ Template não encontrado: ${template_name}, registrando mensagem genérica`);
      
      await registerMessage(supabase, {
        phone_number: normalizedPhone,
        bitrix_id,
        conversation_id,
        content: `[📋 Template: ${template_name}]`,
        template_name,
        template_display_name: null,
        variables
      });
      
      return new Response(
        JSON.stringify({ success: true, warning: 'Template não encontrado, mensagem genérica registrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Template encontrado: ${template.display_name}`);

    // Construir conteúdo do template com variáveis
    let content = template.template_body || '';
    variables.forEach((value, index) => {
      content = content.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), value);
    });

    console.log(`📝 Conteúdo renderizado: ${content.substring(0, 100)}...`);

    // Registrar mensagem completa
    await registerMessage(supabase, {
      phone_number: normalizedPhone,
      bitrix_id,
      conversation_id,
      content,
      template_name: template.element_name,
      template_display_name: template.display_name,
      variables
    });

    console.log(`✅ Template ${template_name} registrado para ${normalizedPhone}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Template registrado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Erro no webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11 && digits[2] === '9') return `55${digits}`;
  return digits;
}

interface RegisterMessageParams {
  phone_number: string;
  bitrix_id?: string;
  conversation_id?: number;
  content: string;
  template_name: string;
  template_display_name: string | null;
  variables: string[];
}

async function registerMessage(supabase: any, data: RegisterMessageParams) {
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert({
      phone_number: data.phone_number,
      bitrix_id: data.bitrix_id,
      conversation_id: data.conversation_id,
      direction: 'outbound',
      message_type: 'template',
      content: data.content,
      template_name: data.template_name,
      status: 'sent',
      sent_by: 'bitrix',
      sender_name: 'Bitrix Automação',
      metadata: {
        source: 'bitrix_webhook',
        template_display_name: data.template_display_name,
        variables: data.variables
      }
    });

  if (error) {
    console.error('❌ Erro ao salvar mensagem:', error);
    throw error;
  }

  // Atualizar last_message no chatwoot_contacts
  if (data.bitrix_id) {
    const { error: updateError } = await supabase
      .from('chatwoot_contacts')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `[Template] ${data.template_display_name || data.template_name}`,
        last_message_direction: 'outbound'
      })
      .eq('bitrix_id', data.bitrix_id);

    if (updateError) {
      console.warn('⚠️ Erro ao atualizar chatwoot_contacts:', updateError);
    }
  }

  console.log('✅ Mensagem registrada com sucesso');
}
