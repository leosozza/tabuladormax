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
    const { scriptId } = await req.json();
    
    if (!scriptId) {
      return new Response(
        JSON.stringify({ error: 'scriptId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the script
    const { data: script, error: fetchError } = await supabase
      .from('telemarketing_scripts')
      .select('*')
      .eq('id', scriptId)
      .single();

    if (fetchError || !script) {
      console.error('Error fetching script:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Script not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing script:', script.title);

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em scripts de telemarketing e vendas. Analise scripts de atendimento e forneça feedback construtivo.

Sua análise deve avaliar:
1. Tom de voz - Profissional, amigável, adequado ao contexto
2. Clareza - Instruções claras e fáceis de seguir
3. Estrutura - Organização lógica do script
4. Tratamento de objeções - Preparação para respostas negativas
5. Call-to-action - Efetividade do fechamento
6. Personalização - Uso de variáveis como {nome} do lead

Responda SEMPRE em JSON válido com esta estrutura exata:
{
  "score": número de 0 a 100,
  "summary": "Resumo da análise em 1-2 frases",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["sugestão de melhoria 1", "sugestão 2"],
  "tips": ["dica prática 1", "dica 2"]
}`
          },
          {
            role: 'user',
            content: `Analise este script de telemarketing:

Título: ${script.title}
Categoria: ${script.category}

Conteúdo:
${script.content}

Forneça sua análise em JSON.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    console.log('AI Response:', content);

    // Parse the JSON response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      analysis = {
        score: 70,
        summary: 'Análise parcial realizada',
        strengths: ['Script funcional'],
        improvements: ['Considere revisar a estrutura'],
        tips: ['Adicione mais personalização']
      };
    }

    // Update the script with analysis results
    const { error: updateError } = await supabase
      .from('telemarketing_scripts')
      .update({
        ai_analysis: analysis,
        ai_score: Math.min(100, Math.max(0, analysis.score || 70)),
        ai_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId);

    if (updateError) {
      console.error('Error updating script:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Script analysis saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        score: analysis.score 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-script:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
