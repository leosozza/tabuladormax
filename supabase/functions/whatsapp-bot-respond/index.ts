import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BotConfig {
  bot_name: string;
  personality: string;
  welcome_message: string;
  fallback_message: string;
  transfer_keywords: string[];
  max_messages_before_transfer: number;
  collect_lead_data: boolean;
}

interface TrainingInstruction {
  title: string;
  content: string;
  category: string;
  priority: number;
}

const PERSONALITY_PROMPTS: Record<string, string> = {
  formal: `Você é um assistente virtual profissional e formal. Use linguagem educada e direta. 
    Evite gírias e expressões informais. Seja objetivo nas respostas.`,
  amigavel: `Você é um assistente virtual amigável e acolhedor. Use uma linguagem próxima e calorosa.
    Pode usar emojis moderadamente. Seja empático e paciente.`,
  consultivo: `Você é um consultor especialista. Demonstre conhecimento profundo sobre o assunto.
    Faça perguntas para entender melhor as necessidades. Ofereça insights valiosos.`,
  vendedor: `Você é um assistente focado em ajudar o cliente. Destaque benefícios e vantagens.
    Identifique oportunidades e conduza para a conversão. Seja persuasivo mas não invasivo.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      phone_number, 
      project_id, 
      bitrix_id,
      conversation_history,
      is_test = false 
    } = await req.json();

    console.log('[whatsapp-bot-respond] Request:', { message, project_id, is_test });

    if (!message || !project_id) {
      return new Response(
        JSON.stringify({ error: 'message and project_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar configuração do bot
    const { data: botConfig, error: configError } = await supabase
      .from('whatsapp_bot_config')
      .select('*')
      .eq('commercial_project_id', project_id)
      .single();

    if (configError || !botConfig) {
      console.log('[whatsapp-bot-respond] Bot config not found');
      return new Response(
        JSON.stringify({ 
          should_respond: false, 
          reason: 'bot_not_configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se deve transferir por palavra-chave
    const lowerMessage = message.toLowerCase();
    const shouldTransfer = botConfig.transfer_keywords?.some(
      (keyword: string) => lowerMessage.includes(keyword.toLowerCase())
    );

    if (shouldTransfer && !is_test) {
      console.log('[whatsapp-bot-respond] Transfer keyword detected');
      return new Response(
        JSON.stringify({ 
          should_respond: false, 
          should_transfer: true,
          reason: 'transfer_keyword_detected' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar instruções de treinamento
    const { data: instructions } = await supabase
      .from('ai_training_instructions')
      .select('title, content, category, priority')
      .eq('is_active', true)
      .or(`commercial_project_id.eq.${project_id},commercial_project_id.is.null`)
      .order('priority', { ascending: false });

    // Construir contexto de treinamento
    let trainingContext = '';
    if (instructions && instructions.length > 0) {
      trainingContext = instructions.map((inst: TrainingInstruction) => 
        `[${inst.category || 'Geral'}] ${inst.title}:\n${inst.content}`
      ).join('\n\n');
    }

    // Construir prompt do sistema
    const personalityPrompt = PERSONALITY_PROMPTS[botConfig.personality] || PERSONALITY_PROMPTS.amigavel;
    
    const systemPrompt = `${personalityPrompt}

Seu nome é: ${botConfig.bot_name}

INSTRUÇÕES DE ATENDIMENTO:
${trainingContext || 'Não há instruções específicas. Responda de forma útil e profissional.'}

REGRAS IMPORTANTES:
1. Responda sempre em português do Brasil
2. Seja conciso - mensagens de WhatsApp devem ser curtas
3. Se não souber responder, diga que vai transferir para um atendente
4. Nunca invente informações sobre produtos ou preços
5. Colete informações relevantes quando apropriado (nome, interesse, etc)
6. Use no máximo 2-3 parágrafos curtos por resposta

CONTEXTO: Esta é uma conversa por WhatsApp com um potencial cliente.`;

    // Preparar histórico de conversa
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []),
      { role: 'user', content: message }
    ];

    console.log('[whatsapp-bot-respond] Calling AI...');
    const startTime = Date.now();

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[whatsapp-bot-respond] AI error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', should_respond: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          should_respond: true,
          response: botConfig.fallback_message,
          should_transfer: true,
          reason: 'ai_error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const responseTime = Date.now() - startTime;
    const botResponse = aiData.choices?.[0]?.message?.content || botConfig.fallback_message;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    console.log('[whatsapp-bot-respond] AI response:', { responseTime, tokensUsed });

    // Se não for teste, registrar conversa e mensagem
    if (!is_test && phone_number) {
      // Buscar ou criar conversa
      let { data: conversation } = await supabase
        .from('whatsapp_bot_conversations')
        .select('*')
        .eq('phone_number', phone_number)
        .eq('commercial_project_id', project_id)
        .eq('status', 'active')
        .single();

      if (!conversation) {
        const { data: newConversation } = await supabase
          .from('whatsapp_bot_conversations')
          .insert({
            phone_number,
            commercial_project_id: project_id,
            bitrix_id,
            status: 'active',
            messages_count: 0,
            bot_messages_count: 0,
          })
          .select()
          .single();
        
        conversation = newConversation;
      }

      if (conversation) {
        // Registrar mensagens
        await supabase.from('whatsapp_bot_messages').insert([
          {
            conversation_id: conversation.id,
            role: 'user',
            content: message,
          },
          {
            conversation_id: conversation.id,
            role: 'assistant',
            content: botResponse,
            tokens_used: tokensUsed,
            response_time_ms: responseTime,
          }
        ]);

        // Atualizar contadores
        const newMessagesCount = (conversation.messages_count || 0) + 2;
        const newBotMessagesCount = (conversation.bot_messages_count || 0) + 1;

        await supabase
          .from('whatsapp_bot_conversations')
          .update({
            messages_count: newMessagesCount,
            bot_messages_count: newBotMessagesCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.id);

        // Verificar se deve transferir por limite de mensagens
        if (newMessagesCount >= botConfig.max_messages_before_transfer * 2) {
          await supabase
            .from('whatsapp_bot_conversations')
            .update({
              status: 'transferred',
              transferred_at: new Date().toISOString(),
              transferred_reason: 'message_limit_reached',
            })
            .eq('id', conversation.id);

          return new Response(
            JSON.stringify({
              should_respond: true,
              response: botResponse,
              should_transfer: true,
              reason: 'message_limit_reached',
              conversation_id: conversation.id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        should_respond: true,
        response: botResponse,
        tokens_used: tokensUsed,
        response_time_ms: responseTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[whatsapp-bot-respond] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
