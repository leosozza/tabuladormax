
# Plano: IA Lendo Conversas Completas + Treinamento Baseado em Conversas de Agentes

## Visão Geral

Este plano implementa duas funcionalidades solicitadas:

1. **IA lê toda a conversa**: Aumentar o contexto de 10 para todas as mensagens relevantes
2. **Treinamento baseado em conversas**: Nova ferramenta para gerar treinamentos a partir do histórico de atendimento de agentes humanos

---

## Parte 1: IA Lendo Conversa Completa

### Problema Atual
O hook `useWhatsAppAI.ts` limita o contexto para apenas **10 mensagens**:
```typescript
messages: messages.slice(-10).map(m => ({...}))
```

### Solução
Modificar para enviar **todas as mensagens** (ou um limite maior como 50-100) e fazer uma sumarização inteligente no backend quando necessário.

### Arquivo: `src/hooks/useWhatsAppAI.ts`

**Alterações**:
- Remover o `.slice(-10)` ou aumentar para limite maior
- Opcional: Adicionar parâmetro para controlar quantas mensagens incluir

```typescript
// ANTES:
messages: messages.slice(-10).map(m => ({...}))

// DEPOIS - opção 1 (todas mensagens):
messages: messages.map(m => ({...}))

// DEPOIS - opção 2 (limite maior configurável):
const MAX_CONTEXT_MESSAGES = 50;
messages: messages.slice(-MAX_CONTEXT_MESSAGES).map(m => ({...}))
```

### Arquivo: `supabase/functions/whatsapp-ai-assist/index.ts`

**Alterações**:
- Aumentar `max_tokens` se necessário para respostas mais contextualizadas
- Opcional: Implementar sumarização de mensagens antigas para economizar tokens

---

## Parte 2: Treinamento Baseado em Conversas de Agentes

### Conceito
Criar uma nova aba/funcionalidade na página `/admin/ai-agents` que permite:
1. Selecionar um agente humano (operador do sistema)
2. Ver as conversas que esse operador respondeu
3. Selecionar conversas relevantes
4. Usar IA para extrair padrões de atendimento e gerar treinamento

### Novos Arquivos

#### 1. `src/components/admin/ai-agents/ConversationTrainingGenerator.tsx`
Componente principal que:
- Lista operadores com histórico de conversas
- Mostra conversas do operador selecionado
- Permite selecionar conversas para análise
- Botão "Gerar Treinamento com IA" que analisa os padrões

#### 2. `src/hooks/useOperatorConversations.ts`
Hook para:
- Buscar operadores que têm mensagens outbound
- Buscar conversas de um operador específico
- Agrupar por telefone/cliente

### Modificações em Arquivos Existentes

#### `src/pages/admin/AIAgents.tsx`
- Adicionar nova aba "Gerar de Conversas" (ou similar)
- Integrar o novo componente `ConversationTrainingGenerator`

#### `src/components/admin/ai-agents/AIAgentTrainingFormDialog.tsx`
- Adicionar prop opcional para pré-preencher o conteúdo (quando gerado por IA)

### Nova Edge Function: `supabase/functions/generate-training-from-conversations/index.ts`

Função que:
1. Recebe array de conversas selecionadas
2. Usa Lovable AI (Gemini) para analisar padrões
3. Extrai:
   - Tom de voz do operador
   - Frases comuns usadas
   - Como lida com objeções
   - Saudações típicas
   - Técnicas de fechamento
4. Retorna texto estruturado para treinamento

**Prompt para a IA**:
```text
Analise as seguintes conversas de WhatsApp entre um operador humano e clientes.
Extraia os padrões de atendimento para criar um treinamento de IA.

Identifique:
1. Tom de voz (formal/informal, amigável/profissional)
2. Frases de saudação típicas
3. Como lida com dúvidas frequentes
4. Técnicas de persuasão usadas
5. Como lida com reclamações/objeções
6. Frases de fechamento/despedida

Gere um texto de treinamento estruturado que uma IA possa seguir.
```

---

## Estrutura da Nova Aba

```text
┌─────────────────────────────────────────────────────────────┐
│ Gerar Treinamento de Conversas                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Selecione o Operador:                                   │
│  ┌──────────────────────────────────────────┐               │
│  │ ▼ Fabio (88 mensagens)                   │               │
│  └──────────────────────────────────────────┘               │
│                                                             │
│  2. Período:                                                │
│  [Últimos 7 dias ▼] [01/01/2026] - [28/01/2026]            │
│                                                             │
│  3. Conversas do Operador:                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ☑ 5511910933615 - Mary❤️🙏 (5 mensagens)              │   │
│  │   "Boa Tarde! Tudo bem e contigo?..."                │   │
│  │ ☑ 5511999887766 - João (12 mensagens)                │   │
│  │   "Olá! Tudo ótimo, como posso ajudar?"              │   │
│  │ ☐ 5511988776655 - Maria (3 mensagens)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Conversas selecionadas: 2                                  │
│                                                             │
│  ┌─────────────────────────────┐                            │
│  │ 🤖 Gerar Treinamento com IA │                            │
│  └─────────────────────────────┘                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Preview do Treinamento Gerado:                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ## TOM DE VOZ                                        │   │
│  │ O operador usa um tom amigável e profissional...     │   │
│  │                                                      │   │
│  │ ## SAUDAÇÕES                                         │   │
│  │ - "Boa Tarde! Tudo bem e contigo?"                   │   │
│  │ - "Olá! Tudo ótimo, como posso ajudar?"              │   │
│  │ ...                                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Salvar como:                                               │
│  Título: [Padrões do Fabio - Atendimento Geral]            │
│  Categoria: [Geral ▼]  Agente: [Central Atendimento ▼]     │
│                                                             │
│  [Salvar Treinamento]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Fluxo Completo

```text
Admin em /admin/ai-agents
         ↓
Clica na aba "Gerar de Conversas"
         ↓
Seleciona operador "Fabio"
         ↓
Sistema busca conversas onde Fabio respondeu
         ↓
Admin seleciona conversas relevantes (ex: 5 melhores atendimentos)
         ↓
Clica "Gerar Treinamento com IA"
         ↓
Edge function analisa as conversas com Lovable AI
         ↓
Retorna texto estruturado de treinamento
         ↓
Admin revisa, edita se necessário
         ↓
Salva como novo treinamento para o agente de IA
         ↓
Agente de IA agora responde seguindo o estilo do Fabio
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useOperatorConversations.ts` | Hook para buscar conversas por operador |
| `src/components/admin/ai-agents/ConversationTrainingGenerator.tsx` | Componente principal da nova funcionalidade |
| `supabase/functions/generate-training-from-conversations/index.ts` | Edge function para análise com IA |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useWhatsAppAI.ts` | Remover limite de 10 mensagens |
| `src/pages/admin/AIAgents.tsx` | Adicionar nova aba |

---

## Detalhes Técnicos

### Buscar Conversas do Operador (SQL)
```sql
SELECT DISTINCT phone_number, 
       MAX(created_at) as last_message,
       COUNT(*) as operator_messages,
       COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as client_messages
FROM whatsapp_messages
WHERE sender_name = 'Fabio' 
  AND direction = 'outbound'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY phone_number
ORDER BY last_message DESC
LIMIT 50
```

### Buscar Mensagens de Uma Conversa Específica
```sql
SELECT * FROM whatsapp_messages
WHERE phone_number = '5511910933615'
ORDER BY created_at ASC
```

### Limite de Tokens
O Lovable AI (Gemini 2.5 Flash) suporta até 1M tokens de contexto, então podemos enviar várias conversas completas para análise.

---

## Benefícios

1. **IA mais inteligente**: Com contexto completo, entende melhor a conversa
2. **Treinamento realista**: Baseado em conversas reais, não genéricas
3. **Escalável**: Qualquer operador pode ser "copiado" para treinar a IA
4. **Melhoria contínua**: Pode gerar novos treinamentos periodicamente com conversas recentes
