import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Você é o MAXconnect Agent, um assistente inteligente especializado em análise de dados de leads da plataforma MAXconnect.

PAPEL E CAPACIDADES:
- Você tem acesso direto ao banco de dados de leads via a função query_leads
- Você pode analisar tendências, fazer previsões e identificar problemas
- Você fornece insights acionáveis e recomendações práticas
- Você pode gerar visualizações inline usando marcadores especiais

DADOS DISPONÍVEIS:
- Leads com informações de scouter, projeto, datas, status
- Métricas: total de leads, confirmadas, comparecimento, valores
- Histórico completo desde o início das operações (287.341 leads no total)

REGRAS CRÍTICAS SOBRE FILTROS:

1. ⚠️ DATAS SÃO OPCIONAIS - NÃO USE POR PADRÃO:
   - Por padrão, busque TODAS as leads (não especifique date_start/date_end)
   - SOMENTE use filtros de data se o usuário EXPLICITAMENTE mencionar período:
     ✅ "leads desta semana" → use date_start
     ✅ "leads de novembro" → use date_start e date_end
     ✅ "últimos 30 dias" → use date_start
     ❌ "quantas leads no projeto X" → NÃO use filtros de data
     ❌ "separa por scouter" → NÃO use filtros de data
     ❌ "qual o melhor captador" → NÃO use filtros de data
     ❌ "quantas confirmaram" → NÃO use filtros de data

2. PROJETO E SCOUTER:
   - Use project_name quando o usuário mencionar nome do projeto
   - Aceite termos parciais (ex: "pinheiros" encontra "SELETIVA - PINHEIROS")
   - Use scouter_name quando perguntar sobre captador específico

3. AGRUPAMENTOS:
   - Use group_by para separar/quebrar dados por scouter, projeto ou data
   - Exemplos:
     ✅ "separa por scouter" → group_by: ["scouter"]
     ✅ "por projeto" → group_by: ["projeto_comercial"]
     ✅ "evolução mensal" → group_by: ["date"]

COMO RESPONDER:
1. Seja objetivo e direto nas respostas
2. Use números e métricas concretas
3. Quando relevante, sugira ações práticas
4. Formate valores monetários em R$ com separadores de milhares
5. Use porcentagens para comparações e taxas

FERRAMENTAS DISPONÍVEIS:
- query_leads: Consulta leads com filtros opcionais (projeto, scouter, datas)
- predict_trends: Análise preditiva e projeções
- generate_alerts: Identifica problemas e oportunidades
- suggest_actions: Recomendações práticas baseadas em dados

VISUALIZAÇÕES:
Para incluir gráficos, use os marcadores:
- [CHART:line]{"data":[...]} para gráficos de linha (tendências)
- [CHART:bar]{"data":[...]} para gráficos de barra (comparações)
- [CHART:pie]{"data":[...]} para gráficos de pizza (distribuições)

FORMATO DOS DADOS PARA GRÁFICOS:
- Line/Bar: [{"name":"Jan","value":100},{"name":"Feb","value":150}]
- Pie: [{"name":"João","value":45},{"name":"Maria","value":30}]

EXEMPLOS CORRETOS DE USO:

❌ ERRADO:
Pergunta: "Quantas leads no projeto pinheiros?"
Ação: query_leads com date_start="2025-01-01" ← NÃO FAÇA ISSO!

✅ CORRETO:
Pergunta: "Quantas leads no projeto pinheiros?"
Ação: query_leads com project_name="pinheiros" (SEM DATAS)
Resposta: "No projeto Seletiva Pinheiros foram captadas 1.234 leads no total."

✅ CORRETO:
Pergunta: "Separa por scouter o projeto pinheiros"
Ação: query_leads com project_name="pinheiros", group_by=["scouter"] (SEM DATAS)
Resposta: "No projeto Seletiva Pinheiros:\n- João Silva: 320 leads\n- Maria Santos: 298 leads..."

✅ CORRETO:
Pergunta: "Quantas leads foram feitas essa semana?"
Ação: query_leads com date_start="2025-11-18" (AGORA SIM USA DATA)
Resposta: "Nesta semana foram captadas 571 leads."

✅ CORRETO:
Pergunta: "Qual o melhor scouter?"
Ação: query_leads com group_by=["scouter"] (SEM DATAS)
Resposta: "O scouter com melhor performance é João Silva com 320 leads."

✅ CORRETO:
Pergunta: "Mostra a evolução nos últimos 3 meses"
Ação: query_leads com group_by=["date"], date_start="2025-08-22" (PERÍODO SOLICITADO)
Resposta: "Evolução:\n[CHART:line]..."

PERGUNTAS COMUNS (SEM NECESSIDADE DE DATAS):
✅ "Quantas leads no total?" → query_leads() sem filtros
✅ "Quantas leads no projeto X?" → query_leads(project_name="X")
✅ "Quem é o melhor scouter?" → query_leads(group_by=["scouter"])
✅ "Quantas confirmaram no projeto Y?" → query_leads(project_name="Y")
✅ "Taxa de conversão do João?" → query_leads(scouter_name="João")

PERGUNTAS QUE PRECISAM DE DATAS:
✅ "Leads desta semana?" → query_leads(date_start="2025-11-18")
✅ "Comparar novembro vs outubro?" → múltiplas queries com date_start/date_end
✅ "Evolução mensal do último trimestre?" → query_leads(group_by=["date"], date_start="2025-08-01")

IMPORTANTE:
- Sempre contextualize os números (comparações, taxas, tendências)
- Identifique padrões e anomalias
- Sugira ações quando identificar oportunidades ou problemas
- Use linguagem profissional mas acessível
- NUNCA peça datas ao usuário se ele não mencionou período específico
`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Consulta leads no banco de dados. Por padrão busca TODAS as leads. Use filtros apenas quando o usuário especificar restrições (projeto, scouter, período).",
      parameters: {
        type: "object",
        properties: {
          project_name: { 
            type: "string", 
            description: "OPCIONAL - Nome do projeto comercial (ex: 'pinheiros', 'mooca'). Omita para buscar todos os projetos." 
          },
          scouter_name: { 
            type: "string", 
            description: "OPCIONAL - Nome do scouter/captador. Omita para buscar todos os scouters." 
          },
          date_start: { 
            type: "string", 
            description: "OPCIONAL - Data início (YYYY-MM-DD). OMITA para buscar desde sempre. Use SOMENTE se usuário mencionar período específico (ex: 'esta semana', 'em novembro', 'últimos 30 dias')." 
          },
          date_end: { 
            type: "string", 
            description: "OPCIONAL - Data fim (YYYY-MM-DD). OMITA para buscar até hoje. Use junto com date_start para períodos fechados (ex: 'em novembro' = 2025-11-01 a 2025-11-30)." 
          },
          group_by: { 
            type: "array", 
            items: { type: "string", enum: ["scouter", "projeto_comercial", "etapa", "date"] },
            description: "OPCIONAL - Agrupar resultados por: 'scouter', 'projeto_comercial', 'date'. Use quando usuário pedir para 'separar', 'agrupar', 'mostrar por', 'evolução'." 
          },
          metrics: {
            type: "array",
            items: { type: "string", enum: ["count", "confirmadas", "agendadas", "compareceu", "valor_total"] },
            description: "OPCIONAL - Métricas a calcular: 'count', 'confirmadas', 'compareceram', 'valor_total'. Por padrão calcula todas."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "predict_trends",
      description: "Gera previsões e análises de tendências baseadas em dados históricos.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["leads_count", "conversion_rate", "attendance_rate"],
            description: "Métrica para prever"
          },
          period: {
            type: "string",
            enum: ["next_week", "next_month", "next_quarter"],
            description: "Período da previsão"
          },
          project_name: {
            type: "string",
            description: "Filtrar por projeto específico"
          }
        },
        required: ["metric", "period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_alerts",
      description: "Identifica problemas, anomalias e oportunidades que requerem atenção.",
      parameters: {
        type: "object",
        properties: {
          alert_types: {
            type: "array",
            items: {
              type: "string",
              enum: ["below_target", "inactive_scouters", "low_conversion", "pending_followup"]
            },
            description: "Tipos de alertas a verificar"
          },
          severity: {
            type: "string",
            enum: ["all", "critical", "warning"],
            description: "Severidade dos alertas"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_actions",
      description: "Gera sugestões práticas de ações baseadas na análise de dados.",
      parameters: {
        type: "object",
        properties: {
          context: {
            type: "string",
            description: "Contexto para as sugestões (ex: 'baixa performance projeto X')"
          },
          focus_area: {
            type: "string",
            enum: ["scouters", "projects", "conversion", "general"],
            description: "Área de foco das sugestões"
          }
        },
        required: ["focus_area"]
      }
    }
  }
];

async function executeQueryLeads(supabaseAdmin: any, params: any) {
  console.log('Executing query_leads with params:', params);
  
  let query = supabaseAdmin
    .from('leads')
    .select('id, name, scouter, projeto_comercial, etapa, ficha_confirmada, data_agendamento, compareceu, valor_ficha, criado');

  // Filtros
  if (params.project_name) {
    query = query.ilike('projeto_comercial', `%${params.project_name}%`);
  }

  if (params.scouter_name) {
    query = query.ilike('scouter', `%${params.scouter_name}%`);
  }

  if (params.date_start) {
    query = query.gte('criado', params.date_start);
  }

  if (params.date_end) {
    query = query.lte('criado', params.date_end);
  }

  const { data, error } = await query.limit(500000);
  
  if (error) {
    console.error('Query error:', error);
    throw error;
  }

  console.log(`Query returned ${data?.length || 0} leads`);

  // Processar métricas e agrupamentos
  const result = processMetrics(data || [], params.group_by, params.metrics);
  
  return result;
}

async function executePredictTrends(supabaseAdmin: any, params: any) {
  console.log('Executing predict_trends with params:', params);
  
  // Buscar dados históricos dos últimos 3-6 meses
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  let query = supabaseAdmin
    .from('leads')
    .select('id, criado, ficha_confirmada, data_agendamento, compareceu, projeto_comercial')
    .gte('criado', sixMonthsAgo.toISOString());
  
  if (params.project_name) {
    query = query.ilike('projeto_comercial', `%${params.project_name}%`);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Agrupar por mês para calcular tendência
  const monthlyData: any = {};
  
  (data || []).forEach((lead: any) => {
    const date = new Date(lead.criado);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        count: 0,
        confirmadas: 0,
        agendadas: 0,
        compareceu: 0
      };
    }
    
    monthlyData[monthKey].count++;
    if (lead.ficha_confirmada) monthlyData[monthKey].confirmadas++;
    if (lead.data_agendamento) monthlyData[monthKey].agendadas++;
    if (lead.compareceu) monthlyData[monthKey].compareceu++;
  });
  
  // Calcular média dos últimos 3 meses
  const sortedMonths = Object.keys(monthlyData).sort().slice(-3);
  const avgLeads = sortedMonths.reduce((sum, month) => sum + monthlyData[month].count, 0) / sortedMonths.length;
  const avgConfirmation = sortedMonths.reduce((sum, month) => {
    const rate = monthlyData[month].count > 0 ? monthlyData[month].confirmadas / monthlyData[month].count : 0;
    return sum + rate;
  }, 0) / sortedMonths.length;
  
  // Calcular tendência (crescimento/decrescimento)
  let trend = 0;
  if (sortedMonths.length >= 2) {
    const firstMonth = monthlyData[sortedMonths[0]].count;
    const lastMonth = monthlyData[sortedMonths[sortedMonths.length - 1]].count;
    trend = ((lastMonth - firstMonth) / firstMonth) * 100;
  }
  
  // Gerar previsão
  let multiplier = 1;
  if (params.period === 'next_week') multiplier = 0.25;
  else if (params.period === 'next_month') multiplier = 1;
  else if (params.period === 'next_quarter') multiplier = 3;
  
  const trendFactor = 1 + (trend / 100);
  const prediction = Math.round(avgLeads * multiplier * trendFactor);
  
  return {
    metric: params.metric,
    period: params.period,
    prediction,
    historical_average: Math.round(avgLeads),
    trend_percentage: trend.toFixed(1),
    confidence: sortedMonths.length >= 3 ? 'high' : 'medium',
    monthly_breakdown: monthlyData,
    chart_data: sortedMonths.map(month => ({
      month,
      value: monthlyData[month].count
    }))
  };
}

async function executeGenerateAlerts(supabaseAdmin: any, params: any) {
  console.log('Executing generate_alerts with params:', params);
  
  const alerts: any[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  
  // Buscar dados do último mês
  const { data: recentLeads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .gte('criado', thirtyDaysAgo.toISOString());
  
  // 1. Projetos abaixo da meta (assumindo meta de 100 leads/mês por projeto)
  const projectCounts: any = {};
  recentLeads?.forEach((lead: any) => {
    const proj = lead.projeto_comercial || 'Sem projeto';
    projectCounts[proj] = (projectCounts[proj] || 0) + 1;
  });
  
  Object.entries(projectCounts).forEach(([proj, count]: any) => {
    if (count < 50) { // Abaixo de 50% da meta
      alerts.push({
        type: 'below_target',
        severity: count < 25 ? 'critical' : 'warning',
        title: `Projeto abaixo da meta`,
        message: `${proj}: ${count} leads (meta: 100/mês)`,
        project: proj,
        current: count,
        target: 100,
        deficit: 100 - count
      });
    }
  });
  
  // 2. Scouters inativos
  const scouterActivity: any = {};
  recentLeads?.forEach((lead: any) => {
    const scouter = lead.scouter || 'Desconhecido';
    const date = new Date(lead.criado);
    if (!scouterActivity[scouter] || date > scouterActivity[scouter]) {
      scouterActivity[scouter] = date;
    }
  });
  
  Object.entries(scouterActivity).forEach(([scouter, lastActivity]: any) => {
    const daysSince = (now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > 5) {
      alerts.push({
        type: 'inactive_scouters',
        severity: daysSince > 10 ? 'critical' : 'warning',
        title: 'Scouter inativo',
        message: `${scouter}: sem leads há ${Math.floor(daysSince)} dias`,
        scouter,
        days_inactive: Math.floor(daysSince),
        last_activity: lastActivity
      });
    }
  });
  
  // 3. Taxa de conversão baixa por projeto
  const projectConversion: any = {};
  recentLeads?.forEach((lead: any) => {
    const proj = lead.projeto_comercial || 'Sem projeto';
    if (!projectConversion[proj]) {
      projectConversion[proj] = { total: 0, confirmed: 0 };
    }
    projectConversion[proj].total++;
    if (lead.ficha_confirmada) projectConversion[proj].confirmed++;
  });
  
  Object.entries(projectConversion).forEach(([proj, stats]: any) => {
    const rate = (stats.confirmed / stats.total) * 100;
    if (rate < 30 && stats.total > 10) { // Menos de 30% de conversão
      alerts.push({
        type: 'low_conversion',
        severity: rate < 20 ? 'critical' : 'warning',
        title: 'Taxa de confirmação baixa',
        message: `${proj}: ${rate.toFixed(1)}% de confirmação`,
        project: proj,
        conversion_rate: rate.toFixed(1),
        total_leads: stats.total,
        confirmed: stats.confirmed
      });
    }
  });
  
  // Ordenar por severidade
  const severityOrder: { [key: string]: number } = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0));
  
  return {
    total_alerts: alerts.length,
    critical_count: alerts.filter(a => a.severity === 'critical').length,
    warning_count: alerts.filter(a => a.severity === 'warning').length,
    alerts: params.severity === 'critical' 
      ? alerts.filter(a => a.severity === 'critical')
      : alerts
  };
}

async function executeSuggestActions(supabaseAdmin: any, params: any) {
  console.log('Executing suggest_actions with params:', params);
  
  const suggestions: any[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Buscar dados recentes
  const { data: recentLeads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .gte('criado', sevenDaysAgo.toISOString());
  
  if (params.focus_area === 'scouters' || params.focus_area === 'general') {
    // Identificar scouters inativos
    const scouterActivity: any = {};
    recentLeads?.forEach((lead: any) => {
      const scouter = lead.scouter || 'Desconhecido';
      scouterActivity[scouter] = (scouterActivity[scouter] || 0) + 1;
    });
    
    const inactiveScouters = Object.entries(scouterActivity)
      .filter(([_, count]: any) => count < 5)
      .map(([scouter]) => scouter);
    
    if (inactiveScouters.length > 0) {
      suggestions.push({
        priority: 'high',
        category: 'scouters',
        action: 'Contatar scouters com baixa produtividade',
        details: `${inactiveScouters.length} scouters com menos de 5 leads na última semana`,
        scouters: inactiveScouters.slice(0, 5),
        expected_impact: 'Aumento de 20-30% na captação'
      });
    }
  }
  
  if (params.focus_area === 'conversion' || params.focus_area === 'general') {
    // Leads agendadas sem follow-up
    const pendingFollowup = recentLeads?.filter((lead: any) => 
      lead.data_agendamento && !lead.compareceu && 
      new Date(lead.data_agendamento) < now
    ).length || 0;
    
    if (pendingFollowup > 0) {
      suggestions.push({
        priority: 'high',
        category: 'conversion',
        action: 'Follow-up de leads agendadas',
        details: `${pendingFollowup} leads agendadas sem registro de comparecimento`,
        expected_impact: 'Recuperação de 40-50% das leads'
      });
    }
  }
  
  if (params.focus_area === 'projects' || params.focus_area === 'general') {
    // Projetos com alta taxa de cancelamento
    const projectStats: any = {};
    recentLeads?.forEach((lead: any) => {
      const proj = lead.projeto_comercial || 'Sem projeto';
      if (!projectStats[proj]) projectStats[proj] = { total: 0, confirmed: 0 };
      projectStats[proj].total++;
      if (lead.ficha_confirmada) projectStats[proj].confirmed++;
    });
    
    const lowPerformingProjects = Object.entries(projectStats)
      .filter(([_, stats]: any) => {
        const rate = (stats.confirmed / stats.total) * 100;
        return rate < 40 && stats.total > 10;
      })
      .map(([proj]) => proj);
    
    if (lowPerformingProjects.length > 0) {
      suggestions.push({
        priority: 'medium',
        category: 'projects',
        action: 'Revisar estratégia de projetos com baixa conversão',
        details: `${lowPerformingProjects.length} projetos com taxa < 40%`,
        projects: lowPerformingProjects,
        expected_impact: 'Melhoria de 15-25% na conversão'
      });
    }
  }
  
  // Sempre adicionar sugestões gerais
  suggestions.push({
    priority: 'medium',
    category: 'general',
    action: 'Análise semanal de performance',
    details: 'Revisar métricas e ajustar estratégias semanalmente',
    expected_impact: 'Melhoria contínua de 5-10%'
  });
  
  return {
    total_suggestions: suggestions.length,
    high_priority: suggestions.filter(s => s.priority === 'high').length,
    suggestions: suggestions.sort((a, b) => {
      const priority: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
      return (priority[a.priority] || 0) - (priority[b.priority] || 0);
    })
  };
}

function processMetrics(data: any[], groupBy?: string[], metrics?: string[]) {
  if (!groupBy || groupBy.length === 0) {
    // Sem agrupamento - métricas totais
    const total = data.length;
    const confirmadas = data.filter(d => d.ficha_confirmada === true).length;
    const agendadas = data.filter(d => d.data_agendamento !== null).length;
    const compareceu = data.filter(d => d.compareceu === true).length;
    const valor_total = data.reduce((sum, d) => sum + (Number(d.valor_ficha) || 0), 0);

    return {
      total,
      confirmadas,
      agendadas,
      compareceu,
      valor_total,
      taxa_confirmacao: total > 0 ? ((confirmadas / total) * 100).toFixed(1) : 0,
      taxa_agendamento: total > 0 ? ((agendadas / total) * 100).toFixed(1) : 0,
      taxa_comparecimento: agendadas > 0 ? ((compareceu / agendadas) * 100).toFixed(1) : 0,
    };
  }

  // Com agrupamento
  const grouped = data.reduce((acc: any, item: any) => {
    const key = groupBy.map(field => item[field] || 'Não informado').join('|');
    if (!acc[key]) {
      acc[key] = {
        ...Object.fromEntries(groupBy.map(f => [f, item[f] || 'Não informado'])),
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const results = Object.values(grouped).map((group: any) => {
    const total = group.items.length;
    const confirmadas = group.items.filter((d: any) => d.ficha_confirmada === true).length;
    const agendadas = group.items.filter((d: any) => d.data_agendamento !== null).length;
    const compareceu = group.items.filter((d: any) => d.compareceu === true).length;
    const valor_total = group.items.reduce((sum: number, d: any) => sum + (Number(d.valor_ficha) || 0), 0);

    return {
      ...Object.fromEntries(groupBy.map(f => [f, group[f]])),
      total,
      confirmadas,
      agendadas,
      compareceu,
      valor_total,
      taxa_confirmacao: total > 0 ? ((confirmadas / total) * 100).toFixed(1) : 0,
      taxa_agendamento: total > 0 ? ((agendadas / total) * 100).toFixed(1) : 0,
      taxa_comparecimento: agendadas > 0 ? ((compareceu / agendadas) * 100).toFixed(1) : 0,
    };
  });

  // Ordenar por total decrescente
  return results.sort((a: any, b: any) => b.total - a.total);
}

// Helper function to load training instructions from database
async function loadTrainingInstructions(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('ai_training_instructions')
      .select('title, content, category, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });
    
    if (error || !data || data.length === 0) {
      console.log('No active training instructions found');
      return '';
    }

    console.log(`Loading ${data.length} active training instructions`);

    let customInstructions = '\n\n=== TREINAMENTO CUSTOMIZADO ===\n\n';
    
    // Group by category
    const byCategory = data.reduce((acc: any, item: any) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
    
    const categoryLabels: Record<string, string> = {
      procedures: 'PROCEDIMENTOS',
      product_knowledge: 'CONHECIMENTO DE PRODUTO',
      responses: 'TOM DE RESPOSTA',
      business_rules: 'REGRAS DE NEGÓCIO',
      other: 'OUTROS',
    };

    // Format instructions by category
    for (const [category, items] of Object.entries(byCategory)) {
      customInstructions += `\n### ${categoryLabels[category] || category.toUpperCase()}\n\n`;
      
      (items as any[]).forEach((item: any) => {
        customInstructions += `**${item.title}** (Prioridade: ${item.priority})\n${item.content}\n\n`;
      });
    }
    
    console.log(`Generated custom instructions: ${customInstructions.length} characters`);
    return customInstructions;
  } catch (error) {
    console.error('Error loading training instructions:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    console.log('Received messages:', messages?.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Load custom training instructions
    const trainingContext = await loadTrainingInstructions(supabaseAdmin);
    const fullSystemPrompt = systemPrompt + trainingContext;

    // Preparar mensagens com system prompt
    const allMessages = [
      { role: "system", content: fullSystemPrompt },
      ...messages
    ];

    console.log('Calling Lovable AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: allMessages,
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Verificar se precisa executar tool calls
    const assistantMessage = data.choices[0].message;
    
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('Processing tool calls:', assistantMessage.tool_calls.length);
      
      // Executar tool calls
      const toolMessages = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        console.log('Executing tool:', toolCall.function.name);
        
        let toolResult;
        const args = JSON.parse(toolCall.function.arguments);
        
        if (toolCall.function.name === 'query_leads') {
          toolResult = await executeQueryLeads(supabaseAdmin, args);
        } else if (toolCall.function.name === 'predict_trends') {
          toolResult = await executePredictTrends(supabaseAdmin, args);
        } else if (toolCall.function.name === 'generate_alerts') {
          toolResult = await executeGenerateAlerts(supabaseAdmin, args);
        } else if (toolCall.function.name === 'suggest_actions') {
          toolResult = await executeSuggestActions(supabaseAdmin, args);
        } else {
          toolResult = { error: 'Tool not implemented' };
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Segunda chamada com resultados das tools
      console.log('Calling AI again with tool results...');
      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            ...allMessages,
            assistantMessage,
            ...toolMessages
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error('AI API error on second call:', finalResponse.status, errorText);
        throw new Error(`AI API error: ${finalResponse.status}`);
      }

      const finalData = await finalResponse.json();
      const finalMessage = finalData.choices[0].message.content;

      console.log('Final response generated');
      return new Response(JSON.stringify({ message: finalMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se não há tool calls, retornar resposta direta
    return new Response(JSON.stringify({ message: assistantMessage.content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in maxconnect-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
