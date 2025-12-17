import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface BotConfig {
  bot_name: string;
  personality: string;
  welcome_message: string;
  fallback_message: string;
  transfer_keywords: string[];
  max_messages_before_transfer: number;
  collect_lead_data: boolean;
  ai_provider: string;
  ai_model: string;
  api_key_secret_name: string | null;
  tools_enabled: boolean;
  available_tools: string[];
}

interface AIProvider {
  name: string;
  display_name: string;
  base_url: string;
  models: Array<{ id: string; name: string }>;
  supports_tools: boolean;
  requires_api_key: boolean;
}

interface AgentTool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  tool_type: string;
  config: Record<string, unknown>;
  parameters_schema: Record<string, unknown>;
}

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

const PERSONALITY_PROMPTS: Record<string, string> = {
  formal: `Você é um assistente virtual profissional e formal. Use linguagem educada e direta. 
    Evite gírias e expressões informais. Seja objetivo nas respostas.`,
  amigavel: `Você é um assistente virtual amigável e acolhedor. Use uma linguagem próxima e calorosa.
    Pode usar emojis moderadamente. Seja empático e paciente.`,
  consultivo: `Você é um consultor especialista. Demonstre conhecimento profundo sobre o assunto.
    Faça perguntas para entender melhor as necessidades. Ofereça insights valiosos.`,
  vendedor: `Você é um assistente focado em ajudar o cliente. Destaque benefícios e vantagens.
    Identifique oportunidades e conduza para a conversão. Seja persuasivo mas não invasivo.`,
};

// Executar ferramenta do agente
async function executeAgentTool(
  supabase: ReturnType<typeof createClient>,
  tool: AgentTool,
  args: Record<string, unknown>,
  context: { lead_id?: number; phone_number?: string; bitrix_id?: string; project_id: string }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const startTime = Date.now();
  let result: unknown;
  let error: string | undefined;
  let success = false;

  try {
    console.log(`[executeAgentTool] Executing ${tool.name} with args:`, args);

    switch (tool.tool_type) {
      case 'webhook': {
        const webhookUrl = tool.config.url as string;
        const method = (tool.config.method as string) || 'POST';
        const headers = (tool.config.headers as Record<string, string>) || {};
        
        // Substituir placeholders
        const body = JSON.stringify({
          ...args,
          lead_id: context.lead_id,
          phone_number: context.phone_number,
          bitrix_id: context.bitrix_id,
        });

        const response = await fetch(webhookUrl, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: method !== 'GET' ? body : undefined,
        });

        result = await response.json().catch(() => ({ status: response.status }));
        success = response.ok;
        break;
      }

      case 'bitrix_update': {
        const webhookUrl = tool.config.webhook_url as string || 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json';
        const field = tool.config.field as string;
        
        if (!context.lead_id && !context.bitrix_id) {
          throw new Error('lead_id ou bitrix_id necessário para atualizar Bitrix');
        }

        const leadId = context.lead_id || context.bitrix_id;
        const fields: Record<string, unknown> = {};
        
        if (field && args.value !== undefined) {
          fields[field] = args.value;
        } else {
          Object.assign(fields, args);
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: leadId, fields }),
        });

        result = await response.json();
        success = response.ok && !(result as Record<string, unknown>).error;
        break;
      }

      case 'bitrix_get': {
        const webhookUrl = tool.config.webhook_url as string || 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.get.json';
        
        if (!context.lead_id && !context.bitrix_id) {
          throw new Error('lead_id ou bitrix_id necessário para buscar do Bitrix');
        }

        const leadId = context.lead_id || context.bitrix_id;
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: leadId }),
        });

        const data = await response.json();
        result = data.result || data;
        success = response.ok && !data.error;
        break;
      }

      case 'supabase_query': {
        const table = tool.config.table as string;
        const operation = (tool.config.operation as string) || 'select';
        const filters = args.filters as Record<string, unknown> || {};
        
        if (operation === 'select') {
          let selectQuery = supabase.from(table).select(tool.config.select as string || '*');
          Object.entries(filters).forEach(([key, value]) => {
            selectQuery = selectQuery.eq(key, value as string);
          });
          const { data, error: dbError } = await selectQuery.limit(10);
          if (dbError) throw dbError;
          result = data;
        } else if (operation === 'insert') {
          const { data, error: dbError } = await supabase.from(table).insert(args.data as Record<string, string>).select();
          if (dbError) throw dbError;
          result = data;
        } else if (operation === 'update') {
          let updateQuery = supabase.from(table).update(args.data as Record<string, string>);
          Object.entries(filters).forEach(([key, value]) => {
            updateQuery = updateQuery.eq(key, value as string);
          });
          const { data, error: dbError } = await updateQuery.select();
          if (dbError) throw dbError;
          result = data;
        }
        
        success = true;
        break;
      }

      case 'n8n_workflow': {
        const webhookUrl = tool.config.webhook_url as string;
        
        if (!webhookUrl) {
          throw new Error('URL do webhook n8n não configurada');
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...args,
            context: {
              lead_id: context.lead_id,
              phone_number: context.phone_number,
              bitrix_id: context.bitrix_id,
              project_id: context.project_id,
            },
          }),
        });

        result = await response.json().catch(() => ({ triggered: true }));
        success = response.ok;
        break;
      }

      case 'transfer_human': {
        result = { 
          should_transfer: true, 
          reason: args.reason || 'agent_requested',
          message: args.message || 'Transferindo para atendente humano...'
        };
        success = true;
        break;
      }

      case 'send_template': {
        // Apenas marca para enviar template - o webhook principal vai processar
        result = {
          template_id: args.template_id,
          variables: args.variables || {},
          should_send_template: true,
        };
        success = true;
        break;
      }

      default:
        throw new Error(`Tipo de ferramenta não suportado: ${tool.tool_type}`);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error(`[executeAgentTool] Error:`, error);
  }

  const executionTime = Date.now() - startTime;

  // Logar execução (ignorar erros de log)
  try {
    await supabase.from('bot_tool_execution_logs').insert({
      tool_id: tool.id,
      tool_name: tool.name,
      input_params: args as Record<string, string>,
      output_result: result as Record<string, string>,
      status: success ? 'success' : 'error',
      error_message: error || null,
      execution_time_ms: executionTime,
    });
  } catch (logError) {
    console.error('[executeAgentTool] Failed to log execution:', logError);
  }

  return { success, result, error };
}

// Obter API key para o provider
async function getApiKey(
  supabase: ReturnType<typeof createClient>,
  provider: string,
  secretName?: string | null
): Promise<string | null> {
  if (provider === 'lovable') {
    return LOVABLE_API_KEY || null;
  }

  if (secretName) {
    // Buscar secret do vault (se configurado)
    const secretValue = Deno.env.get(secretName);
    if (secretValue) return secretValue;
  }

  // Tentar buscar por nome padrão
  const defaultSecretNames: Record<string, string> = {
    'openai': 'OPENAI_API_KEY',
    'groq': 'GROQ_API_KEY',
    'xai': 'XAI_API_KEY',
    'together': 'TOGETHER_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY',
  };

  const defaultName = defaultSecretNames[provider];
  if (defaultName) {
    return Deno.env.get(defaultName) || null;
  }

  return null;
}

// Chamar AI provider
async function callAIProvider(
  provider: AIProvider,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>
): Promise<{
  content?: string;
  tool_calls?: ToolCall[];
  tokens_used: number;
  error?: string;
}> {
  const isAnthropic = provider.name === 'anthropic';
  
  let body: Record<string, unknown>;
  let headers: Record<string, string>;
  let url: string;

  if (isAnthropic) {
    // Anthropic tem formato diferente
    url = `${provider.base_url}/messages`;
    headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    body = {
      model,
      max_tokens: 500,
      system: systemMessage?.content,
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }
  } else {
    // OpenAI-compatible format
    url = `${provider.base_url}/chat/completions`;
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    
    body = {
      model,
      messages,
      max_tokens: 500,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
  }

  console.log(`[callAIProvider] Calling ${provider.name} with model ${model}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[callAIProvider] Error from ${provider.name}:`, errorText);
    return { error: `AI error: ${response.status}`, tokens_used: 0 };
  }

  const data = await response.json();

  if (isAnthropic) {
    // Parse Anthropic response
    const content = data.content?.find((c: { type: string }) => c.type === 'text')?.text;
    const toolUse = data.content?.find((c: { type: string }) => c.type === 'tool_use');
    
    return {
      content,
      tool_calls: toolUse ? [{
        id: toolUse.id,
        type: 'function',
        function: {
          name: toolUse.name,
          arguments: JSON.stringify(toolUse.input),
        },
      }] : undefined,
      tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
  } else {
    // Parse OpenAI-compatible response
    const message = data.choices?.[0]?.message;
    return {
      content: message?.content,
      tool_calls: message?.tool_calls,
      tokens_used: data.usage?.total_tokens || 0,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      phone_number, 
      project_id, 
      bitrix_id,
      lead_id,
      conversation_history,
      is_test = false 
    } = await req.json();

    console.log('[whatsapp-bot-respond] Request:', { message, project_id, is_test });

    if (!message || !project_id) {
      return new Response(
        JSON.stringify({ error: 'message and project_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar configuração do bot
    const { data: botConfig, error: configError } = await supabase
      .from('whatsapp_bot_config')
      .select('*')
      .eq('commercial_project_id', project_id)
      .single();

    if (configError || !botConfig) {
      console.log('[whatsapp-bot-respond] Bot config not found');
      return new Response(
        JSON.stringify({ should_respond: false, reason: 'bot_not_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se deve transferir por palavra-chave
    const lowerMessage = message.toLowerCase();
    const shouldTransfer = botConfig.transfer_keywords?.some(
      (keyword: string) => lowerMessage.includes(keyword.toLowerCase())
    );

    if (shouldTransfer && !is_test) {
      console.log('[whatsapp-bot-respond] Transfer keyword detected');
      return new Response(
        JSON.stringify({ should_respond: false, should_transfer: true, reason: 'transfer_keyword_detected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar provider de IA
    const providerName = botConfig.ai_provider || 'lovable';
    const { data: provider } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('name', providerName)
      .eq('is_active', true)
      .single();

    if (!provider) {
      console.error('[whatsapp-bot-respond] AI provider not found:', providerName);
      return new Response(
        JSON.stringify({ should_respond: true, response: botConfig.fallback_message, reason: 'provider_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter API key
    const apiKey = await getApiKey(supabase, providerName, botConfig.api_key_secret_name);
    
    if (!apiKey && provider.requires_api_key) {
      console.error('[whatsapp-bot-respond] API key not found for provider:', providerName);
      return new Response(
        JSON.stringify({ should_respond: true, response: botConfig.fallback_message, reason: 'api_key_missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar ferramentas do agente (se habilitado)
    let agentTools: AgentTool[] = [];
    let aiTools: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }> | undefined;

    if (botConfig.tools_enabled && botConfig.available_tools?.length > 0) {
      const { data: tools } = await supabase
        .from('bot_agent_tools')
        .select('*')
        .eq('commercial_project_id', project_id)
        .eq('is_active', true)
        .in('id', botConfig.available_tools);

      if (tools && tools.length > 0 && provider.supports_tools) {
        agentTools = tools as AgentTool[];
        aiTools = agentTools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters_schema,
          },
        }));
        console.log('[whatsapp-bot-respond] Agent tools loaded:', agentTools.map(t => t.name));
      }
    }

    // Buscar instruções de treinamento
    const { data: instructions } = await supabase
      .from('ai_training_instructions')
      .select('title, content, category, priority')
      .eq('is_active', true)
      .or(`commercial_project_id.eq.${project_id},commercial_project_id.is.null`)
      .order('priority', { ascending: false });

    // Construir contexto de treinamento
    let trainingContext = '';
    if (instructions && instructions.length > 0) {
      trainingContext = instructions.map(inst => 
        `[${inst.category || 'Geral'}] ${inst.title}:\n${inst.content}`
      ).join('\n\n');
    }

    // Construir prompt do sistema
    const personalityPrompt = PERSONALITY_PROMPTS[botConfig.personality] || PERSONALITY_PROMPTS.amigavel;
    
    let toolsPrompt = '';
    if (agentTools.length > 0) {
      toolsPrompt = `\n\nFERRAMENTAS DISPONÍVEIS:
Você tem acesso às seguintes ferramentas que pode usar quando apropriado:
${agentTools.map(t => `- ${t.display_name}: ${t.description}`).join('\n')}

Use as ferramentas quando o cliente solicitar uma ação específica ou quando precisar buscar/atualizar informações.`;
    }
    
    const systemPrompt = `${personalityPrompt}

Seu nome é: ${botConfig.bot_name}

INSTRUÇÕES DE ATENDIMENTO:
${trainingContext || 'Não há instruções específicas. Responda de forma útil e profissional.'}
${toolsPrompt}

REGRAS IMPORTANTES:
1. Responda sempre em português do Brasil
2. Seja conciso - mensagens de WhatsApp devem ser curtas
3. Se não souber responder, diga que vai transferir para um atendente
4. Nunca invente informações sobre produtos ou preços
5. Colete informações relevantes quando apropriado (nome, interesse, etc)
6. Use no máximo 2-3 parágrafos curtos por resposta

CONTEXTO: Esta é uma conversa por WhatsApp com um potencial cliente.`;

    // Preparar mensagens
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []),
      { role: 'user', content: message }
    ];

    console.log('[whatsapp-bot-respond] Calling AI provider:', providerName);
    const startTime = Date.now();

    // Primeira chamada para IA
    const model = botConfig.ai_model || provider.default_model || provider.models?.[0]?.id;
    let aiResult = await callAIProvider(provider as AIProvider, apiKey!, model, messages, aiTools);

    if (aiResult.error) {
      console.error('[whatsapp-bot-respond] AI error:', aiResult.error);
      return new Response(
        JSON.stringify({ should_respond: true, response: botConfig.fallback_message, should_transfer: true, reason: 'ai_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar tool calls se houver
    let shouldTransferFromTool = false;
    let transferReason = '';
    const toolResults: Array<{ name: string; result: unknown }> = [];

    if (aiResult.tool_calls && aiResult.tool_calls.length > 0) {
      console.log('[whatsapp-bot-respond] Processing tool calls:', aiResult.tool_calls.length);
      
      const context = { lead_id, phone_number, bitrix_id, project_id };
      
      for (const toolCall of aiResult.tool_calls) {
        const toolName = toolCall.function.name;
        const tool = agentTools.find(t => t.name === toolName);
        
        if (!tool) {
          console.warn('[whatsapp-bot-respond] Tool not found:', toolName);
          continue;
        }

        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        const toolResult = await executeAgentTool(supabase, tool, args, context);
        toolResults.push({ name: toolName, result: toolResult });

        // Verificar se ferramenta solicita transferência
        if (tool.tool_type === 'transfer_human' && toolResult.success) {
          shouldTransferFromTool = true;
          transferReason = (toolResult.result as { reason?: string })?.reason || 'agent_requested';
        }

        // Adicionar resultado à conversa
        messages.push({
          role: 'assistant',
          content: JSON.stringify({ tool_call: toolCall }),
        });
        messages.push({
          role: 'user', // role 'tool' não é universal
          content: `[Resultado da ferramenta ${toolName}]: ${JSON.stringify(toolResult.result)}`,
        });
      }

      // Segunda chamada para IA formular resposta final
      console.log('[whatsapp-bot-respond] Making second AI call for final response');
      aiResult = await callAIProvider(provider as AIProvider, apiKey!, model, messages);
    }

    const responseTime = Date.now() - startTime;
    const botResponse = aiResult.content || botConfig.fallback_message;
    const tokensUsed = aiResult.tokens_used || 0;

    console.log('[whatsapp-bot-respond] AI response:', { responseTime, tokensUsed, toolCalls: toolResults.length });

    // Se não for teste, registrar conversa e mensagem
    if (!is_test && phone_number) {
      // Buscar ou criar conversa
      let { data: conversation } = await supabase
        .from('whatsapp_bot_conversations')
        .select('*')
        .eq('phone_number', phone_number)
        .eq('commercial_project_id', project_id)
        .eq('status', 'active')
        .single();

      if (!conversation) {
        const { data: newConversation } = await supabase
          .from('whatsapp_bot_conversations')
          .insert({
            phone_number,
            commercial_project_id: project_id,
            bitrix_id,
            status: 'active',
            messages_count: 0,
            bot_messages_count: 0,
          })
          .select()
          .single();
        
        conversation = newConversation;
      }

      if (conversation) {
        // Registrar mensagens
        await supabase.from('whatsapp_bot_messages').insert([
          {
            conversation_id: conversation.id,
            role: 'user',
            content: message,
          },
          {
            conversation_id: conversation.id,
            role: 'assistant',
            content: botResponse,
            tokens_used: tokensUsed,
            response_time_ms: responseTime,
          }
        ]);

        // Atualizar contadores
        const newMessagesCount = (conversation.messages_count || 0) + 2;
        const newBotMessagesCount = (conversation.bot_messages_count || 0) + 1;

        await supabase
          .from('whatsapp_bot_conversations')
          .update({
            messages_count: newMessagesCount,
            bot_messages_count: newBotMessagesCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.id);

        // Verificar se deve transferir
        const shouldTransferByLimit = newMessagesCount >= botConfig.max_messages_before_transfer * 2;
        
        if (shouldTransferFromTool || shouldTransferByLimit) {
          await supabase
            .from('whatsapp_bot_conversations')
            .update({
              status: 'transferred',
              transferred_at: new Date().toISOString(),
              transferred_reason: shouldTransferFromTool ? transferReason : 'message_limit_reached',
            })
            .eq('id', conversation.id);

          return new Response(
            JSON.stringify({
              should_respond: true,
              response: botResponse,
              should_transfer: true,
              reason: shouldTransferFromTool ? transferReason : 'message_limit_reached',
              conversation_id: conversation.id,
              tool_results: toolResults,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        should_respond: true,
        response: botResponse,
        tokens_used: tokensUsed,
        response_time_ms: responseTime,
        tool_results: toolResults,
        ai_provider: providerName,
        ai_model: model,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[whatsapp-bot-respond] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
