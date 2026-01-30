// ============================================
// WhatsApp AI Assist - Gerar/Melhorar respostas
// Usa Groq API com suporte a Agentes personalizados
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de atendimento ao cliente via WhatsApp. Seu papel é ajudar agentes de telemarketing a responder mensagens de clientes.

Regras importantes:
- Seja cordial e profissional
- Use linguagem informal mas respeitosa (você ao invés de tu)
- Respostas curtas e objetivas (máximo 2-3 frases)
- NÃO use emojis em excesso (máximo 1 por mensagem)
- NÃO faça promessas que não pode cumprir
- Se não souber algo, sugira encaminhar para um especialista
- Use português brasileiro`;

interface AgentData {
  id: string;
  name: string;
  system_prompt: string;
  personality: string;
  ai_provider: string;
  ai_model: string;
}

interface TrainingData {
  title: string;
  content: string;
  category: string;
  priority: number;
}

async function getAgentAndTraining(operatorBitrixId?: number, profileId?: string): Promise<{ agent: AgentData | null; trainings: TrainingData[] }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Buscar agente vinculado ao operador (por bitrix_id ou profile_id)
    let assignment = null;
    
    // Tentar primeiro por operator_bitrix_id
    if (operatorBitrixId) {
      const { data, error } = await supabase
        .from('agent_operator_assignments')
        .select(`
          agent_id,
          agent:ai_agents(*)
        `)
        .eq('operator_bitrix_id', operatorBitrixId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!error && data?.agent) {
        assignment = data;
      }
    }
    
    // Se não encontrou por bitrix_id, tentar por profile_id
    if (!assignment && profileId) {
      const { data, error } = await supabase
        .from('agent_operator_assignments')
        .select(`
          agent_id,
          agent:ai_agents(*)
        `)
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!error && data?.agent) {
        assignment = data;
      }
    }

    if (!assignment || !assignment.agent) {
      console.log(`Operador ${operatorBitrixId || profileId} não tem agente vinculado, usando prompt padrão`);
      return { agent: null, trainings: [] };
    }

    const agent = assignment.agent as unknown as AgentData;
    const allTrainings: TrainingData[] = [];
    
    // Buscar treinamentos específicos do agente (ai_agents_training)
    const { data: agentTrainings, error: trainingError } = await supabase
      .from('ai_agents_training')
      .select('title, content, category, priority')
      .eq('agent_id', agent.id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (trainingError) {
      console.error('Erro ao buscar treinamentos do agente:', trainingError);
    } else if (agentTrainings) {
      allTrainings.push(...agentTrainings);
    }

    // Buscar treinamentos vinculados do sistema (agent_training_links -> ai_training_instructions)
    const { data: linkedTrainings, error: linkedError } = await supabase
      .from('agent_training_links')
      .select(`
        training:ai_training_instructions(title, content, category, priority, is_active)
      `)
      .eq('agent_id', agent.id);

    if (linkedError) {
      console.error('Erro ao buscar treinamentos vinculados:', linkedError);
    } else if (linkedTrainings) {
      for (const link of linkedTrainings) {
        const training = link.training as unknown as { title: string; content: string | null; category: string | null; priority: number; is_active: boolean };
        if (training && training.is_active && training.content) {
          allTrainings.push({
            title: training.title,
            content: training.content,
            category: training.category || 'geral',
            priority: training.priority,
          });
        }
      }
    }

    // Ordenar todos os treinamentos por prioridade
    allTrainings.sort((a, b) => b.priority - a.priority);

    console.log(`Usando agente "${agent.name}" com ${allTrainings.length} treinamentos (${agentTrainings?.length || 0} diretos + ${linkedTrainings?.length || 0} vinculados)`);
    return { agent, trainings: allTrainings };
  } catch (err) {
    console.error('Erro ao buscar dados do agente:', err);
    return { agent: null, trainings: [] };
  }
}

function buildSystemPrompt(agent: AgentData | null, trainings: TrainingData[], context?: string): string {
  if (!agent) {
    return context ? `${DEFAULT_SYSTEM_PROMPT}\n\nContexto adicional: ${context}` : DEFAULT_SYSTEM_PROMPT;
  }

  let prompt = agent.system_prompt;

  if (trainings.length > 0) {
    prompt += '\n\n=== INSTRUÇÕES DE TREINAMENTO ===\n';
    trainings.forEach((t, i) => {
      prompt += `\n[${t.category.toUpperCase()}] ${t.title}:\n${t.content}\n`;
    });
  }

  if (context) {
    prompt += `\n\nContexto adicional: ${context}`;
  }

  return prompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, text, context, operatorBitrixId, profileId } = await req.json();

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API key do Groq não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar agente e treinamentos se operatorBitrixId ou profileId foi fornecido
    let agent: AgentData | null = null;
    let trainings: TrainingData[] = [];
    
    if (operatorBitrixId || profileId) {
      const agentData = await getAgentAndTraining(operatorBitrixId, profileId);
      agent = agentData.agent;
      trainings = agentData.trainings;
    }

    // Usar modelo do agente ou padrão
    const model = agent?.ai_model || 'llama-3.3-70b-versatile';

    if (action === 'generate') {
      const systemPrompt = buildSystemPrompt(agent, trainings, context);

      // Formatar histórico de conversa
      const conversationHistory = messages?.map((m: any) => ({
        role: m.role,
        content: m.content,
      })) || [];

      const userPrompt = 'Baseado na conversa acima, gere uma resposta adequada para o cliente.';

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro no Groq API:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Créditos insuficientes no Groq. Verifique sua conta.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Erro ao processar com IA' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const generatedResponse = data.choices?.[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ 
          response: generatedResponse.trim(),
          agent_name: agent?.name || null,
          model_used: model
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'improve') {
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Texto não fornecido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const improvePrompt = `Você é um assistente que melhora textos de atendimento ao cliente via WhatsApp.

Sua tarefa é melhorar o texto fornecido:
- Corrigir erros de português
- Melhorar a clareza e cordialidade
- Manter o tom profissional mas amigável
- NÃO mudar o sentido da mensagem
- NÃO adicionar informações novas
- Manter breve (máximo 2-3 frases)
- Usar emojis com moderação (máximo 1)

${context ? `Contexto adicional: ${context}` : ''}

Retorne APENAS o texto melhorado, sem explicações.`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: improvePrompt },
            { role: 'user', content: `Melhore este texto: "${text}"` },
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro no Groq API:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Créditos insuficientes no Groq. Verifique sua conta.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Erro ao processar com IA' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const improvedText = data.choices?.[0]?.message?.content || text;

      return new Response(
        JSON.stringify({ 
          response: improvedText.trim(),
          model_used: model
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Ação inválida. Use "generate" ou "improve"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Erro no whatsapp-ai-assist:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
