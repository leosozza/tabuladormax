

# Correção: Nome do Agente Mostra "Você" ao Invés do Nome Real

## Problema Identificado

Quando um operador (Paulo, Leonardo, etc.) envia uma mensagem, a interface mostra **"Você"** ao invés do nome real do agente.

A causa raiz é que a função RPC `get_telemarketing_whatsapp_messages` **não retorna** os campos `sender_name`, `sent_by`, `conversation_id` e `delivered_at` do banco de dados.

**Query atual da RPC:**
```sql
SELECT 
  m.id, m.phone_number, m.bitrix_id, m.gupshup_message_id,
  m.direction, m.message_type, m.content, m.template_name,
  m.status, m.media_url, m.media_type, m.created_at,
  m.read_at, m.metadata
  -- ⚠️ FALTANDO: sender_name, sent_by, conversation_id, delivered_at
FROM public.whatsapp_messages m
```

**Dado no banco** (está correto):
| phone_number | sender_name | sent_by |
|--------------|-------------|---------|
| 5511967762633 | Paulo Henrique | tabulador |
| 5511964329212 | tele-160@maxfama.internal | tabulador |

**Dado chegando na UI** (está null por causa da RPC):
```
sender_name: null → fallback para "Você"
```

---

## Solução

Criar uma nova migration SQL para atualizar a função `get_telemarketing_whatsapp_messages`, adicionando os campos que estão faltando.

**Query corrigida:**
```sql
CREATE OR REPLACE FUNCTION get_telemarketing_whatsapp_messages(
  p_operator_bitrix_id integer DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_lead_id integer DEFAULT NULL,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  phone_number text,
  bitrix_id text,
  conversation_id integer,         -- ADICIONADO
  gupshup_message_id text,
  direction text,
  message_type text,
  content text,
  template_name text,
  status text,
  sent_by text,                    -- ADICIONADO
  sender_name text,                -- ADICIONADO
  media_url text,
  media_type text,
  created_at timestamptz,
  delivered_at timestamptz,        -- ADICIONADO
  read_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  v_phone := NULLIF(REGEXP_REPLACE(COALESCE(p_phone_number, ''), '\D', '', 'g'), '');

  RETURN QUERY
  SELECT 
    m.id,
    m.phone_number,
    m.bitrix_id,
    m.conversation_id,              -- ADICIONADO
    m.gupshup_message_id,
    m.direction,
    m.message_type,
    m.content,
    m.template_name,
    m.status,
    m.sent_by,                      -- ADICIONADO
    m.sender_name,                  -- ADICIONADO
    m.media_url,
    m.media_type,
    m.created_at,
    m.delivered_at,                 -- ADICIONADO
    m.read_at,
    m.metadata
  FROM public.whatsapp_messages m
  WHERE 
    (p_lead_id IS NOT NULL AND m.bitrix_id = p_lead_id::text)
    OR (v_phone IS NOT NULL AND v_phone != '' AND (
      m.phone_number = v_phone 
      OR RIGHT(m.phone_number, 9) = RIGHT(v_phone, 9)
    ))
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;
```

---

## Arquivos a Modificar

| Recurso | Alteração |
|---------|-----------|
| Nova Migration SQL | Atualizar RPC para incluir `sender_name`, `sent_by`, `conversation_id`, `delivered_at` |

---

## Fluxo Após Correção

```text
┌───────────────────────────────────────────────────────────────┐
│ ANTES (problema):                                              │
│                                                                │
│ Paulo envia mensagem                                          │
│ ├── DB salva: sender_name = "Paulo Henrique" ✓                │
│ ├── RPC retorna: sender_name = NULL (campo não incluído)      │
│ └── UI mostra: "Você" (fallback) ✗                            │
└───────────────────────────────────────────────────────────────┘
              ↓
┌───────────────────────────────────────────────────────────────┐
│ DEPOIS (corrigido):                                            │
│                                                                │
│ Paulo envia mensagem                                          │
│ ├── DB salva: sender_name = "Paulo Henrique" ✓                │
│ ├── RPC retorna: sender_name = "Paulo Henrique" ✓             │
│ └── UI mostra: "Paulo Henrique" ✓                             │
└───────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. Quando Paulo enviar uma mensagem, aparece **"Paulo Henrique"** (seu display_name do perfil)
2. Quando Leonardo enviar, aparece **"Leonardo"**
3. Automações continuam mostrando **"Automação Bitrix"** ou **"Flow Automático"**
4. Mensagens do cliente continuam mostrando o nome vindo do WhatsApp ou **"Cliente"**

