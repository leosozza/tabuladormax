
# Plano: Correção de Filtro de Conversas Encerradas + Permissões por Departamento

## ✅ STATUS: IMPLEMENTADO

---

## Problema 1: Conversas Encerradas Aparecendo em "Ativas" - ✅ RESOLVIDO

### Solução Implementada
1. ✅ Atualizada RPC `get_my_invited_conversations_full` para retornar campo `is_closed` da materialized view
2. ✅ Atualizado tipo `InvitedConversationFull` para incluir `is_closed`
3. ✅ No `mergedConversations`, propagamos o valor real de `is_closed` ao invés de sempre usar `false`
4. ✅ Filtro `closedFilter` é aplicado às conversas convidadas antes de mesclar

---

## Problema 2: Controle de Acesso por Departamento - ✅ RESOLVIDO

### Solução Implementada
1. ✅ Criada função `get_user_resource_scope` no banco de dados para verificar scope de permissão
2. ✅ Criado hook `useResourceScope` para verificar scope do usuário para um recurso
3. ✅ Implementado no `AdminConversationList.tsx`:
   - `isOwnOnly`: quando true, mostra APENAS conversas onde o usuário é participante
   - Filtra pelo `closedFilter` corretamente em ambos os modos

---

## Arquivos Modificados

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `supabase/migrations/` | Atualizada `get_my_invited_conversations_full` + criada `get_user_resource_scope` |
| 2 | `src/hooks/useMyInvitedConversationsFull.ts` | Adicionado campo `is_closed` ao tipo |
| 3 | `src/hooks/useResourceScope.ts` | **Novo hook** para verificar scope de permissão |
| 4 | `src/components/whatsapp/AdminConversationList.tsx` | Corrigido merge de conversas + aplicada lógica de scope |

---

## Comportamento Final

### Para Administradores (scope: global)
- Vê todas as conversas do sistema
- Filtro `closedFilter` funciona corretamente para todas as conversas

### Para Departamento Cobrança (scope: own)
1. Ao acessar `/whatsapp`, vê apenas conversas onde é participante (convidado)
2. Quando é convidado para uma conversa, ela aparece na lista
3. Pode visualizar e interagir com a conversa
4. O filtro `closedFilter` funciona corretamente (ativas vs encerradas)

