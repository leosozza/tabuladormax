
# Plano de Melhorias - Central de Atendimento WhatsApp

## Resumo Executivo

Este plano aborda 14 melhorias identificadas para otimizar o fluxo de atendimento via WhatsApp, categorizadas em automações, filtros, sincronização e interface.

---

## 1. Melhorias de Automação

### 1.1 Encerramento Automático por Resposta (Não fez cadastro / Ver perfil)

**Situação atual**: O encerramento de conversas é manual.

**Implementação proposta**:
- Criar trigger no banco de dados que monitora mensagens de templates específicos
- Quando template com resultado "Não fez cadastro" (ID 8998) ou "Ver perfil" for enviado, encerrar conversa automaticamente
- Inserir registro em `whatsapp_conversation_closures` com motivo "Auto: Não fez cadastro" ou "Auto: Ver perfil"

**Arquivos a modificar**:
- `supabase/migrations/` - Nova migration com trigger
- `supabase/functions/gupshup-webhook/index.ts` - Lógica adicional após envio de template

### 1.2 Reabertura Automática de Conversas Encerradas

**Situacao atual**: JÁ IMPLEMENTADO. O código em `gupshup-webhook/index.ts` (linhas 789-807) já reabvre conversas automaticamente quando cliente envia nova mensagem.

**Ação necessária**: Apenas verificar se está funcionando corretamente em produção.

---

## 2. Melhorias de Filtros

### 2.1 Clarificação do Filtro "Respondeu"

**Situação atual**: O filtro `response_status` tem 4 estados:
- `waiting`: Aguardando resposta do operador (cliente mandou, operador não respondeu)
- `never`: Nunca respondemos ao cliente
- `replied`: Operador/sistema respondeu
- `in_progress`: Em atendimento (operador respondeu, aguardando cliente)

**Problema reportado**: Algumas respostas não estão subindo no filtro "Respondeu".

**Diagnóstico necessário**:
- Verificar a materialized view `mv_whatsapp_conversation_stats`
- Conferir se mensagens automáticas (Bitrix/Flow) estão sendo contadas como "replied"
- Verificar se a RPC `get_admin_whatsapp_conversations` está filtrando corretamente

**Implementação**:
- Revisar lógica de `response_status` na view para garantir que TODAS as respostas (operador + automação) sejam contadas
- Adicionar logs para debug temporário

### 2.2 Filtro por Etiqueta (Tags)

**Situação atual**: Sistema de tags existe (`whatsapp_conversation_tags`), mas não há filtro na listagem.

**Implementação proposta**:
- Adicionar parâmetro `p_tag_filter` na RPC `get_admin_whatsapp_conversations`
- Adicionar SELECT com dropdown de tags em `AdminConversationList.tsx`
- JOIN com tabela `whatsapp_conversation_tag_assignments`

**Arquivos a modificar**:
- `supabase/migrations/` - Atualizar RPC
- `src/components/whatsapp/AdminConversationList.tsx` - Novo filtro UI
- `src/hooks/useAdminWhatsAppConversations.ts` - Novo parâmetro

### 2.3 Filtro por Atribuição (Supervisão, Gerente, Produtor)

**Situação atual**: Não existe filtro por operador atribuído ou convidado.

**Implementação proposta**:
- Adicionar filtro `p_assigned_operator_id` na RPC
- Cruzar com tabela `whatsapp_conversation_participants` e campo `bitrix_telemarketing_id` de leads
- UI: Dropdown com lista de operadores

**Arquivos a modificar**:
- `supabase/migrations/` - Atualizar RPC
- `src/components/whatsapp/AdminConversationList.tsx` - Novo filtro
- `src/hooks/useAdminWhatsAppConversations.ts` - Novo parâmetro

### 2.4 Filtro Combinado por Status (Encerrada, Em andamento, etc)

**Situação atual**: Existe filtro `closedFilter` com opções: ativas, encerradas, todas.

**Melhoria proposta**:
- Expandir para incluir "Em andamento" (in_progress)
- Combinar com response_status para visão mais granular

---

## 3. Melhorias de Sincronização

### 3.1 Sincronização de Nome do Bitrix para Connect

**Situação atual**: O webhook `bitrix-webhook` sincroniza leads, incluindo o campo `name`.

**Problema reportado**: Edições de nome no Bitrix não refletem no Connect.

**Diagnóstico**:
- Verificar se webhook de UPDATE está sendo disparado pelo Bitrix
- Conferir se campo `name` está sendo atualizado no UPSERT

**Implementação**:
- Garantir que webhook Bitrix dispare em eventos `ONCRMLEADUPDATE`
- Adicionar log explícito para mudanças de nome
- Forçar atualização do campo `name` mesmo que outros campos não mudem

**Arquivos a modificar**:
- `supabase/functions/bitrix-webhook/index.ts` - Log e validação de nome

### 3.2 Prevenção de Conversas Duplicadas

**Situação atual**: Código já faz deduplicação por `phone_normalized`, mas ainda gera duplicatas.

**Diagnóstico necessário**:
- Verificar se telefones estão sendo normalizados consistentemente
- Checar se há race conditions na criação de mensagens

**Implementação**:
- Adicionar constraint UNIQUE mais rigorosa
- Implementar normalização unificada em todos os pontos de entrada
- Criar função de "merge" de conversas duplicadas

---

## 4. Melhorias de Interface

### 4.1 Botão "Resolvido" para Operadores Convidados

**Situação atual**: JÁ EXISTE. O componente `ResolveParticipationDialog.tsx` permite marcar participação como resolvida.

**Verificação**: Confirmar que botão está visível no header quando operador é participante convidado.

### 4.2 Status "URGENTE" Visível

**Situação atual**: Sistema de prioridade existe (0-5), sendo 5 = "Urgente".

**Implementação proposta**:
- Adicionar badge vermelho "URGENTE" quando `priority = 5`
- Mostrar no topo da lista de conversas
- Adicionar ícone de alerta (AlertTriangle)

**Arquivos a modificar**:
- `src/components/whatsapp/AdminConversationList.tsx` - Badge visual
- `src/components/whatsapp/InvitedConversationsSection.tsx` - Highlight urgente

### 4.3 Exibir Informação de Retribuição do Convidado

**Situação atual**: Notas de resolução são salvas em `whatsapp_participation_resolutions`.

**Implementação proposta**:
- Mostrar histórico de resoluções na conversa
- Adicionar ícone/badge indicando que há notas do convidado
- Tooltip ou popover com detalhes

**Arquivos a modificar**:
- `src/components/whatsapp/ResolutionHistory.tsx` - Exibir na conversa
- `src/components/whatsapp/WhatsAppHeader.tsx` - Indicador visual

### 4.4 Mostrar Histórico Completo de Mensagens (Tele)

**Situação atual**: Mensagens são buscadas por `phone_number` via RPC `get_telemarketing_whatsapp_messages`.

**Problema reportado**: Algumas conversas não mostram histórico completo.

**Diagnóstico**:
- Verificar se RPC tem LIMIT muito restritivo
- Conferir se telefone está normalizado corretamente

**Implementação**:
- Aumentar limite do RPC ou implementar paginação
- Adicionar botão "Carregar mensagens anteriores"

### 4.5 Correção: Conversas Encerradas Ainda Aparecem como Ativas

**Situação atual**: Filtro `closedFilter = 'active'` deveria excluir encerradas.

**Diagnóstico**:
- Verificar se query está buscando corretamente `reopened_at IS NULL`
- Conferir se há delay na atualização do cache

**Implementação**:
- Revisar lógica no hook `useAdminWhatsAppConversations.ts`
- Garantir invalidação de cache após encerramento

---

## 5. Detalhes Técnicos

### Migrations Necessárias

```text
1. Trigger para encerramento automático por resposta específica
2. Atualização da RPC get_admin_whatsapp_conversations com novos filtros:
   - p_tag_filter: TEXT[] (IDs de tags)
   - p_assigned_operator_id: UUID (filtrar por operador)
3. Índices otimizados para novos filtros
```

### Componentes Frontend a Modificar

```text
1. AdminConversationList.tsx
   - Novo filtro por Tag (dropdown multi-select)
   - Novo filtro por Operador atribuído
   - Badge URGENTE para prioridade 5
   
2. WhatsAppHeader.tsx
   - Indicador de notas de resolução do convidado
   
3. useAdminWhatsAppConversations.ts
   - Novos parâmetros de filtro (tagFilter, operatorFilter)
```

### Edge Functions a Modificar

```text
1. gupshup-webhook/index.ts
   - Encerramento automático após resposta específica
   - Log melhorado para debug de response_status

2. bitrix-webhook/index.ts
   - Garantir sincronização de campo name em updates
```

---

## 6. Priorização Sugerida

| Prioridade | Item | Impacto | Esforço |
|------------|------|---------|---------|
| Alta | Filtro por Etiqueta | Alto | Médio |
| Alta | Badge URGENTE | Alto | Baixo |
| Alta | Correção encerradas como ativas | Alto | Baixo |
| Média | Encerramento automático | Médio | Médio |
| Média | Filtro por atribuição | Médio | Médio |
| Média | Sincronização nome Bitrix | Médio | Baixo |
| Baixa | Histórico completo | Baixo | Médio |
| Baixa | Info retribuição convidado | Baixo | Baixo |

---

## 7. Itens Já Implementados (Apenas Verificar)

1. **Reabertura automática**: Código existe em `gupshup-webhook` (linhas 789-807)
2. **Botão Resolvido**: Componente `ResolveParticipationDialog.tsx` existe
3. **Status Em Atendimento**: Filtro `in_progress` já existe no dropdown
