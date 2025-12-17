import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OperatorMetrics {
  name: string;
  leads: number;
  agendamentos: number;
  confirmadas: number;
  leadsScouter: number;
  leadsMeta: number;
}

interface ScouterMetrics {
  name: string;
  total: number;
  agendados: number;
  confirmados: number;
}

interface ConversationMetrics {
  totalConversations: number;
  resolvedByBot: number;
  transferred: number;
  avgSatisfaction: number;
  transferReasons: { reason: string; count: number }[];
  avgResponseTime: number;
}

interface AnalysisRequest {
  period: string;
  periodLabel: string;
  metrics: {
    totalLeads: number;
    agendamentos: number;
    comparecimentos: number;
    taxaConversao: number;
    operatorPerformance: OperatorMetrics[];
    scouterPerformance: ScouterMetrics[];
    tabulacaoDistribution: { label: string; count: number }[];
  };
  conversations?: ConversationMetrics;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { period, periodLabel, metrics, conversations } = await req.json() as AnalysisRequest;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Calculate additional metrics
    const avgConversion = metrics.operatorPerformance.length > 0
      ? metrics.operatorPerformance.reduce((sum, op) => {
          const rate = op.leads > 0 ? (op.agendamentos / op.leads) * 100 : 0;
          return sum + rate;
        }, 0) / metrics.operatorPerformance.length
      : 0;

    const topOperators = [...metrics.operatorPerformance]
      .sort((a, b) => b.agendamentos - a.agendamentos)
      .slice(0, 3);

    const lowPerformers = [...metrics.operatorPerformance]
      .filter(op => op.leads > 2)
      .sort((a, b) => {
        const rateA = a.leads > 0 ? a.agendamentos / a.leads : 0;
        const rateB = b.leads > 0 ? b.agendamentos / b.leads : 0;
        return rateA - rateB;
      })
      .slice(0, 2);

    const topScouters = [...metrics.scouterPerformance]
      .sort((a, b) => b.agendados - a.agendados)
      .slice(0, 3);

    // Build system prompt
    const systemPrompt = `Você é um analista de performance de telemarketing especializado em gestão de equipes de vendas e agendamentos.
Sua função é analisar dados de performance e fornecer insights estratégicos e acionáveis para gestores.

Responda SEMPRE em formato JSON válido seguindo EXATAMENTE esta estrutura:
{
  "executiveSummary": {
    "overallRating": number (1-5),
    "ratingLabel": "string (Ex: Excelente, Muito Bom, Bom, Regular, Precisa Atenção)",
    "mainInsight": "string (principal conclusão em 1-2 frases)",
    "comparisonWithAverage": "string (como está comparado ao esperado)"
  },
  "professionalAnalysis": {
    "highlights": [
      { "name": "string", "metric": "string", "insight": "string" }
    ],
    "needsAttention": [
      { "name": "string", "issue": "string", "recommendation": "string" }
    ],
    "teamTrend": "improving" | "stable" | "declining"
  },
  "leadQuality": {
    "confirmationRate": number,
    "attendanceRate": number,
    "insights": ["string", "string"]
  },
  "conversationAnalysis": {
    "botEfficiency": "string (análise da resolução pelo bot)",
    "transferPatterns": "string (padrões de transferência)",
    "satisfactionAnalysis": "string (análise de satisfação)",
    "improvements": ["string", "string"]
  },
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "title": "string",
      "description": "string",
      "expectedImpact": "string"
    }
  ],
  "trends": {
    "comparedToPrevious": "string",
    "patterns": ["string", "string"]
  }
}

IMPORTANTE:
- Seja específico e cite nomes e números
- Forneça recomendações práticas e acionáveis
- Identifique padrões que gestores podem não perceber
- Se não houver dados de conversas, omita ou adapte a seção conversationAnalysis`;

    // Build user prompt with all data
    let userPrompt = `Analise os dados de telemarketing do período "${periodLabel}" (${period}):

## MÉTRICAS GERAIS
- Total de Leads Trabalhados: ${metrics.totalLeads}
- Agendamentos Realizados: ${metrics.agendamentos}
- Comparecimentos: ${metrics.comparecimentos}
- Taxa de Conversão Geral: ${metrics.taxaConversao.toFixed(1)}%
- Taxa Média Individual: ${avgConversion.toFixed(1)}%

## PERFORMANCE POR OPERADOR
${metrics.operatorPerformance.map(op => {
  const rate = op.leads > 0 ? ((op.agendamentos / op.leads) * 100).toFixed(1) : '0.0';
  return `- ${op.name}: ${op.leads} leads, ${op.agendamentos} agendamentos (${rate}%), ${op.confirmadas} confirmadas, ${op.leadsScouter} scouter, ${op.leadsMeta} meta`;
}).join('\n')}

## TOP PERFORMERS
${topOperators.map((op, i) => `${i + 1}. ${op.name} - ${op.agendamentos} agendamentos`).join('\n')}

## PRECISAM DE ATENÇÃO
${lowPerformers.map(op => {
  const rate = op.leads > 0 ? ((op.agendamentos / op.leads) * 100).toFixed(1) : '0.0';
  return `- ${op.name}: ${rate}% de conversão`;
}).join('\n') || 'Nenhum operador identificado'}

## PERFORMANCE POR SCOUTER
${metrics.scouterPerformance.map(s => 
  `- ${s.name}: ${s.total} leads, ${s.agendados} agendados, ${s.confirmados} confirmados`
).join('\n')}

## TOP SCOUTERS
${topScouters.map((s, i) => `${i + 1}. ${s.name} - ${s.agendados} agendados`).join('\n')}

## DISTRIBUIÇÃO DE TABULAÇÕES
${metrics.tabulacaoDistribution.map(t => `- ${t.label}: ${t.count}`).join('\n')}`;

    // Add conversation data if available
    if (conversations && conversations.totalConversations > 0) {
      const botResolutionRate = ((conversations.resolvedByBot / conversations.totalConversations) * 100).toFixed(1);
      userPrompt += `

## DADOS DE CONVERSAS (MAXCONNECT)
- Total de Conversas: ${conversations.totalConversations}
- Resolvidas pelo Bot: ${conversations.resolvedByBot} (${botResolutionRate}%)
- Transferidas para Humano: ${conversations.transferred}
- Satisfação Média: ${conversations.avgSatisfaction.toFixed(1)}/5
- Tempo Médio de Resposta: ${conversations.avgResponseTime}ms

### MOTIVOS DE TRANSFERÊNCIA
${conversations.transferReasons.map(r => `- ${r.reason}: ${r.count}`).join('\n')}`;
    }

    userPrompt += `

Por favor, forneça uma análise estratégica completa em formato JSON.`;

    console.log('Calling Lovable AI for telemarketing analysis...');

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
        temperature: 0.7,
        max_tokens: 4000,
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
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
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content:', content);
      throw new Error('Failed to parse AI analysis');
    }

    console.log('Analysis generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      generatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-telemarketing:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
