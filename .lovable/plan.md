

# Migrar WhatsApp AI Assist para usar Groq

## Problema

A edge function `whatsapp-ai-assist` está causando erro 500 porque:
1. Usa **exclusivamente** o Lovable AI Gateway
2. O workspace está com créditos insuficientes (erro 402)
3. Mesmo tendo `GROQ_API_KEY` configurada, a função não a utiliza

## Solução

Modificar a edge function para usar o **Groq** como provedor principal.

---

## Alterações

### Arquivo: `supabase/functions/whatsapp-ai-assist/index.ts`

| Item | Antes | Depois |
|------|-------|--------|
| API Key | `LOVABLE_API_KEY` | `GROQ_API_KEY` |
| URL | `ai.gateway.lovable.dev` | `api.groq.com/openai/v1` |
| Modelo | `google/gemini-2.5-flash` | `llama-3.3-70b-versatile` |

### Mudanças específicas:

**1. Trocar constantes (linhas 14-15):**
```typescript
// Antes
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Depois
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
```

**2. Atualizar validação da API key (linhas 25-31):**
```typescript
if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY não configurada');
  return new Response(
    JSON.stringify({ error: 'API key do Groq não configurada' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**3. Atualizar chamadas de API (linhas 58-73 e 123-137):**
- Trocar `AI_GATEWAY_URL` por `GROQ_API_URL`
- Trocar `LOVABLE_API_KEY` por `GROQ_API_KEY`
- Trocar modelo `google/gemini-2.5-flash` por `llama-3.3-70b-versatile`

**4. Melhorar tratamento de erros (linhas 75-90 e 139-154):**
- Adicionar tratamento específico para erro 402 (créditos/billing)
- Log mais detalhado do erro

---

## Estrutura Final da Edge Function

```text
whatsapp-ai-assist/index.ts
├── Configuração
│   ├── GROQ_API_KEY (secret)
│   └── GROQ_API_URL (api.groq.com)
├── Ação: generate
│   ├── System prompt (atendimento WhatsApp)
│   ├── Histórico de conversa
│   └── Chamada Groq (llama-3.3-70b-versatile)
└── Ação: improve
    ├── System prompt (melhorar texto)
    └── Chamada Groq (llama-3.3-70b-versatile)
```

---

## Benefícios

1. **Sem custo de créditos Lovable** - Groq usa sua própria API key
2. **Modelo rápido** - Llama 3.3 70B é extremamente rápido no Groq
3. **Gratuito** - Groq oferece tier gratuito generoso
4. **Compatível** - API do Groq é compatível com OpenAI

---

## Verificação pós-deploy

Após implementar:
1. Acessar a Central de Atendimento (/whatsapp)
2. Abrir uma conversa
3. Clicar no botão de gerar sugestão de resposta
4. Verificar se a resposta é gerada sem erro 500

