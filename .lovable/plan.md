

# Correção: Seção de Conversas Convidadas Não Aparece e Duplicatas

## Problemas Identificados

### Problema 1: RPC Quebrada - Seção "Conversas Convidadas" Nunca Carrega
A função `get_my_invited_conversations_full` tenta acessar a coluna `s.lead_etapa` que **não existe** na view materializada `mv_whatsapp_conversation_stats`.

**Erro no console:**
```
Error fetching full invited conversations: 
  "column s.lead_etapa does not exist"
```

**Colunas disponíveis na view:**
- phone_number, bitrix_id, last_message_at, unread_count, total_messages
- last_message_preview, last_message_direction, response_status
- is_window_open, is_closed

**Colunas que a RPC tenta usar mas NÃO existem:**
- `lead_etapa` ❌

### Problema 2: Duplicatas na Lista de Convidados
O telefone `5511967762633` tem duas entradas na `mv_whatsapp_conversation_stats`:
- `bitrix_id: 1028996` (histórico antigo)
- `bitrix_id: 134546` (lead Daniele - atual)

O convite foi feito para o `bitrix_id: 134546`, portanto apenas UMA entrada deveria aparecer. Contudo, se por algum erro foram criados múltiplos convites, apareceriam duplicatas.

### Problema 3: Notificação Abre Chat Mas Não Seleciona na Lista
Quando o operador clica na notificação:
1. `handleNotificationClick` é chamado com `phoneNumber` e `bitrixId`
2. Abre o chat corretamente ✓
3. **Mas a seção "Conversas Convidadas" não aparece** porque a RPC está falhando!

---

## Solução Proposta

### Parte 1: Corrigir a RPC

Atualizar a função `get_my_invited_conversations_full` para buscar `lead_etapa` da tabela `leads` ao invés da view materializada:

```sql
CREATE OR REPLACE FUNCTION get_my_invited_conversations_full(p_operator_id uuid)
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
  response_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.phone_number,
    p.bitrix_id,
    COALESCE(p.priority, 0)::integer as priority,
    inviter.display_name as inviter_name,
    p.invited_at,
    p.invited_by,
    COALESCE(l.name, p.phone_number) as lead_name,
    s.last_message_at,
    s.last_message_preview,
    COALESCE(s.is_window_open, false) as is_window_open,
    COALESCE(s.unread_count, 0) as unread_count,
    l.stage_id as lead_etapa,  -- ← Vem do leads, não da view!
    s.response_status::text
  FROM whatsapp_conversation_participants p
  LEFT JOIN profiles inviter ON inviter.id = p.invited_by
  LEFT JOIN mv_whatsapp_conversation_stats s 
    ON s.phone_number = p.phone_number 
    AND (s.bitrix_id = p.bitrix_id OR (s.bitrix_id IS NULL AND p.bitrix_id IS NULL))
  LEFT JOIN leads l ON l.id = CASE 
    WHEN p.bitrix_id IS NOT NULL AND p.bitrix_id ~ '^[0-9]+$' 
    THEN p.bitrix_id::bigint 
    ELSE NULL 
  END
  WHERE p.operator_id = p_operator_id
  ORDER BY p.priority DESC NULLS LAST, s.last_message_at DESC NULLS LAST;
END;
$$;
```

### Parte 2: Adicionar Constraint de Unicidade (Opcional)

Para evitar convites duplicados no futuro, adicionar constraint na tabela `whatsapp_conversation_participants`:

```sql
-- Evitar convites duplicados para a mesma conversa/operador
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_participant 
ON whatsapp_conversation_participants(phone_number, COALESCE(bitrix_id, ''), operator_id);
```

### Parte 3: Limpar Dados Duplicados Existentes

```sql
-- Remover participantes duplicados mantendo apenas o mais recente
DELETE FROM whatsapp_conversation_participants
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY phone_number, COALESCE(bitrix_id, ''), operator_id 
             ORDER BY invited_at DESC
           ) as rn
    FROM whatsapp_conversation_participants
  ) sub
  WHERE rn > 1
);
```

---

## Arquivos a Modificar

| Arquivo/Recurso | Alteração |
|-----------------|-----------|
| Nova Migration SQL | Corrigir RPC `get_my_invited_conversations_full` |
| Nova Migration SQL | Adicionar constraint de unicidade |
| Nova Migration SQL | Limpar dados duplicados |

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│ ANTES (problema):                                                │
│                                                                  │
│ Operador clica em notificação                                   │
│ ├── Chat abre corretamente ✓                                    │
│ ├── RPC falha: "column s.lead_etapa does not exist"             │
│ └── Seção "Conversas Convidadas" fica VAZIA ✗                   │
│                                                                  │
│ Resultado: Chat está aberto, mas a conversa não aparece         │
│ selecionada na lista lateral                                    │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DEPOIS (corrigido):                                              │
│                                                                  │
│ Operador clica em notificação                                   │
│ ├── Chat abre corretamente ✓                                    │
│ ├── RPC retorna dados corretamente ✓                            │
│ ├── Seção "Conversas Convidadas" carrega ✓                      │
│ └── Conversa aparece selecionada com destaque ✓                 │
│                                                                  │
│ Resultado: Layout esperado (Imagem 1 do usuário)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Impacto Esperado

1. **Seção "Conversas Convidadas" funciona**: RPC retorna dados corretamente
2. **Sem duplicatas**: Constraint impede convites duplicados
3. **Seleção visual correta**: Conversa aparece destacada quando clicada
4. **Performance mantida**: Dados de etapa vêm do leads já existente no JOIN

---

## Teste de Validação

Após implementação:
1. Paulo convida Vitória para uma conversa
2. Vitória recebe notificação ✓
3. Vitória clica na notificação
4. Chat abre E conversa aparece na seção "Convidadas" com destaque roxo
5. Apenas UMA entrada para cada conversa (sem duplicatas)

