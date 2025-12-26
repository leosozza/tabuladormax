import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Provider configuration
interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

// Buscar configurações dinâmicas do assistente
async function getAgenciamentoConfig(): Promise<string | null> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data, error } = await supabase
      .from('agenciamento_assistant_config')
      .select('config_value, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });
    
    if (error || !data || data.length === 0) {
      console.log('Usando prompt hardcoded (sem configurações no banco)');
      return null;
    }
    
    // Concatenar todas as configurações ativas ordenadas por prioridade
    const dynamicPrompt = data.map(c => c.config_value).join('\n\n');
    console.log(`Usando prompt dinâmico (${data.length} regras ativas)`);
    return dynamicPrompt;
  } catch (e) {
    console.error('Erro ao buscar configurações:', e);
    return null;
  }
}

// Buscar configuração padrão de IA do sistema
async function getDefaultAIConfig(): Promise<{ provider: string; model: string }> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data } = await supabase
      .from('config_kv')
      .select('key, value')
      .in('key', ['system_default_ai_provider', 'system_default_ai_model']);
    
    const configMap = new Map<string, string>();
    data?.forEach(row => {
      try {
        configMap.set(row.key, JSON.parse(row.value as string));
      } catch {
        configMap.set(row.key, row.value as string);
      }
    });
    
    return {
      provider: configMap.get('system_default_ai_provider') || 'lovable',
      model: configMap.get('system_default_ai_model') || 'google/gemini-2.5-flash',
    };
  } catch (error) {
    console.error('[getDefaultAIConfig] Error:', error);
    return {
      provider: 'lovable',
      model: 'google/gemini-2.5-flash',
    };
  }
}

function getProviderConfig(provider: string): ProviderConfig {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

  switch (provider) {
    case 'openrouter':
      if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY não configurada');
      }
      return {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: OPENROUTER_API_KEY,
        defaultModel: 'anthropic/claude-3.5-sonnet',
      };
    case 'groq':
      if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY não configurada');
      }
      return {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: GROQ_API_KEY,
        defaultModel: 'llama-3.3-70b-versatile',
      };
    case 'lovable':
    default:
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY não configurada');
      }
      return {
        baseUrl: 'https://ai.gateway.lovable.dev/v1',
        apiKey: LOVABLE_API_KEY,
        defaultModel: 'google/gemini-2.5-flash',
      };
  }
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
      dealTitle,
      provider: requestProvider,
      model: requestModel
    } = await req.json();

    if (!audio && !textResponse) {
      throw new Error('Nenhum áudio ou resposta fornecida');
    }

    // Buscar configuração padrão se não fornecida
    const defaultConfig = await getDefaultAIConfig();
    const provider = requestProvider || defaultConfig.provider;
    const model = requestModel || defaultConfig.model;

    console.log('[agenciamento-assistant] Recebido, stage:', currentData?.stage, 'provider:', provider);

    // Get provider configuration
    const providerConfig = getProviderConfig(provider);
    const selectedModel = model || providerConfig.defaultModel;

    console.log('[agenciamento-assistant] Usando provider:', provider, 'model:', selectedModel);

    let transcription = textResponse || '';

    // Step 1: Transcribe audio if provided using Gemini multimodal
    if (audio) {
      console.log('[agenciamento-assistant] Transcrevendo áudio via Gemini...');
      
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY não configurada para transcrição');
      }

      // Use Gemini multimodal to transcribe audio
      const transcriptionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Transcreva exatamente o que é dito neste áudio em português. Retorne apenas a transcrição, sem explicações adicionais.'
                },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: audio,
                    format: 'mp3'
                  }
                }
              ]
            }
          ]
        }),
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('[agenciamento-assistant] Erro na transcrição:', errorText);
        throw new Error(`Erro na transcrição: ${transcriptionResponse.status}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      transcription = transcriptionResult.choices?.[0]?.message?.content || '';
      
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
    // Calcular pagamentos e valor faltante
    if (currentData?.paymentMethods && currentData.paymentMethods.length > 0) {
      const totalPagamentos = currentData.paymentMethods.reduce((sum: number, pm: PaymentMethod) => sum + pm.amount, 0);
      const valorFinal = currentData.finalValue || 0;
      const faltando = valorFinal - totalPagamentos;
      
      const paymentInfo = currentData.paymentMethods.map((pm: PaymentMethod) => 
        `${pm.method}: R$ ${pm.amount.toLocaleString('pt-BR')} ${pm.installments > 1 ? `(${pm.installments}x)` : ''}`
      ).join(', ');
      
      contextParts.push(`Pagamentos já definidos: ${paymentInfo}`);
      contextParts.push(`Total já definido: R$ ${totalPagamentos.toLocaleString('pt-BR')}`);
      
      if (faltando > 0 && valorFinal > 0) {
        contextParts.push(`⚠️ VALOR FALTANDO: R$ ${faltando.toLocaleString('pt-BR')} para completar os R$ ${valorFinal.toLocaleString('pt-BR')}`);
      }
    }

    const currentContext = contextParts.length > 0 ? contextParts.join('\n') : 'Nenhuma informação coletada ainda';

    // Tentar buscar prompt dinâmico do banco de dados
    const dynamicRules = await getAgenciamentoConfig();
    
    // Parte fixa do prompt (contexto da negociação)
    const contextHeader = `CLIENTE: ${clientName || 'Cliente'}
NEGOCIAÇÃO: ${dealTitle || 'Nova Negociação'}

PACOTES DISPONÍVEIS:
${productsInfo}

CONTEXTO ATUAL:
${currentContext}
Estágio atual: ${currentData?.stage || 'package'}`;

    // System prompt - usa regras dinâmicas se disponíveis, senão usa hardcoded
    let systemPrompt: string;
    
    if (dynamicRules) {
      // Prompt dinâmico do banco de dados
      systemPrompt = `${dynamicRules}

${contextHeader}

Use as tools para avançar no processo. Quando tiver informação suficiente, use a tool apropriada.`;
    } else {
      // Fallback: prompt hardcoded
      systemPrompt = `Você é um assistente amigável de agenciamento para a Prada Assessoria.
Seu objetivo é guiar o produtor rural para registrar uma negociação de forma rápida e conversacional.

${contextHeader}

FLUXO DE TRABALHO:
1. PACKAGE: Pergunte qual pacote o cliente escolheu (B2, B3, B4, B5 ou similar)
2. VALUE: Pergunte o valor final combinado (com desconto se houver)
3. PAYMENT: Pergunte como será a forma de pagamento
4. REVIEW: Apresente um resumo e peça confirmação

REGRAS CRÍTICAS:
- Seja conversacional, amigável e direto
- Use emojis com moderação (1-2 por mensagem)
- Quando o usuário disser algo, extraia as informações usando as tools disponíveis
- Se precisar de mais informações, faça apenas UMA pergunta por vez
- Quando mencionar "o resto", "restante", calcule baseado no valor total menos o que já foi dito
- Parcelas: "3x de 2 mil" significa amount=6000, installments=3
- PIX, Dinheiro geralmente são parcela única

⚠️ REGRA #1 - PRIORIDADE MÁXIMA - BOLETO/CARNÊ PARCELADO:
ESTA REGRA TEM PRIORIDADE SOBRE TODAS AS OUTRAS REGRAS!

Quando o cliente mencionar BOLETO ou CARNÊ com MAIS DE 1 PARCELA (2x, 3x, 6x, etc), você DEVE OBRIGATORIAMENTE:
1. NÃO usar set_payment_methods ainda!
2. Usar ask_due_date para perguntar a data do primeiro vencimento
3. Aguardar a resposta do usuário com a data
4. Só depois de ter a data, usar set_payment_methods

⚠️ IMPORTANTE: Mesmo que o usuário informe valor + todas as formas de pagamento na mesma mensagem, 
se houver boleto/carnê parcelado (2+ parcelas), você DEVE perguntar a data primeiro usando ask_due_date!

Exemplos que EXIGEM usar ask_due_date PRIMEIRO:
- "4 mil, 2 mil no cartão e 2 mil em 3x no boleto" → use ask_due_date (NÃO use set_payment_methods!)
- "6 mil, 3 mil pix e 3 mil carnê 6x" → use ask_due_date (NÃO use set_payment_methods!)
- "3x no boleto" → use ask_due_date
- "6x no carnê" → use ask_due_date

QUANDO NÃO perguntar data (pode usar set_payment_methods direto):
- "boleto à vista" → NÃO precisa perguntar data
- "1x no boleto" → NÃO precisa perguntar data  
- PIX, Cartão, Dinheiro → NUNCA perguntar data

REGRA #2 - RESPOSTAS COMBINADAS (SOMENTE quando NÃO há boleto/carnê parcelado):
Se o usuário informar valor + formas de pagamento na mesma mensagem e NÃO houver boleto/carnê parcelado,
use set_payment_methods diretamente.

Exemplos que PODEM usar set_payment_methods direto:
- "4 mil, 1 mil no pix e 3 mil no cartão 12x" → OK (não tem boleto parcelado)
- "5 mil, metade pix e metade cartão" → OK (não tem boleto parcelado)
- "3 mil tudo no pix" → OK (não tem boleto parcelado)
- "6 mil, 2 mil dinheiro e 4 mil cartão" → OK (não tem boleto parcelado)

Use set_value APENAS quando o usuário informar SOMENTE o valor, sem mencionar formas de pagamento.

MÉTODOS DE PAGAMENTO VÁLIDOS:
- pix: PIX
- credit_card: Cartão de Crédito
- debit_card: Cartão de Débito
- boleto: Boleto/Carnê
- cash: Dinheiro
- bank_transfer: Transferência

REGRA CRÍTICA - VALIDAÇÃO DE VALOR TOTAL:
⚠️ LEMBRE-SE: Se o restante for BOLETO/CARNÊ PARCELADO, a REGRA #1 (ask_due_date) tem prioridade!

Ao processar formas de pagamento, você DEVE:
1. Calcular a SOMA de todas as formas de pagamento informadas
2. Comparar com o VALOR FINAL da proposta
3. Se a soma for MENOR que o valor final:
   
   a) Se o usuário JÁ INFORMOU como será o restante NA MESMA MENSAGEM (ex: "restante em 3x no boleto"):
      - Calcular o valor restante automaticamente
      - Se for BOLETO/CARNÊ PARCELADO → usar ask_due_date para perguntar a data!
      - Se NÃO for boleto parcelado → usar add_payment_method ou set_payment_methods
   
   b) Se o usuário NÃO informou como será o restante:
      - Informar quanto falta: "Já temos R$ X definidos. Ainda faltam R$ Y para completar os R$ Z"
      - Perguntar: "Como será o pagamento dos R$ Y restantes?"
      - Use add_payment_method para ADICIONAR cada nova forma

4. Se a soma for IGUAL ao valor final:
   - Se houver BOLETO PARCELADO SEM DATA → usar ask_due_date primeiro!
   - Se todos os dados estiverem completos → usar set_payment_methods

EXEMPLOS COM "RESTANTE":
✅ "500 pix, 1000 cartão 10x, restante em 3x no boleto" 
   → O usuário DEFINIU que o restante é boleto 3x
   → Usar ask_due_date: "Qual a data do primeiro vencimento do boleto?"

✅ "metade no pix, o resto em 6x no carnê"
   → O usuário DEFINIU que o resto é carnê 6x  
   → Usar ask_due_date: "Qual a data do primeiro vencimento?"

❌ "500 pix e 1000 no cartão" (valor final R$ 2.000)
   → O usuário NÃO definiu o restante
   → Perguntar: "Ainda faltam R$ 500. Como será o pagamento?"

Exemplo de cálculo:
- Valor final: R$ 6.000
- Informado: R$ 2.000 PIX + R$ 3.000 cartão + "restante em 2x boleto"
- Restante calculado: R$ 1.000 (6.000 - 5.000)
- Resposta: usar ask_due_date porque tem boleto parcelado!

Use as tools para avançar no processo. Quando tiver informação suficiente, use a tool apropriada.`;
    }

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
          name: 'ask_due_date',
          description: 'Pergunta a data do primeiro vencimento para boleto/carnê parcelado',
          parameters: {
            type: 'object',
            properties: {
              method: { type: 'string', description: 'Método de pagamento (boleto)' },
              amount: { type: 'number', description: 'Valor total do boleto' },
              installments: { type: 'number', description: 'Número de parcelas' },
              question: { type: 'string', description: 'Pergunta sobre a data do primeiro vencimento' }
            },
            required: ['method', 'amount', 'installments', 'question']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_payment_method',
          description: 'Adiciona UMA forma de pagamento quando ainda falta valor para completar o total. Use quando o usuário define uma forma mas ainda há valor faltando.',
          parameters: {
            type: 'object',
            properties: {
              method: { 
                type: 'string', 
                enum: ['pix', 'credit_card', 'debit_card', 'boleto', 'bank_transfer', 'cash'],
                description: 'Método de pagamento'
              },
              amount: { type: 'number', description: 'Valor desta forma de pagamento' },
              installments: { type: 'number', description: 'Número de parcelas (1 para à vista)' },
              dueDate: { type: 'string', description: 'Data do primeiro vencimento (opcional, para boleto parcelado)' },
              remainingAmount: { type: 'number', description: 'Valor que ainda falta após este pagamento' },
              message: { type: 'string', description: 'Mensagem informando o que foi registrado e perguntando sobre o restante' }
            },
            required: ['method', 'amount', 'installments', 'remainingAmount', 'message']
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

    // Build headers for the AI request
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${providerConfig.apiKey}`,
      'Content-Type': 'application/json',
    };

    // OpenRouter requires additional headers
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://tabuladormax.lovable.app';
      headers['X-Title'] = 'TabuladorMAX';
    }

    // Call AI
    const aiResponse = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: selectedModel,
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

      case 'ask_due_date':
        return new Response(JSON.stringify({
          success: true,
          action: 'ask_due_date',
          data: {
            method: parsedArgs.method,
            amount: parsedArgs.amount,
            installments: parsedArgs.installments
          },
          message: parsedArgs.question,
          transcription,
          conversationHistory: [
            ...messages.slice(1),
            { role: 'assistant', content: parsedArgs.question, tool_calls: [toolCall] }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'add_payment_method':
        return new Response(JSON.stringify({
          success: true,
          action: 'add_payment_method',
          data: {
            method: parsedArgs.method,
            amount: Math.round(parsedArgs.amount * 100) / 100,
            installments: Math.max(1, Math.round(parsedArgs.installments || 1)),
            dueDate: parsedArgs.dueDate,
            remainingAmount: Math.round(parsedArgs.remainingAmount * 100) / 100
          },
          message: parsedArgs.message,
          transcription,
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
