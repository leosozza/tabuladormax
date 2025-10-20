# Guia de Teste - Sincronização Gestão Scouter

Este documento fornece instruções detalhadas para testar as correções implementadas na sincronização entre TabuladorMax e Gestão Scouter.

## Pré-requisitos

Antes de iniciar os testes:

1. ✅ Projeto TabuladorMax configurado e rodando
2. ✅ Projeto Gestão Scouter acessível
3. ✅ Credenciais do Gestão Scouter disponíveis:
   - URL do projeto
   - Anon key (chave pública)
4. ✅ Acesso ao Supabase Dashboard de ambos os projetos

## Fase 1: Configuração Inicial

### 1.1 Verificar Variáveis de Ambiente

No Supabase Dashboard do TabuladorMax:

1. Navegue até **Settings** > **Edge Functions**
2. Verifique se as variáveis estão configuradas:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

Se não estiverem configuradas:
```bash
# Via CLI do Supabase
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 1.2 Configurar Gestão Scouter no TabuladorMax

Execute no SQL Editor do TabuladorMax:

```sql
-- Verificar se já existe configuração
SELECT * FROM gestao_scouter_config WHERE active = true;

-- Se não existir, criar uma nova
INSERT INTO gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://seu-projeto-gestao-scouter.supabase.co',
  'sua-anon-key-do-gestao-scouter',
  true,
  false  -- Inicialmente desabilitado para testes
);

-- Se já existir, atualizar
UPDATE gestao_scouter_config
SET 
  project_url = 'https://seu-projeto-gestao-scouter.supabase.co',
  anon_key = 'sua-anon-key-do-gestao-scouter',
  active = true,
  sync_enabled = false  -- Inicialmente desabilitado
WHERE id = 1;  -- Substitua pelo ID correto
```

## Fase 2: Testes de Validação

### 2.1 Testar Validação de Configuração

Execute a função de validação via Supabase CLI ou curl:

```bash
# Via curl
curl -X POST \
  https://your-project.supabase.co/functions/v1/validate-gestao-scouter-config \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Resultado esperado:**
```json
{
  "valid": true,
  "checks": {
    "credentials": {
      "valid": true,
      "message": "Credenciais válidas"
    },
    "connection": {
      "valid": true,
      "message": "Cliente criado com sucesso"
    },
    "tableAccess": {
      "valid": true,
      "message": "Acesso à tabela leads confirmado"
    },
    "tableStructure": {
      "valid": true,
      "message": "Estrutura da tabela validada"
    }
  },
  "errors": [],
  "warnings": []
}
```

### 2.2 Interpretar Resultados da Validação

| Check | Significado | Ação se Falhar |
|-------|-------------|----------------|
| `credentials.valid` | URL e chave têm formato correto | Verificar formato de `project_url` e `anon_key` |
| `connection.valid` | Pode criar cliente Supabase | Verificar URL e conectividade de rede |
| `tableAccess.valid` | Pode acessar tabela `leads` | Verificar RLS policies no Gestão Scouter |
| `tableStructure.valid` | Tabela tem campos necessários | Verificar schema da tabela `leads` |

## Fase 3: Testes Manuais de Sincronização

### 3.1 Habilitar Sincronização

Após validação bem-sucedida:

```sql
UPDATE gestao_scouter_config
SET sync_enabled = true
WHERE active = true;
```

### 3.2 Teste Manual: Sincronização Para Gestão Scouter

Crie ou atualize um lead no TabuladorMax:

```sql
-- Criar lead de teste
INSERT INTO leads (
  id,
  name,
  celular,
  sync_source
) VALUES (
  gen_random_uuid(),
  'Lead Teste Sincronização',
  '11999999999',
  'supabase'  -- Importante: source diferente de 'gestao_scouter'
) RETURNING id;

-- Anote o ID retornado
```

Aguarde 5-10 segundos e verifique:

1. **Logs da Edge Function:**
   - Dashboard > Edge Functions > sync-to-gestao-scouter > Logs
   - Procure por mensagens com o ID do lead
   - Verifique se há erros

2. **Tabela sync_events:**
```sql
SELECT 
  event_type,
  direction,
  status,
  error_message,
  sync_duration_ms,
  created_at
FROM sync_events
WHERE lead_id = 'ID_DO_LEAD_TESTE'
ORDER BY created_at DESC;
```

3. **Gestão Scouter:**
```sql
-- No SQL Editor do Gestão Scouter
SELECT * FROM leads WHERE id = 'ID_DO_LEAD_TESTE';
```

**Resultado esperado:**
- ✅ Lead existe no Gestão Scouter
- ✅ Campos sincronizados corretamente
- ✅ `sync_source = 'tabuladormax'`
- ✅ Evento em `sync_events` com `status = 'success'`

### 3.3 Teste Manual: Sincronização Do Gestão Scouter

Atualize o lead no Gestão Scouter:

```sql
-- No SQL Editor do Gestão Scouter
UPDATE leads
SET 
  name = 'Lead Teste Atualizado',
  sync_source = 'gestao_scouter'  -- Marca origem
WHERE id = 'ID_DO_LEAD_TESTE';
```

Se houver trigger configurado no Gestão Scouter, ele deve chamar o webhook.
Caso contrário, chame manualmente:

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/sync-from-gestao-scouter \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "id": "ID_DO_LEAD_TESTE",
      "name": "Lead Teste Atualizado",
      "celular": "11999999999"
    },
    "source": "gestao_scouter"
  }'
```

Verifique no TabuladorMax:

```sql
SELECT name, sync_source, updated_at
FROM leads
WHERE id = 'ID_DO_LEAD_TESTE';
```

**Resultado esperado:**
- ✅ `name = 'Lead Teste Atualizado'`
- ✅ `sync_source = 'gestao_scouter'`
- ✅ `updated_at` atualizado

## Fase 4: Testes de Erro

### 4.1 Teste: Configuração Inválida

```sql
-- Desabilitar temporariamente
UPDATE gestao_scouter_config
SET anon_key = 'chave-invalida'
WHERE active = true;
```

Tente sincronizar um lead e verifique:
- ❌ Deve falhar
- ✅ Logs devem indicar "Erro ao criar cliente"
- ✅ Erro registrado em `sync_events`

Restaure a configuração:
```sql
UPDATE gestao_scouter_config
SET anon_key = 'chave-valida-original'
WHERE active = true;
```

### 4.2 Teste: Payload Inválido

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/sync-to-gestao-scouter \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "name": "Sem ID"
    },
    "source": "supabase"
  }'
```

**Resultado esperado:**
- ❌ Erro 500
- ✅ Mensagem: "Payload inválido: lead e lead.id são obrigatórios"
- ✅ Logs indicam validação de payload

### 4.3 Teste: Prevenção de Loop

```sql
-- Tentar sincronizar lead que veio do gestao_scouter
INSERT INTO leads (
  id,
  name,
  celular,
  sync_source
) VALUES (
  gen_random_uuid(),
  'Lead de Loop Test',
  '11888888888',
  'gestao_scouter'  -- Source é gestao_scouter
);
```

**Resultado esperado:**
- ✅ Lead criado no TabuladorMax
- ✅ NÃO sincronizado de volta para Gestão Scouter
- ✅ Logs indicam "Ignorando - origem é gestao-scouter"

## Fase 5: Testes de Performance

### 5.1 Teste de Batch Export

```sql
-- Criar job de exportação
-- Via interface ou diretamente
SELECT * FROM gestao_scouter_export_jobs;
```

Monitore:
1. Status do job
2. Progresso (`exported_leads` / `total_leads`)
3. Taxa de erro (`error_leads`)
4. Tempo médio de sincronização

### 5.2 Métricas de Sucesso

Após 1 hora de operação:

```sql
-- Taxa de sucesso nas últimas 1 hora
SELECT 
  direction,
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY direction), 2) as percentage
FROM sync_events
WHERE 
  direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY direction, status
ORDER BY direction, status;

-- Tempo médio de sincronização
SELECT 
  direction,
  AVG(sync_duration_ms) as avg_ms,
  MIN(sync_duration_ms) as min_ms,
  MAX(sync_duration_ms) as max_ms,
  COUNT(*) as count
FROM sync_events
WHERE 
  direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
  AND created_at > NOW() - INTERVAL '1 hour'
  AND sync_duration_ms IS NOT NULL
GROUP BY direction;
```

**Metas:**
- ✅ Taxa de sucesso > 99%
- ✅ Tempo médio < 2000ms (2s)
- ✅ Erros registrados em `sync_events`

## Fase 6: Testes de Compatibilidade com Bitrix

### 6.1 Verificar Sincronização Bitrix

```sql
-- Criar/atualizar lead e verificar sync com Bitrix
INSERT INTO leads (
  id,
  name,
  celular,
  bitrix_telemarketing_id,
  sync_source
) VALUES (
  gen_random_uuid(),
  'Lead Teste Bitrix',
  '11777777777',
  NULL,
  'supabase'
);

-- Verificar eventos de sync do Bitrix
SELECT * FROM sync_events
WHERE direction IN ('supabase_to_bitrix', 'bitrix_to_supabase')
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado:**
- ✅ Sincronização Bitrix funciona normalmente
- ✅ Não há interferência entre Bitrix e Gestão Scouter
- ✅ Ambos os sistemas recebem atualizações

## Checklist Final

Antes de considerar os testes concluídos:

### Configuração
- [ ] Variáveis de ambiente configuradas
- [ ] Configuração do Gestão Scouter validada
- [ ] Função de validação retorna `valid: true`

### Sincronização
- [ ] TabuladorMax → Gestão Scouter funciona
- [ ] Gestão Scouter → TabuladorMax funciona
- [ ] Prevenção de loop ativa
- [ ] Erros são tratados e registrados

### Logs e Monitoramento
- [ ] Logs são claros e informativos
- [ ] Erros registrados em `sync_events`
- [ ] Métricas de performance dentro das metas

### Compatibilidade
- [ ] Sincronização Bitrix não afetada
- [ ] Importação CSV funciona normalmente
- [ ] Outras funcionalidades não afetadas

## Troubleshooting Durante Testes

### Problema: Validação falha em "tableAccess"

**Causa Provável:** RLS policies do Gestão Scouter bloqueando acesso.

**Solução:**
1. No Gestão Scouter, vá para SQL Editor
2. Execute:
```sql
-- Permitir SELECT com anon key
CREATE POLICY "Anon can read leads"
ON leads FOR SELECT
TO anon
USING (true);

-- Permitir INSERT/UPDATE com anon key
CREATE POLICY "Anon can insert leads"
ON leads FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can update leads"
ON leads FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
```

### Problema: Timeout nas sincronizações

**Causa Provável:** Latência de rede ou payload muito grande.

**Solução:**
1. Verificar latência entre regiões
2. Considerar usar regiões geográficas próximas
3. Reduzir tamanho do payload (campos desnecessários)
4. Aumentar timeout (atualmente 10s)

### Problema: Loop de sincronização detectado

**Sintoma:** Mesmo lead sendo sincronizado infinitamente.

**Solução:**
1. Verificar se `sync_source` está sendo definido corretamente
2. Verificar cláusula WHEN do trigger
3. Logs devem mostrar "Ignorando - origem é X"

## Contato e Suporte

Se encontrar problemas não cobertos por este guia:

1. Verifique logs completos das Edge Functions
2. Consulte tabela `sync_events` para detalhes
3. Revise documentação em `docs/GESTAO_SCOUTER_SYNC_FIXES.md`
4. Abra issue no repositório com:
   - Logs relevantes
   - Passos para reproduzir
   - Configuração (sem credenciais)
