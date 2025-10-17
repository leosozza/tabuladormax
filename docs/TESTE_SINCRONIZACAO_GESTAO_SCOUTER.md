# Teste de Sincronização TabuladorMax ↔ Gestão Scouter

## Configuração Inicial

### 1. Verificar colunas de sincronização na tabela leads
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'leads'
  AND column_name IN ('sync_source', 'sync_status', 'last_sync_at');
```

**Resultado esperado:**
- sync_source: TEXT, nullable
- sync_status: TEXT, nullable
- last_sync_at: TIMESTAMPTZ, nullable

### 2. Verificar configuração do gestao-scouter
```sql
SELECT id, project_url, active, sync_enabled, created_at
FROM gestao_scouter_config
WHERE active = true;
```

**Resultado esperado:**
- Deve existir pelo menos um registro ativo com sync_enabled = true
- Se não existir, configurar manualmente com as credenciais corretas

### 3. Verificar triggers existentes
```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'leads'
  AND trigger_name LIKE '%gestao%';
```

**Resultado esperado:**
- sync_lead_to_gestao_scouter_on_update: AFTER UPDATE ON leads

## Testes de Prevenção de Loops

### Teste 1: Update vindo de Gestão Scouter deve ser ignorado pelo trigger do Bitrix
```sql
-- Simular update de lead vindo do gestao-scouter
UPDATE leads
SET 
  name = 'Teste Gestao Scouter',
  sync_source = 'gestao_scouter',
  updated_at = NOW()
WHERE id = [ID_TESTE];

-- Verificar se o trigger do Bitrix NÃO foi acionado
SELECT * FROM sync_events
WHERE lead_id = [ID_TESTE]
  AND direction = 'supabase_to_bitrix'
  AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- NÃO deve haver registros de sincronização para Bitrix
- sync_source deve ter sido resetado para NULL

### Teste 2: Update vindo de Gestão Scouter não deve acionar trigger de volta
```sql
-- Simular update de lead vindo do gestao-scouter
UPDATE leads
SET 
  name = 'Teste Loop Prevention',
  sync_source = 'gestao_scouter',
  updated_at = NOW()
WHERE id = [ID_TESTE];

-- Verificar se o trigger de gestao-scouter NÃO foi acionado
SELECT * FROM sync_events
WHERE lead_id = [ID_TESTE]
  AND direction = 'supabase_to_gestao_scouter'
  AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- NÃO deve haver registros de sincronização de volta para gestao-scouter

## Testes de Resolução de Conflitos

### Teste 3: Edge Function deve ignorar updates mais antigos (gestao-scouter → TabuladorMax)
```bash
# Chamar Edge Function com ficha mais antiga
curl -X POST 'https://[SEU_PROJETO].supabase.co/functions/v1/sync-from-gestao-scouter' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [SERVICE_ROLE_KEY]' \
  -d '{
    "ficha": {
      "id": [ID_TESTE],
      "name": "Ficha Antiga",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "source": "gestao_scouter"
  }'
```

**Resultado esperado:**
- Resposta com `"skipped": true`
- Mensagem: "Ficha ignorada - versão mais antiga que o lead existente"
- Registro em sync_events com status 'success' e error_message 'Skipped - older version'

### Teste 4: Edge Function deve aceitar updates mais recentes (gestao-scouter → TabuladorMax)
```bash
# Chamar Edge Function com ficha mais recente
curl -X POST 'https://[SEU_PROJETO].supabase.co/functions/v1/sync-from-gestao-scouter' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [SERVICE_ROLE_KEY]' \
  -d '{
    "ficha": {
      "id": [ID_TESTE],
      "name": "Ficha Recente",
      "updated_at": "[DATA_FUTURA]"
    },
    "source": "gestao_scouter"
  }'
```

**Resultado esperado:**
- Resposta com `"success": true`
- Lead atualizado no TabuladorMax
- Registro em sync_events com status 'success'

### Teste 5: Edge Function deve ignorar updates mais antigos (TabuladorMax → gestao-scouter)
```bash
# Chamar Edge Function com lead mais antigo
curl -X POST 'https://[SEU_PROJETO].supabase.co/functions/v1/sync-to-gestao-scouter' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [SERVICE_ROLE_KEY]' \
  -d '{
    "lead": {
      "id": [ID_TESTE],
      "name": "Lead Antigo",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "source": "supabase"
  }'
```

**Resultado esperado:**
- Resposta com `"skipped": true`
- Mensagem: "Lead ignorado - versão mais antiga que a ficha existente"
- Registro em sync_events com status 'success' e error_message 'Skipped - older version'

## Testes de Logging Detalhado

### Teste 6: Verificar logs detalhados em sync_events
```sql
-- Verificar eventos de sincronização com detalhes
SELECT 
  id,
  event_type,
  direction,
  lead_id,
  status,
  error_message::jsonb AS details,
  sync_duration_ms,
  created_at
FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- Cada evento deve ter detalhes no campo error_message (JSON com action, lead_name, sync_source, timestamp)
- sync_duration_ms deve estar preenchido
- status deve ser 'success' para sincronizações bem-sucedidas

## Testes de Schema Alignment

### Teste 7: Verificar alinhamento entre leads e fichas
```sql
-- Campos da tabela leads
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'leads'
ORDER BY ordinal_position;
```

**Comparar com schema da tabela fichas (gestao-scouter)**
- Todos os campos devem estar presentes em ambas as tabelas
- Os tipos de dados devem ser compatíveis

## Testes de Configuração

### Teste 8: Verificar desabilitação de sincronização
```sql
-- Desabilitar sincronização
UPDATE gestao_scouter_config
SET sync_enabled = false
WHERE active = true;

-- Tentar atualizar um lead
UPDATE leads
SET name = 'Teste Sync Disabled'
WHERE id = [ID_TESTE];

-- Verificar que NÃO foi sincronizado
SELECT * FROM sync_events
WHERE lead_id = [ID_TESTE]
  AND direction = 'supabase_to_gestao_scouter'
  AND created_at > NOW() - INTERVAL '1 minute';
```

**Resultado esperado:**
- NÃO deve haver registros de sincronização

### Teste 9: Reabilitar sincronização
```sql
-- Reabilitar sincronização
UPDATE gestao_scouter_config
SET sync_enabled = true
WHERE active = true;

-- Tentar atualizar um lead
UPDATE leads
SET name = 'Teste Sync Enabled'
WHERE id = [ID_TESTE];

-- Verificar que FOI sincronizado
SELECT * FROM sync_events
WHERE lead_id = [ID_TESTE]
  AND direction = 'supabase_to_gestao_scouter'
  AND created_at > NOW() - INTERVAL '1 minute';
```

**Resultado esperado:**
- Deve haver registro de sincronização

## Checklist Final

- [ ] Colunas sync_source, sync_status, last_sync_at existem na tabela leads
- [ ] gestao_scouter_config está preenchida e ativa
- [ ] Triggers ignoram sync_source = 'gestao_scouter'
- [ ] Edge Functions implementam resolução de conflitos baseada em updated_at
- [ ] Logging detalhado em sync_events funciona
- [ ] Prevenção de loops está ativa
- [ ] Schema da tabela leads está alinhado com fichas

## Notas de Implementação

### Campos obrigatórios para sincronização
- `id`: BIGINT (chave primária)
- `updated_at`: TIMESTAMPTZ (para resolução de conflitos)
- `sync_source`: TEXT (para prevenção de loops)
- `sync_status`: TEXT (para controle de estado)
- `last_sync_at`: TIMESTAMPTZ (para auditoria)

### Direções de sincronização
1. `gestao_scouter_to_supabase`: Fichas → Leads (via sync-from-gestao-scouter)
2. `supabase_to_gestao_scouter`: Leads → Fichas (via sync-to-gestao-scouter)

### Prevenção de loops
- Triggers verificam sync_source antes de disparar
- Edge Functions marcam sync_source na origem
- Trigger WHEN clause impede disparo quando origem é gestao-scouter
