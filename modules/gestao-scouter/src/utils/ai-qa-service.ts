/**
 * AI Q&A Service
 * Heuristic-based question answering for area analysis
 * Local fallback implementation (no external LLM)
 */

interface AnalysisSummary {
  total: number;
  byProjeto: Array<{
    projeto: string;
    total: number;
    byScout: Map<string, number>;
  }>;
  // Enhanced analysis data
  byEtapa?: Map<string, number>;
  byConfirmado?: Map<string, number>;
  totalComFoto?: number;
  totalConfirmados?: number;
  valorTotal?: number;
  idadeMedia?: number;
  supervisores?: Set<string>;
}

interface AIAnalysisResult {
  topProjetos: string[];
  topScouters: string[];
  densidade: string;
  hotspot: string;
  recomendacoes: string[];
  // Enhanced insights
  etapas?: Array<{ etapa: string; count: number }>;
  taxaConfirmacao?: number;
  taxaComFoto?: number;
  insights?: string[];
}

/**
 * Answer questions using heuristic rules based on keywords
 */
export function answerQuestion(
  question: string,
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  const questionLower = question.toLowerCase();

  // Densidade / densidade de fichas
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

  // Scouters / produtividade
  if (
    questionLower.includes('scouter') ||
    questionLower.includes('produtiv') ||
    questionLower.includes('melhor') ||
    questionLower.includes('top')
  ) {
    return generateScoutersAnswer(summary, analysis);
  }

  // Recomendações / sugestões
  if (
    questionLower.includes('recomenda') ||
    questionLower.includes('sugest') ||
    questionLower.includes('devo') ||
    questionLower.includes('ação') ||
    questionLower.includes('fazer')
  ) {
    return generateRecomendacoesAnswer(summary, analysis);
  }

  // Localização / área / região
  if (
    questionLower.includes('localização') ||
    questionLower.includes('área') ||
    questionLower.includes('região') ||
    questionLower.includes('onde')
  ) {
    return generateLocalizacaoAnswer(summary, analysis);
  }

  // Comparação / diferença
  if (
    questionLower.includes('compar') ||
    questionLower.includes('diferença') ||
    questionLower.includes('versus') ||
    questionLower.includes('vs')
  ) {
    return generateComparacaoAnswer(summary, analysis);
  }

  // Potencial / oportunidade
  if (
    questionLower.includes('potencial') ||
    questionLower.includes('oportunidade') ||
    questionLower.includes('crescimento')
  ) {
    return generatePotencialAnswer(summary, analysis);
  }

  // Default response with overview
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

function generateScoutersAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
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

function generateRecomendacoesAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
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

function generateLocalizacaoAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  const { hotspot } = analysis;

  let answer = `📍 **Informações de Localização:**\n\n`;
  answer += `${hotspot}\n\n`;
  answer += `**Distribuição:** ${summary.total} fichas nesta região\n\n`;
  
  if (summary.total > 50) {
    answer += `🔥 Hotspot identificado - área de alta atividade`;
  } else {
    answer += `📌 Área com atividade moderada`;
  }

  return answer;
}

function generateComparacaoAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  const { byProjeto } = summary;

  let answer = `📊 **Comparação entre Projetos:**\n\n`;
  
  if (byProjeto.length < 2) {
    answer += `Apenas um projeto nesta área. Selecione uma área com múltiplos projetos para comparação.`;
    return answer;
  }

  byProjeto.forEach((proj, idx) => {
    const percentage = (proj.total / summary.total) * 100;
    answer += `${idx + 1}. **${proj.projeto}:** ${proj.total} fichas (${percentage.toFixed(1)}%)\n`;
  });

  const topProject = byProjeto[0];
  const secondProject = byProjeto[1];
  const difference = topProject.total - secondProject.total;
  
  answer += `\n📈 **Análise:**\n`;
  answer += `O projeto líder (${topProject.projeto}) possui ${difference} fichas a mais que o segundo colocado (${secondProject.projeto}).`;

  return answer;
}

function generatePotencialAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  const { total } = summary;
  const { densidade } = analysis;

  let answer = `🚀 **Análise de Potencial:**\n\n`;

  if (total > 100) {
    answer += `**Status:** Área consolidada com alto volume\n\n`;
    answer += `**Potencial:** Otimização e eficiência\n`;
    answer += `• Refinar processos existentes\n`;
    answer += `• Aumentar taxa de conversão\n`;
    answer += `• Expandir para áreas adjacentes`;
  } else if (total > 30) {
    answer += `**Status:** Área em desenvolvimento\n\n`;
    answer += `**Potencial:** Crescimento acelerado\n`;
    answer += `• Aumentar frequência de visitas\n`;
    answer += `• Adicionar mais scouters\n`;
    answer += `• Replicar estratégias bem-sucedidas`;
  } else {
    answer += `**Status:** Área inexplorada\n\n`;
    answer += `**Potencial:** Grande oportunidade\n`;
    answer += `• Mercado virgem para exploração\n`;
    answer += `• Baixa concorrência\n`;
    answer += `• Alto retorno potencial`;
  }

  return answer;
}

function generateOverviewAnswer(
  summary: AnalysisSummary,
  analysis: AIAnalysisResult
): string {
  let answer = `📋 **Resumo Automático da Área Selecionada:**\n\n`;
  
  answer += `**📊 Dados Gerais:**\n`;
  answer += `• Total de Fichas: ${summary.total}\n`;
  answer += `• Projetos: ${summary.byProjeto.length}\n`;
  
  if (analysis.topProjetos.length > 0) {
    answer += `• Top Projeto: ${analysis.topProjetos[0]}\n`;
  }
  
  if (analysis.topScouters.length > 0) {
    answer += `• Top Scouter: ${analysis.topScouters[0]}\n`;
  }
  
  // Add enhanced insights
  if (analysis.taxaConfirmacao !== undefined) {
    answer += `• Taxa de Confirmação: ${analysis.taxaConfirmacao.toFixed(1)}%\n`;
  }
  
  if (analysis.taxaComFoto !== undefined) {
    answer += `• Fichas com Foto: ${analysis.taxaComFoto.toFixed(1)}%\n`;
  }
  
  if (summary.idadeMedia !== undefined && summary.idadeMedia > 0) {
    answer += `• Idade Média: ${summary.idadeMedia.toFixed(0)} anos\n`;
  }
  
  // Show etapas distribution
  if (analysis.etapas && analysis.etapas.length > 0) {
    answer += `\n**📈 Por Etapa:**\n`;
    analysis.etapas.slice(0, 5).forEach(({ etapa, count }) => {
      const percentage = ((count / summary.total) * 100).toFixed(1);
      answer += `• ${etapa}: ${count} (${percentage}%)\n`;
    });
  }
  
  // Show supervisores
  if (summary.supervisores && summary.supervisores.size > 0) {
    answer += `\n**👥 Supervisores:** ${summary.supervisores.size} supervisor(es)\n`;
  }
  
  // Add contextual insights
  if (analysis.insights && analysis.insights.length > 0) {
    answer += `\n**💡 Insights:**\n`;
    analysis.insights.forEach(insight => {
      answer += `• ${insight}\n`;
    });
  }

  answer += `\n💬 Faça perguntas específicas sobre densidade, projetos, scouters, etapas ou recomendações.`;

  return answer;
}
