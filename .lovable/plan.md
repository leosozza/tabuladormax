

# Correção: Conversas Convidadas na Central de Atendimento

## Problemas Identificados

### 1. Conversas Duplicadas para o Mesmo Número
O telefone `5511967762633` tem **duas entradas** na `mv_whatsapp_conversation_stats`:

| bitrix_id | Última mensagem | Status |
|-----------|-----------------|--------|
| 134546 | 29/01 13:09 | "Daniele" - Lead atual |
| 1028996 | 28/01 19:25 | Entrada anterior |

**Causa**: O cliente enviou mensagens associadas a dois leads diferentes em momentos distintos. A view materializada agrupa por `(phone_number, bitrix_id)`, criando duas entradas.

### 2. Conversas Convidadas Não Aparecem na Lista
O componente `AdminConversationList` usa `useMyInvitedConversations` apenas para destacar conversas **que já estão na lista**. Porém, a lista é filtrada pela RPC `get_admin_whatsapp_conversations`, que pode não incluir a conversa convidada se:
- Está filtrada por etapa/status que não corresponde
- Está paginada e ainda não foi carregada
- Está encerrada (closedFilter)

**Resultado**: Mesmo sendo convidado para uma conversa, ela não aparece até você pesquisar o número.

### 3. Falta Seção Dedicada para Convidados
Não há uma área separada para mostrar conversas onde você foi convidado.

---

## Solução Proposta

### Parte 1: Criar Seção "Minhas Conversas Convidadas"

Adicionar uma seção dedicada no topo da lista que mostra **todas** as conversas onde o operador foi convidado, independente dos filtros:

```text
┌─────────────────────────────────────────────────┐
│ Conversas                              [🔄]     │
├─────────────────────────────────────────────────┤
│ [📨 35023] [🟢 768 abertas] [31837 não lidas]   │
├─────────────────────────────────────────────────┤
│ 🔔 Minhas Conversas Convidadas (2)        [▼]  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔔 Convidado por: Paulo Henrique            │ │
│ │ [D] Daniele                        10:09   │ │
│ │     5511967762633                           │ │
│ │     [StandBy] [⭐ Prioridade 3]             │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ 🔍 Buscar por nome ou telefone...              │
│ ... lista principal de conversas ...           │
└─────────────────────────────────────────────────┘
```

### Parte 2: Unificar Conversas Duplicadas (Opcional)

Para o problema de duplicatas, há duas abordagens:

**Opção A - Manter Separadas (recomendado inicialmente)**:
- Mantém visibilidade de ambos os leads
- Permite que o operador veja o histórico de cada lead
- Menos invasivo

**Opção B - Unificar por Telefone**:
- Mostra apenas a entrada mais recente
- Perde visibilidade do lead antigo
- Requer alteração na RPC

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/whatsapp/AdminConversationList.tsx` | Adicionar seção dedicada para conversas convidadas no topo |
| `src/hooks/useMyInvitedConversations.ts` | Adicionar dados adicionais (nome do lead, última mensagem) |

---

## Detalhes Técnicos

### Modificação do AdminConversationList

Adicionar seção colapsável no topo da lista que mostra todas as conversas convidadas, buscando dados completos via uma nova query:

```typescript
// Após os filtros, antes da lista principal
{myInvitedConversations.length > 0 && (
  <Collapsible defaultOpen>
    <CollapsibleTrigger className="w-full">
      <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
        <Bell className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-sm">
          Conversas Convidadas ({myInvitedConversations.length})
        </span>
      </div>
    </CollapsibleTrigger>
    <CollapsibleContent>
      {/* Renderizar conversas convidadas aqui */}
    </CollapsibleContent>
  </Collapsible>
)}
```

### Buscar Dados Completos das Conversas Convidadas

O hook `useMyInvitedConversations` retorna apenas `phone_number`, `bitrix_id`, `priority` e `inviter_name`. Precisamos enriquecê-lo com dados de conversa (nome do lead, última mensagem, etc.):

```sql
-- Nova RPC: get_my_invited_conversations_full
CREATE OR REPLACE FUNCTION get_my_invited_conversations_full(p_operator_id uuid)
RETURNS TABLE (
  phone_number text,
  bitrix_id text,
  priority integer,
  inviter_name text,
  invited_at timestamptz,
  lead_name text,
  last_message_at timestamptz,
  is_window_open boolean,
  unread_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.phone_number,
    p.bitrix_id,
    COALESCE(p.priority, 0),
    p.inviter_name,
    p.invited_at,
    COALESCE(l.name, p.phone_number) as lead_name,
    s.last_message_at,
    s.is_window_open,
    s.unread_count
  FROM whatsapp_conversation_participants p
  LEFT JOIN mv_whatsapp_conversation_stats s 
    ON s.phone_number = p.phone_number 
    AND (s.bitrix_id = p.bitrix_id OR (s.bitrix_id IS NULL AND p.bitrix_id IS NULL))
  LEFT JOIN leads l ON l.id = CASE 
    WHEN p.bitrix_id IS NOT NULL AND p.bitrix_id ~ '^[0-9]+$' 
    THEN p.bitrix_id::bigint 
    ELSE NULL 
  END
  WHERE p.operator_id = p_operator_id
  ORDER BY p.priority DESC NULLS LAST, p.invited_at DESC;
END;
$$;
```

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│ ANTES (problema):                                                │
│                                                                  │
│ Vitória recebe convite para 5511967762633                       │
│ ├── Notificação aparece no sino ✓                               │
│ ├── Clica na notificação → conversa abre ✓                      │
│ └── Lista não mostra a conversa ✗ (depende de filtros)          │
│                                                                  │
│ Duas entradas para mesmo número (bitrix_id diferentes)          │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DEPOIS (corrigido):                                              │
│                                                                  │
│ Vitória recebe convite para 5511967762633                       │
│ ├── Notificação aparece no sino ✓                               │
│ ├── Clica na notificação → conversa abre ✓                      │
│ └── Seção "Convidadas" mostra SEMPRE a conversa ✓               │
│                                                                  │
│ Seção "Convidadas" é independente dos filtros principais        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Impacto Esperado

1. **Conversas convidadas sempre visíveis**: Seção dedicada independente de filtros
2. **Destaque visual**: Background roxo/lilás e badge de prioridade
3. **Acesso rápido**: Um clique para abrir qualquer conversa convidada
4. **Clareza sobre duplicatas**: Mantém ambas entradas visíveis por enquanto

