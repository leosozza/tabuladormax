
# Plano: Correção de Filtro de Conversas Encerradas + Permissões por Departamento

## Problema 1: Conversas Encerradas Aparecendo em "Ativas"

### Diagnóstico
A RPC `get_admin_whatsapp_conversations` filtra corretamente pelo parâmetro `p_closed_filter`, mas no componente `AdminConversationList.tsx`, o código mescla conversas vindas do hook `useMyInvitedConversationsFull` que são sempre adicionadas com `is_closed: false` (hardcoded na linha 398).

```text
┌─────────────────────────────────────────────────────────────────┐
│ RPC: get_admin_whatsapp_conversations                           │
│ → Filtra corretamente: p_closed_filter = 'active'               │
│ → Retorna apenas is_closed = false                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ AdminConversationList - mergedConversations                     │
│ → Adiciona conversas de myInvitedConversationsFull              │
│ → SEMPRE com is_closed: false (hardcoded)    ❌ PROBLEMA        │
│ → NÃO aplica filtro closedFilter nessas conversas               │
└─────────────────────────────────────────────────────────────────┘
```

### Solução
1. Atualizar a RPC `get_my_invited_conversations_full` para retornar o campo `is_closed` da materialized view
2. Atualizar o tipo `InvitedConversationFull` para incluir `is_closed`
3. No `mergedConversations`, propagar o valor real de `is_closed` ao invés de sempre usar `false`
4. Filtrar as conversas convidadas pelo `closedFilter` antes de mesclar

---

## Problema 2: Controle de Acesso por Departamento

### Diagnóstico
A configuração atual mostra:
- Departamento "Cobrança" tem `scope: own` para `whatsapp.view` e `whatsapp.send`
- "own" significa: visualizar apenas conversas próprias (onde é participante)
- Não existe validação que force esse comportamento no frontend/backend

### Fluxo Desejado

```text
┌────────────────────────────────────────────────────────────────┐
│ Usuário do Departamento Cobrança                               │
│ → Permissão: whatsapp.view = "own"                             │
└────────────────────────────┬───────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────────┐
│ Não Convidado           │         │ Convidado para Conversa     │
│ → Não vê a conversa     │         │ → Pode visualizar           │
│ → Lista vazia           │         │ → Pode interagir            │
└─────────────────────────┘         │ → Ao resolver, perde acesso │
                                    └─────────────────────────────┘
```

### Solução
1. Criar hook `useResourceScope` para verificar scope do usuário para um recurso
2. No `/whatsapp`, verificar scope do recurso `whatsapp.view`:
   - `global`: acesso total (admin)
   - `department`: ver conversas do departamento
   - `own`: ver APENAS conversas onde é participante
3. Para usuários com scope `own`:
   - Mostrar somente conversas vindas de `get_my_invited_conversations_full`
   - Esconder a lista principal de `get_admin_whatsapp_conversations`
4. Quando marcar "Resolvido", remover da tabela `whatsapp_conversation_participants`

---

## Implementação Técnica

### Arquivos a Modificar

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `supabase/migrations/xxx.sql` | Atualizar `get_my_invited_conversations_full` para incluir `is_closed` |
| 2 | `src/hooks/useMyInvitedConversationsFull.ts` | Adicionar campo `is_closed` ao tipo |
| 3 | `src/components/whatsapp/AdminConversationList.tsx` | Propagar `is_closed` e filtrar pelo `closedFilter` |
| 4 | `src/hooks/useResourceScope.ts` | **Novo hook** para verificar scope de permissão |
| 5 | `supabase/migrations/xxx.sql` | Criar função `get_user_resource_scope` |
| 6 | `src/pages/WhatsApp.tsx` | Aplicar lógica de scope para controlar lista exibida |
| 7 | `src/components/whatsapp/InvitedConversationsSection.tsx` | Ajustes visuais para modo "own" |

### 1. Migração: Atualizar RPC `get_my_invited_conversations_full`

```sql
CREATE OR REPLACE FUNCTION public.get_my_invited_conversations_full(p_operator_id uuid)
RETURNS TABLE (
  phone_number text,
  bitrix_id text,
  priority integer,
  inviter_name text,
  invited_at timestamptz,
  invited_by uuid,
  lead_name text,
  last_message_at timestamptz,
  last_message_preview text,
  is_window_open boolean,
  unread_count bigint,
  lead_etapa text,
  response_status text,
  is_closed boolean  -- NOVO CAMPO
)
...
SELECT 
  ...
  COALESCE(s.is_closed, false) as is_closed  -- ADICIONAR
FROM whatsapp_conversation_participants p
LEFT JOIN mv_whatsapp_conversation_stats s ON ...
```

### 2. Migração: Criar função `get_user_resource_scope`

```sql
CREATE OR REPLACE FUNCTION public.get_user_resource_scope(
  _user_id uuid,
  _resource_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text := 'none';
  v_user_role_id uuid;
  v_user_department text;
BEGIN
  -- 1. Verificar permissão direta do usuário
  SELECT pa.scope INTO v_scope
  FROM permission_assignments pa
  JOIN app_resources ar ON ar.id = pa.resource_id
  WHERE pa.assign_type = 'user'
    AND pa.user_id = _user_id
    AND ar.code = _resource_code
    AND pa.can_access = true
  LIMIT 1;
  
  IF v_scope IS NOT NULL AND v_scope != 'none' THEN
    RETURN v_scope;
  END IF;
  
  -- 2. Verificar permissão por departamento
  SELECT ud.department INTO v_user_department
  FROM user_departments ud
  WHERE ud.user_id = _user_id
  LIMIT 1;
  
  IF v_user_department IS NOT NULL THEN
    SELECT pa.scope INTO v_scope
    FROM permission_assignments pa
    JOIN app_resources ar ON ar.id = pa.resource_id
    JOIN departments d ON d.id = pa.department_id
    WHERE pa.assign_type = 'department'
      AND d.code = v_user_department
      AND ar.code = _resource_code
      AND pa.can_access = true
    LIMIT 1;
    
    IF v_scope IS NOT NULL AND v_scope != 'none' THEN
      RETURN v_scope;
    END IF;
  END IF;
  
  -- 3. Verificar permissão por role
  SELECT ur.id INTO v_user_role_id
  FROM user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;
  
  IF v_user_role_id IS NOT NULL THEN
    SELECT pa.scope INTO v_scope
    FROM permission_assignments pa
    JOIN app_resources ar ON ar.id = pa.resource_id
    WHERE pa.assign_type = 'role'
      AND pa.role_id = v_user_role_id
      AND ar.code = _resource_code
      AND pa.can_access = true
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_scope, 'none');
END;
$$;
```

### 3. Novo Hook: `useResourceScope`

```typescript
// src/hooks/useResourceScope.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ResourceScope = 'global' | 'department' | 'own' | 'none';

export const useResourceScope = (resourceCode: string) => {
  const [scope, setScope] = useState<ResourceScope>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkScope = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setScope('none');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_user_resource_scope', {
        _user_id: user.id,
        _resource_code: resourceCode,
      });

      if (error) {
        console.error('Error checking resource scope:', error);
        setScope('none');
      } else {
        setScope(data as ResourceScope || 'none');
      }
      setLoading(false);
    };

    checkScope();
  }, [resourceCode]);

  return { scope, loading, isOwnOnly: scope === 'own' };
};
```

### 4. Ajustes no `AdminConversationList.tsx`

```typescript
// Importar o novo hook
import { useResourceScope } from '@/hooks/useResourceScope';

// Dentro do componente
const { scope: viewScope, isOwnOnly } = useResourceScope('whatsapp.view');

// Atualizar mergedConversations para:
// 1. Usar is_closed real das conversas convidadas
// 2. Filtrar pelo closedFilter
// 3. Se isOwnOnly, mostrar APENAS conversas convidadas

const mergedConversations = useMemo(() => {
  // Se scope = 'own', usar apenas conversas convidadas
  if (isOwnOnly) {
    return myInvitedConversationsFull
      .filter(inv => {
        // Aplicar filtro closed
        if (closedFilter === 'active') return !inv.is_closed;
        if (closedFilter === 'closed') return inv.is_closed;
        return true; // 'all'
      })
      .map(inv => ({
        ...convertInvitedToAdmin(inv),
        is_closed: inv.is_closed, // Usar valor real
      }));
  }
  
  // Lógica atual para global/department
  // ... mas com is_closed correto das conversas convidadas
}, [conversations, myInvitedConversationsFull, isOwnOnly, closedFilter]);
```

### 5. Ajustes no `WhatsApp.tsx`

Para usuários com scope `own`, mostrar interface simplificada focada apenas nas conversas convidadas.

---

## Resultado Esperado

### Problema 1 Resolvido
- Conversas encerradas NÃO aparecem mais na aba "Ativas"
- O filtro `closedFilter` é aplicado corretamente a TODAS as conversas (principais + convidadas)

### Problema 2 Resolvido
- Usuário do departamento Cobrança com `whatsapp.view = "own"`:
  1. Ao acessar `/whatsapp`, vê lista vazia
  2. Quando é convidado para uma conversa, ela aparece na lista
  3. Pode visualizar e interagir (se tem `whatsapp.send = "own"`)
  4. Ao clicar "Resolvido", conversa desaparece da lista
  5. Não tem mais acesso até ser convidado novamente

---

## Ordem de Implementação

1. **Migração SQL** - Atualizar RPC + criar função de scope
2. **Hook useResourceScope** - Novo hook para verificar permissões
3. **useMyInvitedConversationsFull** - Adicionar campo is_closed
4. **AdminConversationList** - Corrigir merge e aplicar lógica de scope
5. **WhatsApp.tsx** - Ajustar interface para modo restrito
6. **Testes** - Verificar comportamento com diferentes scopes
