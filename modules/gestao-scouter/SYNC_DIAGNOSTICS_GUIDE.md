# Diagnóstico de Sincronização TabuladorMax

Este documento descreve as ferramentas de diagnóstico implementadas para resolver problemas de sincronização com TabuladorMax.

## 🎯 Problema Original

Usuários relatavam:
- "0 Leads encontrados" durante sincronização
- "0 tabelas encontradas" ao listar tabelas
- Erros genéricos sem informação suficiente para debug
- Dificuldade em identificar se o problema era de credenciais, permissões ou configuração

## 🔧 Soluções Implementadas

### 1. Função de Diagnóstico Completo

**Edge Function:** `diagnose-tabulador-sync`

Executa uma bateria completa de testes:

#### ✅ Teste 1: Variáveis de Ambiente
- Verifica se `TABULADOR_URL` está configurada
- Verifica se `TABULADOR_SERVICE_KEY` está configurada
- Valida formato da URL
- Fornece instruções de onde configurar

**Resultado esperado:**
```json
{
  "status": "ok",
  "message": "Variáveis de ambiente configuradas corretamente",
  "details": {
    "url": "https://project.supabase.co",
    "key_configured": true,
    "url_valid": true
  }
}
```

#### 🔌 Teste 2: Conectividade
- Tenta estabelecer conexão com TabuladorMax
- Mede latência
- Identifica erros de rede

**Possíveis erros:**
- Projeto inativo
- URL incorreta
- Firewall bloqueando

#### 🔐 Teste 3: Autenticação
- Valida se as credenciais são aceitas
- Detecta uso incorreto de anon key ao invés de service role key
- Verifica permissões básicas

**Erros comuns:**
- `42501`: Permissão negada (use SERVICE ROLE KEY)
- Credenciais expiradas ou inválidas

#### 📊 Teste 4: Tabelas
- Testa múltiplas variações de nomes: `leads`, `Leads`, `"Leads"`, etc.
- Conta registros em cada tabela
- Mede latência de cada acesso
- Recomenda melhor tabela para usar

**Resultado esperado:**
```json
{
  "status": "ok",
  "message": "2 tabela(s) encontrada(s) com dados",
  "details": {
    "tables_tested": [...],
    "accessible_count": 2,
    "with_data_count": 2,
    "best_table": {
      "table_name": "leads",
      "count": 150
    }
  }
}
```

#### 🔒 Teste 5: Permissões RLS
- Verifica se consegue ler dados
- Detecta políticas RLS bloqueando acesso
- Fornece instruções para resolver

#### 🔍 Teste 6: Estrutura de Dados
- Analisa campos disponíveis
- Verifica campos obrigatórios (`id`, `nome`, `telefone`, etc.)
- Detecta campos faltantes
- Verifica campo `updated_at` para sincronização incremental

### 2. Melhorias em `list-tabulador-tables`

**Antes:**
```
❌ Erro ao listar tabelas: PGRST116
```

**Depois:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "url": "https://project.supabase.co",
  "credentials_valid": true,
  "rpc_available": false,
  "tables_found": [],
  "table_tests": {
    "leads": {
      "exists": true,
      "count": 150,
      "quoted_name": "leads",
      "latency_ms": 234,
      "status": "✅ Acessível"
    },
    "Leads": {
      "exists": false,
      "error": "Tabela não encontrada",
      "error_code": "PGRST116",
      "status": "❌ Não acessível"
    }
  },
  "summary": {
    "total_tables_tested": 7,
    "accessible_tables": 1,
    "total_records": 150,
    "rpc_working": false
  },
  "recommendations": [
    "Use a tabela \"leads\" para sincronização (150 registros)"
  ]
}
```

### 3. Melhorias em `test-tabulador-connection`

**Novos recursos:**
- Testa todas as variações de nomes de tabela
- Registra cada tentativa com latência
- Fornece troubleshooting específico para cada erro
- Valida URL antes de tentar conectar

**Códigos de erro tratados:**
- `406`: Headers faltando
- `PGRST116`: Tabela não encontrada
- `PGRST301`: Erro de parsing/roteamento
- `42501`: Permissão negada
- Erros de rede

### 4. Melhorias em `initial-sync-leads`

**Antes:**
- Tentava apenas "leads"
- Erro genérico se falhasse

**Depois:**
- Tenta RPC `list_public_tables` primeiro
- Testa múltiplas variações de nomes
- Registra resultado de cada tentativa
- Mostra qual tabela funcionou
- Fornece estatísticas de performance

### 5. Validação de Credenciais

Todas as funções agora validam credenciais antes de executar:

```typescript
const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';

if (!tabuladorUrl || !tabuladorKey) {
  const missing = [];
  if (!tabuladorUrl) missing.push('TABULADOR_URL');
  if (!tabuladorKey) missing.push('TABULADOR_SERVICE_KEY');
  
  throw new Error(`Credenciais faltando: ${missing.join(', ')}`);
}

// Validar formato da URL
try {
  new URL(tabuladorUrl);
} catch (e) {
  throw new Error(`URL inválida: ${tabuladorUrl}`);
}
```

## 📱 Interface do Usuário

### Novo Botão: "Diagnóstico Completo"

Adicionado ao componente `TabuladorSync`:

```tsx
<Button onClick={runDiagnostic}>
  <AlertCircle className="h-4 w-4 mr-2" />
  Diagnóstico Completo
</Button>
```

**Funcionalidade:**
1. Executa função `diagnose-tabulador-sync`
2. Mostra resultado em toast notification
3. Loga detalhes completos no console
4. Registra em `sync_logs_detailed`

**Mensagens:**
- ✅ "Todos os testes passaram! Sincronização deve funcionar"
- ⚠️ "X aviso(s) encontrado(s). Verifique os logs"
- ❌ "X erro(s) encontrado(s). [primeira recomendação]"

## 🚀 Como Usar

### Opção 1: Via Interface

1. Acesse **Configurações → Integrações → Sincronização**
2. Clique em **"Diagnóstico Completo"**
3. Aguarde o resultado (10-30 segundos)
4. Leia as recomendações no toast
5. Revise logs detalhados no console do navegador

### Opção 2: Via API Direta

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/diagnose-tabulador-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Opção 3: Via Supabase Dashboard

1. Acesse **Edge Functions**
2. Selecione `diagnose-tabulador-sync`
3. Clique em **Invoke**

## 📊 Interpretando Resultados

### Status: "ok"
✅ Tudo funcionando! Pode executar sincronização.

**Próximos passos:**
1. Execute "Migração Inicial" para buscar todos os dados
2. Configure sincronização automática (cron)

### Status: "warning"
⚠️ Funcional mas com ressalvas.

**Problemas comuns:**
- Campos faltando na estrutura de dados
- RPC `list_public_tables` não disponível (ok se tabelas são acessíveis)
- Latência alta

**Ação:**
- Revise detalhes dos testes
- Sincronização deve funcionar mas pode haver limitações

### Status: "error"
❌ Problemas críticos impedem sincronização.

**Possíveis causas:**

#### 1. Credenciais não configuradas
```
"TABULADOR_URL não configurada"
"TABULADOR_SERVICE_KEY não configurada"
```

**Solução:**
1. Acesse Supabase Dashboard
2. Project Settings → Edge Functions → Secrets
3. Adicione as variáveis:
   - `TABULADOR_URL`: https://project-id.supabase.co
   - `TABULADOR_SERVICE_KEY`: eyJhbGciOi...

#### 2. URL inválida
```
"URL inválida - deve ser formato: https://project.supabase.co"
```

**Solução:**
- Corrija URL no formato correto
- Remova barra final se houver
- Use protocolo HTTPS

#### 3. Permissão negada (42501)
```
"Permissão negada - verifique as credenciais"
```

**Solução:**
- **NÃO use** anon/publishable key
- **USE** service_role key (secret)
- Encontre em: Project Settings → API → service_role (secret)

#### 4. Tabelas não encontradas
```
"Nenhuma tabela com dados encontrada"
```

**Solução:**
1. Verifique no Table Editor do TabuladorMax se tabela "leads" existe
2. Confirme se há dados na tabela:
   ```sql
   SELECT COUNT(*) FROM leads;
   ```
3. Verifique schema (deve ser `public`)
4. Teste políticas RLS com service role key

#### 5. Erro de conectividade
```
"Falha ao conectar com TabuladorMax"
```

**Solução:**
- Verifique se projeto TabuladorMax está ativo
- Teste URL no navegador (deve retornar página do Supabase)
- Verifique se não há firewall bloqueando

## 🧪 Testes Automatizados

### Executar testes

```bash
cd supabase/functions/_tests
deno test sync-utils.test.ts
deno test config-validation.test.ts
```

### Cobertura de testes

**sync-utils.test.ts:**
- Normalização de datas
- Extração de updated_at com fallbacks
- Prevenção de loops de sincronização
- Mapeamento de dados entre sistemas

**config-validation.test.ts:**
- Validação de URLs
- Validação de credenciais
- Quoting de nomes de tabela
- Geração de variações de nomes

## 📝 Logs Estruturados

Todas as funções agora usam logging estruturado:

```javascript
console.log('🔍 [Component] Ação sendo executada...');
console.log('✅ [Component] Sucesso:', data);
console.error('❌ [Component] Erro:', error);
console.warn('⚠️ [Component] Aviso:', warning);
```

**Símbolos:**
- 🔍 = Pesquisando/Verificando
- 📡 = Endpoint/URL
- 🎯 = Tabela alvo
- 📥 = Recebendo dados
- 📤 = Enviando dados
- ✅ = Sucesso
- ❌ = Erro
- ⚠️ = Aviso
- 📊 = Estatísticas
- ⏱️ = Tempo de execução
- 🔄 = Sincronizando
- 🚀 = Iniciando operação

## 🔄 Fluxo de Diagnóstico Recomendado

1. **Diagnóstico Completo** (novo botão)
   - Identifica todos os problemas
   - Fornece recomendações específicas

2. **Resolva problemas identificados**
   - Configure variáveis de ambiente
   - Ajuste permissões
   - Crie tabelas faltantes

3. **Teste Conexão** (botão existente)
   - Verifica acesso rápido
   - Confirma que correções funcionaram

4. **Migração Inicial**
   - Busca todos os dados
   - Popula banco local

5. **Sincronização Contínua**
   - Sincronização manual ou automática
   - Monitoramento via logs

## 🆘 Troubleshooting

### Problema: Diagnóstico falha ao executar

**Sintomas:**
- Botão não responde
- Erro no console: "Function not found"

**Solução:**
```bash
# Deploy da função
supabase functions deploy diagnose-tabulador-sync

# Configure variáveis de ambiente no Dashboard
```

### Problema: Todos os testes passam mas sincronização falha

**Possíveis causas:**
1. Políticas RLS diferentes para read vs write
2. Triggers interferindo
3. Campos obrigatórios faltando

**Debug:**
1. Verifique logs da sincronização
2. Teste manualmente no SQL Editor:
   ```sql
   INSERT INTO leads (id, nome) VALUES ('test', 'Test');
   ```
3. Revise políticas RLS da tabela

### Problema: Latência muito alta

**Sintomas:**
- Testes levam > 10 segundos
- Timeouts frequentes

**Soluções:**
- Verifique localização do servidor (latência geográfica)
- Otimize queries com índices
- Considere aumentar timeout (SYNC_TIMEOUT_MS)

## 📚 Documentação Relacionada

- [TABULADORMAX_CONFIGURATION_GUIDE.md](../../TABULADORMAX_CONFIGURATION_GUIDE.md)
- [SYNC_ARCHITECTURE.md](../../SYNC_ARCHITECTURE.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## ✅ Checklist de Validação

Após implementar as correções:

- [ ] Diagnóstico Completo retorna status "ok"
- [ ] Todos os 6 testes passam
- [ ] Tabela "leads" identificada e acessível
- [ ] Contagem de registros > 0
- [ ] Latência aceitável (< 1s por teste)
- [ ] Migração Inicial funciona
- [ ] Sincronização incremental funciona
- [ ] Logs aparecem no console
- [ ] Logs salvos em sync_logs_detailed
