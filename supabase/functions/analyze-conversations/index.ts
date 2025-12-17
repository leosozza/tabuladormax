import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationMessage {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

interface Conversation {
  id: string;
  phone_number: string;
  messages: ConversationMessage[];
}

interface SuggestedInstruction {
  title: string;
  content: string;
  category: string;
  confidence: number;
  sampleQuestions: string[];
  frequency: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, dateRangeStart, dateRangeEnd, jobId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update job status to processing
    if (jobId) {
      await supabase
        .from('conversation_analysis_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    // Fetch conversations with messages
    let conversationsQuery = supabase
      .from('whatsapp_bot_conversations')
      .select('id, phone_number, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (projectId) {
      conversationsQuery = conversationsQuery.eq('commercial_project_id', projectId);
    }

    if (dateRangeStart) {
      conversationsQuery = conversationsQuery.gte('created_at', dateRangeStart);
    }

    if (dateRangeEnd) {
      conversationsQuery = conversationsQuery.lte('created_at', dateRangeEnd);
    }

    const { data: conversations, error: convError } = await conversationsQuery;

    if (convError) {
      throw new Error(`Failed to fetch conversations: ${convError.message}`);
    }

    if (!conversations || conversations.length === 0) {
      if (jobId) {
        await supabase
          .from('conversation_analysis_jobs')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            conversations_analyzed: 0,
            suggestions_generated: 0,
            analysis_results: { message: 'No conversations found to analyze' }
          })
          .eq('id', jobId);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No conversations to analyze',
        suggestions: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch messages for each conversation
    const conversationsWithMessages: Conversation[] = [];
    
    for (const conv of conversations) {
      const { data: messages } = await supabase
        .from('whatsapp_bot_messages')
        .select('id, content, sender_type, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (messages && messages.length > 0) {
        conversationsWithMessages.push({
          id: conv.id,
          phone_number: conv.phone_number,
          messages: messages
        });
      }
    }

    if (conversationsWithMessages.length === 0) {
      if (jobId) {
        await supabase
          .from('conversation_analysis_jobs')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            conversations_analyzed: conversations.length,
            suggestions_generated: 0,
            analysis_results: { message: 'No messages found in conversations' }
          })
          .eq('id', jobId);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No messages to analyze',
        suggestions: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare conversation data for AI analysis
    const conversationSummaries = conversationsWithMessages.map(conv => {
      const userMessages = conv.messages
        .filter(m => m.sender_type === 'user')
        .map(m => m.content)
        .join('\n');
      return userMessages;
    }).filter(s => s.length > 0).join('\n---\n');

    // Fetch existing training instructions to avoid duplicates
    let existingQuery = supabase
      .from('ai_training_instructions')
      .select('title, content, category');
    
    if (projectId) {
      existingQuery = existingQuery.eq('commercial_project_id', projectId);
    }

    const { data: existingInstructions } = await existingQuery;

    const existingContext = existingInstructions && existingInstructions.length > 0
      ? `\n\nINSTRUÇÕES DE TREINAMENTO EXISTENTES (evite sugerir duplicatas):\n${existingInstructions.map(i => `- ${i.title}: ${i.content?.substring(0, 100)}...`).join('\n')}`
      : '';

    // Use AI to analyze patterns
    const systemPrompt = `Você é um especialista em análise de conversas de atendimento. Sua tarefa é analisar mensagens de usuários e identificar:
1. Perguntas frequentes que não estão sendo bem respondidas
2. Tópicos que precisam de mais informação
3. Padrões de dúvidas recorrentes
4. Gaps no conhecimento do bot

Retorne suas sugestões no formato JSON usando a função suggest_training_instructions.
${existingContext}`;

    const userPrompt = `Analise as seguintes mensagens de usuários e sugira novas instruções de treinamento:

${conversationSummaries}

Identifique padrões e sugira 3-7 instruções de treinamento que ajudariam o bot a responder melhor essas perguntas.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_training_instructions',
            description: 'Sugere novas instruções de treinamento baseado na análise das conversas',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { 
                        type: 'string', 
                        description: 'Título curto e descritivo da instrução' 
                      },
                      content: { 
                        type: 'string', 
                        description: 'Conteúdo detalhado da instrução de treinamento' 
                      },
                      category: { 
                        type: 'string', 
                        enum: ['faq', 'product_knowledge', 'procedures', 'policies', 'troubleshooting', 'general'],
                        description: 'Categoria da instrução' 
                      },
                      confidence: { 
                        type: 'number', 
                        description: 'Score de confiança de 0 a 1' 
                      },
                      sampleQuestions: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Exemplos de perguntas que esta instrução ajudaria a responder' 
                      },
                      frequency: { 
                        type: 'integer', 
                        description: 'Frequência estimada desta pergunta nas conversas analisadas' 
                      }
                    },
                    required: ['title', 'content', 'category', 'confidence', 'sampleQuestions', 'frequency']
                  }
                },
                analysis_summary: {
                  type: 'string',
                  description: 'Resumo geral da análise das conversas'
                }
              },
              required: ['suggestions', 'analysis_summary']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_training_instructions' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    let suggestions: SuggestedInstruction[] = [];
    let analysisSummary = '';

    // Extract suggestions from tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        suggestions = args.suggestions || [];
        analysisSummary = args.analysis_summary || '';
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Save suggestions to database
    const savedSuggestions = [];
    for (const suggestion of suggestions) {
      const { data: saved, error: saveError } = await supabase
        .from('ai_training_suggestions')
        .insert({
          commercial_project_id: projectId || null,
          suggested_title: suggestion.title,
          suggested_content: suggestion.content,
          suggested_category: suggestion.category,
          confidence_score: suggestion.confidence,
          sample_questions: suggestion.sampleQuestions,
          frequency_count: suggestion.frequency,
          source_type: 'conversation_analysis',
          source_data: {
            conversations_analyzed: conversationsWithMessages.length,
            date_range: { start: dateRangeStart, end: dateRangeEnd }
          }
        })
        .select()
        .single();

      if (!saveError && saved) {
        savedSuggestions.push(saved);
      }
    }

    // Update job status
    if (jobId) {
      await supabase
        .from('conversation_analysis_jobs')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          conversations_analyzed: conversationsWithMessages.length,
          suggestions_generated: savedSuggestions.length,
          analysis_results: { 
            summary: analysisSummary,
            total_messages: conversationsWithMessages.reduce((acc, c) => acc + c.messages.length, 0)
          }
        })
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({ 
      success: true,
      conversationsAnalyzed: conversationsWithMessages.length,
      suggestionsGenerated: savedSuggestions.length,
      suggestions: savedSuggestions,
      summary: analysisSummary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-conversations:', error);
    
    // Try to update job status on error
    try {
      const { jobId } = await req.clone().json();
      if (jobId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase
          .from('conversation_analysis_jobs')
          .update({ 
            status: 'failed', 
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', jobId);
      }
    } catch (e) {
      console.error('Failed to update job status:', e);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
