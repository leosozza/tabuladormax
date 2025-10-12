# Flow Builder - Sistema de Automação com Flows

## Visão Geral

O Flow Builder é uma funcionalidade MVP (Minimum Viable Product) que permite criar e executar fluxos de automação sequenciais no sistema. Os flows são executados server-side através de Edge Functions, com persistência em banco de dados e logging completo.

### Flows v2 Foundation

A versão 2 do Flow Builder adiciona infraestrutura robusta com:
- **Versionamento**: Sistema completo de controle de versão de flows
- **Validação JSON Schema**: Validação rigorosa de definições de flows
- **Step Runners Modulares**: Infraestrutura extensível para executores de steps
- **Utilidades**: Ferramentas para gerenciamento de versões e validação
- **Testes**: Estrutura de testes unitários para garantir qualidade

## Conceitos

### Modo Básico vs Modo Avançado

- **Modo Básico**: Comportamento atual do botão "tabular" - execução local, imediata e individual de cada ação
- **Modo Avançado (Flows)**: Execução server-side de sequências de steps, com persistência, logging e controle de execução

### Componentes Principais

1. **Flows** (`public.flows`): Definições de flows com steps sequenciais
2. **Flows Runs** (`public.flows_runs`): Histórico de execuções com logs e resultados
3. **Edge Functions**: APIs para CRUD e execução de flows
4. **Handlers**: Lógica reutilizável para ações (tabular, HTTP calls)
5. **UI Components**: Interface para criar, listar e executar flows

## Arquitetura

### Database Schema

```sql
-- Tabela de flows
CREATE TABLE public.flows (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  steps JSONB NOT NULL, -- Array de steps
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE,
  atualizado_em TIMESTAMP WITH TIME ZONE,
  criado_por UUID REFERENCES auth.users(id),
  current_version_id UUID REFERENCES public.flow_versions(id) -- v2: Link para versão ativa
);

-- Tabela de execuções
CREATE TABLE public.flows_runs (
  id UUID PRIMARY KEY,
  flow_id UUID REFERENCES public.flows(id),
  lead_id INTEGER,
  status TEXT, -- pending, running, completed, failed
  logs JSONB, -- Array de log entries
  resultado JSONB,
  iniciado_em TIMESTAMP WITH TIME ZONE,
  finalizado_em TIMESTAMP WITH TIME ZONE,
  executado_por UUID REFERENCES auth.users(id)
);

-- Tabela de versões (v2)
CREATE TABLE public.flow_versions (
  id UUID PRIMARY KEY,
  flow_id UUID REFERENCES public.flows(id),
  version_number INTEGER NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  definition JSONB NOT NULL, -- Definição completa do flow
  schema_version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE,
  criado_por UUID REFERENCES auth.users(id),
  notas_versao TEXT,
  UNIQUE(flow_id, version_number)
);
```

### RLS Policies

- **Flows**: Todos podem ler, apenas admins/managers podem criar/editar/deletar
- **Flows Runs**: Usuários veem suas próprias execuções, admins/managers veem todas

### Edge Functions

#### flows-api

**Endpoint**: `/functions/v1/flows-api`

Operações CRUD para flows:

- `GET /flows-api` - Listar todos os flows
- `GET /flows-api/{id}` - Obter flow específico
- `POST /flows-api` - Criar novo flow
- `PUT /flows-api/{id}` - Atualizar flow
- `DELETE /flows-api/{id}` - Deletar flow

**Exemplo de criação**:
```json
{
  "nome": "Qualificação Completa",
  "descricao": "Atualiza status e envia notificação",
  "steps": [
    {
      "id": "step-1",
      "type": "tabular",
      "nome": "Atualizar Status",
      "config": {
        "webhook_url": "https://bitrix.example.com/rest/...",
        "field": "STATUS_ID",
        "value": "QUALIFIED"
      }
    },
    {
      "id": "step-2",
      "type": "wait",
      "nome": "Aguardar 5 segundos",
      "config": {
        "seconds": 5
      }
    },
    {
      "id": "step-3",
      "type": "http_call",
      "nome": "Enviar Notificação",
      "config": {
        "url": "https://api.example.com/notify",
        "method": "POST",
        "body": {
          "lead_id": "{{lead_id}}",
          "message": "Lead qualificado"
        }
      }
    }
  ],
  "ativo": true
}
```

#### flows-executor

**Endpoint**: `/functions/v1/flows-executor`

Executa um flow sequencialmente:

- `POST /flows-executor` - Executar flow

**Exemplo de execução**:
```json
{
  "flowId": "uuid-do-flow",
  "leadId": 12345,
  "context": {
    "nome_usuario": "João"
  }
}
```

**Resposta**:
```json
{
  "runId": "uuid-da-execucao",
  "status": "completed",
  "message": "Flow executado com sucesso",
  "logs": [
    {
      "timestamp": "2025-10-11T23:00:00Z",
      "stepId": "step-1",
      "stepNome": "Atualizar Status",
      "level": "success",
      "message": "Step completado com sucesso",
      "data": { ... }
    }
  ],
  "resultado": {
    "steps": [
      { "stepId": "step-1", "success": true, "result": {...} }
    ]
  }
}
```

### Tipos de Steps

1. **tabular**: Executa ação de tabulação (atualização no Bitrix)
   ```json
   {
     "type": "tabular",
     "config": {
       "webhook_url": "string",
       "field": "string",
       "value": "string",
       "additional_fields": [{ "field": "string", "value": "string" }]
     }
   }
   ```

2. **http_call**: Faz requisição HTTP
   ```json
   {
     "type": "http_call",
     "config": {
       "url": "string",
       "method": "GET|POST|PUT|PATCH|DELETE",
       "headers": { "key": "value" },
       "body": { "key": "value" }
     }
   }
   ```

3. **wait**: Adiciona delay entre steps
   ```json
   {
     "type": "wait",
     "config": {
       "seconds": 5
     }
   }
   ```

### Handlers Reutilizáveis

#### src/handlers/tabular.ts

```typescript
import { runTabular, type TabularConfig, type TabularContext } from "@/handlers/tabular";

const result = await runTabular(
  {
    webhook_url: "https://...",
    field: "STATUS_ID",
    value: "QUALIFIED"
  },
  {
    leadId: 12345,
    chatwootData: {...},
    profile: {...}
  }
);
```

#### src/handlers/httpCall.ts

```typescript
import { execHttpCall, type HttpCallConfig } from "@/handlers/httpCall";

const result = await execHttpCall(
  {
    url: "https://api.example.com/endpoint",
    method: "POST",
    body: { lead_id: "{{lead_id}}" }
  },
  {
    leadId: 12345,
    variables: { custom_field: "value" }
  }
);
```

## UI Components

### FlowList

Componente para listar e gerenciar flows.

```tsx
import { FlowList } from "@/components/flow/FlowList";

<FlowList onExecuteFlow={(flowId) => console.log('Flow executado:', flowId)} />
```

### FlowBuilder

Modal para criar/editar flows.

```tsx
import { FlowBuilder } from "@/components/flow/FlowBuilder";

<FlowBuilder
  open={open}
  onOpenChange={setOpen}
  flow={flow}
  onSave={() => console.log('Flow salvo')}
/>
```

### FlowExecuteModal

Modal para executar um flow.

```tsx
import { FlowExecuteModal } from "@/components/flow/FlowExecuteModal";

<FlowExecuteModal
  open={open}
  onOpenChange={setOpen}
  flow={flow}
  leadId={12345}
  onComplete={() => console.log('Execução concluída')}
/>
```

## Segurança

### Service Role Key

⚠️ **IMPORTANTE**: Use `SUPABASE_SERVICE_ROLE_KEY` **SOMENTE** nas Edge Functions (server-side). Nunca exponha essa chave no frontend.

### Variáveis de Ambiente

Configure no Edge Functions:
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave service_role (apenas server-side)
- `SUPABASE_ANON_KEY`: Chave pública (frontend)

### RLS Policies

Todas as tabelas possuem Row Level Security (RLS) habilitado:
- Flows: Leitura para todos autenticados, escrita para admins/managers
- Flows Runs: Leitura das próprias execuções, admins/managers veem todas

## Logging

### flows_runs.logs

Cada execução armazena logs detalhados em formato JSON:
```json
[
  {
    "timestamp": "2025-10-11T23:00:00Z",
    "stepId": "step-1",
    "stepNome": "Nome do Step",
    "level": "info|success|warning|error",
    "message": "Mensagem descritiva",
    "data": { "additional": "info" }
  }
]
```

### public.actions_log

Quando possível (quando há `lead_id`), também registra em `actions_log`:
```sql
INSERT INTO public.actions_log (
  lead_id,
  action_label,
  user_id,
  payload,
  status,
  error
) VALUES (
  12345,
  'Flow: Nome do Flow - Nome do Step',
  'user-uuid',
  { "flowId": "...", "runId": "...", "result": {...} },
  'SUCCESS',
  NULL
);
```

## Migrations

### Execução

As migrations são idempotentes e podem ser executadas múltiplas vezes:

1. `_create_flows_tables.sql`: Cria tabelas, índices, triggers e policies
2. `schema_ensure.sql`: Verifica e corrige schema (fallback)

### Aplicar Migrations

```bash
# Via Supabase CLI
supabase db push

# Ou via dashboard do Supabase
# SQL Editor > Nova Query > Cole o conteúdo da migration > Run
```

## Testes de Aceite

### 1. Criar Flow

1. Acesse a aba "Flows" na interface
2. Clique em "Novo Flow"
3. Preencha:
   - Nome: "Teste MVP"
   - Descrição: "Flow de teste"
4. Adicione steps:
   - Step 1: Tabular (webhook, field, value)
   - Step 2: Wait (5 segundos)
   - Step 3: HTTP Call (URL de teste)
5. Clique em "Salvar Flow"
6. ✅ Verificar: Flow aparece na lista

### 2. Listar Flows

1. Acesse a aba "Flows"
2. ✅ Verificar: Lista mostra flows criados
3. ✅ Verificar: Badge "Ativo" aparece corretamente
4. ✅ Verificar: Quantidade de steps é exibida

### 3. Executar Flow

1. Na lista de flows, clique em "Executar"
2. Informe ID do lead (ou deixe em branco para teste)
3. Clique em "Executar"
4. ✅ Verificar: Modal mostra progresso da execução
5. ✅ Verificar: Logs aparecem em tempo real
6. ✅ Verificar: Status final é "Concluída" ou "Falhou"

### 4. Editar Flow

1. Na lista de flows, clique no ícone de edição
2. Modifique nome, descrição ou steps
3. Clique em "Salvar Flow"
4. ✅ Verificar: Mudanças são salvas
5. ✅ Verificar: Flow atualizado aparece na lista

### 5. Deletar Flow

1. Na lista de flows, clique no ícone de lixeira
2. Confirme exclusão
3. ✅ Verificar: Flow é removido da lista
4. ✅ Verificar: Toast de confirmação aparece

### 6. Verificar Logs

1. Execute um flow com sucesso
2. Acesse tabela `flows_runs` no Supabase
3. ✅ Verificar: Registro de execução existe
4. ✅ Verificar: Campo `logs` contém array de log entries
5. ✅ Verificar: Campo `status` é 'completed'

### 7. Verificar RLS

1. Faça login como usuário normal (não admin)
2. Tente criar um flow
3. ✅ Verificar: Permissão negada (apenas admins/managers podem criar)
4. Liste flows
5. ✅ Verificar: Pode ver flows existentes
6. Execute um flow
7. ✅ Verificar: Pode executar flows ativos

### 8. Modo Básico (Compatibilidade)

1. Use um botão "tabular" normal (não-flow)
2. Clique no botão
3. ✅ Verificar: Execução local funciona como antes
4. ✅ Verificar: Nenhuma quebra de funcionalidade existente

## Troubleshooting

### Edge Function não responde

1. Verifique logs no Supabase Dashboard > Edge Functions
2. Confirme que as variáveis de ambiente estão configuradas
3. Teste com `curl`:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/flows-executor \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"flowId":"uuid","leadId":123}'
   ```

### Flow não executa

1. Verifique se flow está ativo (`ativo = true`)
2. Confirme que flow tem steps definidos
3. Verifique logs em `flows_runs.logs`
4. Confirme permissões RLS

### Erro "leadId é obrigatório"

- Steps do tipo `tabular` exigem `leadId`
- Informe um ID de lead válido ao executar o flow
- Ou use steps do tipo `http_call` que não dependem de leadId

## Próximos Passos (Fora do MVP)

- [ ] UI para visualizar histórico de execuções
- [ ] Filtros e busca na lista de flows
- [ ] Templates de flows pré-configurados
- [ ] Execução agendada de flows (cron)
- [ ] Suporte a condicionais nos steps
- [ ] Integração com mais sistemas externos
- [ ] Notificações em tempo real de execução
- [ ] Métricas e analytics de flows

## Flows v2 - Recursos Avançados

### Versionamento de Flows

O sistema v2 introduz controle de versão completo para flows:

```typescript
import { createFlowVersion, getFlowVersions, activateVersion } from '@/utils/flowVersionManager';

// Criar nova versão
const { data: version } = await createFlowVersion(
  flowId,
  'Meu Flow',
  flowDefinition,
  {
    descricao: 'Descrição do flow',
    notas_versao: 'Adicionado novo step de validação',
    schema_version: 'v1',
    activate: true
  }
);

// Listar versões
const { data: versions } = await getFlowVersions(flowId);

// Ativar versão específica
await activateVersion(versionId);
```

### Validação JSON Schema

Validação rigorosa de definições de flows:

```typescript
import { validateFlowDefinition } from '@/utils/flowSchemaValidator';

const result = validateFlowDefinition(flowDefinition, 'v1');
if (!result.valid) {
  console.error('Erros de validação:', result.errors);
}
```

### Step Runners Modulares

Sistema extensível para executores de steps:

```typescript
import { stepRunnerRegistry } from '@/stepRunners';

// Obter runner para um tipo de step
const runner = stepRunnerRegistry.get('tabular');

// Validar configuração
const validation = runner.validate(stepConfig);

// Executar step
const result = await runner.execute(stepConfig, context);
```

### Criar Custom Step Runner

```typescript
import { BaseStepRunner } from '@/stepRunners/BaseStepRunner';

export class CustomStepRunner extends BaseStepRunner<CustomConfig> {
  readonly type = 'custom';
  readonly displayName = 'Custom Action';
  
  validate(config: CustomConfig) {
    // Implementar validação
  }
  
  async execute(config: CustomConfig, context: StepExecutionContext) {
    // Implementar execução
  }
}

// Registrar
import { stepRunnerRegistry } from '@/stepRunners/StepRunnerRegistry';
stepRunnerRegistry.register(new CustomStepRunner());
```

### Migrations v2

As migrations v2 estão em `supabase/migrations/`:

1. `20251012032351_create_flow_versions.sql` - Cria tabela de versões
2. `20251012032352_migrate_flows_to_versions.sql` - Migra flows existentes para v1

Para aplicar:
```bash
supabase db push
```

### Testes Unitários

Estrutura de testes em `src/__tests__/`:

```bash
# Instalar dependências de teste
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Executar testes
npm run test

# Executar com coverage
npm run test:coverage
```

## Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Vitest Testing Framework](https://vitest.dev/)
