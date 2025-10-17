# Correção de Sincronização TabuladorMax ↔ Gestão Scouter

## ✅ Problemas Resolvidos

Este PR resolve os seguintes problemas de sincronização entre TabuladorMax e Gestão Scouter:

1. **✅ Updates vindos de Gestão Scouter são ignorados pelos triggers de Bitrix**
   - Implementado via cláusula WHEN nos triggers
   - Campo sync_source é verificado antes de disparar sincronizações

2. **✅ Tabela gestao_scouter_config está preenchida e ativa**
   - Migration insere configuração padrão se não existir
   - Requer configuração manual das credenciais (project_url e anon_key)

3. **✅ Schema da tabela leads alinhado com schema fichas**
   - Colunas sync_source, sync_status, last_sync_at adicionadas
   - Índices criados para performance

4. **✅ Logging detalhado em sync_events**
   - Campo error_message armazena JSON com metadados
   - Inclui action, lead_name, sync_source, timestamp
   - Registra também operações ignoradas (skipped)

5. **✅ Resolução de conflitos baseada em updated_at**
   - Implementado nas Edge Functions
   - Estratégia last-write-wins
   - Versões mais antigas são ignoradas

6. **✅ Prevenção de loops e duplicidade ativa**
   - Cláusulas WHEN nos triggers
   - Verificação de sync_source nas Edge Functions
   - Parâmetro source verificado em todas as chamadas

## 📁 Arquivos Modificados

### SQL Migrations
- `supabase/migrations/20251017030000_fix_sync_conflicts.sql`
  - Adiciona colunas de sincronização
  - Atualiza trigger do Bitrix
  - Popula gestao_scouter_config
  
- `supabase/migrations/20251017030500_fix_gestao_scouter_trigger.sql`
  - Corrige função trigger_sync_to_gestao_scouter
  - Remove tentativa de modificar NEW em AFTER trigger

### Edge Functions
- `supabase/functions/sync-from-gestao-scouter/index.ts`
  - Adiciona resolução de conflitos
  - Melhora logging
  
- `supabase/functions/sync-to-gestao-scouter/index.ts`
  - Adiciona resolução de conflitos
  - Melhora logging

### Documentação
- `docs/TESTE_SINCRONIZACAO_GESTAO_SCOUTER.md` - Guia completo de testes
- `docs/IMPLEMENTACAO_SYNC_FIX.md` - Resumo da implementação

## 🚀 Como Usar

### 1. Aplicar Migrations
As migrations serão aplicadas automaticamente pelo Supabase. Após o merge:
```sql
-- Verificar se as colunas foram criadas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name IN ('sync_source', 'sync_status', 'last_sync_at');
```

### 2. Configurar Credenciais do Gestão Scouter
```sql
UPDATE gestao_scouter_config
SET 
  project_url = 'https://[SEU_PROJETO].supabase.co',
  anon_key = '[SUA_ANON_KEY]'
WHERE active = true;
```

### 3. Configurar Webhook no Gestão Scouter
No projeto Gestão Scouter, configurar trigger na tabela `fichas` para chamar:
```
POST https://[TABULADORMAX].supabase.co/functions/v1/sync-from-gestao-scouter
```

### 4. Testar Sincronização
Seguir o guia em `docs/TESTE_SINCRONIZACAO_GESTAO_SCOUTER.md`

## 📊 Monitoramento

### Verificar sincronizações recentes:
```sql
SELECT event_type, direction, lead_id, status, created_at
FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
ORDER BY created_at DESC
LIMIT 20;
```

### Verificar erros:
```sql
SELECT * FROM sync_events
WHERE status = 'error' 
  AND direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
ORDER BY created_at DESC;
```

### Verificar atualizações ignoradas:
```sql
SELECT * FROM sync_events
WHERE error_message LIKE '%Skipped%'
ORDER BY created_at DESC;
```

## 🔍 Arquitetura de Sincronização

```
TabuladorMax (leads)           Gestão Scouter (fichas)
        │                              │
        │  1. Update com              │
        │     sync_source=NULL        │
        ├──────────────────────────►  │
        │  Trigger detecta            │
        │  Chama sync-to-gestao       │
        │                             │
        │  2. Verifica updated_at     │
        │     Cria/atualiza ficha     │
        │     sync_source='tabuladormax'
        │                             │
        │                             │  3. Update na ficha
        │  4. Webhook chama           │     (manual ou sistema)
        │     sync-from-gestao        │
        │ ◄──────────────────────────┤
        │  5. Verifica updated_at     │
        │     Atualiza lead           │
        │     sync_source='gestao_scouter'
        │                             │
```

## ⚠️ Notas Importantes

1. **Configuração Manual Necessária**: 
   - Após o merge, configurar `gestao_scouter_config` com as credenciais corretas

2. **Webhook no Gestão Scouter**:
   - Precisa ser configurado manualmente no projeto Gestão Scouter

3. **Resolução de Conflitos**:
   - Usa estratégia last-write-wins baseada em `updated_at`
   - A versão mais recente sempre prevalece

4. **Prevenção de Loops**:
   - Funciona via campo `sync_source` e cláusulas WHEN nos triggers
   - Não requer intervenção manual

5. **Performance**:
   - Triggers usam cláusulas WHEN para não executar desnecessariamente
   - Índices criados em campos de sincronização

## 📚 Documentação Adicional

- **Testes**: `docs/TESTE_SINCRONIZACAO_GESTAO_SCOUTER.md`
- **Implementação**: `docs/IMPLEMENTACAO_SYNC_FIX.md`
- **Schema Fichas**: `docs/gestao-scouter-fichas-table.sql`

## 🐛 Troubleshooting

### Sincronização não funciona
1. Verificar se `gestao_scouter_config` tem credenciais corretas
2. Verificar logs das Edge Functions
3. Verificar se triggers estão habilitados

### Loops de sincronização
1. Verificar se `sync_source` está sendo setado corretamente
2. Verificar logs em `sync_events`
3. Verificar cláusulas WHEN dos triggers

### Dados sendo sobrescritos
1. Verificar timestamps `updated_at` em ambas as tabelas
2. Verificar logs de sincronizações ignoradas
3. Revisar lógica de resolução de conflitos nas Edge Functions

## ✅ Checklist de Validação

Após o merge e configuração:

- [ ] Colunas de sincronização existem na tabela leads
- [ ] gestao_scouter_config está configurada e ativa
- [ ] Triggers ignoram sync_source corretamente
- [ ] Edge Functions implementam resolução de conflitos
- [ ] Logging detalhado funciona em sync_events
- [ ] Testes de loop prevention passam
- [ ] Testes de conflict resolution passam
- [ ] Monitoramento está funcionando

## 👥 Suporte

Para problemas ou dúvidas:
1. Verificar documentação em `docs/`
2. Verificar logs em `sync_events`
3. Verificar logs das Edge Functions no dashboard Supabase
