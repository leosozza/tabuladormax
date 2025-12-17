// ============================================
// WhatsApp AI Assist - Gerar/Melhorar respostas
// Usa Lovable AI Gateway
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, text, context } = await req.json();

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'generate') {
      systemPrompt = `Você é um assistente de atendimento ao cliente via WhatsApp. Seu papel é ajudar agentes de telemarketing a responder mensagens de clientes.

Regras importantes:
- Seja cordial e profissional
- Use linguagem informal mas respeitosa (você ao invés de tu)
- Respostas curtas e objetivas (máximo 2-3 frases)
- NÃO use emojis em excesso (máximo 1 por mensagem)
- NÃO faça promessas que não pode cumprir
- Se não souber algo, sugira encaminhar para um especialista
- Use português brasileiro

${context ? `Contexto adicional: ${context}` : ''}`;

      // Formatar histórico de conversa
      const conversationHistory = messages?.map((m: any) => ({
        role: m.role,
        content: m.content,
      })) || [];

      userPrompt = 'Baseado na conversa acima, gere uma resposta adequada para o cliente.';

      const response = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro no AI Gateway:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Erro ao processar com IA' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const generatedResponse = data.choices?.[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ response: generatedResponse.trim() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'improve') {
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Texto não fornecido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      systemPrompt = `Você é um assistente que melhora textos de atendimento ao cliente via WhatsApp.

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

      const response = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Melhore este texto: "${text}"` },
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro no AI Gateway:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Erro ao processar com IA' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const improvedText = data.choices?.[0]?.message?.content || text;

      return new Response(
        JSON.stringify({ response: improvedText.trim() }),
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
