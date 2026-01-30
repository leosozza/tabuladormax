// ============================================
// WhatsApp AI Assist - Gerar/Melhorar respostas
// Multi-provider fallback com vários provedores
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de atendimento ao cliente via WhatsApp. Seu papel é ajudar agentes de telemarketing a responder mensagens de clientes.

Regras importantes:
- Seja cordial e profissional
- Use linguagem informal mas respeitosa (você ao invés de tu)
- Respostas curtas e objetivas (máximo 2-3 frases)
- NÃO use emojis em excesso (máximo 1 por mensagem)
- NÃO faça promessas que não pode cumprir
- Se não souber algo, sugira encaminhar para um especialista
- Use português brasileiro`;

// Configuração de providers com fallback (mesma lista do generate-training)
interface ProviderConfig {
  name: string;
  displayName: string;
  url: string;
  getApiKey: () => string | undefined;
  model: string;
  timeout: number;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'lovable',
    displayName: 'Gemini 3 Flash',
    url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    getApiKey: () => Deno.env.get('LOVABLE_API_KEY'),
    model: 'google/gemini-3-flash-preview',
    timeout: 20000,
  },
  {
    name: 'groq',
    displayName: 'Groq (Llama 3.3)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    getApiKey: () => Deno.env.get('GROQ_API_KEY'),
    model: 'llama-3.3-70b-versatile',
    timeout: 15000,
  },
  {
    name: 'deepseek',
    displayName: 'DeepSeek Chat',
    url: 'https://api.deepseek.com/chat/completions',
    getApiKey: () => Deno.env.get('DEEPSEEK_API_KEY'),
    model: 'deepseek-chat',
    timeout: 20000,
  },
  {
    name: 'cerebras',
    displayName: 'Cerebras (Llama 3.3)',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    getApiKey: () => Deno.env.get('CEREBRAS_API_KEY'),
    model: 'llama-3.3-70b',
    timeout: 15000,
  },
  {
    name: 'sambanova',
    displayName: 'SambaNova (Llama 3.1)',
    url: 'https://api.sambanova.ai/v1/chat/completions',
    getApiKey: () => Deno.env.get('SAMBANOVA_API_KEY'),
    model: 'Meta-Llama-3.1-70B-Instruct',
    timeout: 20000,
  },
  {
    name: 'openrouter-deepseek',
    displayName: 'DeepSeek R1 (OpenRouter)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    getApiKey: () => Deno.env.get('OPENROUTER_API_KEY'),
    model: 'deepseek/deepseek-r1-0528:free',
    timeout: 25000,
  },
  {
    name: 'openrouter-llama',
    displayName: 'Llama 70B (OpenRouter)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    getApiKey: () => Deno.env.get('OPENROUTER_API_KEY'),
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    timeout: 25000,
  },
  {
    name: 'openrouter-gemma',
    displayName: 'Gemma 27B (OpenRouter)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    getApiKey: () => Deno.env.get('OPENROUTER_API_KEY'),
    model: 'google/gemma-3-27b-it:free',
    timeout: 25000,
  },
  {
    name: 'google-ai-studio',
    displayName: 'Google AI Studio (Gemini 2.0)',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    getApiKey: () => Deno.env.get('GOOGLE_AI_STUDIO_API_KEY'),
    model: 'gemini-2.0-flash',
    timeout: 20000,
  },
  {
    name: 'kimi',
    displayName: 'Kimi (Moonshot)',
    url: 'https://api.moonshot.ai/v1/chat/completions',
    getApiKey: () => Deno.env.get('KIMI_API_KEY'),
    model: 'moonshot-v1-8k',
    timeout: 20000,
  },
];

interface AgentData {
  id: string;
  name: string;
  system_prompt: string;
  personality: string;
  ai_provider: string;
  ai_model: string;
}

interface TrainingData {
  title: string;
  content: string;
  category: string;
  priority: number;
}

interface AICallResult {
  success: boolean;
  response?: string;
  provider?: string;
  model?: string;
  error?: string;
  errorCode?: number;
  errorType?: 'rate_limit' | 'credits' | 'timeout' | 'api_error' | 'config' | 'model_not_found';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAIProvider(
  provider: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 300
): Promise<AICallResult> {
  const apiKey = provider.getApiKey();
  
  if (!apiKey) {
    console.log(`⏭️ ${provider.displayName}: API key não configurada, pulando...`);
    return {
      success: false,
      error: `API key não configurada para ${provider.displayName}`,
      errorType: 'config',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeout);

  try {
    console.log(`🔄 Tentando ${provider.displayName} (${provider.model})...`);
    
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider.name.startsWith('openrouter') ? { 'HTTP-Referer': 'https://tabuladormax.lovable.app' } : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ ${provider.displayName} erro ${response.status}:`, errorText);

      // Rate limit
      if (response.status === 429) {
        return {
          success: false,
          error: `⏳ Rate limit excedido em ${provider.displayName}`,
          errorCode: 429,
          errorType: 'rate_limit',
        };
      }

      // Créditos/Pagamento
      if (response.status === 402) {
        return {
          success: false,
          error: `💳 Sem créditos em ${provider.displayName}`,
          errorCode: 402,
          errorType: 'credits',
        };
      }

      // Autenticação
      if (response.status === 401) {
        return {
          success: false,
          error: `🔑 API key inválida em ${provider.displayName}`,
          errorCode: 401,
          errorType: 'config',
        };
      }

      // Modelo não encontrado
      if (response.status === 404) {
        return {
          success: false,
          error: `❓ Modelo não encontrado em ${provider.displayName}`,
          errorCode: 404,
          errorType: 'model_not_found',
        };
      }

      return {
        success: false,
        error: `Erro ${response.status} em ${provider.displayName}`,
        errorCode: response.status,
        errorType: 'api_error',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: `Resposta vazia de ${provider.displayName}`,
        errorType: 'api_error',
      };
    }

    console.log(`✅ ${provider.displayName} respondeu com sucesso`);
    return {
      success: true,
      response: content.trim(),
      provider: provider.name,
      model: provider.model,
    };

  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`⏱️ ${provider.displayName} timeout após ${provider.timeout}ms`);
      return {
        success: false,
        error: `⏱️ Timeout em ${provider.displayName}`,
        errorType: 'timeout',
      };
    }

    console.error(`❌ ${provider.displayName} erro de conexão:`, err);
    return {
      success: false,
      error: `Erro de conexão com ${provider.displayName}`,
      errorType: 'api_error',
    };
  }
}

async function callWithFallback(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 300
): Promise<AICallResult> {
  const errors: string[] = [];
  let attemptCount = 0;
  const maxRetries = 2; // Retry para rate limit

  for (const provider of PROVIDERS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await callAIProvider(provider, messages, maxTokens);
      attemptCount++;
      
      if (result.success) {
        console.log(`📊 Sucesso após ${attemptCount} tentativa(s)`);
        return result;
      }

      // Se for rate limit e ainda tem tentativas, aguarda e tenta novamente
      if (result.errorType === 'rate_limit' && attempt < maxRetries) {
        const backoffMs = 800 * Math.pow(2, attempt) + Math.floor(Math.random() * 400);
        console.log(`⏳ Rate limit em ${provider.displayName}. Aguardando ${backoffMs}ms (tentativa ${attempt + 1}/${maxRetries})...`);
        await sleep(backoffMs);
        continue;
      }

      errors.push(result.error || `Falha em ${provider.displayName}`);
      break; // Próximo provider
    }

    // Pequeno delay entre providers para evitar flood
    await sleep(300);
  }

  // Todos falharam - determinar tipo predominante de erro
  const hasRateLimit = errors.some(e => e.includes('Rate limit') || e.includes('⏳'));
  const hasCredits = errors.some(e => e.includes('créditos') || e.includes('💳'));
  
  let finalErrorType: AICallResult['errorType'] = 'api_error';
  if (hasCredits) finalErrorType = 'credits';
  if (hasRateLimit) finalErrorType = 'rate_limit';

  console.error(`❌ Todos os ${PROVIDERS.length} provedores falharam após ${attemptCount} tentativas`);
  
  return {
    success: false,
    error: `Todos os ${PROVIDERS.length} provedores falharam. Erros:\n${errors.slice(0, 5).join('\n')}`,
    errorType: finalErrorType,
  };
}

async function getAgentAndTraining(operatorBitrixId?: number, profileId?: string): Promise<{ agent: AgentData | null; trainings: TrainingData[] }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let assignment = null;
    
    if (operatorBitrixId) {
      const { data, error } = await supabase
        .from('agent_operator_assignments')
        .select(`
          agent_id,
          agent:ai_agents(*)
        `)
        .eq('operator_bitrix_id', operatorBitrixId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!error && data?.agent) {
        assignment = data;
      }
    }
    
    if (!assignment && profileId) {
      const { data, error } = await supabase
        .from('agent_operator_assignments')
        .select(`
          agent_id,
          agent:ai_agents(*)
        `)
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!error && data?.agent) {
        assignment = data;
      }
    }

    if (!assignment || !assignment.agent) {
      console.log(`Operador ${operatorBitrixId || profileId} não tem agente vinculado, usando prompt padrão`);
      return { agent: null, trainings: [] };
    }

    const agent = assignment.agent as unknown as AgentData;
    const allTrainings: TrainingData[] = [];
    
    const { data: agentTrainings, error: trainingError } = await supabase
      .from('ai_agents_training')
      .select('title, content, category, priority')
      .eq('agent_id', agent.id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (trainingError) {
      console.error('Erro ao buscar treinamentos do agente:', trainingError);
    } else if (agentTrainings) {
      allTrainings.push(...agentTrainings);
    }

    const { data: linkedTrainings, error: linkedError } = await supabase
      .from('agent_training_links')
      .select(`
        training:ai_training_instructions(title, content, category, priority, is_active)
      `)
      .eq('agent_id', agent.id);

    if (linkedError) {
      console.error('Erro ao buscar treinamentos vinculados:', linkedError);
    } else if (linkedTrainings) {
      for (const link of linkedTrainings) {
        const training = link.training as unknown as { title: string; content: string | null; category: string | null; priority: number; is_active: boolean };
        if (training && training.is_active && training.content) {
          allTrainings.push({
            title: training.title,
            content: training.content,
            category: training.category || 'geral',
            priority: training.priority,
          });
        }
      }
    }

    allTrainings.sort((a, b) => b.priority - a.priority);

    const directCount = agentTrainings?.length || 0;
    const linkedCount = allTrainings.length - directCount;
    console.log(`Usando agente "${agent.name}" com ${allTrainings.length} treinamentos (${directCount} diretos + ${linkedCount} vinculados)`);
    return { agent, trainings: allTrainings };
  } catch (err) {
    console.error('Erro ao buscar dados do agente:', err);
    return { agent: null, trainings: [] };
  }
}

function buildSystemPrompt(agent: AgentData | null, trainings: TrainingData[], context?: string): string {
  if (!agent) {
    return context ? `${DEFAULT_SYSTEM_PROMPT}\n\nContexto adicional: ${context}` : DEFAULT_SYSTEM_PROMPT;
  }

  let prompt = agent.system_prompt;

  if (trainings.length > 0) {
    prompt += '\n\n=== INSTRUÇÕES DE TREINAMENTO ===\n';
    trainings.forEach((t) => {
      prompt += `\n[${t.category.toUpperCase()}] ${t.title}:\n${t.content}\n`;
    });
  }

  if (context) {
    prompt += `\n\nContexto adicional: ${context}`;
  }

  return prompt;
}

// Mapeia nome do modelo para exibição amigável
function formatModelDisplay(model: string): string {
  const modelNames: Record<string, string> = {
    'llama-3.3-70b-versatile': 'Llama 3.3',
    'llama-3.3-70b': 'Llama 3.3',
    'Meta-Llama-3.1-70B-Instruct': 'Llama 3.1',
    'google/gemini-3-flash-preview': 'Gemini 3 Flash',
    'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'deepseek-chat': 'DeepSeek Chat',
    'deepseek/deepseek-r1-0528:free': 'DeepSeek R1',
    'google/gemma-3-27b-it:free': 'Gemma 27B',
    'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3',
    'moonshot-v1-8k': 'Kimi (Moonshot)',
  };
  return modelNames[model] || model;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, text, context, operatorBitrixId, profileId } = await req.json();

    // Buscar agente e treinamentos
    let agent: AgentData | null = null;
    let trainings: TrainingData[] = [];
    
    if (operatorBitrixId || profileId) {
      const agentData = await getAgentAndTraining(operatorBitrixId, profileId);
      agent = agentData.agent;
      trainings = agentData.trainings;
    }

    if (action === 'generate') {
      const systemPrompt = buildSystemPrompt(agent, trainings, context);

      const conversationHistory = messages?.map((m: any) => ({
        role: m.role,
        content: m.content,
      })) || [];

      const userPrompt = 'Baseado na conversa acima, gere uma resposta adequada para o cliente.';

      const aiMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userPrompt },
      ];

      const result = await callWithFallback(aiMessages, 300);

      if (!result.success) {
        // Determinar código de status baseado no tipo de erro
        let statusCode = 500;
        if (result.errorType === 'rate_limit') statusCode = 429;
        if (result.errorType === 'credits') statusCode = 402;

        return new Response(
          JSON.stringify({ 
            error: result.error,
            error_type: result.errorType,
          }),
          { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: result.response,
          agent_name: agent?.name || null,
          model_used: formatModelDisplay(result.model || ''),
          provider: result.provider,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'improve') {
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Texto não fornecido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const improvePrompt = `Você é um assistente que melhora textos de atendimento ao cliente via WhatsApp.

Sua tarefa é melhorar o texto fornecido:
- Corrigir erros de português
- Melhorar a clareza e cordialidade
- Manter o tom profissional mas amigável
- NÃO mudar o sentido da mensagem
- NÃO adicionar informações novas
- Manter breve (máximo 2-3 frases)
- Usar emojis com moderação (máximo 1)

${context ? `Contexto adicional: ${context}` : ''}

Retorne APENAS o texto melhorado, sem explicações.`;

      const aiMessages = [
        { role: 'system', content: improvePrompt },
        { role: 'user', content: `Melhore este texto: "${text}"` },
      ];

      const result = await callWithFallback(aiMessages, 300);

      if (!result.success) {
        let statusCode = 500;
        if (result.errorType === 'rate_limit') statusCode = 429;
        if (result.errorType === 'credits') statusCode = 402;

        return new Response(
          JSON.stringify({ 
            error: result.error,
            error_type: result.errorType,
          }),
          { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: result.response,
          model_used: formatModelDisplay(result.model || ''),
          provider: result.provider,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Ação inválida. Use "generate" ou "improve"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err) {
    console.error('Erro na função whatsapp-ai-assist:', err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Erro interno',
        error_type: 'api_error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
