
# Correção: Conversas WhatsApp Não Carregando

## Problema Identificado

O erro que impede o carregamento das conversas é:
```
operator does not exist: uuid = text
```

### Causa Raiz
Na migration `20260129210345`, os parâmetros de tag filter foram definidos como `text[]`, mas a tabela `whatsapp_conversation_tag_assignments` tem a coluna `tag_id` do tipo `uuid`. Quando a RPC tenta fazer a comparação `wcta.tag_id = ANY(p_tag_filter)`, o PostgreSQL não consegue comparar `uuid = text`.

### Localização do Problema
Todas as 3 RPCs afetadas:
- `get_admin_whatsapp_conversations` (linha 14)
- `count_admin_whatsapp_conversations` (linha 139)  
- `get_admin_whatsapp_filtered_stats` (linha 205)

Todas têm: `p_tag_filter text[] DEFAULT NULL`

Deveria ser: `p_tag_filter uuid[] DEFAULT NULL`

---

## Solução

Criar nova migration SQL para corrigir o tipo do parâmetro nas 3 RPCs.

### Alteração Necessária

Em cada RPC, mudar:
```sql
p_tag_filter text[] DEFAULT NULL
```
Para:
```sql
p_tag_filter uuid[] DEFAULT NULL
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Recriar as 3 RPCs com `p_tag_filter uuid[]` |

---

## Detalhes Técnicos

### Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  ...
  p_tag_filter uuid[] DEFAULT NULL,  -- Alterado de text[] para uuid[]
  p_operator_filter uuid DEFAULT NULL
)
...
```

A mesma correção será aplicada em:
- `count_admin_whatsapp_conversations`
- `get_admin_whatsapp_filtered_stats`

### Por que funciona

A coluna `tag_id` é `uuid`:
```
whatsapp_conversation_tag_assignments.tag_id → uuid
```

Após a correção, a comparação será `uuid = ANY(uuid[])`, que é válida.
