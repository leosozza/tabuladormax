

# Implementar Fallback de Provedores de IA

## Problema Identificado

A Edge Function `generate-training-from-conversations` usa **apenas Lovable AI** e retorna erro 402 quando os créditos acabam, ao invés de tentar outros provedores disponíveis.

**Provedores disponíveis no sistema:**
| Provedor | API Key Configurada | Gratuito |
|----------|---------------------|----------|
| Lovable AI | ✅ LOVABLE_API_KEY | ✅ (com limite) |
| Groq | ✅ GROQ_API_KEY | ✅ |
| OpenRouter | ✅ OPENROUTER_API_KEY | ❌ (pago) |

## Solução

Implementar um sistema de **fallback automático** na Edge Function que tenta provedores alternativos quando o principal falha (402/429):

```text
┌─────────────────────────────────────────────────────────────┐
│ FLUXO COM FALLBACK:                                          │
│                                                              │
│ 1. Tentar Lovable AI (google/gemini-3-flash-preview)        │
│    ├── Sucesso → Retornar resposta                          │
│    └── Erro 402/429 → Tentar próximo                        │
│                                                              │
│ 2. Tentar Groq (llama-3.3-70b-versatile) [GRATUITO]         │
│    ├── Sucesso → Retornar resposta                          │
│    └── Erro → Tentar próximo                                │
│                                                              │
│ 3. Tentar OpenRouter (google/gemini-2.0-flash-exp:free)     │
│    ├── Sucesso → Retornar resposta                          │
│    └── Erro → Retornar erro final                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-training-from-conversations/index.ts` | Adicionar lógica de fallback entre provedores |

---

## Implementação Detalhada

### Estrutura de Provedores

```typescript
interface AIProvider {
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  model: string;
  isFree: boolean;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'Lovable AI',
    baseUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    apiKeyEnv: 'LOVABLE_API_KEY',
    model: 'google/gemini-3-flash-preview',
    isFree: true,
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyEnv: 'GROQ_API_KEY',
    model: 'llama-3.3-70b-versatile',
    isFree: true,
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    model: 'google/gemini-2.0-flash-exp:free',
    isFree: false,
  },
];
```

### Função de Chamada com Retry

```typescript
async function callAIWithFallback(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000
): Promise<{ content: string; provider: string }> {
  const errors: string[] = [];

  for (const provider of AI_PROVIDERS) {
    const apiKey = Deno.env.get(provider.apiKeyEnv);
    if (!apiKey) {
      console.log(`⏭️ ${provider.name}: API key não configurada, pulando...`);
      continue;
    }

    try {
      console.log(`🤖 Tentando ${provider.name} (${provider.model})...`);
      
      const response = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
        }),
      });

      if (response.status === 402 || response.status === 429) {
        const errorText = await response.text();
        console.log(`⚠️ ${provider.name} retornou ${response.status}, tentando próximo...`);
        errors.push(`${provider.name}: ${response.status}`);
        continue; // Tentar próximo provedor
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${provider.name} erro:`, response.status, errorText);
        errors.push(`${provider.name}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      if (content) {
        console.log(`✅ Sucesso com ${provider.name}`);
        return { content, provider: provider.name };
      }
    } catch (err) {
      console.error(`❌ Erro ao chamar ${provider.name}:`, err);
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error(`Todos os provedores falharam: ${errors.join(', ')}`);
}
```

### Uso na Função Principal

```typescript
// Substituir chamada direta por:
const { content: generatedTraining, provider } = await callAIWithFallback(
  systemPrompt,
  userPrompt,
  4000
);

console.log(`Treinamento gerado com ${provider}`);

return new Response(
  JSON.stringify({
    training: generatedTraining.trim(),
    conversations_analyzed: conversations.length,
    operator_name: operatorName,
    ai_provider_used: provider, // Novo campo
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

## Resultado Esperado

1. Se Lovable AI tiver créditos → usa Lovable AI
2. Se Lovable AI retornar 402/429 → tenta Groq (gratuito)
3. Se Groq falhar → tenta OpenRouter
4. Resposta inclui qual provedor foi usado
5. Logs mostram a tentativa de cada provedor

