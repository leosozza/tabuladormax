

# Correção: Mostrar Todos Usuários do Sistema na Seleção de Operador

## Problema Identificado

Na aba "Conversas" da página `/admin/ai-agents`, o seletor de operador não mostra Fabio, Paulo e outros usuários do sistema.

**Causa raiz**: O componente `ConversationTrainingGenerator` usa o hook `useOperatorsWithConversations()` que busca operadores **apenas da tabela `whatsapp_messages`** (quem já enviou mensagens). Isso significa:
- Operadores aparecem com nomes de automação (`Automação Bitrix`, `tele-xxx@maxfama.internal`)
- Usuários que nunca enviaram mensagem não aparecem
- Não usa a tabela `profiles` como fonte de verdade

## Solução

Modificar o componente para buscar usuários da tabela `profiles` (todos os usuários do sistema) e depois cruzar com as mensagens para mostrar estatísticas.

### Fluxo Proposto

```text
┌─────────────────────────────────────────────────────────────┐
│ ANTES (problemático):                                        │
│                                                              │
│ useOperatorsWithConversations()                             │
│ └── SELECT sender_name FROM whatsapp_messages               │
│     └── Retorna: "Automação Bitrix", "tele-xxx", etc.      │
│     └── Fabio/Paulo só aparecem se mandaram msg com         │
│         exatamente o mesmo display_name                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ DEPOIS (corrigido):                                          │
│                                                              │
│ Novo hook: useSystemUsers()                                 │
│ └── SELECT id, display_name FROM profiles                   │
│     └── Retorna: Fabio, Paulo Henrique, Leonardo, etc.     │
│                                                              │
│ Após selecionar usuário:                                    │
│ └── Buscar conversas WHERE sender_name = display_name       │
│     OU usar profile_id se disponível                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### 1. Criar novo hook `useSystemUsers`

Criar um hook simples que busca todos os usuários da tabela `profiles`:

```typescript
// src/hooks/useSystemUsers.ts
export function useSystemUsers() {
  return useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });
}
```

### 2. Modificar `ConversationTrainingGenerator.tsx`

- Trocar `useOperatorsWithConversations()` por `useSystemUsers()`
- Ajustar o seletor para usar `id` ao invés de `sender_name`
- Atualizar `useOperatorConversations` para aceitar o `display_name` do usuário selecionado
- Manter compatibilidade com o fluxo existente

```tsx
// Antes
const { data: operators } = useOperatorsWithConversations();
const [selectedOperator, setSelectedOperator] = useState<string | null>(null);

// Depois
const { data: users } = useSystemUsers();
const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const selectedUser = users?.find(u => u.id === selectedUserId);
```

### 3. Atualizar o hook `useOperatorConversations`

Modificar para aceitar tanto `display_name` quanto uma lista de possíveis nomes do operador (para cobrir variações):

```typescript
export function useOperatorConversations(
  operatorDisplayName: string | null,
  startDate?: Date,
  endDate?: Date
) {
  // Buscar mensagens onde sender_name = display_name
  // OU sender_name ILIKE display_name (para variações)
}
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSystemUsers.ts` | Criar novo hook |
| `src/components/admin/ai-agents/ConversationTrainingGenerator.tsx` | Trocar fonte de operadores para `profiles` |
| `src/hooks/useOperatorConversations.ts` | Ajustar para buscar por `display_name` |

---

## Resultado Esperado

1. O seletor "Selecione o Operador" mostrará **todos os usuários do sistema** (Fabio, Paulo Henrique, Leonardo, etc.)
2. Ao selecionar um usuário, o sistema buscará conversas onde `sender_name` corresponde ao `display_name` do usuário
3. Automações (`Automação Bitrix`, `Flow Automático`, `tele-xxx`) não aparecem no seletor de operadores humanos

