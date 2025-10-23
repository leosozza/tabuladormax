# Arquitetura de Sincronização: TabuladorMax ↔ Gestão Scouter

## ✅ Fluxo Atual (PUSH Unidirecional)

### TabuladorMax → Gestão Scouter
- **Edge Function:** `export-to-gestao-scouter-batch`
- **Origem:** TabuladorMax tabela `leads`
- **Destino:** Gestão Scouter tabela `leads`
- **Método:** PUSH via Service Role Key
- **Interface:** Sync Monitor no TabuladorMax

### O que o Gestão Scouter precisa?
1. ✅ Tabela `public.leads` com 49 campos (já existe)
2. ✅ RLS policies configuradas (já existe)
3. ✅ Interface de monitoramento read-only (já existe)
4. ❌ **NENHUMA Edge Function necessária**

## ❌ O que NÃO é necessário

### Edge Functions que NÃO precisam ser criadas:
- `get-leads-count` - DESNECESSÁRIA
- `get-leads-for-sync` - DESNECESSÁRIA

**Por quê?** O TabuladorMax faz PUSH direto para a tabela `leads` do Gestão Scouter via REST API usando Service Role Key. Não há necessidade de Edge Functions no Gestão Scouter para receber dados.

## 🔧 Setup Necessário

### No Gestão Scouter (já configurado):

**Tabela `public.leads`** com 49 campos (ver mapeamento completo em `PROMPT_TABULADORMAX.md`)

**🔒 Política RLS Obrigatória:**

```sql
-- Permite UPSERT do TabuladorMax via service_role
CREATE POLICY "service_role_upsert_leads"
  ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_upsert_leads" ON public.leads IS 
  'Permite que service_role (usado pelo TabuladorMax) faça UPSERT de leads via sincronização';
```

**Por que é necessária:**
- TabuladorMax usa `service_role_key` do Gestão Scouter para autenticação
- Operação UPSERT requer permissões de INSERT e UPDATE simultaneamente
- `FOR ALL` cobre todas as operações (INSERT, UPDATE, DELETE, SELECT)
- `TO service_role` limita a política apenas ao role de serviço
- Sem esta política: erro "new row violates row-level security policy"

**Segurança:**
- Aplica-se apenas ao `service_role` (não afeta usuários comuns)
- Usuários autenticados continuam com políticas específicas
- Mantém auditoria via `created_at`/`updated_at`

### No TabuladorMax (já configurado):
- Credenciais do Gestão Scouter (URL + Service Key)
- Edge Function `export-to-gestao-scouter-batch`
- Mapeamento de campos
- Interface de monitoramento

## 📊 Como Funciona

```
┌─────────────────┐
│  TabuladorMax   │
│                 │
│  Edge Function: │
│  export-to-     │
│  gestao-scouter │
│  -batch         │
└────────┬────────┘
         │
         │ POST https://jstsrgyxrrlklnzgsihd.supabase.co/rest/v1/leads
         │ Authorization: Bearer [SERVICE_ROLE_KEY]
         │ Content-Type: application/json
         │ Prefer: resolution=merge-duplicates
         │ Body: [{...leads...}]
         │
         ▼
┌─────────────────┐
│ Gestão Scouter  │
│                 │
│ RLS permite     │
│ service_role    │
│                 │
│ INSERT/UPDATE   │
│ tabela leads    │
└─────────────────┘
```

## 🔄 Sincronização Bidirecional (Opcional)

### TabuladorMax ← Gestão Scouter (Webhook Reverso)

**⚠️ Importante:** Este fluxo reverso é **OPCIONAL** e atualmente **NÃO ESTÁ IMPLEMENTADO** no Gestão Scouter.

Para habilitar sincronização reversa (Gestão → TabuladorMax):

1. **No TabuladorMax**: Edge Function `sync-from-gestao-scouter` (já existe)
2. **No Gestão Scouter**: Criar trigger para chamar webhook (não existe)

```sql
-- Trigger necessário no Gestão Scouter (NÃO IMPLEMENTADO)
CREATE OR REPLACE FUNCTION notify_tabulador_on_lead_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Chama webhook do TabuladorMax
  PERFORM net.http_post(
    'https://[tabulador-url]/functions/v1/sync-from-gestao-scouter',
    jsonb_build_object(
      'operation', TG_OP,
      'lead', row_to_json(NEW)
    ),
    headers := jsonb_build_object(
      'Authorization', 'Bearer [service-key]',
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_to_tabulador
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION notify_tabulador_on_lead_change();
```

**Status atual:** Sincronização reversa **NÃO CONFIGURADA** - apenas o fluxo TabuladorMax → Gestão Scouter está ativo.

## 🚨 Erros Comuns

### "Edge Functions de PULL removidas"
**Status:** ✅ Arquitetura simplificada em 2025-10-21  
**Removidas:**
- `sync-tabulador` - Tentava fazer PULL do TabuladorMax (desnecessário)
- `test-tabulador-connection` - Testava funções que não existem no TabuladorMax
- `diagnose-tabulador-sync` - Diagnosticava fluxo PULL obsoleto

**Motivo da remoção:** O fluxo correto é PUSH unidirecional do TabuladorMax. Estas Edge Functions implementavam um fluxo PULL que nunca foi necessário.

### "Connection failed"
**Causa:** Credenciais incorretas ou RLS bloqueando.  
**Solução:** 
1. Verificar Service Role Key no TabuladorMax
2. Verificar URL do Gestão Scouter
3. Confirmar RLS policies na tabela `leads`

### "Schema mismatch" ao exportar
**Causa:** Campos faltando na tabela `leads` do Gestão Scouter.  
**Solução:**
1. No TabuladorMax, clique em "Validar Schema"
2. Copie o SQL sugerido
3. Execute no SQL Editor do Gestão Scouter
4. Aguarde 30 segundos para cache atualizar
5. Clique novamente em "Validar Schema"

## 📝 Histórico de Decisões

### Por que PUSH e não PULL?
- ✅ TabuladorMax é a fonte da verdade
- ✅ Gestão Scouter é dashboard de visualização
- ✅ PUSH é mais simples e confiável
- ✅ Menos pontos de falha
- ✅ Não precisa Edge Functions no Gestão Scouter

### Por que não Edge Functions no Gestão Scouter?
- ✅ TabuladorMax acessa REST API diretamente
- ✅ Service Role Key tem acesso total via RLS
- ✅ Edge Functions seriam redundantes
- ✅ Arquitetura mais simples = mais confiável

### Por que sincronização reversa não está implementada?
- ✅ Não há necessidade atual de editar leads no Gestão Scouter
- ✅ Gestão Scouter é primariamente um dashboard de visualização
- ✅ Reduz complexidade e riscos de loops infinitos
- ✅ Pode ser implementada no futuro se necessário

## 🔍 Monitoramento

### No TabuladorMax (Sync Monitor):
- Status da última exportação
- Total de leads exportados
- Erros e logs detalhados
- Validação de schema
- Testes de conexão

### No Gestão Scouter:
- Dashboard exibe leads sincronizados automaticamente
- Nenhuma configuração adicional necessária
- Dados aparecem assim que são enviados do TabuladorMax

## 🔧 Diagnóstico e Troubleshooting

### Botão "Sincronizar Schema" na UI

O painel de sincronização possui um botão **"🔄 Sincronizar Schema"** que:
- 🔍 Analisa automaticamente schemas de ambos os projetos
- 📊 Identifica colunas faltantes no Gestão Scouter
- ➕ Adiciona automaticamente todas as colunas necessárias
- 🔧 Cria índices para otimização
- 🔄 Recarrega schema cache
- ✅ Elimina erros PGRST204 e 42501 relacionados a campos

**Como usar:**
1. Clique em **"Sincronizar Schema"** no painel de integrações
2. Confirme a ação
3. Aguarde 5-15 segundos
4. Verifique o resultado no toast

**Quando usar:**
- Após atualizações no TabuladorMax que adicionaram novos campos
- Quando aparecem erros de "coluna não encontrada"
- Antes de iniciar sincronização de dados
- Periodicamente para garantir compatibilidade

### Botão "Diagnóstico RLS" na UI

O painel de sincronização possui um botão **"Diagnóstico RLS"** que executa automaticamente:
- ✅ Teste de conexão com tabela `leads`
- ✅ Verificação de políticas RLS
- ✅ Reload de schema cache
- ✅ Teste de UPSERT

### Erro 42501 - Insufficient Privilege

Se receber erro **42501**, significa que a política RLS está incorreta ou schema cache desatualizado.

**Solução Rápida:**
1. Clique em **"Sincronizar Schema"** para garantir compatibilidade
2. Clique em **"Diagnóstico RLS"** no painel de integrações
3. Aguarde os resultados aparecerem
4. Siga as recomendações apresentadas

**Solução Manual:**
```sql
NOTIFY pgrst, 'reload schema';
```

Aguarde 10 segundos e tente novamente.

### Erro PGRST204 - Coluna não encontrada

Se receber erro **PGRST204**, significa que TabuladorMax está tentando enviar dados para colunas que não existem no Gestão Scouter.

**Solução Automática:**
1. Clique em **"Sincronizar Schema"** no painel de integrações
2. Aguarde a sincronização completar
3. Verifique o toast para ver quantas colunas foram adicionadas
4. Teste novamente a sincronização de dados

**Solução Manual:**
Execute o SQL gerado pela edge function `sync-schema-from-tabulador`.

## 📚 Documentação Relacionada

- [SCHEMA_AUTO_SYNC.md](./docs/SCHEMA_AUTO_SYNC.md) - Guia completo de Auto-Sync de Schema
- [DIAGNOSTICO_RLS.md](./docs/DIAGNOSTICO_RLS.md) - Guia completo de diagnóstico
- [README.md](./README.md) - Visão geral do projeto
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) - Arquitetura de dados
- Edge Function: `supabase/functions/sync-schema-from-tabulador/index.ts`
- Edge Function: `supabase/functions/diagnose-gestao-rls/index.ts`
- Componente UI: `src/components/dashboard/integrations/TabuladorSync.tsx`

---

**Última atualização:** 2025-10-21  
**Status:** ✅ Arquitetura simplificada e funcional
