import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  scouterName: string;
  periodLabel: string;
  stats: {
    total_leads: number;
    com_foto: number;
    confirmados: number;
    agendados: number;
    reagendar: number;
    compareceram: number;
    pendentes: number;
    duplicados: number;
  };
  ranking: {
    rank_position: number;
    scouter_fichas: number;
    total_scouters: number;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { scouterName, periodLabel, stats, ranking }: AnalysisRequest = await req.json();

    console.log('Analyzing performance for:', scouterName, 'Period:', periodLabel);

    // Calculate metrics
    const confirmationRate = stats.total_leads > 0 
      ? ((stats.confirmados / stats.total_leads) * 100).toFixed(1) 
      : '0';
    const attendanceRate = stats.confirmados > 0 
      ? ((stats.compareceram / stats.confirmados) * 100).toFixed(1) 
      : '0';
    const photoRate = stats.total_leads > 0 
      ? ((stats.com_foto / stats.total_leads) * 100).toFixed(1) 
      : '0';
    const scheduledRate = stats.total_leads > 0 
      ? ((stats.agendados / stats.total_leads) * 100).toFixed(1) 
      : '0';
    const duplicateRate = stats.total_leads > 0 
      ? ((stats.duplicados / stats.total_leads) * 100).toFixed(1) 
      : '0';

    const rankingInfo = ranking 
      ? `Posição no ranking: ${ranking.rank_position}º de ${ranking.total_scouters} scouters, com ${ranking.scouter_fichas} fichas.`
      : 'Dados de ranking não disponíveis.';

    const systemPrompt = `Você é um analista de desempenho especializado em equipes de captação (scouters) e telemarketing.
Sua função é analisar métricas de performance e fornecer insights estratégicos em português brasileiro.
Seja direto, profissional e foque em pontos acionáveis.
Use emojis para destacar pontos importantes.
Estruture a resposta de forma clara e organizada.`;

    const userPrompt = `Analise o desempenho do scouter "${scouterName}" no período "${periodLabel}":

MÉTRICAS:
- Total de Leads Captados: ${stats.total_leads}
- Leads com Foto: ${stats.com_foto}
- Fichas Confirmadas: ${stats.confirmados}
- Leads Agendados: ${stats.agendados}
- Leads para Reagendar: ${stats.reagendar}
- Comparecimentos: ${stats.compareceram}
- Pendentes: ${stats.pendentes}
- Duplicados: ${stats.duplicados}

TAXAS CALCULADAS:
- Taxa de Confirmação: ${confirmationRate}%
- Taxa de Comparecimento (sobre confirmados): ${attendanceRate}%
- Taxa de Leads com Foto: ${photoRate}%
- Taxa de Agendamento: ${scheduledRate}%
- Taxa de Duplicados: ${duplicateRate}%

${rankingInfo}

Por favor, forneça uma análise completa incluindo:

1. 📊 RESUMO EXECUTIVO
   - Avaliação geral do desempenho (use ⭐ de 1 a 5)
   - Principal destaque positivo
   - Principal ponto de atenção

2. 📈 ANÁLISE DE MÉTRICAS
   - Avalie cada taxa em relação a benchmarks típicos do setor de captação
   - Identifique pontos fortes e fracos
   - Compare volume vs qualidade
   - Avalie a taxa de duplicados e fotos

3. 🎯 RECOMENDAÇÕES PRÁTICAS
   - Liste 3-5 ações específicas para melhorar resultados
   - Priorize as ações por impacto esperado

4. 🏆 PERSPECTIVA DE RANKING
   - Contextualize a posição no ranking
   - O que fazer para subir de posição

Seja específico e use os números fornecidos na análise.`;

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
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes para análise de IA.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis generated');
    }

    console.log('Analysis generated successfully');

    return new Response(JSON.stringify({ 
      analysis,
      metrics: {
        confirmationRate: parseFloat(confirmationRate),
        attendanceRate: parseFloat(attendanceRate),
        photoRate: parseFloat(photoRate),
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-performance:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro ao gerar análise' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
