/**
 * Edge Function: ai-analyze
 * AI-powered analysis endpoint for area selections
 * Currently uses local-fallback heuristic model
 * 
 * POST /api/ai/analyze
 * Body: {
 *   question: string,
 *   summary: { total, byProjeto },
 *   analysis: { topProjetos, topScouters, densidade, hotspot, recomendacoes }
 * }
 */

import { serve } from "https://deno.land/std@0.193.0/http/server.ts";

interface AnalysisSummary {
  total: number;
  byProjeto: Array<{
    projeto: string;
    total: number;
  }>;
}

interface AIAnalysisResult {
  topProjetos: string[];
  topScouters: string[];
  densidade: string;
  hotspot: string;
  recomendacoes: string[];
}

interface RequestBody {
  question: string;
  summary: AnalysisSummary;
  analysis: AIAnalysisResult;
}

/**
 * Answer questions using heuristic rules (local-fallback model)
 */
function answerQuestion(
  question: string,
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  const questionLower = question.toLowerCase();

  // Densidade
  if (
    questionLower.includes('densidade') ||
    questionLower.includes('concentração') ||
    questionLower.includes('quantas fichas')
  ) {
    return generateDensidadeAnswer(summary, analysis);
  }

  // Projetos
  if (
    questionLower.includes('projeto') ||
    questionLower.includes('principais projeto') ||
    questionLower.includes('quais projeto')
  ) {
    return generateProjetosAnswer(summary, analysis);
  }

  // Scouters
  if (
    questionLower.includes('scouter') ||
    questionLower.includes('produtiv') ||
    questionLower.includes('melhor') ||
    questionLower.includes('top')
  ) {
    return generateScoutersAnswer(analysis);
  }

  // Recomendações
  if (
    questionLower.includes('recomenda') ||
    questionLower.includes('sugest') ||
    questionLower.includes('devo') ||
    questionLower.includes('ação') ||
    questionLower.includes('fazer')
  ) {
    return generateRecomendacoesAnswer(analysis);
  }

  // Default overview
  return generateOverviewAnswer(summary, analysis);
}

function generateDensidadeAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  const { total } = summary;
  const { densidade } = analysis;

  let answer = `📊 **Análise de Densidade:**\n\n`;
  answer += `A área selecionada possui **${total} fichas**, o que caracteriza uma **${densidade.toLowerCase()}**.\n\n`;

  if (total > 100) {
    answer += `✅ Essa é uma área com **alta concentração**, ideal para:\n`;
    answer += `• Análises detalhadas de performance\n`;
    answer += `• Identificação de padrões de sucesso\n`;
    answer += `• Benchmarking de melhores práticas`;
  } else if (total > 30) {
    answer += `📈 Densidade moderada, sugerindo:\n`;
    answer += `• Área em desenvolvimento\n`;
    answer += `• Potencial de crescimento\n`;
    answer += `• Oportunidade para intensificação`;
  } else {
    answer += `🎯 Baixa densidade pode indicar:\n`;
    answer += `• Área pouco explorada\n`;
    answer += `• Grande potencial de expansão\n`;
    answer += `• Necessidade de maior cobertura`;
  }

  return answer;
}

function generateProjetosAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  const { byProjeto } = summary;
  const { topProjetos } = analysis;

  let answer = `📁 **Projetos na Área:**\n\n`;
  
  if (byProjeto.length === 0) {
    answer += `Nenhum projeto identificado nesta área.`;
    return answer;
  }

  answer += `Foram identificados **${byProjeto.length} projeto(s)**:\n\n`;
  
  topProjetos.forEach((proj, idx) => {
    answer += `${idx + 1}. ${proj}\n`;
  });

  if (byProjeto.length === 1) {
    answer += `\n📌 Área focada em um único projeto, facilitando gestão e análise.`;
  } else {
    const topProject = byProjeto[0];
    const dominance = (topProject.total / summary.total) * 100;
    
    if (dominance > 70) {
      answer += `\n⚡ O projeto **${topProject.projeto}** domina com ${dominance.toFixed(0)}% das fichas.`;
    } else {
      answer += `\n🔄 Distribuição equilibrada entre múltiplos projetos.`;
    }
  }

  return answer;
}

function generateScoutersAnswer(analysis: AIAnalysisResult): string {
  const { topScouters } = analysis;

  let answer = `👥 **Scouters Mais Produtivos:**\n\n`;
  
  if (topScouters.length === 0) {
    answer += `Nenhum scouter identificado nesta área.`;
    return answer;
  }

  answer += `Top performers na área:\n\n`;
  
  topScouters.forEach((scouter, idx) => {
    answer += `${idx + 1}. ${scouter}\n`;
  });

  answer += `\n💡 **Insights:**\n`;
  answer += `• Concentre esforços nos scouters mais produtivos\n`;
  answer += `• Use-os como referência para treinamento\n`;
  answer += `• Analise padrões de sucesso replicáveis`;

  return answer;
}

function generateRecomendacoesAnswer(analysis: AIAnalysisResult): string {
  const { recomendacoes } = analysis;

  let answer = `💡 **Recomendações Estratégicas:**\n\n`;
  
  recomendacoes.forEach((rec, idx) => {
    answer += `${idx + 1}. ${rec}\n`;
  });

  answer += `\n🎯 **Próximos Passos:**\n`;
  answer += `• Monitore tendências ao longo do tempo\n`;
  answer += `• Compare com outras áreas similares\n`;
  answer += `• Ajuste estratégias baseado em dados`;

  return answer;
}

function generateOverviewAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  let answer = `📋 **Resumo da Área Selecionada:**\n\n`;
  
  answer += `**Total de Fichas:** ${summary.total}\n`;
  answer += `**Densidade:** ${analysis.densidade}\n`;
  answer += `**Projetos:** ${summary.byProjeto.length}\n\n`;
  
  if (analysis.topProjetos.length > 0) {
    answer += `**Top Projeto:** ${analysis.topProjetos[0]}\n`;
  }
  
  if (analysis.topScouters.length > 0) {
    answer += `**Top Scouter:** ${analysis.topScouters[0]}\n`;
  }

  answer += `\n💬 Faça perguntas específicas sobre densidade, projetos, scouters ou recomendações.`;

  return answer;
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { question, summary, analysis } = body;

    if (!question || !summary || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: question, summary, analysis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate answer using local-fallback model
    const answer = answerQuestion(question, summary, analysis);

    return new Response(
      JSON.stringify({
        success: true,
        model: 'local-fallback',
        question,
        answer,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-analyze:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
