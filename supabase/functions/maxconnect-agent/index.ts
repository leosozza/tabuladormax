import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Você é o Agente MAXconnect, um assistente inteligente especializado em análise de dados do sistema MAXconnect.

ESTRUTURA DE DADOS:
- Tabela "leads": contém todas as fichas captadas
  - Campos principais: id, name, scouter, projeto_comercial, etapa, ficha_confirmada, data_agendamento, compareceu, valor_ficha, criado
  - "scouter": nome do captador
  - "projeto_comercial": nome do projeto (ex: "SELETIVA SÃO PAULO - PINHEIROS")
  - "etapa": status no funil (ex: "UC_8WYI7Q", "UC_DDVFX3")
  - "ficha_confirmada": booleano se ficha foi confirmada
  - "compareceu": booleano se compareceu ao agendamento
  - "data_agendamento": data do agendamento

INSTRUÇÕES:
1. Quando receber perguntas sobre quantidade de leads, use a tool "query_leads"
2. Para perguntas com projeto específico, extraia o nome e passe no filtro "project_name"
3. Para métricas por scouter, use group_by: ["scouter"]
4. Sempre responda em português brasileiro de forma clara e objetiva
5. Formate números com separadores (ex: 1.234 leads)
6. Se precisar de dados de múltiplas tabelas, faça chamadas separadas às tools

EXEMPLOS:

Pergunta: "Quantas leads foram feitas no projeto seletiva pinheiros?"
Ação: Chamar query_leads com project_name="pinheiros", metrics=["count"]
Resposta: "No projeto Seletiva Pinheiros foram captadas X leads."

Pergunta: "Separa por scouter esse projeto"
Ação: Chamar query_leads com project_name (do contexto), group_by=["scouter"], metrics=["count"]
Resposta: "No projeto Seletiva Pinheiros, a distribuição por scouter é:
- João Silva: 320 leads
- Maria Santos: 298 leads
..."

Pergunta: "Quantas confirmaram?"
Ação: Chamar query_leads com project_name (do contexto), metrics=["confirmadas"]
Resposta: "Das X leads do projeto, Y confirmaram (Z%)."

Seja sempre preciso, cite números exatos e mantenha o contexto da conversa.`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Consulta leads com filtros. Retorna dados de leads incluindo scouter, projeto, etapa, confirmação, etc.",
      parameters: {
        type: "object",
        properties: {
          project_name: { 
            type: "string", 
            description: "Parte do nome do projeto para buscar (ex: 'pinheiros', 'resende')" 
          },
          scouter_name: { 
            type: "string", 
            description: "Nome do scouter" 
          },
          date_start: { 
            type: "string", 
            description: "Data início formato YYYY-MM-DD" 
          },
          date_end: { 
            type: "string", 
            description: "Data fim formato YYYY-MM-DD" 
          },
          group_by: { 
            type: "array", 
            items: { type: "string", enum: ["scouter", "projeto_comercial", "etapa"] },
            description: "Campos para agrupar resultados"
          },
          metrics: {
            type: "array",
            items: { type: "string", enum: ["count", "confirmadas", "agendadas", "compareceu", "valor_total"] },
            description: "Métricas a calcular"
          }
        }
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
        if (toolCall.function.name === 'query_leads') {
          const args = JSON.parse(toolCall.function.arguments);
          toolResult = await executeQueryLeads(supabaseAdmin, args);
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
