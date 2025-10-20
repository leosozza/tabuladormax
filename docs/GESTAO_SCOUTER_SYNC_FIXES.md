# Correções de Sincronização com Gestão Scouter

## Resumo das Alterações

Este documento descreve as correções implementadas para resolver problemas de sincronização entre TabuladorMax e Gestão Scouter.

## Problemas Corrigidos

### 1. Validação de Variáveis de Ambiente

**Problema:** As edge functions não validavam se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estavam configuradas, resultando em erros não informativos.

**Solução:** Adicionada validação explícita no início de todas as funções de sincronização:
- `sync-to-gestao-scouter/index.ts`
- `sync-from-gestao-scouter/index.ts`
- `export-to-gestao-scouter-batch/index.ts`

```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
}
```

### 2. Validação de Payload

**Problema:** Funções não validavam se o payload recebido continha os campos obrigatórios.

**Solução:** Adicionada validação de payload antes do processamento:

```typescript
if (!lead || !lead.id) {
  console.error('❌ Payload inválido - lead ou lead.id ausente');
  throw new Error('Payload inválido: lead e lead.id são obrigatórios');
}
```

### 3. Validação de Configuração do Gestão Scouter

**Problema:** Configurações incompletas (sem `project_url` ou `anon_key`) não eram detectadas adequadamente.

**Solução:** Adicionada validação explícita da configuração:

```typescript
if (!config.project_url || !config.anon_key) {
  console.error('❌ Configuração incompleta:', {
    hasUrl: !!config.project_url,
    hasKey: !!config.anon_key
  });
  throw new Error('Configuração do gestao-scouter incompleta');
}
```

### 4. Logs Detalhados

**Problema:** Logs não forneciam contexto suficiente para debugging de erros.

**Solução:** Melhorados os logs em todos os pontos críticos:

```typescript
console.log('🔄 sync-to-gestao-scouter: Recebendo requisição', { 
  leadId: lead.id, 
  leadName: lead.name,
  source,
  timestamp: new Date().toISOString()
});

console.error('❌ Erro ao sincronizar com gestao-scouter:', {
  error: leadError,
  leadId: lead.id,
  leadName: lead.name,
  errorMessage: leadError.message,
  errorDetails: leadError.details,
  errorHint: leadError.hint,
  errorCode: leadError.code,
  projectUrl: config.project_url,
  timestamp: new Date().toISOString()
});
```

### 5. Registro de Erros em sync_events

**Problema:** Erros não eram sempre registrados na tabela `sync_events`, dificultando auditoria.

**Solução:** Adicionado registro de erro detalhado com try-catch:

```typescript
try {
  await supabase.from('sync_events').insert({
    event_type: 'update',
    direction: 'supabase_to_gestao_scouter',
    lead_id: lead.id,
    status: 'error',
    error_message: `${leadError.message} (code: ${leadError.code}, hint: ${leadError.hint || 'N/A'})`,
    sync_duration_ms: Date.now() - startTime
  });
} catch (syncErr) {
  console.error('❌ Erro ao registrar sync_event de erro:', syncErr);
}
```

### 6. Nova Edge Function de Validação

**Criada:** `validate-gestao-scouter-config/index.ts`

Esta função realiza testes abrangentes da configuração:

1. **Validação de Credenciais:**
   - Verifica se `project_url` e `anon_key` existem
   - Valida formato da URL (deve começar com http/https)
   - Valida formato da chave (deve começar com 'eyJ')

2. **Teste de Conexão:**
   - Tenta criar cliente Supabase com as credenciais
   - Verifica conectividade básica

3. **Teste de Acesso à Tabela:**
   - Verifica permissões de leitura na tabela `leads`
   - Testa se a tabela existe e é acessível

4. **Validação de Estrutura:**
   - Verifica campos essenciais (`id`, `updated_at`)
   - Alerta sobre campos recomendados ausentes

**Uso:**
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/validate-gestao-scouter-config \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Resposta de Exemplo:**
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

## Como Testar as Correções

### 1. Validar Configuração

Execute a função de validação para verificar a configuração atual:

```bash
# Via curl
curl -X POST \
  https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/validate-gestao-scouter-config \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Via JavaScript
const response = await supabase.functions.invoke('validate-gestao-scouter-config');
console.log(response.data);
```

### 2. Testar Sincronização Manual

Teste a sincronização de um lead específico:

```javascript
// Sincronizar para Gestão Scouter
const { data, error } = await supabase.functions.invoke('sync-to-gestao-scouter', {
  body: {
    lead: {
      id: 'test-lead-id',
      name: 'Test Lead',
      // ... outros campos
    },
    source: 'supabase'
  }
});

console.log('Resultado:', data);
console.log('Erro:', error);
```

### 3. Monitorar Logs

Acompanhe os logs no Supabase Dashboard:
1. Navegue até **Edge Functions**
2. Selecione a função desejada
3. Visualize os logs em tempo real

### 4. Verificar sync_events

Consulte a tabela `sync_events` para ver o histórico de sincronização:

```sql
-- Ver últimos eventos de sincronização
SELECT 
  event_type,
  direction,
  lead_id,
  status,
  error_message,
  sync_duration_ms,
  created_at
FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
ORDER BY created_at DESC
LIMIT 20;

-- Ver taxa de erro
SELECT 
  direction,
  status,
  COUNT(*) as count
FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY direction, status;
```

## Checklist de Configuração

Antes de ativar a sincronização, verifique:

- [ ] **Variáveis de Ambiente:**
  - `SUPABASE_URL` configurado no projeto
  - `SUPABASE_SERVICE_ROLE_KEY` configurado no projeto

- [ ] **Configuração do Gestão Scouter:**
  - Registro existe na tabela `gestao_scouter_config`
  - `project_url` está correto
  - `anon_key` está correto
  - `active = true`
  - `sync_enabled = true` (após testes)

- [ ] **Permissões:**
  - Anon key do Gestão Scouter tem permissões de leitura/escrita na tabela `leads`
  - RLS policies do Gestão Scouter permitem operações via anon key

- [ ] **Estrutura da Tabela:**
  - Tabela `leads` existe no Gestão Scouter
  - Campos obrigatórios (`id`, `updated_at`) existem
  - Campos sincronizados são compatíveis

## Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"

**Causa:** `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` não estão definidas.

**Solução:**
1. Vá para Supabase Dashboard > Project Settings > Edge Functions
2. Adicione as variáveis de ambiente
3. Redeploy as funções

### Erro: "Configuração do gestao-scouter incompleta"

**Causa:** `project_url` ou `anon_key` ausentes ou vazios na configuração.

**Solução:**
```sql
UPDATE gestao_scouter_config
SET 
  project_url = 'https://your-project.supabase.co',
  anon_key = 'your-anon-key'
WHERE active = true;
```

### Erro: "Sem acesso à tabela leads"

**Causa:** Permissões RLS do Gestão Scouter bloqueando acesso.

**Solução:**
1. Verifique RLS policies da tabela `leads` no Gestão Scouter
2. Garanta que operações com anon key são permitidas
3. Teste acesso manual:
```javascript
const client = createClient('gestao-url', 'gestao-anon-key');
const { data, error } = await client.from('leads').select('*').limit(1);
```

### Sincronização lenta

**Causa:** Batch muito grande ou latência de rede.

**Solução:**
1. Ajuste `BATCH_SIZE` em `export-to-gestao-scouter-batch`
2. Verifique latência entre servidores
3. Considere usar regiões geográficas próximas

## Métricas de Sucesso

Após as correções, espera-se:

- ✅ Taxa de erro < 1% nas sincronizações
- ✅ Logs claros e informativos em todos os casos
- ✅ Erros registrados em `sync_events`
- ✅ Validação de configuração passando todos os checks
- ✅ Tempo médio de sincronização < 2s por lead

## Próximos Passos

1. **Monitoramento Contínuo:**
   - Configurar alertas para taxa de erro > 5%
   - Dashboard de métricas de sincronização

2. **Otimizações Futuras:**
   - Retry automático para falhas temporárias
   - Circuit breaker para prevenir cascata de falhas
   - Cache de configuração para reduzir queries

3. **Testes Automatizados:**
   - Testes de integração para funções de sincronização
   - Testes de carga para batch export

## Compatibilidade

Estas alterações são **100% compatíveis** com:
- ✅ Sincronização existente com Bitrix24
- ✅ Importação de CSV
- ✅ Todas as outras funcionalidades do TabuladorMax

Nenhuma funcionalidade existente foi removida ou modificada de forma incompatível.
