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
    let bitrix_id_source: string = 'not_found';

    // SEMPRE extrair query params da URL primeiro (funciona para GET e POST)
    // Bitrix Webhook envia POST mas os dados vêm na URL, não no body
    const url = new URL(req.url);
    const urlPhone = url.searchParams.get('phone_number');
    const urlTemplate = url.searchParams.get('template_name');
    
    // FASE C: Tentar múltiplos parâmetros para bitrix_id
    const urlBitrixId = url.searchParams.get('bitrix_id') 
      || url.searchParams.get('lead_id') 
      || url.searchParams.get('id') 
      || url.searchParams.get('DEAL_ID')
      || url.searchParams.get('deal_id')
      || url.searchParams.get('LEAD_ID')
      || url.searchParams.get('ID');
    
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
      // Normalizar bitrix_id: remover caracteres não numéricos (ex: "407406_" -> "407406")
      bitrix_id = urlBitrixId ? urlBitrixId.replace(/\D/g, '') : undefined;
      if (bitrix_id && bitrix_id.length === 0) bitrix_id = undefined;
      if (bitrix_id) bitrix_id_source = 'url_param';
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
        if (bitrix_id) bitrix_id_source = 'json_body';
        conversation_id = body.conversation_id;
        
        console.log('📋 Dados POST JSON:', JSON.stringify({ phone_number, template_name, variables, bitrix_id, conversation_id }));
        
      } else {
        // Form-urlencoded ou texto plano
        const text = await req.text();
        console.log('📋 Raw POST data:', text.substring(0, 500));
        
        const params = new URLSearchParams(text);
        
        phone_number = params.get('phone_number') || params.get('PHONE') || params.get('phone') || '';
        template_name = params.get('template_name') || params.get('TEMPLATE') || params.get('template') || '';
        
        // Tentar múltiplos parâmetros para bitrix_id
        let rawBitrixId = params.get('bitrix_id') 
          || params.get('BITRIX_ID') 
          || params.get('lead_id') 
          || params.get('LEAD_ID')
          || params.get('id')
          || params.get('ID')
          || params.get('deal_id')
          || params.get('DEAL_ID')
          || undefined;
        // Normalizar: remover caracteres não numéricos (ex: "407406_" -> "407406")
        bitrix_id = rawBitrixId ? rawBitrixId.replace(/\D/g, '') : undefined;
        if (bitrix_id && bitrix_id.length === 0) bitrix_id = undefined;
        if (bitrix_id) bitrix_id_source = 'form_body';
        
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

    // FASE C: Se não tem bitrix_id, tentar lookup por telefone
    if (!bitrix_id && normalizedPhone) {
      console.log('🔍 Tentando lookup de lead por telefone...');
      
      // Gerar variações do telefone (com/sem 9)
      const phoneVariations = getPhoneVariations(normalizedPhone);
      console.log('📞 Variações de telefone:', phoneVariations);
      
      // Buscar lead mais recente nos últimos 7 dias com match de telefone
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: matchedLead, error: lookupError } = await supabase
        .from('leads')
        .select('id, phone_normalized, name')
        .in('phone_normalized', phoneVariations)
        .gte('created_date', sevenDaysAgo.toISOString())
        .order('created_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lookupError) {
        console.warn('⚠️ Erro no lookup por telefone:', lookupError);
      } else if (matchedLead) {
        bitrix_id = matchedLead.id.toString();
        bitrix_id_source = 'phone_lookup';
        console.log(`✅ Lead encontrado via telefone: ${bitrix_id} (${matchedLead.name})`);
      } else {
        console.log('⚠️ Nenhum lead encontrado para as variações de telefone');
      }
    }

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
        bitrix_id_source,
        conversation_id,
        content: `[📋 Template: ${template_name}]`,
        template_name,
        template_display_name: null,
        variables
      });
      
      return new Response(
        JSON.stringify({ success: true, warning: 'Template não encontrado, mensagem genérica registrada', bitrix_id_source }),
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
      bitrix_id_source,
      conversation_id,
      content,
      template_name: template.element_name,
      template_display_name: template.display_name,
      variables
    });

    console.log(`✅ Template ${template_name} registrado para ${normalizedPhone} (bitrix_id: ${bitrix_id || 'N/A'}, source: ${bitrix_id_source})`);

    return new Response(
      JSON.stringify({ success: true, message: 'Template registrado com sucesso', bitrix_id_source }),
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
  // Se vier múltiplos telefones separados por vírgula, pegar o primeiro válido
  const phones = (phone || '').split(',').map(p => p.trim());
  
  for (const p of phones) {
    const digits = p.replace(/\D/g, '');
    if (!digits) continue;

    // ==============================
    // Normalização BR (com 9º dígito)
    // ==============================
    // Casos suportados:
    // - 55 + DDD + 9 + 8 dígitos (13) -> mantém
    // - 55 + DDD + 8 dígitos (12) -> insere 9 se for provável celular (6-9)
    // - DDD + 9 dígitos (11) -> prefixa 55
    // - DDD + 8 dígitos (10) -> prefixa 55 e insere 9 se for provável celular (6-9)

    // Já tem DDI Brasil
    if (digits.startsWith('55')) {
      if (digits.length === 12) {
        const ddd = digits.substring(2, 4);
        const local = digits.substring(4); // 8 dígitos
        if (local.length === 8 && ['6', '7', '8', '9'].includes(local[0])) {
          return `55${ddd}9${local}`;
        }
        return digits;
      }
      if (digits.length === 13) {
        return digits;
      }

      // Fallback: manter como veio se estiver num range minimamente razoável
      if (digits.length >= 10 && digits.length <= 15) {
        return digits;
      }
      continue;
    }
    
    // Telefone válido tem pelo menos 10 dígitos
    if (digits.length === 11) {
      // DDD + 9 dígitos (celular moderno)
      return `55${digits}`;
    }

    if (digits.length === 10) {
      // DDD + 8 dígitos (pode ser celular antigo ou fixo)
      const ddd = digits.substring(0, 2);
      const local = digits.substring(2); // 8 dígitos
      if (local.length === 8 && ['6', '7', '8', '9'].includes(local[0])) {
        return `55${ddd}9${local}`;
      }
      return `55${digits}`;
    }

    // Outros formatos: manter apenas dígitos, limitado
    if (digits.length >= 10 && digits.length <= 13) {
      return digits;
    }
  }
  
  // Fallback: pegar primeiro telefone e limitar a 13 dígitos
  const fallbackDigits = (phone || '').replace(/\D/g, '');
  const limited = fallbackDigits.substring(0, 13);

  // Se vier BR sem DDI (DDD+8/9), tentar normalizar também
  if (!limited.startsWith('55')) {
    if (limited.length === 10) {
      const ddd = limited.substring(0, 2);
      const local = limited.substring(2);
      if (local.length === 8 && ['6', '7', '8', '9'].includes(local[0])) {
        return `55${ddd}9${local}`;
      }
      return `55${limited}`;
    }
    if (limited.length === 11) {
      return `55${limited}`;
    }
  }

  if (limited.startsWith('55') && limited.length === 12) {
    const ddd = limited.substring(2, 4);
    const local = limited.substring(4);
    if (local.length === 8 && ['6', '7', '8', '9'].includes(local[0])) {
      return `55${ddd}9${local}`;
    }
  }

  return limited;
}

// Gerar variações de telefone para match (com/sem 9)
function getPhoneVariations(phone: string): string[] {
  const variations: string[] = [phone];
  
  // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos), gerar versão sem o 9
  if (phone.length === 13 && phone.startsWith('55')) {
    // Remover o 5º dígito (o 9 após o DDD)
    const without9 = phone.substring(0, 4) + phone.substring(5);
    variations.push(without9);
  }
  
  // Se tem 12 dígitos (55 + DDD + 8 dígitos), gerar versão com o 9
  if (phone.length === 12 && phone.startsWith('55')) {
    // Adicionar 9 após o DDD
    const with9 = phone.substring(0, 4) + '9' + phone.substring(4);
    variations.push(with9);
  }
  
  return variations;
}

interface RegisterMessageParams {
  phone_number: string;
  bitrix_id?: string;
  bitrix_id_source: string;
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
      status: 'sent', // Status válido conforme constraint da tabela
      sent_by: 'bitrix',
      sender_name: 'Bitrix Automação',
      metadata: {
        source: 'bitrix_webhook',
        template_display_name: data.template_display_name,
        variables: data.variables,
        bitrix_id_source: data.bitrix_id_source,
        pending_since: now, // Para matching no gupshup-webhook
        rendered_content: data.content // Conteúdo renderizado para exibição
      }
    });

  if (error) {
    console.error('❌ Erro ao salvar mensagem:', error);
    throw error;
  }
  
  console.log(`✅ Mensagem registrada com status 'sent' para ${data.phone_number} (bitrix_id_source: ${data.bitrix_id_source})`);

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
