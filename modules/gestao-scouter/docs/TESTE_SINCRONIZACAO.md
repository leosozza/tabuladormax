# Teste de Sincronização - Gestão Scouter ↔ TabuladorMax

## Objetivo

Este documento descreve os processos de teste da sincronização bidirecional entre Gestão Scouter e TabuladorMax, incluindo testes unitários, integração e validação end-to-end.

## Pré-requisitos

- Schema do banco de dados configurado (ver `docs/VALIDACAO_SCHEMA.md`)
- Dados importados (ver `docs/IMPORTACAO_DADOS.md`)
- Acesso aos dois projetos: Gestão Scouter e TabuladorMax
- Edge Functions deployadas (sync-fichas, tabulador-export)

## Arquitetura da Sincronização

### Fluxo Gestão Scouter → TabuladorMax

```
1. Usuário cria/edita ficha no Gestão Scouter
2. Trigger adiciona à sync_queue
3. Edge Function processa fila periodicamente
4. Dados são enviados para TabuladorMax
5. sync_logs registra resultado
```

### Fluxo TabuladorMax → Gestão Scouter

```
1. Usuário edita lead no TabuladorMax
2. Trigger adiciona à sync_queue (TabuladorMax)
3. Edge Function envia para Gestão Scouter
4. Dados são inseridos/atualizados em fichas
5. sync_logs registra resultado
```

## 1. Teste de Componentes Individuais

### 1.1 Teste da Tabela sync_queue

#### Verificar Estrutura

```sql
-- Verificar que sync_queue existe e está vazia/limpa
SELECT 
  COUNT(*) as total_queue,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM public.sync_queue;
```

**Resultado Esperado:** Query executa sem erro. Total pode ser 0 (limpa) ou ter registros de testes anteriores.

#### Teste Manual de Inserção

```sql
-- Inserir registro de teste na fila
INSERT INTO public.sync_queue (
  ficha_id,
  operation,
  sync_direction,
  payload,
  status
) VALUES (
  '999999', -- ID fictício
  'insert',
  'gestao_to_tabulador',
  '{"nome": "Teste Sync", "telefone": "11999999999"}'::jsonb,
  'pending'
) RETURNING id, created_at, status;
```

**Resultado Esperado:** Registro inserido com sucesso

#### Limpar Teste

```sql
DELETE FROM public.sync_queue WHERE ficha_id = '999999';
```

### 1.2 Teste do Trigger fichas_sync_trigger

#### Criar Ficha de Teste

```sql
-- Inserir ficha que deve acionar trigger
INSERT INTO public.fichas (
  nome,
  telefone,
  projeto,
  scouter,
  sync_source
) VALUES (
  'Teste Trigger Sync',
  '11988887777',
  'Projeto Teste',
  'Sistema',
  'Gestao'
) RETURNING id;
-- Anotar o ID retornado
```

#### Verificar Fila de Sync

```sql
-- Verificar se ficha foi adicionada à fila
SELECT 
  sq.id,
  sq.ficha_id,
  sq.operation,
  sq.sync_direction,
  sq.status,
  sq.created_at,
  sq.payload->>'nome' as nome_payload
FROM public.sync_queue sq
WHERE sq.ficha_id = 'ID_ANOTADO_ACIMA'
ORDER BY sq.created_at DESC;
```

**Resultado Esperado:** 1 registro na fila com operation='INSERT' e nome_payload='Teste Trigger Sync'

#### Atualizar Ficha e Verificar

```sql
-- Atualizar ficha
UPDATE public.fichas
SET telefone = '11977776666'
WHERE nome = 'Teste Trigger Sync'
RETURNING id;

-- Verificar nova entrada na fila
SELECT 
  sq.id,
  sq.ficha_id,
  sq.operation,
  sq.sync_direction,
  sq.status,
  sq.created_at
FROM public.sync_queue sq
WHERE sq.ficha_id = 'ID_ANOTADO_ACIMA'
ORDER BY sq.created_at DESC
LIMIT 2;
```

**Resultado Esperado:** 2 registros na fila (1 INSERT + 1 UPDATE)

#### Limpar Teste

```sql
-- Limpar fila e ficha de teste
DELETE FROM public.sync_queue 
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'Teste Trigger Sync'
);

DELETE FROM public.fichas WHERE nome = 'Teste Trigger Sync';
```

### 1.3 Teste de Prevenção de Loop

O trigger deve evitar loops infinitos quando dados vêm do TabuladorMax.

#### Simular Sync do TabuladorMax

```sql
-- Inserir ficha vinda do TabuladorMax (não deve ir para fila)
INSERT INTO public.fichas (
  nome,
  telefone,
  projeto,
  scouter,
  sync_source,
  last_synced_at
) VALUES (
  'Teste Anti-Loop',
  '11966665555',
  'Projeto Teste',
  'Sistema',
  'TabuladorMax',
  NOW()
) RETURNING id;
```

#### Verificar que NÃO foi para a fila

```sql
-- Não deve ter entrada na fila
SELECT COUNT(*) as deve_ser_zero
FROM public.sync_queue
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'Teste Anti-Loop'
);
```

**Resultado Esperado:** `deve_ser_zero = 0`

#### Limpar Teste

```sql
DELETE FROM public.fichas WHERE nome = 'Teste Anti-Loop';
```

## 2. Teste de Integração com Edge Functions

### 2.1 Teste Manual da Edge Function

#### Via cURL (Gestão Scouter → TabuladorMax)

```bash
# Configurar variáveis
export SUPABASE_URL="https://SEU_PROJECT_ID.supabase.co"
export SHARED_SECRET="SEU_SECRET"

# Enviar dados de teste
curl -X POST \
  "$SUPABASE_URL/functions/v1/tabulador-export" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "X-Secret: $SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "fichas": [
      {
        "id": "test-123",
        "nome": "João Teste Sync",
        "telefone": "11955554444",
        "projeto": "Teste Sync",
        "scouter": "Sistema"
      }
    ]
  }'
```

**Resultado Esperado:** 
```json
{
  "synced": 1,
  "errors": 0
}
```

### 2.2 Verificar Logs da Edge Function

```sql
-- Ver logs de sincronização
SELECT 
  id,
  sync_direction,
  records_synced,
  records_failed,
  errors,
  started_at,
  completed_at,
  processing_time_ms
FROM public.sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

### 2.3 Teste Automático via Script

Executar script de diagnóstico:

```bash
# Modo dry-run (sem alterações)
npm run diagnostics:sync

# Modo escrita (executar sync real)
npm run diagnostics:sync:write
```

Verificar output:

```
✓ Conectado ao Supabase Gestão Scouter
✓ Conectado ao Supabase TabuladorMax
✓ Iniciando sincronização...
✓ Sincronizados: 150 registros
✗ Erros: 2 registros
ℹ Ver sync_logs para detalhes
```

## 3. Teste End-to-End (E2E)

### 3.1 Cenário: Criar Ficha no Gestão Scouter

#### Passo 1: Criar no Front-end

1. Acessar http://localhost:8080
2. Navegar para "Leads" ou "Fichas"
3. Clicar em "Novo Lead"
4. Preencher dados:
   - Nome: "Maria E2E Test"
   - Telefone: "11944443333"
   - Projeto: "Projeto E2E"
   - Scouter: "Teste Automático"
5. Salvar

#### Passo 2: Verificar no Banco

```sql
-- Verificar que ficha foi criada
SELECT 
  id,
  nome,
  telefone,
  projeto,
  scouter,
  created_at,
  sync_source
FROM public.fichas
WHERE nome = 'Maria E2E Test';
```

**Resultado Esperado:** 1 registro encontrado

#### Passo 3: Verificar Fila de Sync

```sql
-- Verificar que foi adicionado à fila
SELECT 
  sq.id,
  sq.ficha_id,
  sq.operation,
  sq.status,
  sq.created_at
FROM public.sync_queue sq
WHERE sq.ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'Maria E2E Test'
)
ORDER BY sq.created_at DESC;
```

**Resultado Esperado:** 1 registro com status='pending'

#### Passo 4: Processar Fila (Simular Cron)

```sql
-- Marcar como processado (simular Edge Function)
UPDATE public.sync_queue
SET 
  status = 'completed',
  processed_at = NOW()
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'Maria E2E Test'
);
```

#### Passo 5: Verificar no TabuladorMax

1. Acessar TabuladorMax
2. Procurar lead "Maria E2E Test"
3. Verificar que dados foram sincronizados corretamente

#### Passo 6: Limpar

```sql
DELETE FROM public.sync_queue 
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'Maria E2E Test'
);

DELETE FROM public.fichas WHERE nome = 'Maria E2E Test';
```

### 3.2 Cenário: Editar Lead no TabuladorMax

#### Passo 1: Editar no TabuladorMax

1. Acessar TabuladorMax
2. Selecionar um lead existente
3. Editar campo (ex: mudar telefone)
4. Salvar

#### Passo 2: Verificar Sincronização

Aguardar alguns segundos (dependendo do intervalo do cron) e verificar:

```sql
-- Verificar se dados foram atualizados no Gestão Scouter
SELECT 
  id,
  nome,
  telefone,
  updated_at,
  sync_source,
  last_synced_at
FROM public.fichas
WHERE id = 'ID_DO_LEAD_EDITADO';
```

**Resultado Esperado:** 
- Campo editado reflete a mudança
- `sync_source` = 'TabuladorMax'
- `last_synced_at` é recente

### 3.3 Cenário: Conflito de Edição Simultânea

#### Simular Conflito

1. **No Gestão Scouter:** Editar telefone do lead para '11933332222'
2. **No TabuladorMax:** Editar MESMO lead telefone para '11922221111' (quase simultaneamente)
3. Aguardar sincronização

#### Verificar Resolução

```sql
-- Ver histórico de mudanças no sync_logs
SELECT 
  sl.id,
  sl.sync_direction,
  sl.records_synced,
  sl.errors,
  sl.started_at
FROM public.sync_logs sl
ORDER BY sl.started_at DESC
LIMIT 5;
```

**Comportamento Esperado:**
- A última modificação (timestamp mais recente) deve prevalecer
- Pode haver entrada de erro em sync_logs se houver conflito

## 4. Teste de Performance

### 4.1 Sync em Lote

#### Inserir 100 Fichas de Teste

```sql
-- Inserir lote de fichas de teste
INSERT INTO public.fichas (nome, telefone, projeto, scouter)
SELECT 
  'Teste Lote ' || generate_series,
  '119' || LPAD(generate_series::TEXT, 8, '0'),
  'Projeto Performance',
  'Sistema'
FROM generate_series(1, 100);
```

#### Medir Tempo de Processamento

```sql
-- Ver tempo de processamento no sync_logs
SELECT 
  id,
  records_synced,
  records_failed,
  processing_time_ms,
  (processing_time_ms / records_synced) as ms_por_registro
FROM public.sync_logs
WHERE records_synced >= 100
ORDER BY started_at DESC
LIMIT 1;
```

**Resultado Esperado:** 
- `processing_time_ms` < 10000 (menos de 10 segundos)
- `ms_por_registro` < 100 (menos de 100ms por registro)

#### Limpar Teste

```sql
DELETE FROM public.sync_queue 
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome LIKE 'Teste Lote%'
);

DELETE FROM public.fichas WHERE nome LIKE 'Teste Lote%';
```

### 4.2 Teste de Carga (Stress Test)

#### Inserir 1000 Fichas

```sql
-- CUIDADO: Só executar em ambiente de teste!
INSERT INTO public.fichas (nome, telefone, projeto, scouter)
SELECT 
  'Stress Test ' || generate_series,
  '119' || LPAD(generate_series::TEXT, 8, '0'),
  'Projeto Stress',
  'Sistema'
FROM generate_series(1, 1000);
```

#### Monitorar Performance

```sql
-- Verificar fila de sync
SELECT 
  status,
  COUNT(*) as total
FROM public.sync_queue
GROUP BY status;

-- Verificar se processamento está estável
SELECT 
  DATE_TRUNC('minute', created_at) as minuto,
  COUNT(*) as fichas_por_minuto
FROM public.sync_queue
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minuto DESC;
```

**Monitorar:**
- CPU e memória do Supabase
- Tempo de resposta das Edge Functions
- Erros em sync_logs

#### Limpar Teste

```sql
-- ATENÇÃO: Só executar se tiver certeza!
DELETE FROM public.sync_queue 
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome LIKE 'Stress Test%'
);

DELETE FROM public.fichas WHERE nome LIKE 'Stress Test%';
```

## 5. Teste de Recuperação de Erros

### 5.1 Simular Erro de Rede

#### Desabilitar Edge Function Temporariamente

No Supabase Dashboard, pausar a Edge Function `tabulador-export`.

#### Criar Fichas Durante Downtime

```sql
INSERT INTO public.fichas (nome, telefone, projeto, scouter)
VALUES 
  ('Erro Test 1', '11911110001', 'Projeto Erro', 'Sistema'),
  ('Erro Test 2', '11911110002', 'Projeto Erro', 'Sistema'),
  ('Erro Test 3', '11911110003', 'Projeto Erro', 'Sistema');
```

#### Verificar Fila Acumulando

```sql
SELECT COUNT(*) as fila_acumulada
FROM public.sync_queue
WHERE status = 'pending';
```

#### Reabilitar Edge Function

Reativar a função no Dashboard.

#### Verificar Recuperação

```sql
-- Aguardar processamento e verificar
SELECT 
  status,
  COUNT(*) as total
FROM public.sync_queue
GROUP BY status;
```

**Resultado Esperado:** Fila processada com sucesso após reativação

### 5.2 Teste de Retry

#### Forçar Erro em Registro Específico

```sql
-- Inserir registro inválido que causará erro
INSERT INTO public.fichas (nome, telefone, bitrix_id)
VALUES ('Teste Retry', '11900009999', 'DUPLICATE_ID');
-- Assumindo que DUPLICATE_ID já existe
```

#### Verificar Retry Count

```sql
SELECT 
  id,
  ficha_id,
  operation,
  status,
  retry_count,
  last_error
FROM public.sync_queue
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'Teste Retry'
)
ORDER BY created_at DESC;
```

**Resultado Esperado:** 
- `retry_count` aumenta a cada tentativa
- `status` = 'failed' após 3 tentativas
- `last_error` contém mensagem de erro

## 6. Monitoramento Contínuo

### 6.1 Dashboard de Sync Health

```sql
-- Query para dashboard de saúde da sincronização
SELECT 
  ss.project_name,
  ss.last_sync_at,
  ss.last_sync_success,
  ss.total_records,
  ss.last_error,
  EXTRACT(EPOCH FROM (NOW() - ss.last_sync_at))/60 as minutos_desde_ultimo_sync
FROM public.sync_status ss
ORDER BY ss.project_name;
```

**Alerta se:**
- `minutos_desde_ultimo_sync` > 10
- `last_sync_success` = false

### 6.2 Métricas de Performance

```sql
-- Métricas dos últimos 7 dias
SELECT 
  DATE(started_at) as data,
  sync_direction,
  COUNT(*) as total_syncs,
  SUM(records_synced) as total_records,
  SUM(records_failed) as total_errors,
  AVG(processing_time_ms) as avg_processing_time,
  MAX(processing_time_ms) as max_processing_time
FROM public.sync_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(started_at), sync_direction
ORDER BY data DESC, sync_direction;
```

### 6.3 Alertas Automáticos

Configurar alertas (via Supabase Webhooks ou cron job) para:

- Fila de sync com mais de 100 registros pendentes por mais de 10 minutos
- Taxa de erro acima de 5%
- Tempo de processamento acima de 5 segundos por registro
- Último sync há mais de 10 minutos

## 7. Checklist de Testes

Use esta checklist antes de aprovar sincronização em produção:

- [ ] **Estrutura de Dados**
  - [ ] Tabela sync_queue existe e funciona
  - [ ] Tabela sync_logs registra corretamente
  - [ ] Tabela sync_status atualiza

- [ ] **Triggers**
  - [ ] Trigger em INSERT adiciona à fila
  - [ ] Trigger em UPDATE adiciona à fila
  - [ ] Trigger previne loops infinitos

- [ ] **Edge Functions**
  - [ ] Função responde corretamente
  - [ ] Autenticação funciona (X-Secret)
  - [ ] Processamento de lote funciona

- [ ] **Sincronização Unidirecional**
  - [ ] Gestão → TabuladorMax funciona
  - [ ] TabuladorMax → Gestão funciona

- [ ] **Sincronização Bidirecional**
  - [ ] Edições em ambos os lados sincronizam
  - [ ] Conflitos são resolvidos corretamente

- [ ] **Performance**
  - [ ] Sync de 100 registros < 10 segundos
  - [ ] Sync de 1000 registros < 60 segundos
  - [ ] Fila processa sem acumular

- [ ] **Recuperação de Erros**
  - [ ] Retry funciona após falha temporária
  - [ ] Registros com erro não bloqueiam fila
  - [ ] Alertas funcionam

- [ ] **Monitoramento**
  - [ ] Dashboard de saúde atualiza
  - [ ] Métricas são precisas
  - [ ] Logs são detalhados

## 8. Troubleshooting

### Problema: Fila não processa

**Sintomas:** Registros ficam em 'pending' por muito tempo

**Verificar:**
```sql
SELECT * FROM public.sync_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

**Soluções:**
1. Verificar se Edge Function está ativa
2. Verificar logs da Edge Function
3. Verificar variáveis de ambiente (secrets)
4. Reprocessar manualmente com status='completed'

### Problema: Muitos erros na sincronização

**Sintomas:** sync_logs mostra records_failed alto

**Verificar:**
```sql
SELECT errors, metadata
FROM public.sync_logs
WHERE records_failed > 0
ORDER BY started_at DESC
LIMIT 5;
```

**Soluções:**
1. Verificar formato de dados incompatível
2. Verificar constraint violations
3. Ajustar mapeamento de campos
4. Adicionar validação antes de sync

### Problema: Loop infinito de sincronização

**Sintomas:** Mesmos registros sendo sincronizados repetidamente

**Verificar:**
```sql
SELECT 
  ficha_id,
  COUNT(*) as vezes_processado
FROM public.sync_queue
WHERE processed_at > NOW() - INTERVAL '1 hour'
GROUP BY ficha_id
HAVING COUNT(*) > 5
ORDER BY vezes_processado DESC;
```

**Soluções:**
1. Verificar lógica de prevenção de loop no trigger
2. Ajustar intervalo de verificação (1 minuto)
3. Adicionar flag de "already_syncing"

## Conclusão

Se todos os testes passaram, a sincronização está funcionando corretamente e pronta para produção.

**Monitoramento Recomendado:**
- Verificar dashboard de sync health diariamente
- Revisar sync_logs semanalmente
- Executar testes de carga mensalmente

**Manutenção:**
- Limpar sync_queue completados mensalmente
- Arquivar sync_logs antigos (> 90 dias)
- Atualizar documentação com novos aprendizados

---

**Última atualização:** 2025-10-18  
**Versão:** 1.0  
**Autor:** GitHub Copilot
