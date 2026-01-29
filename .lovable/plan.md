
# Correção: Materialized View de Conversas WhatsApp Não Está Atualizando

## Problema Identificado

A materialized view `mv_whatsapp_conversation_stats` está **38 horas desatualizada**, causando:
- Filtro "Janela Aberta" mostrando 0 conversas
- Status de resposta incorreto
- Contagens erradas no dashboard

### Causa Raiz

O cron job `refresh-whatsapp-stats` está falhando a cada 2 minutos com o erro:

```text
cannot refresh materialized view "public.mv_whatsapp_conversation_stats" concurrently
```

Isso ocorre porque o índice único da view (`phone_number, bitrix_id`) não trata corretamente valores NULL em `bitrix_id`. Quando há múltiplas conversas com `bitrix_id = NULL`, o PostgreSQL não consegue garantir unicidade.

### Evidências

| Métrica | Valor |
|---------|-------|
| Última mensagem na tabela | 2026-01-29 11:14:15 |
| Última mensagem na view | 2026-01-27 21:20:04 |
| Diferença | ~38 horas |
| Conversas com janela aberta (real) | 762 |
| Conversas com janela aberta (view) | 0 |

---

## Solução

### Passo 1: Corrigir o Índice Único

O índice precisa tratar NULL corretamente usando COALESCE:

```sql
-- Remover índice existente
DROP INDEX IF EXISTS mv_whatsapp_conversation_stats_phone_number_bitrix_id_idx;

-- Recriar com tratamento de NULL
CREATE UNIQUE INDEX idx_mv_whatsapp_stats_phone_bitrix 
ON mv_whatsapp_conversation_stats (phone_number, COALESCE(bitrix_id, ''));
```

### Passo 2: Forçar Refresh Imediato

Após corrigir o índice, fazer refresh sem CONCURRENTLY (mais lento mas funciona):

```sql
REFRESH MATERIALIZED VIEW mv_whatsapp_conversation_stats;
```

### Passo 3: Atualizar Função de Refresh

A função `refresh_whatsapp_stats()` deve ter fallback caso o concurrent falhe:

```sql
CREATE OR REPLACE FUNCTION refresh_whatsapp_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Tentar refresh concurrent primeiro (mais rápido, não bloqueia leitura)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_whatsapp_conversation_stats;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar, fazer refresh normal (bloqueia mas funciona)
    RAISE NOTICE 'Concurrent refresh failed, doing full refresh';
    REFRESH MATERIALIZED VIEW mv_whatsapp_conversation_stats;
  END;
END;
$$;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Corrigir índice e função de refresh |

## Resultado Esperado

Após a correção:
- View será atualizada a cada 2 minutos corretamente
- Filtro "Janela Aberta" mostrará as 762+ conversas reais
- Status de resposta refletirá dados atuais

---

## Detalhes Técnicos

### Por que CONCURRENTLY falha com NULL?

O PostgreSQL requer que todas as linhas tenham valores únicos no índice para refresh concurrent. Com `bitrix_id = NULL`, múltiplas linhas podem ter o mesmo par `(phone_number, NULL)`, violando a unicidade.

Usar `COALESCE(bitrix_id, '')` converte NULL para string vazia, garantindo unicidade.

### Verificação do Índice Atual

O índice existente é:
```sql
CREATE UNIQUE INDEX idx_mv_whatsapp_stats_phone_bitrix 
ON mv_whatsapp_conversation_stats (phone_number, COALESCE(bitrix_id, ''::text))
```

Mas a view foi recriada em `20260127210600_d6099b22-7dfa-4858-a11c-f2fc80a60c83.sql` com:
```sql
CREATE UNIQUE INDEX ON mv_whatsapp_conversation_stats (phone_number, bitrix_id);
```

Isso sobrescreveu o índice correto com um que não trata NULL.
