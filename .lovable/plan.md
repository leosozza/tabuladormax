
## O que está acontecendo (e por que ficou “com erro” mesmo após corrigir)

O /whatsapp não está carregando porque o backend está retornando **PGRST203** (ambiguidade de função). Isso acontece quando existem **duas funções com o mesmo nome e mesmos parâmetros**, mas com **tipos diferentes**.

No seu caso, o frontend chama (sempre) a RPC com:

- `p_tag_filter: null`
- `p_operator_filter: null`

E hoje existem **duas versões** no banco que aceitam esses mesmos nomes:

- `... p_tag_filter text[], p_operator_filter uuid`
- `... p_tag_filter uuid[], p_operator_filter uuid`

Quando `p_tag_filter` vem como `null`, o backend **não consegue decidir** qual assinatura usar e retorna:

> “Could not choose the best candidate function…”

### Por que isso aconteceu
Em PostgreSQL, `CREATE OR REPLACE FUNCTION` **só substitui** a função se a **assinatura (tipos dos parâmetros)** for a mesma.  
Quando mudamos `p_tag_filter` de `text[]` para `uuid[]`, a assinatura muda → então o Postgres **cria uma nova função** e a antiga continua existindo (overload).  
Resultado: duas candidatas válidas + `null` = ambiguidade.

---

## Objetivo da correção

1) **Eliminar** as versões antigas (text[]) dessas 3 RPCs:
- `get_admin_whatsapp_conversations`
- `count_admin_whatsapp_conversations`
- `get_admin_whatsapp_filtered_stats`

2) Garantir que reste **apenas 1 assinatura “canônica”** (com `uuid[]` e `uuid`) para cada RPC.

3) Recarregar o “schema cache” do backend para garantir que a API pare de enxergar as versões antigas.

4) (Defensivo) Ajustar o frontend para **não enviar parâmetros nulos** quando não houver filtro (reduz risco de ambiguidades futuras).

---

## Passo a passo de implementação

### Passo 1 — Confirmar o problema no banco (diagnóstico rápido)
Rodar uma consulta (somente leitura) para listar as assinaturas existentes e confirmar que há overloads (já confirmado aqui: existem 4 versões dessas funções).

Critério de sucesso:
- Antes da correção: existem versões com `p_tag_filter text[]` e `p_tag_filter uuid[]`.

---

### Passo 2 — Criar uma migration para “limpar” overloads e recriar a versão única
Criar uma migration SQL que:

1) **DROPA todas as versões** antigas (e, idealmente, todas as assinaturas atuais) dessas RPCs.
2) **RECRIA** uma versão única e definitiva com:
   - `p_tag_filter uuid[] DEFAULT NULL`
   - `p_operator_filter uuid DEFAULT NULL`

#### SQL (estrutura planejada)
- Para cada RPC, executar `DROP FUNCTION IF EXISTS` para todas as assinaturas conhecidas.
- Depois, aplicar o `CREATE OR REPLACE FUNCTION` da versão correta (a mais recente que vocês querem manter).

Assinaturas que hoje existem (exemplo real do seu banco):
- `get_admin_whatsapp_conversations(integer,integer,text,text,text,text,text)`
- `get_admin_whatsapp_conversations(integer,integer,text,text,text,text,text,text[])`
- `get_admin_whatsapp_conversations(integer,integer,text,text,text,text,text,text[],uuid)`
- `get_admin_whatsapp_conversations(integer,integer,text,text,text,text,text,uuid[],uuid)`

E o mesmo padrão para `count_...` e `get_admin_whatsapp_filtered_stats`.

Critério de sucesso após migration:
- Para cada uma das 3 RPCs, existir **apenas 1 regprocedure** (1 assinatura).
- A assinatura final inclui `p_tag_filter uuid[]` e `p_operator_filter uuid` com defaults.

---

### Passo 3 — Recarregar o cache de schema do backend
Após aplicar a migration, disparar o recarregamento do schema cache (já existe no projeto):

- Usar o botão “Recarregar Schema Cache” (que chama a função `reload-schema-cache`).

Critério de sucesso:
- Após recarregar e dar refresh, as chamadas RPC deixam de retornar `PGRST203`.

---

### Passo 4 — Ajuste defensivo no frontend (evitar envio de `null` desnecessário)
Mesmo com o banco limpo, vamos blindar o frontend para evitar problemas parecidos no futuro:

No `useAdminWhatsAppConversations.ts`:
- Em vez de sempre mandar `p_tag_filter: null` e `p_operator_filter: null`,
- Montar o objeto de parâmetros condicionalmente, por exemplo:

- Só incluir `p_tag_filter` quando houver tags selecionadas.
- Só incluir `p_operator_filter` quando houver operador selecionado.

Isso reduz:
- Ambiguidade (se em algum momento voltar a existir overload por acidente)
- Casos de casting estranho quando filtros começarem a vir com valores inválidos

Critério de sucesso:
- No payload RPC, quando não houver filtro, os campos simplesmente **não aparecem** no JSON.

---

## Plano de verificação (teste end-to-end)
1) Abrir `/whatsapp`
2) Confirmar que a lista carrega sem o alerta “Não foi possível carregar as conversas”.
3) Abrir “Detalhes técnicos” (se existir) e confirmar que não há PGRST203.
4) Testar:
   - Sem filtros
   - Com filtro por etiqueta
   - Com filtro por operador
   - Com ambos ao mesmo tempo
5) Confirmar que os badges/estatísticas (total, abertas, não lidas) carregam também (porque usam outra RPC afetada: `get_admin_whatsapp_filtered_stats`).

---

## Risco / Observações importantes
- A correção é segura porque essas RPCs são usadas pelo seu próprio app; a ideia é estabilizar com uma única assinatura.
- Se existir algum cliente externo chamando assinaturas antigas (improvável), isso poderia quebrar esse cliente. Se você suspeitar disso, dá para optar por uma estratégia “v2” (novo nome de função) — mas o mais correto aqui é limpar overload e manter 1 assinatura só.
- Esse tipo de erro é exatamente o que acontece quando se altera tipo de parâmetro em função Postgres sem dropar assinatura antiga; depois disso, o backend fica “inde ciso” quando recebe `null`.

---

## Entregáveis
- 1 migration SQL: “cleanup overloads + recriar RPCs finais”
- 1 ajuste no hook `useAdminWhatsAppConversations.ts` para não enviar parâmetros nulos
- (Opcional) Um pequeno log/erro mais amigável na UI quando ocorrer `PGRST203` (para facilitar suporte futuro)

