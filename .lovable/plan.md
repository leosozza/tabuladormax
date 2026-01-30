# Documentação: Prevenção de Erros PGRST203 (Overload de Funções RPC)

## Última atualização: 2026-01-30

---

## 📋 Resumo do problema resolvido

O `/whatsapp` parava de carregar devido a erros **PGRST203** causados por múltiplas versões (overloads) das mesmas funções RPC com assinaturas diferentes. O PostgREST não conseguia determinar qual função usar quando os parâmetros eram compatíveis com mais de uma assinatura.

---

## ✅ Estado atual (CORRIGIDO)

### Funções RPC do WhatsApp - Assinatura Canônica Única

Cada função agora possui **UMA ÚNICA VERSÃO** com a seguinte assinatura:

#### 1. `get_admin_whatsapp_conversations`
```sql
(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
```

#### 2. `count_admin_whatsapp_conversations`
```sql
(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
```

#### 3. `get_admin_whatsapp_filtered_stats`
```sql
(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
```

---

## 🚫 Regras para evitar erros futuros

### 1. NUNCA criar overloads de funções RPC
- Ao modificar uma função RPC, sempre use `DROP FUNCTION IF EXISTS` com a assinatura exata ANTES de `CREATE OR REPLACE`
- PostgreSQL cria uma NOVA função (overload) se a assinatura diferir, mesmo usando `CREATE OR REPLACE`

### 2. Tipos canônicos obrigatórios
- **Tags**: sempre `uuid[]` (nunca `text[]`)
- **Operador**: sempre `uuid` (nunca `text`)
- Esses tipos evitam ambiguidade quando o frontend envia `null`

### 3. Template para modificar RPCs
```sql
-- PASSO 1: Dropar TODAS as versões existentes (listar todas as assinaturas conhecidas)
DROP FUNCTION IF EXISTS public.nome_funcao(assinatura1);
DROP FUNCTION IF EXISTS public.nome_funcao(assinatura2);
-- ... dropar TODAS

-- PASSO 2: Recriar UMA única versão
CREATE OR REPLACE FUNCTION public.nome_funcao(
  -- parâmetros com tipos canônicos
)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
...
$function$;

-- PASSO 3: Recarregar schema cache
NOTIFY pgrst, 'reload schema';
```

### 4. Verificação pós-migração
Após qualquer migração de RPC, executar:
```sql
SELECT proname, pg_get_function_identity_arguments(oid), COUNT(*) OVER (PARTITION BY proname)
FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'NOME_DA_FUNCAO';
```
Se retornar mais de 1 linha → há overload → ERRO

---

## 🔧 Correções aplicadas no frontend

### 1. `useAdminWhatsAppConversations.ts`
- Tratamento explícito do erro `PGRST203` com mensagem clara
- Parâmetros enviados apenas quando têm valor (evita ambiguidade com `null`)

### 2. `AdminConversationList.tsx` (operatorOptions)
- Busca em 2 passos: primeiro `operator_id`, depois `profiles` separadamente
- Evita joins com FK que aponta para `auth.users`

### 3. `useConversationParticipants.ts`
- Mesmo padrão de 2 passos
- Usa `display_name` (não `full_name` que não existe)

---

## 📊 Outras funções com overloads (monitorar)

Funções que ainda possuem múltiplas versões (podem precisar de limpeza futura):

| Função | Overloads | Risco |
|--------|-----------|-------|
| `get_scouter_leads_simple` | 3 | Médio |
| `cleanup_old_rate_limits` | 2 | Baixo |
| `get_comparecidos_by_date` | 2 | Médio |
| `get_leads_stats` | 2 | Médio |
| `get_scouter_leads` | 2 | Médio |
| `get_telemarketing_conversations` | 2 | Médio |
| `get_telemarketing_metrics` | 2 | Médio |
| `get_telemarketing_whatsapp_messages` | 2 | Médio |

---

## 🔄 Sincronização de Deals com Bitrix24

### Problema identificado
Deals deletados no Bitrix permaneciam no sistema local (tabela `deals` e `negotiations`), causando inconsistência de dados.

### Solução implementada

#### 1. Ação `cleanup_deleted` na Edge Function `sync-deals-from-bitrix`
```typescript
// Chamada via dealsService.ts
await cleanupDeletedDeals(100); // Verifica até 100 deals

// Retorno
{
  checked: number,      // Quantidade verificada
  deleted: number,      // Quantidade removida
  deletedDeals: Array,  // Lista dos deals removidos
  existing: number      // Quantidade que ainda existe
}
```

#### 2. Fluxo de limpeza
1. Busca deals locais ordenados por `last_sync_at` (mais antigos primeiro)
2. Para cada deal, verifica se existe no Bitrix via API
3. Se não existir no Bitrix:
   - Deleta a negotiation associada
   - Deleta o deal
4. Loga cada remoção para auditoria

#### 3. Função de serviço disponível
```typescript
import { cleanupDeletedDeals } from '@/services/dealsService';

const result = await cleanupDeletedDeals(50);
console.log(`Removidos ${result.deleted} deals órfãos`);
```

### Recomendações de uso
- Executar periodicamente (diário ou semanal)
- Pode ser acionado manualmente pelo admin quando necessário
- Limite recomendado: 50-100 por execução (evita timeout)

---

## 🔄 Checklist para novas migrações de RPC

- [ ] Listei TODAS as assinaturas existentes da função?
- [ ] Adicionei `DROP FUNCTION IF EXISTS` para CADA assinatura?
- [ ] Usei tipos canônicos (`uuid[]`, `uuid`)?
- [ ] Adicionei `SECURITY DEFINER SET search_path = public`?
- [ ] Incluí `NOTIFY pgrst, 'reload schema'` no final?
- [ ] Verifiquei com query se há apenas 1 versão após migração?

---

## 📁 Arquivos importantes

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/sync-deals-from-bitrix/index.ts` | Edge function de sync de deals |
| `src/services/dealsService.ts` | Serviço de deals (frontend) |
| `src/services/agenciamentoService.ts` | Serviço de negociações |
| `src/hooks/useAdminWhatsAppConversations.ts` | Hook do WhatsApp admin |

---

## 📅 Histórico de correções

| Data | Problema | Solução |
|------|----------|---------|
| 2026-01-30 | PGRST203 no /whatsapp | Unificação de RPCs do WhatsApp |
| 2026-01-30 | Deals deletados no Bitrix permanecem | Ação `cleanup_deleted` |
