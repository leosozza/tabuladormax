# Guia de Integração do Workspace Gestão Scouter

## Resumo

Este documento descreve a integração do repositório [leosozza/gestao-scouter](https://github.com/leosozza/gestao-scouter) como um módulo workspace no monorepo tabuladormax.

## Arquitetura da Integração

### Estrutura de Diretórios

```
tabuladormax/
├── packages/
│   └── gestao-scouter/          # Módulo workspace
│       ├── src/                  # Código-fonte TypeScript/React
│       ├── public/               # Assets estáticos
│       ├── supabase/            # Migrações e Edge Functions
│       ├── scripts/             # Scripts utilitários
│       ├── package.json         # Dependências do módulo
│       ├── tsconfig.json        # Configuração TypeScript
│       ├── vite.config.ts       # Configuração Vite
│       └── README.md            # Documentação do módulo
├── .github/
│   └── workflows/
│       └── ci.yml               # Workflow CI/CD
├── package.json                 # Root package com workspaces
├── tsconfig.json               # TypeScript com referências
└── vite.config.ts              # Vite com path aliases
```

### Configurações Aplicadas

#### 1. Workspace Configuration (package.json)

Adicionado suporte a npm workspaces:

```json
{
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:gestao-scouter": "npm run dev --workspace=packages/gestao-scouter",
    "build:gestao-scouter": "npm run build --workspace=packages/gestao-scouter"
  }
}
```

**Compatibilidade**: Funciona com npm, pnpm e yarn (todos suportam o campo `workspaces`).

#### 2. TypeScript Configuration (tsconfig.json)

Adicionadas referências ao workspace e path mappings:

```json
{
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./packages/gestao-scouter/tsconfig.json" }
  ],
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/modules/*": ["./src/modules/*"],
      "@gestao-scouter/*": ["./packages/gestao-scouter/src/*"]
    }
  }
}
```

#### 3. Vite Configuration (vite.config.ts)

Adicionado alias para resolver imports do workspace:

```typescript
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/modules": path.resolve(__dirname, "./src/modules"),
      "@gestao-scouter": path.resolve(__dirname, "./packages/gestao-scouter/src"),
    },
  },
}));
```

#### 4. GitHub Actions CI (.github/workflows/ci.yml)

Criado workflow que:
- Roda em múltiplas versões do Node.js (18.x, 20.x)
- Executa lint, typecheck, build e tests para root e gestao-scouter
- Faz cache de dependências npm
- Sobe artifacts de build

## Como Usar

### Instalação

```bash
# Clone o repositório
git clone https://github.com/leosozza/tabuladormax.git
cd tabuladormax

# Instale as dependências (incluindo workspaces)
npm install --legacy-peer-deps
```

**Nota**: `--legacy-peer-deps` é necessário devido a conflitos de peer dependencies no root (react-day-picker + date-fns).

### Desenvolvimento

```bash
# Rodar o projeto raiz em desenvolvimento
npm run dev

# Rodar o gestao-scouter em desenvolvimento
npm run dev:gestao-scouter

# Ou diretamente no workspace
npm run dev --workspace=packages/gestao-scouter
```

### Build

```bash
# Build do projeto raiz
npm run build

# Build do gestao-scouter
npm run build:gestao-scouter

# Ou diretamente no workspace
npm run build --workspace=packages/gestao-scouter
```

### Typecheck

```bash
# Typecheck do projeto raiz
npx tsc --noEmit

# Typecheck do gestao-scouter
npx tsc --noEmit --project packages/gestao-scouter/tsconfig.json
```

### Lint

```bash
# Lint do projeto raiz
npm run lint

# Lint do gestao-scouter
npm run lint --workspace=packages/gestao-scouter
```

### Testes

```bash
# Testes do projeto raiz
npm run test

# Testes do gestao-scouter (se houver)
npm run test --workspace=packages/gestao-scouter
```

## Configuração de Ambiente

O módulo gestao-scouter requer variáveis de ambiente específicas. Crie um arquivo `.env` em `packages/gestao-scouter/`:

```bash
# Copie o exemplo
cp packages/gestao-scouter/.env.example packages/gestao-scouter/.env

# Edite com suas credenciais
nano packages/gestao-scouter/.env
```

Variáveis necessárias:
- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `VITE_SUPABASE_SERVICE_KEY` - Service role key (opcional, para scripts)
- Outras variáveis específicas (veja `.env.example`)

**⚠️ IMPORTANTE**: Nunca commite arquivos `.env` com secrets reais!

## Migrações de Banco de Dados

O módulo gestao-scouter inclui migrações PLpgSQL em `packages/gestao-scouter/supabase/migrations/`.

Para aplicá-las:

```bash
# 1. Instale o Supabase CLI
npm install -g supabase

# 2. Entre no diretório do módulo
cd packages/gestao-scouter

# 3. Faça login no Supabase
supabase login

# 4. Link ao projeto
supabase link --project-ref your-project-ref

# 5. Aplique as migrações
supabase db push
```

Consulte a [documentação do Supabase](https://supabase.com/docs/guides/cli) para mais detalhes.

## Integração com o Projeto Principal

### Importando Código do Gestão Scouter

Com os path aliases configurados, você pode importar código do gestao-scouter no projeto principal:

```typescript
// No projeto raiz (src/)
import { SomeComponent } from '@gestao-scouter/components/SomeComponent';
import { someUtil } from '@gestao-scouter/utils/someUtil';
```

### Compartilhamento de Dependências

Dependências comuns são automaticamente hoisted pela configuração de workspaces, evitando duplicação.

## Verificação e Testes

### Checklist de Verificação

- [x] ✅ Instalação de dependências funciona
- [x] ✅ Build do root funciona
- [x] ✅ Build do gestao-scouter funciona (com PWA)
- [x] ✅ Typecheck do root sem erros
- [x] ✅ Typecheck do gestao-scouter sem erros
- [x] ✅ Workspace npm configurado corretamente
- [x] ✅ Path aliases TypeScript funcionam
- [x] ✅ Path aliases Vite funcionam
- [x] ✅ CI workflow criado e configurado

### Testes Executados

```bash
# 1. Instalação limpa
rm -rf node_modules package-lock.json packages/gestao-scouter/node_modules
npm install --legacy-peer-deps
# ✅ Sucesso: 1362 packages instalados

# 2. Build root
npm run build
# ✅ Sucesso: dist/index.html gerado (1.7MB JS bundle)

# 3. Build gestao-scouter
npm run build:gestao-scouter
# ✅ Sucesso: packages/gestao-scouter/dist/ gerado (8.4MB precache PWA)

# 4. Typecheck root
npx tsc --noEmit
# ✅ Sucesso: Sem erros de tipo

# 5. Typecheck gestao-scouter
npx tsc --noEmit --project packages/gestao-scouter/tsconfig.json
# ✅ Sucesso: Sem erros de tipo

# 6. Lint
npm run lint
# ⚠️ 565 problemas (528 erros, 37 warnings)
# Nota: Todos são erros pre-existentes no projeto raiz, não relacionados à integração

# 7. Testes
npm run test -- --run
# ⚠️ Algumas falhas em testes existentes
# Nota: Falhas pre-existentes no projeto raiz, não relacionadas à integração
```

## Questões de Segurança

### Vulnerabilidades Conhecidas

Análise de `npm audit` identificou:

1. **esbuild <=0.24.2** (Moderate)
   - CVE: GHSA-67mh-4wv8-2f99
   - Descrição: Development server pode responder a requests de qualquer website
   - Status: Presente no vite@5.4.21 do root e vite@7.1.7 do gestao-scouter
   - Mitigação: Apenas afeta dev server, não produção

2. **xlsx** (High)
   - CVE: GHSA-4r6h-8v6p-xvw6 (Prototype Pollution), GHSA-5pgg-2g8v-p4x9 (ReDoS)
   - Status: Dependência do gestao-scouter sem fix disponível
   - Mitigação: Considerar substituir por alternativa (exceljs, papaparse)
   - TODO: Avaliar substituição em issue separada

### Recomendações

1. **Curto prazo**:
   - ✅ Documentar vulnerabilidades conhecidas
   - ✅ Adicionar nota no README sobre xlsx
   - ⚠️ Não usar xlsx com dados não confiáveis

2. **Médio prazo**:
   - [ ] Avaliar substituição do xlsx por biblioteca alternativa
   - [ ] Atualizar vite quando fix de esbuild estiver disponível

3. **Boas práticas**:
   - ✅ Validar inputs de usuário
   - ✅ Usar sanitização de dados
   - ✅ Manter dependências atualizadas
   - ✅ Rodar `npm audit` regularmente

## Troubleshooting

### Erro: "peer dependency conflicts"

**Solução**: Use `npm install --legacy-peer-deps` ou `npm install --force`.

### Erro: "Cannot find module '@gestao-scouter/...'"

**Possíveis causas**:
1. Path alias não configurado no tsconfig.json ou vite.config.ts
2. Módulo não instalado

**Solução**:
```bash
# Reinstale as dependências
npm install --legacy-peer-deps

# Verifique a configuração dos paths
cat tsconfig.json | grep -A 5 paths
```

### Build falha no CI

**Possíveis causas**:
1. Versão do Node.js incompatível
2. Dependências não cacheadas corretamente

**Solução**: Verifique o workflow CI para garantir que:
- Node.js 18.x ou 20.x está sendo usado
- `npm ci --legacy-peer-deps` está sendo executado
- Cache de npm está configurado

## Próximos Passos

### Tarefas Futuras

- [ ] Avaliar migração de xlsx para alternativa mais segura
- [ ] Adicionar testes de integração entre root e gestao-scouter
- [ ] Configurar Prettier para formatação consistente
- [ ] Adicionar pre-commit hooks (husky + lint-staged)
- [ ] Documentar APIs públicas do gestao-scouter para reuso
- [ ] Criar scripts de deploy para ambos os módulos

### Melhorias Sugeridas

1. **Monorepo avançado**: Considerar migração para Turborepo ou Nx para builds mais rápidos
2. **Shared packages**: Extrair código comum em packages/shared
3. **Storybook**: Adicionar para desenvolvimento de componentes
4. **E2E tests**: Adicionar testes Playwright/Cypress

## Referências

- [Repositório Original](https://github.com/leosozza/gestao-scouter)
- [Documentação do Gestão Scouter](./packages/gestao-scouter/README.md)
- [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Vite Configuration](https://vitejs.dev/config/)

## Suporte

Para questões sobre:
- **Workspace configuration**: Abra issue no repositório tabuladormax
- **Gestão Scouter específico**: Consulte a documentação em `packages/gestao-scouter/`
- **Bugs ou features**: Abra issue descrevendo o problema/melhoria

---

**Data de Integração**: 2025-10-23  
**Autor**: GitHub Copilot Agent  
**Revisores**: leosozza
