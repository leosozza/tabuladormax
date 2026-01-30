// ============================================
// WhatsApp AI Assist - Gerar/Melhorar respostas
// Multi-provider fallback com Groq, Lovable AI, DeepSeek, Cerebras, SambaNova
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

// Configuração de providers com fallback
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
    name: 'groq',
    displayName: 'Groq (Llama 3.3)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    getApiKey: () => Deno.env.get('GROQ_API_KEY'),
    model: 'llama-3.3-70b-versatile',
    timeout: 15000,
  },
  {
    name: 'lovable',
    displayName: 'Gemini 3 Flash',
    url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    getApiKey: () => Deno.env.get('LOVABLE_API_KEY'),
    model: 'google/gemini-3-flash-preview',
    timeout: 20000,
  },
  {
    name: 'deepseek',
    displayName: 'DeepSeek Chat',
    url: 'https://api.deepseek.com/v1/chat/completions',
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
    name: 'openrouter',
    displayName: 'OpenRouter (Gemma 27B)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    getApiKey: () => Deno.env.get('OPENROUTER_API_KEY'),
    model: 'google/gemma-2-27b-it:free',
    timeout: 25000,
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
  errorType?: 'rate_limit' | 'credits' | 'timeout' | 'api_error' | 'config';
}

async function callAIProvider(
  provider: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 300
): Promise<AICallResult> {
  const apiKey = provider.getApiKey();
  
  if (!apiKey) {
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
        ...(provider.name === 'openrouter' ? { 'HTTP-Referer': 'https://tabuladormax.lovable.app' } : {}),
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

      if (response.status === 429) {
        return {
          success: false,
          error: `Rate limit excedido em ${provider.displayName}`,
          errorCode: 429,
          errorType: 'rate_limit',
        };
      }

      if (response.status === 402 || response.status === 401) {
        return {
          success: false,
          error: `Créditos/autenticação em ${provider.displayName}`,
          errorCode: response.status,
          errorType: 'credits',
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
        error: `Timeout em ${provider.displayName}`,
        errorType: 'timeout',
      };
    }

    console.error(`❌ ${provider.displayName} erro:`, err);
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

  for (const provider of PROVIDERS) {
    const result = await callAIProvider(provider, messages, maxTokens);
    
    if (result.success) {
      return result;
    }

    errors.push(result.error || `Falha em ${provider.displayName}`);

    // Se for erro de configuração, pula para próximo
    if (result.errorType === 'config') {
      continue;
    }

    // Pequeno delay entre tentativas para evitar flood
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Todos falharam
  return {
    success: false,
    error: `Todos os provedores falharam:\n${errors.join('\n')}`,
    errorType: 'api_error',
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

    console.log(`Usando agente "${agent.name}" com ${allTrainings.length} treinamentos`);
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
    'deepseek-chat': 'DeepSeek',
    'google/gemma-2-27b-it:free': 'Gemma 27B',
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

  } catch (error) {
    console.error('Erro no whatsapp-ai-assist:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        error_type: 'api_error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
