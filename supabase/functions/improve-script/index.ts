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
    const { scriptId, scriptContent, techniques, improvementType } = await req.json();
    
    console.log('Improve script request:', { scriptId, techniques, improvementType });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get script content if scriptId provided
    let content = scriptContent;
    if (scriptId && !content) {
      const { data: script, error } = await supabase
        .from('telemarketing_scripts')
        .select('content, title, category')
        .eq('id', scriptId)
        .single();
      
      if (error || !script) {
        throw new Error('Script not found');
      }
      content = script.content;
    }

    if (!content) {
      throw new Error('No script content provided');
    }

    const techniqueDescriptions: Record<string, string> = {
      spin_selling: `**SPIN Selling:**
- Adicione perguntas de Situação para entender o contexto
- Inclua perguntas de Problema para identificar dores
- Use Implicação para mostrar consequências
- Crie Necessidade de Solução com urgência`,

      objection_handling: `**Tratamento de Objeções:**
- Identifique objeções implícitas no script
- Adicione respostas para objeções de preço, tempo, necessidade e confiança
- Use técnica "concordar e redirecionar"
- Inclua provas sociais e depoimentos`,

      closing_techniques: `**Técnicas de Fechamento:**
- Adicione fechamento por alternativa
- Crie senso de urgência apropriado
- Inclua resumo de benefícios antes do CTA
- Confirme próximos passos claramente`,

      personalization: `**Personalização Avançada:**
- Adicione variáveis {nome}, {empresa}, {produto}
- Crie variações para diferentes perfis de cliente
- Inclua gatilhos emocionais personalizados
- Adapte linguagem ao público-alvo`,

      conversational: `**Tom Conversacional:**
- Torne o script mais natural e humano
- Remova linguagem corporativa excessiva
- Adicione pausas e entonações [entre colchetes]
- Use linguagem do dia-a-dia brasileiro`,

      persuasion: `**Técnicas de Persuasão:**
- Aplique princípios de Cialdini (reciprocidade, escassez, autoridade)
- Adicione gatilhos mentais estratégicos
- Use storytelling quando apropriado
- Crie conexão emocional com o cliente`
    };

    const selectedTechniques = (techniques || ['spin_selling', 'objection_handling'])
      .map((t: string) => techniqueDescriptions[t] || '')
      .filter(Boolean)
      .join('\n\n');

    const systemPrompt = `Você é um especialista em otimização de scripts de vendas e telemarketing.
Sua tarefa é melhorar scripts existentes aplicando técnicas profissionais de vendas consultivas.

Mantenha a essência e objetivo do script original, mas eleve sua qualidade e eficácia.

Regras:
1. Preserve o objetivo principal do script
2. Mantenha o tom adequado ao contexto
3. Use linguagem natural brasileira
4. Inclua variáveis de personalização: {nome}, {empresa}
5. Indique pausas e entonações entre [colchetes]
6. Não adicione explicações - retorne apenas o script melhorado`;

    const userPrompt = `Melhore o seguinte script de telemarketing aplicando as técnicas selecionadas:

📝 **SCRIPT ORIGINAL:**
${content}

🎯 **TÉCNICAS A APLICAR:**
${selectedTechniques}

${improvementType === 'strategic' ? `
📊 **ANÁLISE ESTRATÉGICA ADICIONAL:**
Além de aplicar as técnicas, faça:
- Identifique pontos fracos do script atual
- Sugira melhorias específicas
- Otimize o fluxo de conversa
- Maximize chances de conversão
` : ''}

Retorne o script MELHORADO e pronto para uso. Não inclua explicações ou comentários.`;

    console.log('Calling Lovable AI Gateway for improvement...');

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
    const improvedScript = data.choices[0].message.content;

    console.log('Script improved successfully');

    return new Response(JSON.stringify({ 
      improvedScript,
      techniquesApplied: techniques || ['spin_selling', 'objection_handling']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in improve-script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
