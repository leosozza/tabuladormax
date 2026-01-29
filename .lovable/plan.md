
## Objetivo (o que você espera ver)
Quando você clica numa notificação (ex.: Daniele), a tela deve ficar como a “imagem 1”:
- conversa aberta na direita
- e a mesma conversa aparecendo/selecionada na lista da esquerda (sem precisar pesquisar)

Além disso, você quer parar de ver conversas duplicadas para o mesmo telefone.

---

## Diagnóstico (por que “não resolveu”)
Eu confirmei no backend que a função usada para montar a seção/lista de “Conversas Convidadas” está quebrando com este erro:

- `column l.stage_id does not exist`

Isso acontece porque a tabela `leads` **não tem** a coluna `stage_id`. Ela tem `etapa`.

Enquanto essa função falha:
- `useMyInvitedConversationsFull()` volta `[]`
- a seção “Conversas Convidadas” fica vazia
- o merge que eu fiz para inserir as convidadas na lista principal também não adiciona nada
- resultado: o chat abre (porque o clique da notificação seta `selectedConversation`), mas **a conversa não aparece na lista** (lado esquerdo)

Eu também confirmei via query que `leads` tem `etapa`:
- `leads.etapa` existe ✅
- `leads.stage_id` não existe ❌

---

## O que vou implementar (passo a passo)

### 1) Corrigir a função do backend (causa raiz)
Criar uma nova migração para **recriar** `get_my_invited_conversations_full(...)` corrigindo:
- trocar `l.stage_id` → `l.etapa`
- parar de depender de `profiles` para `inviter_name` (a própria `whatsapp_conversation_participants` já tem `inviter_name`)
- (importante) **blindar segurança**: hoje a função aceita `p_operator_id` e está `SECURITY DEFINER`; isso permite alguém chamar com outro id. Vou validar dentro da função:
  - se `p_operator_id != auth.uid()` → erro (“forbidden”)  
  (assim mantém compatibilidade com o frontend atual, mas fica seguro)

Resultado esperado: `useMyInvitedConversationsFull()` volta dados reais e a UI passa a ter informação para renderizar a conversa na lista.

Checklist técnico do SQL:
- `SET search_path = public`
- `lead_etapa` vindo de `l.etapa`
- joins tolerantes a `bitrix_id` nulo
- ordenar por prioridade e `last_message_at`

---

### 2) Fazer a lista da esquerda “nunca falhar silenciosamente”
Hoje, quando a RPC falha, o hook apenas dá `console.error` e retorna `[]`, e visualmente parece que “não existe conversa convidada”.

Vou ajustar o frontend para:
- exibir um aviso discreto na lista (ex.: “Não foi possível carregar conversas convidadas. Atualize.”) quando `useMyInvitedConversationsFull` retornar erro
- mostrar um skeleton/loading para a seção convidada enquanto carrega
Isso reduz a sensação de “cliquei e sumiu” e ajuda no diagnóstico caso aconteça de novo.

---

### 3) Garantir que ao clicar na notificação a conversa apareça na lista imediatamente
Mesmo com a RPC funcionando, pode existir um intervalo de 0.5–2s até a conversa entrar na lista (carregamento/paginação).

Vou implementar uma garantia na `AdminConversationList`:
- se existe `selectedConversation` e ela **não está** em `mergedConversations`, a lista renderiza um item “fixado” no topo (pinned) representando a conversa atual, até os dados reais carregarem.
Assim: clicou na notificação → imediatamente aparece à esquerda, selecionada.

Também vou normalizar o telefone (remover caracteres não numéricos) nas comparações/chaves, para evitar casos em que um lado tem `+55 (11)...` e o outro `5511...`.

---

### 4) Duplicidade por mesmo telefone (sem quebrar o chat)
Hoje a duplicidade é “real” na origem porque `mv_whatsapp_conversation_stats` agrupa por `(phone_number, bitrix_id)`.

Implementarei uma deduplicação **na UI** (mais rápida e sem mexer em lógica pesada de estatísticas):
- na renderização da lista principal, agrupar por `phone_number normalizado`
- manter apenas a entrada com `last_message_at` mais recente
- manter `bitrix_id`/lead info da entrada mais recente (é o que você espera ver no dia a dia)

Obs.: isso vai remover as duplicatas visuais. Se no futuro você quiser acessar o “histórico” do telefone com outro lead, a gente pode adicionar um botão “Ver histórico (2)” — mas primeiro vamos cumprir o esperado: “não duplicar”.

---

## Como vou validar (teste de ponta a ponta)
1) Entrar em `/whatsapp`
2) Receber uma notificação de convite (ex.: Daniele)
3) Clicar na notificação:
   - chat abre à direita
   - imediatamente aparece item correspondente na lista à esquerda (selecionado)
4) Confirmar que:
   - a seção “Conversas Convidadas” aparece com a Daniele
   - a Daniele também aparece na lista principal (sem precisar pesquisar)
   - não aparecem duas entradas para o mesmo telefone na lista

---

## Arquivos/partes que serão alteradas
Backend:
- Nova migração SQL: corrigir `get_my_invited_conversations_full` (stage_id → etapa) + segurança

Frontend:
- `src/hooks/useMyInvitedConversationsFull.ts` (expor/propagar estado de erro/loading de forma útil)
- `src/components/whatsapp/AdminConversationList.tsx` (aviso de erro, pinned item quando aberto por notificação, normalização de telefone, dedupe por telefone)
- (se necessário) pequenos ajustes em `InvitedConversationsSection.tsx` para normalização/seleção

---

## Resultado esperado
Depois disso, “clicar na notificação” vai sempre produzir o layout que você quer (lista + conversa) e a conversa convidada vai aparecer na lista sem precisar buscar, além de remover a duplicidade visual por telefone.
