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
    const { audio, totalValue } = await req.json();
    
    if (!audio) {
      throw new Error('Nenhum áudio fornecido');
    }

    if (!totalValue || totalValue <= 0) {
      throw new Error('Valor total inválido');
    }

    console.log('[extract-payment] Recebido áudio, totalValue:', totalValue);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Step 1: Transcribe audio using Whisper via Lovable AI Gateway
    console.log('[extract-payment] Transcrevendo áudio...');
    
    // Convert base64 to binary for Whisper
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
    const transcription = transcriptionResult.text;
    
    console.log('[extract-payment] Transcrição:', transcription);

    if (!transcription || transcription.trim().length < 5) {
      throw new Error('Não foi possível entender o áudio. Por favor, fale mais claramente.');
    }

    // Step 2: Extract payment methods using Gemini with tool calling
    console.log('[extract-payment] Extraindo formas de pagamento...');

    const systemPrompt = `Você é um assistente especializado em extrair informações de pagamento de texto em português brasileiro.
Você deve analisar o texto e extrair as formas de pagamento mencionadas.

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

Exemplos de interpretação:
- "5 mil no PIX de entrada" → {method: "pix", amount: 5000, installments: 1}
- "3x de 2 mil no cartão" → {method: "credit_card", amount: 6000, installments: 3}
- "o resto em 6x no boleto" → calcule o restante e divida em 6 parcelas
- "entrada de 30%" → calcule 30% do valor total`;

    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extraia as formas de pagamento do seguinte texto:\n\n"${transcription}"` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'set_payment_methods',
            description: 'Define as formas de pagamento extraídas do texto',
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
        }],
        tool_choice: { type: 'function', function: { name: 'set_payment_methods' } }
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
    console.log('[extract-payment] Resultado da extração:', JSON.stringify(extractionResult, null, 2));

    // Parse the tool call response
    const toolCall = extractionResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'set_payment_methods') {
      throw new Error('Não foi possível extrair as formas de pagamento. Tente novamente.');
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const payments = parsedArgs.payments || [];
    const reasoning = parsedArgs.reasoning || '';

    console.log('[extract-payment] Pagamentos extraídos:', payments);
    console.log('[extract-payment] Raciocínio:', reasoning);

    // Validate payments
    if (!payments || payments.length === 0) {
      throw new Error('Não foram identificadas formas de pagamento no áudio. Tente ser mais específico.');
    }

    // Calculate totals and validate
    const totalExtracted = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    return new Response(JSON.stringify({
      success: true,
      transcription,
      payments: payments.map((p: any) => ({
        method: p.method,
        amount: Math.round(p.amount * 100) / 100, // Round to 2 decimal places
        installments: Math.max(1, Math.round(p.installments || 1))
      })),
      reasoning,
      totalExtracted,
      totalValue,
      difference: Math.round((totalValue - totalExtracted) * 100) / 100
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
