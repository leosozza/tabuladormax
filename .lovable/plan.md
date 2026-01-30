
# Plano: Badges de Status Persistentes para Conversas WhatsApp

## Problema Identificado

Após análise detalhada, identifiquei que:

1. **A RPC não retorna `is_closed`**: A função `get_admin_whatsapp_conversations` não inclui o campo `is_closed` que já existe na materialized view `mv_whatsapp_conversation_stats`
2. **Filtro cliente-side ineficiente**: O frontend faz uma consulta separada para buscar encerramentos e aplica filtro localmente, perdendo sincronia após refresh
3. **Sem badge visual**: Não existe badge "Encerrada", "Em Atendimento" ou "Reaberta" na lista de conversas
4. **Reabertura automática funciona**: O webhook `gupshup-webhook` já reabe conversas automaticamente quando cliente envia mensagem

## Solução Proposta

### 1. Adicionar campo `is_closed` à RPC e interface

Incluir o campo `is_closed` na resposta da RPC `get_admin_whatsapp_conversations` para que o frontend receba diretamente a informação de encerramento.

### 2. Criar badges visuais na lista de conversas

Adicionar badges coloridas para cada status:
- **🟢 Encerrada** (verde): Conversa foi encerrada manualmente
- **🟣 Em Atendimento** (roxo): Operador respondeu e aguarda cliente
- **🟡 Reaberta** (amarelo): Conversa foi encerrada e cliente enviou nova mensagem (detectado via campo `reopened_at`)

### 3. Mover filtro para o servidor (RPC)

Em vez de filtrar localmente, passar o filtro `closedFilter` para a RPC aplicar no banco de dados.

---

## Detalhes Técnicos

### Alterações no Banco de Dados (SQL Migration)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Atualizar RPCs para retornar is_closed                         │
├─────────────────────────────────────────────────────────────────┤
│  get_admin_whatsapp_conversations:                              │
│    - Adicionar coluna is_closed boolean à RETURNS TABLE         │
│    - Retornar s.is_closed do SELECT                            │
│    - Adicionar parâmetro p_closed_filter text                   │
│    - Aplicar filtro no WHERE com base em is_closed              │
│                                                                 │
│  count_admin_whatsapp_conversations:                            │
│    - Adicionar mesmo p_closed_filter e lógica                   │
│                                                                 │
│  get_admin_whatsapp_filtered_stats:                             │
│    - Adicionar mesmo p_closed_filter e lógica                   │
└─────────────────────────────────────────────────────────────────┘
```

### Alterações no Frontend

**Arquivo: `src/hooks/useAdminWhatsAppConversations.ts`**
- Adicionar `is_closed?: boolean` à interface `AdminConversation`
- Adicionar parâmetro `p_closed_filter` às chamadas RPC
- Remover lógica de filtro cliente-side para encerradas

**Arquivo: `src/components/whatsapp/AdminConversationList.tsx`**
- Adicionar badges visuais para status:
  - **Encerrada**: Badge verde com ícone CheckCircle2
  - **Em Atendimento**: Badge roxa com ícone Headphones (já existe config)
  - **Reaberta**: Badge amarela com ícone RefreshCw (nova)
- Criar lógica para detectar "reaberta" consultando closures recentes

**Arquivo: `src/hooks/useCloseConversation.ts`**
- Adicionar query para buscar histórico de reaberturas recentes
- Usar para exibir badge "Reaberta"

### Fluxo de Status

```text
 Cliente envia mensagem
         │
         ▼
┌─────────────────┐
│ Conversa Ativa  │ (sem badge ou badge "Em Atendimento" se operador respondeu)
└────────┬────────┘
         │ Operador clica "Encerrar"
         ▼
┌─────────────────┐
│   Encerrada     │ (badge verde "Encerrada")
└────────┬────────┘
         │ Cliente envia nova mensagem
         │ (webhook seta reopened_at)
         ▼
┌─────────────────┐
│    Reaberta     │ (badge amarela "Reaberta" por algumas horas)
└────────┬────────┘
         │ Após interação do operador
         ▼
┌─────────────────┐
│ Conversa Ativa  │
└─────────────────┘
```

---

## Sequência de Implementação

1. **Migração SQL**: Atualizar as 3 RPCs para incluir `is_closed` e `p_closed_filter`
2. **Hook de dados**: Atualizar `useAdminWhatsAppConversations` para passar o filtro e receber `is_closed`
3. **Lista de conversas**: Adicionar badges visuais na `AdminConversationList`
4. **Detecção de reaberta**: Criar hook ou lógica para identificar conversas recentemente reabertas
5. **Refresh da view**: Garantir que a materialized view seja atualizada quando encerrar/reabrir

---

## Resultado Esperado

- ✅ Conversas encerradas mantêm status após refresh da página
- ✅ Badge "Encerrada" visível na lista de conversas
- ✅ Badge "Em Atendimento" para conversas ativas com operador
- ✅ Badge "Reaberta" quando cliente envia mensagem após encerramento
- ✅ Filtros funcionam corretamente no servidor (não mais cliente-side)
