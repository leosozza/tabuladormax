
# Plano: Corrigir Erro de Acesso ao WhatsApp dos Agentes

## Problema Identificado

Os agentes estão recebendo erro ao acessar `/portal-telemarketing/whatsapp` porque existe **duas versões** da função `get_telemarketing_whatsapp_messages` no banco de dados:

| OID | Parâmetro p_lead_id | Limite |
|-----|---------------------|--------|
| 4373305 | `bigint` | 500 |
| 5591099 | `integer` | 200 |

**Erro exibido no console:**
```
PGRST203: Could not choose the best candidate function between:
- public.get_telemarketing_whatsapp_messages(...p_lead_id => bigint...)
- public.get_telemarketing_whatsapp_messages(...p_lead_id => integer...)
```

Isso causa **ambiguidade** no PostgREST que não sabe qual função chamar.

## Causa Raiz

Uma migration anterior criou a função com `bigint`, e outra migration posterior recriou com `integer`, mas sem dropar a versão antiga primeiro.

## Solução

Executar migration SQL para remover a função duplicada (versão `bigint`):

```sql
-- Dropar a versão antiga com p_lead_id bigint
DROP FUNCTION IF EXISTS public.get_telemarketing_whatsapp_messages(
  integer, text, bigint, integer[], integer
);
```

Isso manterá apenas a versão correta com `p_lead_id integer`.

## Impacto

- Nenhum código precisa ser alterado
- Apenas a função duplicada será removida do banco
- A função restante continuará funcionando normalmente

## Resumo

| Ação | Descrição |
|------|-----------|
| Drop function | Remover versão com `p_lead_id bigint` |
| Resultado | Agentes poderão acessar WhatsApp novamente |
