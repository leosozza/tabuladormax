
Objetivo
- Fazer o /whatsapp voltar a carregar (lista + chat) de forma estável, mesmo após mudanças pequenas, eliminando as causas reais de “quebra em cadeia”.

O que está acontecendo (causa raiz já confirmada)
1) A lista do /whatsapp não carrega porque a chamada RPC falha com:
- PGRST203: “Could not choose the best candidate function…”
- Isso acontece porque existem múltiplas versões (overloads) de public.get_admin_whatsapp_conversations com assinaturas diferentes (ex.: p_tag_filter text[] vs uuid[] e p_operator_filter text vs uuid). Como o frontend envia parâmetros compatíveis com ambas, o backend não consegue escolher “a melhor” e devolve erro 300/PGRST203. Resultado: conversa não lista => não dá para abrir => “mensagens não carregam”.

2) Além disso, há erro 400 recorrente ao buscar participantes:
- GET /rest/v1/whatsapp_conversation_participants?select=operator_id,operator:profiles!whatsapp_conversation_participants_operator_id_fkey(...)
- O FK whatsapp_conversation_participants_operator_id_fkey aponta para auth.users (não para profiles), então esse “join” com profiles falha (400).
- Também há uso de colunas inexistentes (ex.: full_name/photo_url em profiles) em alguns pontos do código.

Estratégia de correção (para parar de “quebrar sempre”)
A) Zerar a ambiguidade: remover overloads e deixar 1 assinatura canônica por RPC
B) Tornar as queries de participantes robustas (sem depender de FK incorreto)
C) Recarregar o schema cache após alterações de RPC (para o backend refletir imediatamente as assinaturas)

Plano de implementação

1) Correção no banco (migração SQL) — “limpeza de overloads”
1.1. Mapear e dropar TODAS as assinaturas antigas (overloads) destes RPCs:
- public.get_admin_whatsapp_conversations
- public.count_admin_whatsapp_conversations
- public.get_admin_whatsapp_filtered_stats

Observação: hoje existem, pelo menos, estas assinaturas coexistindo (confirmadas via leitura do catálogo do banco):
- get_admin_whatsapp_conversations(
    p_limit integer, p_offset integer, p_search text, p_window_filter text, p_response_filter text,
    p_etapa_filter text, p_deal_status_filter text, p_tag_filter uuid[], p_operator_filter uuid
  )  -- (sem p_closed_filter, retorno diferente)
- get_admin_whatsapp_conversations(
    p_search text, p_limit integer, p_offset integer, p_window_filter text, p_response_filter text,
    p_etapa_filter text, p_tag_filter text[], p_operator_filter text, p_deal_status_filter text, p_closed_filter text
  )
- get_admin_whatsapp_conversations(
    p_search text, p_limit integer, p_offset integer, p_window_filter text, p_response_filter text,
    p_etapa_filter text, p_tag_filter uuid[], p_operator_filter uuid, p_deal_status_filter text, p_closed_filter text
  )
E o mesmo padrão de duplicidade existe em count_admin_whatsapp_conversations e get_admin_whatsapp_filtered_stats.

1.2. Recriar somente 1 versão canônica de cada função (sem overloads), com:
- Assinatura exatamente compatível com o que o frontend envia hoje (incluindo p_closed_filter).
- Tipos canônicos:
  - p_tag_filter uuid[] DEFAULT NULL
  - p_operator_filter uuid DEFAULT NULL
- SECURITY DEFINER + SET search_path = public (para consistência e evitar problemas de permissão/rls em leitura agregada).
- Retorno contendo is_closed (para badge “Encerrada” persistir).
- Remover qualquer referência a colunas inexistentes (ex.: wcp.resolved_at) — isso precisa ser excluído, porque a tabela não tem essa coluna.

1.3. Garantir que a função NUNCA dependa do overload “text[]/text”.
- Ou seja: não teremos mais a versão p_tag_filter text[] / p_operator_filter text.
- Isso elimina definitivamente o PGRST203.

2) Recarregar schema cache imediatamente após a migração
2.1. No final da migração SQL, executar:
- NOTIFY pgrst, 'reload schema';
(ou acionar o botão/funcionalidade já existente de “Recarregar Schema Cache” no admin, se preferirem via UI)

Resultado esperado: o /whatsapp volta a chamar RPC sem ambiguidade imediatamente (sem esperar cache).

3) Correção no frontend: participantes (erro 400) sem depender de FK para profiles
3.1. src/components/whatsapp/AdminConversationList.tsx (operatorOptions)
Problema atual:
- Faz join com profiles via profiles!whatsapp_conversation_participants_operator_id_fkey, mas esse FK aponta para auth.users.
Correção:
- Trocar por uma estratégia em 2 passos:
  1) Buscar apenas operator_id da tabela whatsapp_conversation_participants (sem join).
     - Opcional: usar select('operator_id') e deduplicar no client.
  2) Buscar profiles com .in('id', operatorIds) e montar o display_name localmente.
- Se profiles não tiver algum id (caso raro), mostrar fallback “Operador”.

3.2. src/hooks/useConversationParticipants.ts + src/components/whatsapp/ConversationParticipants.tsx
Problema atual:
- Tenta selecionar operator:profiles!(...) com campos full_name/photo_url, mas profiles tem apenas display_name/email/created_at/updated_at.
Correção:
- Mesmo padrão 2 passos:
  - Buscar participantes (operator_id, role etc.)
  - Buscar profiles em lote (id, display_name) e “enriquecer” o resultado.
- Ajustar a UI para usar display_name (não full_name) e remover dependência de photo_url (ou usar avatar fallback com iniciais).

Benefício: elimina os 400 constantes e evita que pequenas mudanças em FK/caches derrubem o /whatsapp.

4) Hardening (para não “quebrar tudo” na próxima mudança)
4.1. Tratar explicitamente o erro PGRST203 no hook do admin list
- Em src/hooks/useAdminWhatsAppConversations.ts, quando convError.code === 'PGRST203':
  - Mostrar mensagem objetiva: “Erro de assinatura do backend (cache/overload). Clique em ‘Recarregar Schema Cache’ e tente novamente.”
  - Isso reduz tempo de diagnóstico quando acontecer algo parecido.

4.2. (Opcional, mas recomendado) Centralizar contrato de parâmetros das RPCs
- Criar um helper local (ex.: buildAdminConversationsRpcParams) para não “divergir” parâmetros em 3 lugares (list/stats/count).

5) Checklist de validação (fim-a-fim)
- Abrir /whatsapp
- Verificar no Network:
  - rpc/get_admin_whatsapp_conversations => 200 (não 300)
  - rpc/get_admin_whatsapp_filtered_stats => 200
  - (Se aplicável) rpc/count_admin_whatsapp_conversations => 200
- Verificar UI:
  - Lista de conversas aparece
  - Filtros funcionam
  - Abrir conversa => mensagens carregam
  - Badge “Encerrada” persiste após refresh
- Verificar que erros 400 de whatsapp_conversation_participants não aparecem mais.

Impacto esperado
- O /whatsapp deixa de “parar de funcionar” após mudanças pequenas porque:
  - Não existirá mais ambiguidade de overload (principal causa do travamento)
  - Participantes não dependerão de joins frágeis/errados com FK
  - Cache do schema será atualizado na hora após migrações

Riscos e mitigação
- Risco: existir ainda alguma outra chamada antiga que “esperava” a assinatura text[]/text.
  - Mitigação: como o frontend atual envia UUIDs como strings, a assinatura uuid[]/uuid cobre o caso e é a desejada. Qualquer lugar que envie texto não-UUID deverá ser corrigido para enviar UUID (ou deixar null).
- Risco: após dropar overloads, uma chamada com parâmetros “errados” falhará com erro claro (em vez de ambíguo).
  - Mitigação: adicionar validação e fallback no frontend e manter params opcionais só quando existirem.

Sequência de execução
1) Aplicar migração SQL: DROP overloads + CREATE 1 assinatura canônica para as 3 RPCs + NOTIFY reload schema
2) Ajustar queries de participantes no frontend (AdminConversationList + useConversationParticipants + ConversationParticipants)
3) Teste fim-a-fim no /whatsapp (lista + abrir conversa + mensagens + encerramento + refresh)
