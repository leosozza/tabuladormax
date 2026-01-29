
# Plano: Expandir Modelos Gratuitos da OpenRouter no Fallback

## Resumo
Adicionar múltiplos modelos gratuitos da OpenRouter ao sistema de fallback, maximizando as chances de sucesso quando os provedores principais falharem.

## Modelos Gratuitos Disponíveis na OpenRouter

A OpenRouter oferece **33 modelos gratuitos** atualmente. Os mais relevantes para geração de treinamento (que precisam de bom reasoning e contexto longo) são:

| Modelo | Contexto | Uso (tokens) |
|--------|----------|--------------|
| `deepseek/deepseek-r1-0528:free` | 164K | 16.8B |
| `moonshotai/kimi-k2:free` | 33K | Novo |
| `meta-llama/llama-3.3-70b-instruct:free` | 131K | 5.09B |
| `meta-llama/llama-3.1-405b-instruct:free` | 131K | Alto uso |
| `google/gemma-3-27b-it:free` | 131K | 4.23B |
| `nousresearch/hermes-3-llama-3.1-405b:free` | 131K | 288M |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 128K | 190M |
| `qwen/qwen3-coder:free` | 262K | 3.57B |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 256K | 7.53B |
| `tngtech/deepseek-r1t2-chimera:free` | 164K | 106B |
| `arcee-ai/trinity-large-preview:free` | 131K | 19.4B |

## Estratégia de Implementação

### Modelos Recomendados para Adicionar (por qualidade/popularidade)
1. **`deepseek/deepseek-r1-0528:free`** - DeepSeek R1 gratuito via OpenRouter
2. **`moonshotai/kimi-k2:free`** - Kimi K2 gratuito via OpenRouter  
3. **`meta-llama/llama-3.3-70b-instruct:free`** - Llama 70B
4. **`meta-llama/llama-3.1-405b-instruct:free`** - Llama 405B (maior modelo)
5. **`google/gemma-3-27b-it:free`** - Gemma 3 27B
6. **`mistralai/mistral-small-3.1-24b-instruct:free`** - Mistral Small
7. **`qwen/qwen3-coder:free`** - Qwen3 Coder (bom para estrutura)

## Alterações Técnicas

### Arquivo: `supabase/functions/generate-training-from-conversations/index.ts`

Adicionar múltiplas entradas OpenRouter com modelos diferentes:

```typescript
// Adicionar ao array AI_PROVIDERS antes do OpenRouter atual:

{
  name: 'OpenRouter DeepSeek R1',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  model: 'deepseek/deepseek-r1-0528:free',
  isFree: true,
},
{
  name: 'OpenRouter Kimi K2',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  model: 'moonshotai/kimi-k2:free',
  isFree: true,
},
{
  name: 'OpenRouter Llama 70B',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  model: 'meta-llama/llama-3.3-70b-instruct:free',
  isFree: true,
},
{
  name: 'OpenRouter Llama 405B',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  model: 'meta-llama/llama-3.1-405b-instruct:free',
  isFree: true,
},
{
  name: 'OpenRouter Gemma 27B',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  model: 'google/gemma-3-27b-it:free',
  isFree: true,
},
{
  name: 'OpenRouter Mistral Small',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  model: 'mistralai/mistral-small-3.1-24b-instruct:free',
  isFree: true,
},
{
  name: 'OpenRouter Qwen3 Coder',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  model: 'qwen/qwen3-coder:free',
  isFree: true,
},
```

### Nova Ordem de Fallback (15 provedores)

1. Lovable AI (Gemini 3 Flash)
2. Groq (Llama 3.3 70B)
3. DeepSeek (API direta)
4. Cerebras (Llama 3.3 70B)
5. SambaNova (Llama 3.1 70B)
6. **OpenRouter DeepSeek R1** ← NOVO
7. **OpenRouter Kimi K2** ← NOVO
8. **OpenRouter Llama 70B** ← NOVO
9. **OpenRouter Llama 405B** ← NOVO
10. **OpenRouter Gemma 27B** ← NOVO
11. **OpenRouter Mistral Small** ← NOVO
12. **OpenRouter Qwen3 Coder** ← NOVO
13. Kimi (API direta)
14. Google AI Studio
15. OpenRouter Gemini (modelo atual)

## Benefícios

- **7 novos modelos gratuitos** usando a mesma chave OpenRouter
- Inclui **DeepSeek R1** e **Kimi K2** que você mencionou
- Modelos de 24B a 405B parâmetros para diferentes níveis de qualidade
- Todos usam `OPENROUTER_API_KEY` já configurada
- Maior resiliência contra rate limits (cada modelo tem quota separada)

## Próximos Passos

1. Atualizar o arquivo `index.ts` com os novos provedores
2. Fazer deploy da edge function
3. Testar a geração de treinamento

