import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, productService, targetAudience, tone, projectId } = await req.json();
    
    console.log('Generate script request:', { category, productService, targetAudience, tone, projectId });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é um especialista em scripts de telemarketing e vendas consultivas.
Você domina as seguintes técnicas:

🎯 **SPIN Selling:**
- **S**ituação: Perguntas para entender o contexto do cliente
- **P**roblema: Identificar dores e desafios
- **I**mplicação: Mostrar consequências de não resolver
- **N**ecessidade de Solução: Criar urgência para a solução

📊 **BANT Framework:**
- **B**udget: Capacidade de investimento
- **A**uthority: Poder de decisão
- **N**eed: Necessidade real
- **T**imeline: Prazo para decisão

🛡️ **Tratamento de Objeções:**
- Preço: "Entendo sua preocupação com o investimento..."
- Tempo: "Vou ser breve e objetivo..."
- Necessidade: "Deixa eu entender melhor sua situação..."
- Confiança: "Temos X anos de mercado e Y clientes satisfeitos..."

🎬 **Técnicas de Fechamento:**
- Alternativa: "Prefere começar pela opção A ou B?"
- Urgência: "Essa condição especial é válida até..."
- Resumo: "Então, recapitulando os benefícios..."
- Testemunho: "Assim como o cliente X que teve resultado Y..."

📝 **Variáveis de Personalização:**
Use estas variáveis que serão substituídas: {nome}, {empresa}, {produto}, {data}

Crie scripts naturais, conversacionais e eficazes.`;

    const categoryInstructions: Record<string, string> = {
      abertura: `Crie um script de ABERTURA que:
- Seja cordial e profissional
- Se apresente brevemente
- Desperte interesse imediato
- Use pergunta de engajamento (SPIN - Situação)
- Tenha gancho para continuar a conversa
- Máximo 5-6 frases`,
      
      objecoes: `Crie um script para TRATAMENTO DE OBJEÇÕES que:
- Aborde as objeções mais comuns (preço, tempo, necessidade, confiança)
- Use técnica de "concordar e redirecionar"
- Tenha respostas específicas para cada objeção
- Use SPIN (Implicação) para mostrar consequências
- Forneça provas sociais e casos de sucesso`,
      
      fechamento: `Crie um script de FECHAMENTO que:
- Use técnica de fechamento por alternativa
- Crie senso de urgência apropriado
- Resuma os benefícios principais
- Tenha CTA (Call to Action) claro
- Confirme próximos passos
- Use SPIN (Necessidade de Solução)`,
      
      geral: `Crie um script GERAL/COMPLETO que:
- Tenha estrutura de início, meio e fim
- Inclua abertura, desenvolvimento e fechamento
- Use perguntas consultivas (SPIN completo)
- Antecipe e trate objeções comuns
- Seja flexível para diferentes cenários`
    };

    const userPrompt = `Crie um script de telemarketing profissional com as seguintes especificações:

📋 **Categoria:** ${category}
🏢 **Produto/Serviço:** ${productService || 'Não especificado'}
👥 **Público-Alvo:** ${targetAudience || 'Geral'}
🎭 **Tom:** ${tone || 'Profissional e cordial'}

${categoryInstructions[category] || categoryInstructions.geral}

IMPORTANTE:
- Use linguagem natural brasileira
- Evite ser robotizado ou genérico
- Inclua variáveis de personalização: {nome}, {empresa}
- Forneça variações quando aplicável
- Indique pausas e entonações importantes entre [colchetes]

Retorne APENAS o script, sem explicações adicionais.`;

    console.log('Calling Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedScript = data.choices[0].message.content;

    console.log('Script generated successfully');

    // Generate a suggested title based on category and product
    const suggestedTitle = `${category.charAt(0).toUpperCase() + category.slice(1)} - ${productService || 'Geral'}`.substring(0, 100);

    return new Response(JSON.stringify({ 
      script: generatedScript,
      suggestedTitle,
      category
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
