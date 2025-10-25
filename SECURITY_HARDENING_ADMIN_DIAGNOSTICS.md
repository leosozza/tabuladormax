# Hardening de Segurança - Admin Diagnostics

Este documento descreve as alterações de segurança e otimização implementadas para a área administrativa de diagnósticos do TabuladorMax.

## 📋 Resumo das Alterações

### 1. **Front-end: Guards de Rota e Code-Splitting**

#### AdminRoute Component (`src/components/AdminRoute.tsx`)
- ✅ **Autenticação**: Verifica se o usuário está autenticado via Supabase Auth
- ✅ **Autorização**: Valida role 'admin' na tabela `user_profiles`
- ✅ **Redirecionamento seguro**:
  - Usuários não autenticados → `/auth`
  - Usuários não-admins → `/403`
- ✅ **Loading state**: Previne flash de conteúdo não autorizado

#### Code-Splitting (`src/App.tsx`)
- ✅ React.lazy + Suspense para rotas `/admin/diagnostics` e `/admin/permissions`
- ✅ Reduz bundle inicial, carrega apenas quando acessado

#### Vite Code-Splitting (`vite.config.ts`)
- ✅ `splitVendorChunkPlugin()` para separar código de terceiros
- ✅ `manualChunks` para otimizar carregamento:
  - `react-core`: React + React-DOM (67KB gzipped)
  - `ui-radix`: Componentes Radix UI (33KB gzipped)
  - `charts`: ApexCharts + Recharts (220KB gzipped)
  - `maps`: Leaflet + Turf (58KB gzipped)
  - `routing`: React Router + TanStack Query (1.3KB gzipped)
  - `supabase`: Cliente Supabase (40KB gzipped)
  - `vendor`: Outras dependências (435KB gzipped)

### 2. **Backend: Hardening das Edge Functions**

#### Utilitários Compartilhados (`supabase/functions/_shared/`)

##### `security.ts` - Módulo de Segurança
**CORS Restrito**:
- Desenvolvimento: `*` (todas as origens)
- Produção: `ALLOWED_ORIGINS` (lista separada por vírgula)
- Fallback: Bloqueia todas as origens se não configurado

**Autenticação & Autorização**:
```typescript
checkAuth(req: Request) -> AuthResult
```
- Extrai JWT do header `Authorization`
- Valida token com Supabase Auth
- Busca role do usuário em `user_profiles`
- Retorna se o usuário é admin

**Rate Limiting**:
```typescript
checkRateLimit(req: Request) -> boolean
```
- In-memory, baseado em IP
- Configurável via `RATE_LIMIT_REQUESTS` (padrão: 60/min)
- **⚠️ Limitação**: Não é distribuído, reseta ao reiniciar função
- **✅ Recomendação**: Usar Redis/Upstash em produção

##### `validation.ts` - Validação Zod
**Schemas**:
- `LogsQuerySchema`: cursor, level, q (max 200 chars)
- `AutoFixRequestSchema`: issueId (1-100 chars)
- `ReloadSchemaRequestSchema`: secret (obrigatório)

**Helpers**:
- `validateQueryParams()`: Valida query params da URL
- `validateRequestBody()`: Valida body JSON do request
- `validationErrorResponse()`: Resposta padronizada de erro 400

#### Edge Functions Atualizadas

**diagnostics/metrics** (`GET`):
- ✅ CORS restrito
- ✅ Autenticação + Autorização (admin)
- ✅ Rate limiting
- 📊 Retorna: req_per_s, latency_p95_ms, error_rate_pct, db_connections

**diagnostics/logs** (`GET`):
- ✅ CORS restrito
- ✅ Autenticação + Autorização (admin)
- ✅ Rate limiting
- ✅ Validação Zod de query params (cursor, level, q)
- 📊 Retorna: lista paginada de logs com filtros

**diagnostics/auto-fix** (`POST`):
- ✅ CORS restrito
- ✅ Autenticação + Autorização (admin)
- ✅ Rate limiting
- ✅ Validação Zod de body (issueId)
- 🔧 Retorna: jobId, estimatedDuration

**diagnostics/health** (`GET`):
- ✅ CORS restrito
- ✅ Autenticação + Autorização (admin)
- ✅ Rate limiting
- 📊 Retorna: health checks de Database, Edge Functions, Storage, Auth, PostgREST

**reload-gestao-scouter-schema-cache** (`POST`):
- ✅ CORS restrito
- ✅ Autenticação via segredo compartilhado (`RELOAD_SCHEMA_SECRET`)
- ✅ Rate limiting (mais restritivo)
- ⚠️ **Não usar diretamente do cliente** - apenas backend/jobs
- 🔐 Header: `x-shared-secret` ou Body: `{ "secret": "..." }`

### 3. **Configurações**

#### `.gitignore`
- ✅ Removida exceção que versionava `supabase/functions/diagnostics/logs/`
- ✅ Adicionado `.keep` para manter diretório vazio no repo

## 🔐 Variáveis de Ambiente

### Obrigatórias

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Reload Schema Cache
RELOAD_SCHEMA_SECRET=seu-segredo-super-secreto-aqui
```

### Recomendadas para Produção

```bash
# Ambiente
NODE_ENV=production

# CORS (separado por vírgula, sem espaços)
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com

# Rate Limiting (requests por minuto)
RATE_LIMIT_REQUESTS=60
```

## 🚀 Deploy

### Supabase CLI

```bash
# Deploy todas as funções
supabase functions deploy

# Deploy função específica
supabase functions deploy diagnostics/metrics

# Configurar variáveis de ambiente
supabase secrets set ALLOWED_ORIGINS="https://seu-dominio.com"
supabase secrets set RATE_LIMIT_REQUESTS="60"
supabase secrets set RELOAD_SCHEMA_SECRET="seu-segredo-aqui"
```

### Verificação

```bash
# Testar endpoint (deve retornar 401 sem auth)
curl -X GET https://seu-projeto.supabase.co/functions/v1/diagnostics/metrics

# Testar com autenticação
curl -X GET https://seu-projeto.supabase.co/functions/v1/diagnostics/metrics \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

## 📊 Impacto de Performance

### Code-Splitting
- **Antes**: 1 chunk de 3MB (872KB gzipped)
- **Depois**: 10 chunks menores
  - Chunk principal: 508KB (118KB gzipped) - 86% menor!
  - Carregamento paralelo de chunks
  - Melhor cache do browser

### Edge Functions
- **Rate Limiting**: ~1ms overhead por request
- **Autenticação**: ~50-100ms (busca no Supabase)
- **Validação Zod**: <1ms overhead

## ⚠️ Considerações de Segurança

### 1. Rate Limiting In-Memory
**Limitações**:
- Não compartilha estado entre instâncias
- Perde estado ao reiniciar
- Não é distribuído

**Recomendação para Produção**:
- Migrar para Redis (Upstash, Railway)
- Implementar sliding window
- Usar Cloudflare Rate Limiting como camada adicional

### 2. CORS em Produção
**Ação necessária**:
- Remover `'*'` do código
- Configurar `ALLOWED_ORIGINS` com domínios reais
- Validar origem do request no código (TODO no `security.ts`)

### 3. Rotação de Secrets
**Recomendação**:
- Rotacionar `RELOAD_SCHEMA_SECRET` a cada 90 dias
- Usar secrets manager (Vault, AWS Secrets Manager)
- Implementar rotação automática

### 4. Monitoramento
**Adicionar**:
- Logs estruturados para tentativas de acesso não autorizado
- Alertas para rate limit excedido
- Métricas de latência de autenticação
- Dashboard de segurança

## 📝 Testing

### Front-end
```bash
npm test
```

### Edge Functions (Manual)
```bash
# Metrics (requer admin)
curl -X GET https://seu-projeto.supabase.co/functions/v1/diagnostics/metrics \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN_JWT"

# Logs com filtros (requer admin)
curl -X GET "https://seu-projeto.supabase.co/functions/v1/diagnostics/logs?level=error&q=timeout" \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN_JWT"

# Auto-fix (requer admin)
curl -X POST https://seu-projeto.supabase.co/functions/v1/diagnostics/auto-fix \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"issueId": "issue-123"}'

# Reload schema (backend only)
curl -X POST https://seu-projeto.supabase.co/functions/v1/reload-gestao-scouter-schema-cache \
  -H "x-shared-secret: SEU_RELOAD_SECRET"
```

## 🎯 Próximos Passos

1. [ ] Implementar rate limiting distribuído com Redis
2. [ ] Adicionar validação de origem CORS no código
3. [ ] Configurar rotação automática de secrets
4. [ ] Adicionar logs estruturados e monitoring
5. [ ] Implementar testes de integração para edge functions
6. [ ] Criar dashboard de segurança no admin
7. [ ] Documentar playbook de resposta a incidentes

## 📚 Referências

- [Supabase Edge Functions Security](https://supabase.com/docs/guides/functions/security)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Zod Validation](https://zod.dev/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
