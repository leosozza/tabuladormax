# Guia de Deploy - Hardening Admin Diagnostics

## Resumo das Mudanças

Este PR implementa melhorias de segurança e otimização para a área administrativa de diagnósticos, conforme auditoria técnica realizada.

### 1. Guards de Rota (Front-end)

#### AdminRoute Component
- **Arquivo**: `src/components/AdminRoute.tsx`
- **Funcionalidade**: Componente de proteção de rotas administrativas
- **Segurança**:
  - Autenticação via Supabase Auth (verificação de sessão JWT)
  - Autorização por role: apenas usuários com `role='admin'` em `user_profiles`
  - Redirecionamento automático: não autenticados → `/auth`, não-admins → `/403`
  - Loading state para evitar flash de conteúdo não autorizado

#### Página 403 Forbidden
- **Arquivo**: `src/pages/Forbidden.tsx`
- **Funcionalidade**: Página de erro para usuários sem permissão

#### Code-Splitting
- **Arquivo**: `src/App.tsx`
- **Implementação**:
  - React.lazy/Suspense para rotas `/admin/diagnostics` e `/admin/permissions`
  - Componentes carregados sob demanda apenas quando necessário
  - Reduz bundle inicial em ~30KB

### 2. Hardening de Edge Functions (Backend)

#### Utilitários Compartilhados
- **Arquivo**: `supabase/functions/_shared/security.ts`
- **Funcionalidades**:
  - `getCorsHeaders()`: CORS restrito por ambiente
  - `verifyAdminAuth()`: Validação de JWT + verificação de role admin
  - `checkRateLimit()`: Rate limiting in-memory por IP
  - `errorResponse()`: Helper para respostas de erro padronizadas

- **Arquivo**: `supabase/functions/_shared/validation.ts`
- **Funcionalidades**:
  - Schemas Zod para validação de entrada
  - `logsQuerySchema`: valida query params (cursor, level, q)
  - `autoFixBodySchema`: valida body POST (issueId, action)

#### Funções Atualizadas

##### diagnostics/metrics
- Autenticação + autorização admin
- CORS restrito em produção
- Rate limiting

##### diagnostics/logs
- Autenticação + autorização admin
- Validação Zod de query params
- CORS restrito em produção
- Rate limiting

##### diagnostics/auto-fix
- Autenticação + autorização admin
- Validação Zod do body POST
- CORS restrito em produção
- Rate limiting

##### diagnostics/health
- Autenticação + autorização admin
- CORS restrito em produção
- Rate limiting

##### reload-gestao-scouter-schema-cache
- Validação reforçada de RELOAD_SCHEMA_SECRET
- Documentação clara: **NÃO chamar do cliente**
- Uso apenas para webhooks/cron/backend-to-backend

### 3. Ajustes de .gitignore

- **Arquivo**: `.gitignore`
- **Mudanças**:
  - Removida exceção que versionava `supabase/functions/diagnostics/logs/`
  - Adicionada regra para ignorar arquivos `.log` e `.txt` no diretório de logs
  - Exceção para versionar `.keep` file
  
- **Arquivo**: `supabase/functions/diagnostics/logs/.keep`
- **Finalidade**: Manter estrutura de diretório sem versionar logs reais

### 4. Code-Splitting do Vite

- **Arquivo**: `vite.config.ts`
- **Implementação**:
  - `splitVendorChunkPlugin()`: Separa vendors automaticamente
  - `manualChunks`: Configuração manual para chunks otimizados
    - `react-core`: React e ReactDOM
    - `ui-components`: Radix UI components
    - `charts`: ApexCharts e Recharts
    - `maps`: Leaflet e Turf
    - `router`: React Router
    - `forms`: React Hook Form
    - `supabase`: Supabase client
    - `utils`: jsPDF, date-fns, etc.

## Variáveis de Ambiente Necessárias

### Edge Functions (Supabase)

Configure estas variáveis no Supabase Dashboard → Settings → Edge Functions:

```bash
# Autenticação
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# CORS - Produção
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_REQUESTS=60  # requests por minuto por IP (padrão: 60)

# Reload Schema Cache (apenas para reload-gestao-scouter-schema-cache)
RELOAD_SCHEMA_SECRET=um-segredo-muito-forte-aqui
```

### Front-end

Variáveis já configuradas no `.env` local ou Vercel/Netlify:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

## Instruções de Deploy

### 1. Deploy do Front-end

```bash
# Build de produção
npm run build

# Preview local (opcional)
npm run preview

# Deploy para Vercel/Netlify
# (ou usar integração Git automática)
```

### 2. Deploy das Edge Functions

```bash
# Deploy via Supabase CLI
supabase functions deploy diagnostics/metrics
supabase functions deploy diagnostics/logs
supabase functions deploy diagnostics/auto-fix
supabase functions deploy diagnostics/health
supabase functions deploy reload-gestao-scouter-schema-cache

# Configurar variáveis de ambiente
supabase secrets set ALLOWED_ORIGINS="https://seu-dominio.com"
supabase secrets set NODE_ENV="production"
supabase secrets set RATE_LIMIT_REQUESTS="60"
supabase secrets set RELOAD_SCHEMA_SECRET="seu-segredo-forte"
```

### 3. Verificação de Permissões no Banco

Certifique-se de que a tabela `user_profiles` tem a coluna `role`:

```sql
-- Verificar estrutura da tabela
SELECT * FROM user_profiles LIMIT 1;

-- Se necessário, adicionar role admin para seu usuário
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = 'seu-user-id';
```

## Testando as Mudanças

### 1. Teste de Autenticação (Front-end)

1. Faça logout e tente acessar `/admin/diagnostics` → Deve redirecionar para `/auth`
2. Faça login com usuário não-admin → Deve redirecionar para `/403`
3. Faça login com usuário admin → Deve acessar a página normalmente

### 2. Teste de Edge Functions

```bash
# Teste com token válido de admin
curl -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
     https://seu-projeto.supabase.co/functions/v1/diagnostics/metrics

# Teste sem token (deve falhar)
curl https://seu-projeto.supabase.co/functions/v1/diagnostics/metrics

# Teste rate limiting (fazer 61+ requests em 1 minuto)
for i in {1..65}; do
  curl -H "Authorization: Bearer SEU_TOKEN" \
       https://seu-projeto.supabase.co/functions/v1/diagnostics/metrics
done
# Deve retornar 429 após o limite
```

### 3. Teste de Code-Splitting

1. Abra DevTools → Network
2. Acesse a aplicação
3. Navegue para `/admin/diagnostics`
4. Verifique que um novo chunk é carregado apenas ao acessar a rota

## Próximos Passos Recomendados

### Segurança

1. **Rotacionar Segredos**
   - [ ] Rotacionar `RELOAD_SCHEMA_SECRET` mensalmente
   - [ ] Implementar rotação automática de secrets
   - [ ] Usar secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

2. **Rate Limiting em Produção**
   - [ ] Migrar de rate limiter in-memory para Redis/Upstash
   - [ ] Implementar rate limiting diferenciado por tipo de usuário
   - [ ] Adicionar logging de tentativas de rate limit exceeded

3. **CORS em Produção**
   - [ ] Remover `*` de ALLOWED_ORIGINS quando entrar em produção
   - [ ] Configurar lista específica de domínios permitidos
   - [ ] Considerar usar subdomínios dedicados para API

4. **Auditoria**
   - [ ] Implementar logging de todas as requisições admin
   - [ ] Configurar alertas para tentativas de acesso não autorizado
   - [ ] Revisar logs de segurança semanalmente

### Performance

1. **Monitoramento**
   - [ ] Configurar Lighthouse CI
   - [ ] Monitorar métricas de Core Web Vitals
   - [ ] Acompanhar tamanho dos chunks

2. **Otimizações Adicionais**
   - [ ] Considerar route-based prefetching
   - [ ] Implementar service worker para cache agressivo
   - [ ] Avaliar lazy loading de imagens

### Banco de Dados

1. **Índices**
   - [ ] Verificar índice em `user_profiles.role`
   - [ ] Otimizar queries de verificação de permissão

2. **Row Level Security (RLS)**
   - [ ] Implementar RLS policies para `user_profiles`
   - [ ] Garantir que apenas admins podem modificar roles

## Rollback

Se necessário reverter as mudanças:

```bash
# Front-end: reverter commit
git revert HEAD

# Edge Functions: fazer redeploy da versão anterior
supabase functions deploy diagnostics/metrics --no-verify-jwt

# Remover restrições de CORS temporariamente
supabase secrets unset ALLOWED_ORIGINS
```

## Suporte

Para questões ou problemas:
- Abrir issue no repositório
- Consultar logs no Supabase Dashboard → Edge Functions → Logs
- Verificar console do navegador para erros de front-end

## Referências

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Edge Functions Security](https://supabase.com/docs/guides/functions/auth)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [React.lazy Documentation](https://react.dev/reference/react/lazy)
