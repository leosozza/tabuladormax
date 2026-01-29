

# Adicionar Kimi (Moonshot) ao Fallback de Provedores de IA

## Informações do Kimi API

| Campo | Valor |
|-------|-------|
| Provedor | Moonshot AI (Kimi) |
| Base URL | `https://api.moonshot.ai/v1/chat/completions` |
| Modelos Disponíveis | `kimi-k2-turbo-preview`, `moonshot-v1-8k` |
| Compatível com OpenAI | Sim |
| Gratuito | Não (tem créditos gratuitos iniciais) |

## Status Atual das Secrets

A secret `KIMI_API_KEY` ou `MOONSHOT_API_KEY` **NÃO está configurada** ainda. Será necessário adicioná-la.

## Alterações Necessárias

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-training-from-conversations/index.ts` | Adicionar Kimi ao array `AI_PROVIDERS` |

### Novo Provedor no Array

```typescript
{
  name: 'Kimi',
  baseUrl: 'https://api.moonshot.ai/v1/chat/completions',
  apiKeyEnv: 'KIMI_API_KEY',
  model: 'moonshot-v1-8k',
  isFree: false, // Pago, mas tem créditos iniciais
},
```

### Nova Ordem de Fallback

```text
1. Lovable AI (gratuito com limite)
2. Groq (gratuito)
3. DeepSeek (gratuito)
4. Kimi/Moonshot (pago)     ← NOVO
5. OpenRouter (pago)
```

## Passos da Implementação

1. Adicionar Kimi ao array `AI_PROVIDERS` após DeepSeek
2. Solicitar adição da secret `KIMI_API_KEY`
3. Fazer deploy da Edge Function
4. Testar a geração de treinamento

## Observação Importante

Você precisará obter uma API Key do Kimi em:
- **Plataforma**: https://platform.moonshot.ai
- **Registro**: Criar conta e gerar API Key na seção "API Keys"

