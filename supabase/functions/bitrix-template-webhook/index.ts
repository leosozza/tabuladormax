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
  console.log('📋 URL completa:', req.url);
  console.log('📋 Método:', req.method);

  try {
    let phone_number: string = '';
    let template_name: string = '';
    let variables: string[] = [];
    let bitrix_id: string | undefined;
    let conversation_id: number | undefined;

    // SEMPRE extrair query params da URL primeiro (funciona para GET e POST)
    // Bitrix Webhook envia POST mas os dados vêm na URL, não no body
    const url = new URL(req.url);
    const urlPhone = url.searchParams.get('phone_number');
    const urlTemplate = url.searchParams.get('template_name');
    const urlBitrixId = url.searchParams.get('bitrix_id');
    const urlConvId = url.searchParams.get('conversation_id');
    
    // Extrair variáveis da URL (var1, var2, ... até var10)
    const urlVariables: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const varValue = url.searchParams.get(`var${i}`);
      if (varValue) {
        // Decodificar caracteres especiais (espaços, vírgulas, etc.)
        urlVariables.push(decodeURIComponent(varValue));
      }
    }
    
    // Também aceitar formato variables=Var1,Var2,Var3
    const urlVarsParam = url.searchParams.get('variables');
    if (urlVarsParam && urlVariables.length === 0) {
      urlVariables.push(...urlVarsParam.split(',').map(v => decodeURIComponent(v.trim())));
    }
    
    console.log('📋 Query params da URL:', JSON.stringify({ 
      phone: urlPhone, 
      template: urlTemplate, 
      bitrix_id: urlBitrixId,
      vars_count: urlVariables.length,
      vars: urlVariables
    }));

    // Se temos dados válidos na URL, usar eles (caso típico do Bitrix Webhook)
    if (urlPhone && urlTemplate) {
      phone_number = urlPhone;
      template_name = urlTemplate;
      variables = urlVariables;
      bitrix_id = urlBitrixId || undefined;
      if (urlConvId) conversation_id = parseInt(urlConvId, 10);
      
      console.log('✅ Usando parâmetros da URL (modo Bitrix Webhook)');
    } 
    // Se não tem dados na URL e é POST, tentar extrair do body
    else if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      console.log('📋 Content-Type recebido:', contentType);
      
      if (contentType.includes('application/json')) {
        // JSON body
        const body: BitrixTemplateWebhook = await req.json();
        phone_number = body.phone_number || '';
        template_name = body.template_name || '';
        variables = body.variables || [];
        bitrix_id = body.bitrix_id;
        conversation_id = body.conversation_id;
        
        console.log('📋 Dados POST JSON:', JSON.stringify({ phone_number, template_name, variables, bitrix_id, conversation_id }));
        
      } else {
        // Form-urlencoded ou texto plano
        const text = await req.text();
        console.log('📋 Raw POST data:', text.substring(0, 500));
        
        const params = new URLSearchParams(text);
        
        phone_number = params.get('phone_number') || params.get('PHONE') || params.get('phone') || '';
        template_name = params.get('template_name') || params.get('TEMPLATE') || params.get('template') || '';
        bitrix_id = params.get('bitrix_id') || params.get('BITRIX_ID') || undefined;
        
        // Variáveis: var1, var2, ...
        for (let i = 1; i <= 10; i++) {
          const varValue = params.get(`var${i}`) || params.get(`VARIABLE${i}`) || params.get(`VAR${i}`);
          if (varValue) {
            variables.push(decodeURIComponent(varValue));
          }
        }
        
        // Ou variáveis como lista separada por vírgula
        const varsParam = params.get('variables');
        if (varsParam && variables.length === 0) {
          variables = varsParam.split(',').map(v => decodeURIComponent(v.trim()));
        }
        
        const convId = params.get('conversation_id');
        if (convId) conversation_id = parseInt(convId, 10);
        
        console.log('📋 Dados POST Form:', JSON.stringify({ phone_number, template_name, variables, bitrix_id, conversation_id }));
      }
    } 
    // GET sem dados na URL
    else if (req.method === 'GET') {
      console.log('⚠️ GET request sem parâmetros obrigatórios');
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
  const now = new Date().toISOString();
  
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
      status: 'pending', // Aguardando confirmação do Gupshup
      sent_by: 'bitrix',
      sender_name: 'Bitrix Automação',
      metadata: {
        source: 'bitrix_webhook',
        template_display_name: data.template_display_name,
        variables: data.variables,
        pending_since: now // Para matching no gupshup-webhook
      }
    });

  if (error) {
    console.error('❌ Erro ao salvar mensagem:', error);
    throw error;
  }
  
  console.log(`⏳ Mensagem registrada com status 'pending' para ${data.phone_number}`);

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
