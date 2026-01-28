// ============================================
// Gerar Treinamento de IA a partir de Conversas
// Analisa padrões de atendimento de operadores
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversations, operatorName }: { conversations: ConversationData[]; operatorName: string } = await req.json();

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Chave de API não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`Analisando ${conversations.length} conversas do operador ${operatorName}`);

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro no Lovable AI:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Verifique sua conta Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao processar com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedTraining = data.choices?.[0]?.message?.content || '';

    console.log('Treinamento gerado com sucesso');

    return new Response(
      JSON.stringify({
        training: generatedTraining.trim(),
        conversations_analyzed: conversations.length,
        operator_name: operatorName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no generate-training-from-conversations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
