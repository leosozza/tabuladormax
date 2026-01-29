// ============================================
// Gerar Treinamento de IA a partir de Conversas
// Analisa padrões de atendimento de operadores
// Com fallback automático entre provedores de IA
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================
// Configuração de Provedores de IA
// ============================================

interface AIProvider {
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  model: string;
  isFree: boolean;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'Lovable AI',
    baseUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    apiKeyEnv: 'LOVABLE_API_KEY',
    model: 'google/gemini-3-flash-preview',
    isFree: true,
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyEnv: 'GROQ_API_KEY',
    model: 'llama-3.3-70b-versatile',
    isFree: true,
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
    isFree: true,
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    model: 'google/gemini-2.0-flash-exp:free',
    isFree: false,
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AllProvidersFailedError extends Error {
  status: number;
  providerErrors: Array<{ provider: string; status?: number; reason?: string }>;

  constructor(
    message: string,
    status: number,
    providerErrors: Array<{ provider: string; status?: number; reason?: string }>
  ) {
    super(message);
    this.name = 'AllProvidersFailedError';
    this.status = status;
    this.providerErrors = providerErrors;
  }
}

// ============================================
// Função de Chamada com Fallback
// ============================================

async function callAIWithFallback(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000
): Promise<{ content: string; provider: string }> {
  const providerErrors: Array<{ provider: string; status?: number; reason?: string }> = [];

  for (const provider of AI_PROVIDERS) {
    const apiKey = Deno.env.get(provider.apiKeyEnv);
    if (!apiKey) {
      console.log(`⏭️ ${provider.name}: API key não configurada, pulando...`);
      continue;
    }

    try {
      // Retry leve para 429 (rate limit). 402 (sem créditos) não deve ser refeito.
      const max429Retries = 2;
      for (let attempt = 0; attempt <= max429Retries; attempt++) {
        console.log(`🤖 Tentando ${provider.name} (${provider.model})... (tentativa ${attempt + 1}/${max429Retries + 1})`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);

        let response: Response;
        try {
          response = await fetch(provider.baseUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: provider.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: maxTokens,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.status === 429 && attempt < max429Retries) {
          // Backoff exponencial com jitter curto
          const backoffMs = 800 * Math.pow(2, attempt) + Math.floor(Math.random() * 400);
          console.log(`⏳ ${provider.name} rate limit (429). Aguardando ${backoffMs}ms e tentando novamente...`);
          await response.text(); // consumir body
          await sleep(backoffMs);
          continue;
        }

        if (response.status === 402 || response.status === 429) {
          const errorText = await response.text();
          console.log(`⚠️ ${provider.name} retornou ${response.status}, tentando próximo...`);
          providerErrors.push({ provider: provider.name, status: response.status, reason: errorText?.slice?.(0, 200) });
          break; // próximo provedor
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ ${provider.name} erro:`, response.status, errorText);
          providerErrors.push({ provider: provider.name, status: response.status, reason: errorText?.slice?.(0, 200) });
          break;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        if (content) {
          console.log(`✅ Sucesso com ${provider.name}`);
          return { content, provider: provider.name };
        }

        console.log(`⚠️ ${provider.name} retornou resposta vazia, tentando próximo...`);
        providerErrors.push({ provider: provider.name, reason: 'resposta vazia' });
        break;
      }
    } catch (err) {
      console.error(`❌ Erro ao chamar ${provider.name}:`, err);
      providerErrors.push({
        provider: provider.name,
        reason: err instanceof Error ? err.message : 'erro desconhecido',
      });
    }
  }

  const statuses = providerErrors.map((e) => e.status).filter((s): s is number => typeof s === 'number');
  const all429 = statuses.length > 0 && statuses.every((s) => s === 429);
  const all402 = statuses.length > 0 && statuses.every((s) => s === 402);
  const finalStatus = all429 ? 429 : all402 ? 402 : 503;

  const summary = providerErrors
    .map((e) => (e.status ? `${e.provider}: ${e.status}` : `${e.provider}: erro`))
    .join(', ');

  throw new AllProvidersFailedError(`Todos os provedores falharam: ${summary}`, finalStatus, providerErrors);
}

// ============================================
// Tipos
// ============================================

interface Message {
  direction: 'inbound' | 'outbound';
  content: string;
  sender_name: string | null;
  created_at: string;
}

interface ConversationData {
  phone_number: string;
  messages: Message[];
}

// ============================================
// Handler Principal
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversations, operatorName }: { conversations: ConversationData[]; operatorName: string } = await req.json();

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma conversa fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar conversas para análise
    const formattedConversations = conversations.map((conv, index) => {
      const messagesText = conv.messages
        .map((m) => {
          const role = m.direction === 'inbound' ? 'CLIENTE' : 'OPERADOR';
          return `${role}: ${m.content}`;
        })
        .join('\n');

      return `--- Conversa ${index + 1} (${conv.phone_number}) ---\n${messagesText}\n`;
    }).join('\n\n');

    const systemPrompt = `Você é um especialista em análise de atendimento ao cliente e treinamento de agentes de IA.
Sua tarefa é analisar conversas reais de WhatsApp entre um operador humano e clientes para extrair padrões de atendimento.

Analise as conversas e gere um texto de treinamento estruturado que uma IA possa usar para replicar o estilo de atendimento deste operador.

O texto deve ser em português brasileiro e seguir este formato:

## TOM DE VOZ
[Descreva o tom usado: formal/informal, amigável/profissional, uso de emojis, etc.]

## SAUDAÇÕES E ABERTURAS
[Liste as frases de saudação típicas usadas]

## RESPOSTAS PADRÃO
[Identifique padrões de resposta para situações comuns]

## TÉCNICAS DE ATENDIMENTO
[Descreva como o operador lida com dúvidas, objeções e problemas]

## FECHAMENTOS E DESPEDIDAS
[Liste as frases de fechamento/despedida típicas]

## REGRAS GERAIS
[Extraia regras gerais de comportamento observadas]

Seja específico e use exemplos reais das conversas quando apropriado.`;

    const userPrompt = `Analise as seguintes ${conversations.length} conversas do operador "${operatorName}" e gere um treinamento estruturado:

${formattedConversations}

Gere um texto de treinamento completo baseado nos padrões observados nessas conversas.`;

    console.log(`📊 Analisando ${conversations.length} conversas do operador ${operatorName}`);

    // Usar fallback automático entre provedores
    const { content: generatedTraining, provider } = await callAIWithFallback(
      systemPrompt,
      userPrompt,
      4000
    );

    console.log(`✅ Treinamento gerado com sucesso usando ${provider}`);

    return new Response(
      JSON.stringify({
        training: generatedTraining.trim(),
        conversations_analyzed: conversations.length,
        operator_name: operatorName,
        ai_provider_used: provider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro no generate-training-from-conversations:', error);

    const status = error instanceof AllProvidersFailedError ? error.status : 500;
    const providerErrors = error instanceof AllProvidersFailedError ? error.providerErrors : undefined;

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        provider_errors: providerErrors,
      }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...(status === 429 ? { 'Retry-After': '2' } : {}),
        },
      }
    );
  }
});
