import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface PaymentMethod {
  method: string;
  amount: number;
  installments: number;
  dueDate?: string;
}

interface AgenciamentoData {
  stage: 'package' | 'value' | 'payment' | 'review';
  selectedPackage?: Product;
  baseValue?: number;
  finalValue?: number;
  discountPercent?: number;
  paymentMethods?: PaymentMethod[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      audio, 
      textResponse, 
      conversationHistory = [], 
      currentData,
      products,
      clientName,
      dealTitle
    } = await req.json();

    if (!audio && !textResponse) {
      throw new Error('Nenhum áudio ou resposta fornecida');
    }

    console.log('[agenciamento-assistant] Recebido, stage:', currentData?.stage);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    let transcription = textResponse || '';

    // Step 1: Transcribe audio if provided
    if (audio) {
      console.log('[agenciamento-assistant] Transcrevendo áudio...');
      
      const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([binaryAudio], { type: 'audio/mpeg' });
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');

      const transcriptionResponse = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('[agenciamento-assistant] Erro na transcrição:', errorText);
        throw new Error(`Erro na transcrição: ${transcriptionResponse.status}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      transcription = transcriptionResult.text;
      
      console.log('[agenciamento-assistant] Transcrição:', transcription);

      if (!transcription || transcription.trim().length < 2) {
        throw new Error('Não foi possível entender o áudio. Por favor, fale mais claramente.');
      }
    }

    // Build products info string
    const productsInfo = products?.map((p: Product) => `- ${p.name}: R$ ${p.price.toLocaleString('pt-BR')}`).join('\n') || 'Nenhum pacote disponível';

    // Build current context
    const contextParts: string[] = [];
    if (currentData?.selectedPackage) {
      contextParts.push(`Pacote selecionado: ${currentData.selectedPackage.name} (R$ ${currentData.selectedPackage.price})`);
    }
    if (currentData?.finalValue) {
      contextParts.push(`Valor final: R$ ${currentData.finalValue.toLocaleString('pt-BR')}`);
      if (currentData.discountPercent) {
        contextParts.push(`Desconto: ${currentData.discountPercent.toFixed(1)}%`);
      }
    }
    if (currentData?.paymentMethods && currentData.paymentMethods.length > 0) {
      const paymentInfo = currentData.paymentMethods.map((pm: PaymentMethod) => 
        `${pm.method}: R$ ${pm.amount} ${pm.installments > 1 ? `(${pm.installments}x)` : ''}`
      ).join(', ');
      contextParts.push(`Pagamentos: ${paymentInfo}`);
    }

    const currentContext = contextParts.length > 0 ? contextParts.join('\n') : 'Nenhuma informação coletada ainda';

    // System prompt
    const systemPrompt = `Você é um assistente amigável de agenciamento para a Prada Assessoria.
Seu objetivo é guiar o produtor rural para registrar uma negociação de forma rápida e conversacional.

CLIENTE: ${clientName || 'Cliente'}
NEGOCIAÇÃO: ${dealTitle || 'Nova Negociação'}

PACOTES DISPONÍVEIS:
${productsInfo}

CONTEXTO ATUAL:
${currentContext}
Estágio atual: ${currentData?.stage || 'package'}

FLUXO DE TRABALHO:
1. PACKAGE: Pergunte qual pacote o cliente escolheu (B2, B3, B4, B5 ou similar)
2. VALUE: Pergunte o valor final combinado (com desconto se houver)
3. PAYMENT: Pergunte como será a forma de pagamento
4. REVIEW: Apresente um resumo e peça confirmação

REGRAS:
- Seja conversacional, amigável e direto
- Use emojis com moderação (1-2 por mensagem)
- Quando o usuário disser algo, extraia as informações usando as tools disponíveis
- Se precisar de mais informações, faça apenas UMA pergunta por vez
- Quando mencionar "o resto", "restante", calcule baseado no valor total menos o que já foi dito
- Parcelas: "3x de 2 mil" significa amount=6000, installments=3
- PIX, Dinheiro geralmente são parcela única

MÉTODOS DE PAGAMENTO VÁLIDOS:
- pix: PIX
- credit_card: Cartão de Crédito
- debit_card: Cartão de Débito
- boleto: Boleto/Carnê
- cash: Dinheiro
- bank_transfer: Transferência

Use as tools para avançar no processo. Quando tiver informação suficiente, use a tool apropriada.`;

    // Build messages array
    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }
    
    messages.push({ role: 'user', content: transcription });

    console.log('[agenciamento-assistant] Mensagens para IA:', messages.length);

    // Define tools based on current stage
    const tools = [
      {
        type: 'function',
        function: {
          name: 'select_package',
          description: 'Seleciona o pacote/serviço escolhido pelo cliente',
          parameters: {
            type: 'object',
            properties: {
              packageId: { type: 'string', description: 'ID do pacote selecionado' },
              packageName: { type: 'string', description: 'Nome do pacote' },
              packagePrice: { type: 'number', description: 'Preço do pacote' },
              message: { type: 'string', description: 'Mensagem para o usuário confirmando e perguntando o próximo passo' }
            },
            required: ['packageId', 'packageName', 'packagePrice', 'message']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'set_value',
          description: 'Define o valor final da negociação (com ou sem desconto)',
          parameters: {
            type: 'object',
            properties: {
              finalValue: { type: 'number', description: 'Valor final acordado' },
              discountPercent: { type: 'number', description: 'Percentual de desconto aplicado' },
              message: { type: 'string', description: 'Mensagem confirmando o valor e perguntando a forma de pagamento' }
            },
            required: ['finalValue', 'message']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'set_payment_methods',
          description: 'Define as formas de pagamento quando TODAS as informações estiverem disponíveis',
          parameters: {
            type: 'object',
            properties: {
              payments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    method: { 
                      type: 'string', 
                      enum: ['pix', 'credit_card', 'debit_card', 'boleto', 'bank_transfer', 'cash'] 
                    },
                    amount: { type: 'number', description: 'Valor total desta forma de pagamento' },
                    installments: { type: 'number', description: 'Número de parcelas (1 para à vista)' },
                    dueDate: { type: 'string', description: 'Data do primeiro vencimento (opcional)' }
                  },
                  required: ['method', 'amount', 'installments']
                }
              },
              message: { type: 'string', description: 'Mensagem apresentando o resumo final' }
            },
            required: ['payments', 'message']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'ask_question',
          description: 'Faz uma pergunta ao usuário quando precisa de mais informações',
          parameters: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'A pergunta para o usuário' },
              context: { type: 'string', description: 'O que foi entendido até agora' }
            },
            required: ['question']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'complete_negotiation',
          description: 'Finaliza a negociação quando o usuário confirma que está tudo certo',
          parameters: {
            type: 'object',
            properties: {
              confirmed: { type: 'boolean', description: 'Se o usuário confirmou' },
              message: { type: 'string', description: 'Mensagem de confirmação final' }
            },
            required: ['confirmed', 'message']
          }
        }
      }
    ];

    // Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[agenciamento-assistant] Erro na IA:', errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns segundos.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos insuficientes. Entre em contato com o suporte.');
      }
      
      throw new Error(`Erro na IA: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    console.log('[agenciamento-assistant] Resultado:', JSON.stringify(aiResult, null, 2));

    const message = aiResult.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    // If AI responded with text (no tool call)
    if (!toolCall) {
      const aiMessage = message?.content || 'Pode repetir? Não entendi.';
      return new Response(JSON.stringify({
        success: true,
        action: 'message',
        message: aiMessage,
        transcription,
        conversationHistory: [
          ...messages.slice(1),
          { role: 'assistant', content: aiMessage }
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const functionName = toolCall.function.name;

    // Handle different tool calls
    switch (functionName) {
      case 'select_package':
        return new Response(JSON.stringify({
          success: true,
          action: 'select_package',
          data: {
            packageId: parsedArgs.packageId,
            packageName: parsedArgs.packageName,
            packagePrice: parsedArgs.packagePrice
          },
          message: parsedArgs.message,
          transcription,
          nextStage: 'value',
          conversationHistory: [
            ...messages.slice(1),
            { role: 'assistant', content: parsedArgs.message, tool_calls: [toolCall] }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'set_value':
        return new Response(JSON.stringify({
          success: true,
          action: 'set_value',
          data: {
            finalValue: parsedArgs.finalValue,
            discountPercent: parsedArgs.discountPercent || 0
          },
          message: parsedArgs.message,
          transcription,
          nextStage: 'payment',
          conversationHistory: [
            ...messages.slice(1),
            { role: 'assistant', content: parsedArgs.message, tool_calls: [toolCall] }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'set_payment_methods':
        return new Response(JSON.stringify({
          success: true,
          action: 'set_payment_methods',
          data: {
            payments: parsedArgs.payments.map((p: any) => ({
              method: p.method,
              amount: Math.round(p.amount * 100) / 100,
              installments: Math.max(1, Math.round(p.installments || 1)),
              dueDate: p.dueDate
            }))
          },
          message: parsedArgs.message,
          transcription,
          nextStage: 'review',
          conversationHistory: [
            ...messages.slice(1),
            { role: 'assistant', content: parsedArgs.message, tool_calls: [toolCall] }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'ask_question':
        return new Response(JSON.stringify({
          success: true,
          action: 'ask_question',
          message: parsedArgs.question,
          context: parsedArgs.context,
          transcription,
          conversationHistory: [
            ...messages.slice(1),
            { role: 'assistant', content: parsedArgs.question, tool_calls: [toolCall] }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'complete_negotiation':
        return new Response(JSON.stringify({
          success: true,
          action: 'complete_negotiation',
          confirmed: parsedArgs.confirmed,
          message: parsedArgs.message,
          transcription,
          conversationHistory: [
            ...messages.slice(1),
            { role: 'assistant', content: parsedArgs.message, tool_calls: [toolCall] }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Ação desconhecida');
    }

  } catch (error) {
    console.error('[agenciamento-assistant] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
