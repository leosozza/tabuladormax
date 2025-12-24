import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Payment method mapping
const PAYMENT_METHODS = {
  'pix': ['pix', 'pics', 'pixs'],
  'credit_card': ['cartão de crédito', 'cartao de credito', 'crédito', 'credito', 'cartão', 'cartao', 'visa', 'mastercard', 'elo'],
  'debit_card': ['cartão de débito', 'cartao de debito', 'débito', 'debito'],
  'boleto': ['boleto', 'boletos', 'carnê', 'carne'],
  'bank_transfer': ['transferência', 'transferencia', 'ted', 'doc'],
  'cash': ['dinheiro', 'espécie', 'especie', 'à vista em dinheiro'],
  'check': ['cheque', 'cheques'],
  'financing': ['financiamento', 'financiado', 'financia'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, totalValue, conversationHistory, textResponse } = await req.json();
    
    // Check if this is a text response to a previous question
    const isFollowUp = !!textResponse || (conversationHistory && conversationHistory.length > 0 && !audio);

    if (!audio && !textResponse) {
      throw new Error('Nenhum áudio ou resposta fornecida');
    }

    if (!totalValue || totalValue <= 0) {
      throw new Error('Valor total inválido');
    }

    console.log('[extract-payment] Recebido, totalValue:', totalValue, 'isFollowUp:', isFollowUp);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    let transcription = textResponse || '';

    // Step 1: Transcribe audio if provided
    if (audio) {
      console.log('[extract-payment] Transcrevendo áudio...');
      
      const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([binaryAudio], { type: 'audio/mpeg' });
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');

      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('[extract-payment] Erro na transcrição:', errorText);
        throw new Error(`Erro na transcrição: ${transcriptionResponse.status}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      transcription = transcriptionResult.text;
      
      console.log('[extract-payment] Transcrição:', transcription);

      if (!transcription || transcription.trim().length < 3) {
        throw new Error('Não foi possível entender o áudio. Por favor, fale mais claramente.');
      }
    }

    // Step 2: Build conversation messages
    const systemPrompt = `Você é um assistente especializado em extrair informações de pagamento de texto em português brasileiro.
Você está em uma conversa com um produtor rural que está explicando como o cliente vai pagar.

IMPORTANTE:
- O valor total da negociação é R$ ${totalValue.toFixed(2)}
- Quando mencionar "o resto", "restante", "saldo", calcule: valor_total - soma_dos_outros_pagamentos
- Quando mencionar porcentagem (ex: "30% de entrada"), calcule o valor baseado no total
- Parcelas: "3x de 2 mil" significa amount=6000, installments=3
- Entrada geralmente é parcela única (installments=1)
- PIX e Dinheiro geralmente são parcela única

Métodos de pagamento disponíveis:
- pix: PIX
- credit_card: Cartão de Crédito
- debit_card: Cartão de Débito
- boleto: Boleto/Carnê
- bank_transfer: Transferência Bancária
- cash: Dinheiro/Espécie
- check: Cheque
- financing: Financiamento

REGRAS PARA PERGUNTAS:
Se você não tiver informação suficiente para preencher todos os detalhes, faça perguntas usando a função ask_questions.
Situações que requerem perguntas:
1. Soma dos pagamentos < valor total → Pergunte como será pago o restante
2. Boleto/financiamento sem número de parcelas → Pergunte quantas parcelas
3. Boleto sem data de vencimento do primeiro → Pergunte a data (opcional, só se parecer importante)
4. Valor ambíguo → Pergunte para clarificar (ex: "3 mil é o valor total ou de cada parcela?")

Se você tiver todas as informações necessárias E a soma dos pagamentos for igual ou próxima do valor total (tolerância de R$ 10), use set_payment_methods.`;

    // Build messages array with conversation history
    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }
    
    messages.push({ role: 'user', content: transcription });

    console.log('[extract-payment] Mensagens para IA:', messages.length);

    // Step 3: Call AI with both tools available
    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'set_payment_methods',
              description: 'Define as formas de pagamento quando TODAS as informações necessárias estiverem disponíveis e a soma dos valores for igual ou próxima ao valor total',
              parameters: {
                type: 'object',
                properties: {
                  payments: {
                    type: 'array',
                    description: 'Lista de formas de pagamento extraídas',
                    items: {
                      type: 'object',
                      properties: {
                        method: {
                          type: 'string',
                          enum: ['pix', 'credit_card', 'debit_card', 'boleto', 'bank_transfer', 'cash', 'check', 'financing'],
                          description: 'Tipo de forma de pagamento'
                        },
                        amount: {
                          type: 'number',
                          description: 'Valor total desta forma de pagamento em reais (não o valor da parcela)'
                        },
                        installments: {
                          type: 'number',
                          description: 'Número de parcelas (1 para pagamento à vista)'
                        }
                      },
                      required: ['method', 'amount', 'installments']
                    }
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Breve explicação de como você interpretou o texto'
                  }
                },
                required: ['payments', 'reasoning']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'ask_questions',
              description: 'Faz perguntas ao usuário quando faltam informações importantes para completar os pagamentos',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    description: 'Lista de perguntas para o usuário',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'Identificador único da pergunta (ex: remaining_balance, installments_count)'
                        },
                        question: {
                          type: 'string',
                          description: 'A pergunta em português, de forma amigável e direta'
                        }
                      },
                      required: ['id', 'question']
                    }
                  },
                  partialPayments: {
                    type: 'array',
                    description: 'Pagamentos já identificados até agora',
                    items: {
                      type: 'object',
                      properties: {
                        method: {
                          type: 'string',
                          enum: ['pix', 'credit_card', 'debit_card', 'boleto', 'bank_transfer', 'cash', 'check', 'financing']
                        },
                        amount: { type: 'number' },
                        installments: { type: 'number' }
                      },
                      required: ['method']
                    }
                  },
                  context: {
                    type: 'string',
                    description: 'Resumo do que foi entendido até agora para manter contexto'
                  }
                },
                required: ['questions', 'context']
              }
            }
          }
        ],
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('[extract-payment] Erro na extração:', errorText);
      
      if (extractionResponse.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns segundos.');
      }
      if (extractionResponse.status === 402) {
        throw new Error('Créditos insuficientes. Entre em contato com o suporte.');
      }
      
      throw new Error(`Erro na extração: ${extractionResponse.status}`);
    }

    const extractionResult = await extractionResponse.json();
    console.log('[extract-payment] Resultado:', JSON.stringify(extractionResult, null, 2));

    // Parse the response
    const message = extractionResult.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (!toolCall) {
      // AI responded with text instead of tool call - treat as needs_info
      const aiMessage = message?.content || 'Não entendi. Pode repetir as formas de pagamento?';
      return new Response(JSON.stringify({
        success: true,
        status: 'needs_info',
        transcription,
        questions: [{ id: 'clarification', question: aiMessage }],
        partialPayments: [],
        context: transcription,
        conversationHistory: [
          ...messages.slice(1), // Exclude system prompt
          { role: 'assistant', content: aiMessage }
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === 'ask_questions') {
      // AI needs more information
      const questions = parsedArgs.questions || [];
      const partialPayments = parsedArgs.partialPayments || [];
      const context = parsedArgs.context || '';

      console.log('[extract-payment] Precisa de mais info:', questions);

      // Build updated conversation history
      const updatedHistory = [
        ...messages.slice(1), // Exclude system prompt
        { 
          role: 'assistant', 
          content: `Preciso de mais informações: ${questions.map((q: any) => q.question).join(' ')}`,
          tool_calls: [toolCall]
        }
      ];

      return new Response(JSON.stringify({
        success: true,
        status: 'needs_info',
        transcription,
        questions,
        partialPayments: partialPayments.map((p: any) => ({
          method: p.method,
          amount: p.amount || 0,
          installments: p.installments || 1
        })),
        context,
        conversationHistory: updatedHistory
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (toolCall.function.name === 'set_payment_methods') {
      // AI has all information needed
      const payments = parsedArgs.payments || [];
      const reasoning = parsedArgs.reasoning || '';

      console.log('[extract-payment] Pagamentos completos:', payments);

      if (!payments || payments.length === 0) {
        throw new Error('Não foram identificadas formas de pagamento. Tente ser mais específico.');
      }

      const totalExtracted = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      return new Response(JSON.stringify({
        success: true,
        status: 'complete',
        transcription,
        payments: payments.map((p: any) => ({
          method: p.method,
          amount: Math.round(p.amount * 100) / 100,
          installments: Math.max(1, Math.round(p.installments || 1))
        })),
        reasoning,
        totalExtracted,
        totalValue,
        difference: Math.round((totalValue - totalExtracted) * 100) / 100
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Resposta inesperada da IA. Tente novamente.');

  } catch (error) {
    console.error('[extract-payment] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao processar áudio'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
