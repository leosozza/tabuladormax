
Objetivo: fazer uma revisão profunda e corrigir por que a rota **/whatsapp** não carrega conversas.

## Diagnóstico (causa raiz confirmada)
A lista não carrega porque a chamada do backend que busca conversas está falhando:

- Request: `rpc/get_admin_whatsapp_conversations`
- Status: **400**
- Erro: **`column s.last_message_preview does not exist`**

Ou seja: a função `get_admin_whatsapp_conversations` está selecionando campos que **não existem mais** na materialized view `mv_whatsapp_conversation_stats`.

### Evidência técnica (o que está quebrado)
A função atual (backend) faz:
- `SELECT s.last_message_preview, s.last_message_direction ... FROM mv_whatsapp_conversation_stats s`

Mas a view atual tem apenas:
- `phone_number`, `bitrix_id`, `last_customer_message_at`, `last_operator_message_at`, `last_message_at`, `unread_count`, `total_messages`, `response_status`, `is_window_open`, `is_closed`
e **não** possui `last_message_preview` e `last_message_direction`.

Isso ocorreu porque a migration `20260127210600_d6099b22-7dfa-4858-a11c-f2fc80a60c83.sql` recriou a view para suportar `in_progress`, mas removeu (sem querer) os campos de preview/direction que o frontend depende.

## Estratégia de correção
Corrigir a view para voltar a expor as colunas esperadas **sem perder** o status “Em Atendimento”.

### Resultado esperado após correção
- `/whatsapp` volta a listar conversas imediatamente
- filtros (“Todos / Aguardando / Sem resposta / Respondeu / Em Atendimento”) voltam a funcionar
- preview da última mensagem e direção voltam a aparecer sem quebrar as queries

---

## Plano de implementação

### 1) Backend: recriar `mv_whatsapp_conversation_stats` com colunas completas (fix principal)
Criar uma migration que:
1. **DROP + CREATE** da `mv_whatsapp_conversation_stats` contendo estas colunas (mínimo necessário):
   - `phone_number`
   - `bitrix_id`
   - `last_message_at`
   - `last_customer_message_at`
   - `last_operator_message_at`
   - `unread_count`
   - `total_messages`
   - `last_message_preview`  ✅ (reintroduzir)
   - `last_message_direction` ✅ (reintroduzir)
   - `response_status` ✅ (manter + incluir `in_progress`)
   - `is_window_open`
   - `is_closed`

2. Calcular `last_message_preview` e `last_message_direction` com agregação ordenada (padrão já usado nas migrations antigas), por exemplo:
   - preview: `(array_agg(preview_value ORDER BY created_at DESC))[1]`
   - direction: `(array_agg(direction ORDER BY created_at DESC))[1]`

3. Manter a regra do “Em Atendimento”:
   - `in_progress` quando existe mensagem outbound com `sent_by='operador'` mais recente que a última inbound.

4. Recriar índices importantes:
   - unique `(phone_number, bitrix_id)` (ou `(phone_number, COALESCE(bitrix_id,''))` se quisermos mais robusto com NULL)
   - `response_status`
   - `is_window_open`
   - `is_closed`
   - (recomendado) `last_message_at DESC` para performance da lista

5. Reaplicar permissões (GRANT SELECT) e finalizar com um refresh (ou já criar com dados; refresh extra é opcional).

**Por que isso resolve:** a RPC `get_admin_whatsapp_conversations` volta a encontrar `s.last_message_preview` e `s.last_message_direction`, deixando de retornar 400.

---

### 2) Backend: validação pós-migration (checagem profunda)
Após recriar a view, validar com queries de leitura (sem depender do front):
1. Conferir colunas via `pg_attribute` para garantir que preview/direction existem.
2. Rodar:
   - `select * from get_admin_whatsapp_conversations(10,0,null,'all','all',null,'all');`
   e confirmar:
   - retorna **200/sem erro**
   - campos `last_message_preview` e `last_message_direction` vêm preenchidos
3. Confirmar também:
   - `get_admin_whatsapp_filtered_stats` e `count_admin_whatsapp_conversations` continuam OK (não devem quebrar, pois já usam colunas existentes)

---

### 3) Frontend: melhorar feedback quando o backend falha (hardening)
Hoje, quando a RPC quebra, o usuário vê “Nenhuma conversa encontrada”, o que mascara o problema.

Alterar `src/components/whatsapp/AdminConversationList.tsx` para:
1. Usar o `error` vindo do `useAdminWhatsAppConversations`.
2. Se `error` existir, renderizar um estado de erro:
   - “Não foi possível carregar as conversas”
   - Botão “Tentar novamente” (chama `refetch()`)
   - Detalhe do erro em um `<details>` (apenas para admins), por exemplo `error.message`

Isso não é o fix principal, mas evita “apagões silenciosos” no futuro.

---

### 4) Verificação manual na UI (critério de aceite)
Após as correções:
1. Abrir `/whatsapp`
2. Confirmar:
   - conversas aparecem
   - preview e timestamp aparecem
   - filtros funcionam
   - “Em Atendimento” aparece quando o último envio outbound humano for mais recente que o inbound
3. Confirmar no Network do navegador:
   - `rpc/get_admin_whatsapp_conversations` retorna 200

---

## Riscos e cuidados
- Recriar materialized view pode demorar alguns segundos dependendo do volume; é o caminho mais rápido e seguro para restaurar compatibilidade.
- Precisamos manter o cálculo de preview compatível com mensagens sem `content` (ex.: mídia). Vamos definir fallback (“[Mídia]”, “image”, etc.) para não ficar preview vazio.

---

## Entregáveis (o que será alterado)
1. Uma migration nova corrigindo a `mv_whatsapp_conversation_stats`.
2. Pequena melhoria de UI no `AdminConversationList` para exibir erro real quando existir.

Se você aprovar, eu executo essa correção começando pelo backend (que é o que está impedindo o carregamento agora).
