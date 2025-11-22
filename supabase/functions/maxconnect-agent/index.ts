import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Você é o Agente MAXconnect, um assistente inteligente avançado especializado em análise de dados, previsões e insights acionáveis do sistema MAXconnect.

ESTRUTURA DE DADOS:
- Tabela "leads": contém todas as fichas captadas
  - Campos principais: id, name, scouter, projeto_comercial, etapa, ficha_confirmada, data_agendamento, compareceu, valor_ficha, criado, updated_at
  - "scouter": nome do captador
  - "projeto_comercial": nome do projeto (ex: "SELETIVA SÃO PAULO - PINHEIROS")
  - "etapa": status no funil (ex: "UC_8WYI7Q", "UC_DDVFX3")
  - "ficha_confirmada": booleano se ficha foi confirmada
  - "compareceu": booleano se compareceu ao agendamento
  - "data_agendamento": data do agendamento

CAPACIDADES AVANÇADAS:

1. ANÁLISES DESCRITIVAS (query_leads):
   - Métricas atuais e históricas
   - Agrupamentos por scouter, projeto, etapa
   - Taxas de conversão

2. ANÁLISES PREDITIVAS (predict_trends):
   - Previsão de leads para próximos períodos
   - Tendências de performance
   - Projeções de metas

3. ALERTAS PROATIVOS (generate_alerts):
   - Identificar projetos abaixo da meta
   - Detectar scouters inativos
   - Anomalias em taxas de conversão

4. SUGESTÕES DE AÇÕES (suggest_actions):
   - Ações para melhorar performance
   - Priorização de leads
   - Otimizações de processo

5. VISUALIZAÇÕES:
   - Quando apresentar dados de séries temporais, inclua [CHART:tipo_de_grafico]
   - Tipos: LINE (tendências), BAR (comparações), PIE (proporções)
   - Exemplo: "Aqui está a evolução mensal [CHART:LINE]"

INSTRUÇÕES:
1. Use query_leads para dados atuais
2. Use predict_trends para previsões futuras
3. Use generate_alerts para identificar problemas
4. Use suggest_actions para recomendar melhorias
5. Sempre responda em português brasileiro de forma clara e objetiva
6. Formate números com separadores (ex: 1.234 leads)
7. Inclua marcadores de gráficos quando apropriado
8. Seja proativo: sugira análises relacionadas quando relevante

EXEMPLOS:

Pergunta: "Quantas leads no projeto seletiva pinheiros?"
Ação: query_leads com project_name="pinheiros"
Resposta: "No projeto Seletiva Pinheiros foram captadas X leads. [Sugestão: Quer ver a evolução mensal ou comparar com outros projetos?]"

Pergunta: "Previsão de leads para próximo mês"
Ação: predict_trends com period="next_month"
Resposta: "Com base na tendência dos últimos 3 meses, a previsão é de X leads para o próximo mês [CHART:LINE]. Isso representa um crescimento de Y%."

Pergunta: "Quais projetos precisam de atenção?"
Ação: generate_alerts
Resposta: "Identifiquei 3 alertas críticos:
🔴 Projeto X: 40% abaixo da meta mensal
🟡 Scouter Y: sem leads há 5 dias
🟡 Taxa de comparecimento projeto Z: caiu 15%"

Pergunta: "O que fazer para melhorar?"
Ação: suggest_actions baseado no contexto
Resposta: "Recomendo 3 ações prioritárias:
1. Contatar scouters inativos há mais de 3 dias
2. Fazer follow-up de leads agendadas há mais de 7 dias
3. Analisar motivo de baixa conversão no projeto X"

Seja preciso, proativo e oriente a ação.`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Consulta leads com filtros. Retorna dados atuais e históricos.",
      parameters: {
        type: "object",
        properties: {
          project_name: { 
            type: "string", 
            description: "Parte do nome do projeto" 
          },
          scouter_name: { 
            type: "string", 
            description: "Nome do scouter" 
          },
          date_start: { 
            type: "string", 
            description: "Data início YYYY-MM-DD" 
          },
          date_end: { 
            type: "string", 
            description: "Data fim YYYY-MM-DD" 
          },
          group_by: { 
            type: "array", 
            items: { type: "string", enum: ["scouter", "projeto_comercial", "etapa", "date"] },
            description: "Campos para agrupar"
          },
          metrics: {
            type: "array",
            items: { type: "string", enum: ["count", "confirmadas", "agendadas", "compareceu", "valor_total"] },
            description: "Métricas a calcular"
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

  const { data, error } = await query.limit(10000);
  
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

    // Preparar mensagens com system prompt
    const allMessages = [
      { role: "system", content: systemPrompt },
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
