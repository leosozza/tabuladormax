# Sistema de Diagnóstico - Documentação

## Visão Geral

O Sistema de Diagnóstico do TabuladorMax é uma solução completa para monitoramento, detecção de problemas e auto-correção do sistema. Ele fornece uma interface unificada para administradores supervisionarem a saúde da aplicação e responderem proativamente a problemas.

## Funcionalidades Principais

### 1. Sistema de Diagnóstico de Saúde (Health Check)

O sistema executa verificações periódicas de saúde em componentes críticos:

- **Conexão com Banco de Dados**: Verifica latência e disponibilidade
- **Status de Sincronização**: Monitora taxa de sucesso/falha das sincronizações
- **Eventos Recentes**: Analisa eventos de sincronização da última hora

**Uso:**
```typescript
import { performHealthCheck } from '@/lib/diagnostic/healthCheckService';

const health = await performHealthCheck();
console.log('Status geral:', health.overallStatus);
console.log('Métricas:', health.metrics);
```

**Métricas Coletadas:**
- Total de leads
- Sincronizações bem-sucedidas
- Falhas de sincronização
- Taxa de erro
- Tempo médio de resposta
- Usuários ativos

### 2. Painel de Monitoramento

Interface visual em tempo real que exibe:

- **Status Geral**: Indicador visual do estado do sistema (healthy/warning/critical)
- **Métricas em Cards**: Visualização rápida de KPIs
- **Health Checks Detalhados**: Status individual de cada componente
- **Atualização Automática**: Refresh a cada 30 segundos

**Acesso:**
```
/diagnostic → Aba "Saúde do Sistema"
```

### 3. Detecção e Auto-Correção de Problemas

Sistema inteligente que:

- Detecta problemas automaticamente baseado em health checks
- Classifica problemas por severidade (info/warning/error/critical)
- Identifica problemas que podem ser auto-corrigidos
- Executa correções automáticas quando possível

**Tipos de Problemas Detectados:**
- `database_connection`: Problemas de conexão com BD
- `sync_failure`: Falhas de sincronização
- `high_error_rate`: Taxa de erro elevada
- `slow_response`: Resposta lenta do sistema
- `resource_exhaustion`: Esgotamento de recursos
- `configuration_error`: Erro de configuração
- `api_error`: Erros de API

**Uso:**
```typescript
import { detectProblems, autoFixProblem } from '@/lib/diagnostic/problemDetectionService';

// Detectar problemas
const problems = await detectProblems();

// Corrigir um problema específico
const result = await autoFixProblem(problems[0]);

// Corrigir todos automaticamente
const results = await autoFixAll();
```

**Auto-Correções Implementadas:**
- Reset de leads com falha de sincronização
- Limpeza de erros antigos
- Retry automático de operações falhadas

### 4. Sistema de Alertas Automáticos

Notifica administradores sobre problemas críticos:

**Características:**
- Alertas baseados em problemas detectados
- Classificação por severidade
- Sistema de reconhecimento (acknowledge)
- Configurações personalizáveis por tipo de problema
- Múltiplos canais de notificação (in-app, email, webhook)

**Uso:**
```typescript
import { createAlert, listAlerts, acknowledgeAlert } from '@/lib/diagnostic/alertService';

// Criar alerta de um problema
const alert = createAlert(problem);

// Listar alertas não reconhecidos
const unacknowledged = listAlerts({ acknowledged: false });

// Reconhecer alerta
acknowledgeAlert(alertId, 'admin@example.com');
```

**Configuração de Alertas:**
```typescript
import { createAlertConfiguration } from '@/lib/diagnostic/alertService';

createAlertConfiguration({
  enabled: true,
  severity: 'critical',
  problemType: 'database_connection',
  notificationChannels: ['email', 'in-app'],
  recipients: ['admin@example.com'],
  threshold: 5, // opcional
});
```

### 5. Exportação de Relatórios

Geração e exportação de relatórios detalhados:

**Formatos Suportados:**
- CSV (Planilha)
- JSON (Dados estruturados)
- PDF/TXT (Relatório formatado)

**Conteúdo dos Relatórios:**
- Status geral do sistema
- Métricas de desempenho
- Resultados de health checks
- Problemas detectados e corrigidos
- Histórico de alertas
- Estatísticas e resumo do período

**Uso:**
```typescript
import { downloadReport, generateDiagnosticReport } from '@/lib/diagnostic/reportExportService';

// Gerar relatório
const report = await generateDiagnosticReport('admin', {
  start: new Date('2025-01-01'),
  end: new Date('2025-01-31'),
});

// Download via navegador
await downloadReport('admin', {
  format: 'csv',
  includeCharts: true,
  includeLogs: true,
  period: { start, end },
});
```

**Opções de Exportação Rápida:**
- Últimas 24 horas
- Últimos 7 dias
- Últimos 30 dias
- Últimos 90 dias

## Arquitetura

### Estrutura de Arquivos

```
src/
├── types/
│   └── diagnostic.ts              # Definições de tipos
├── lib/
│   └── diagnostic/
│       ├── index.ts               # Ponto de entrada
│       ├── healthCheckService.ts  # Health checks
│       ├── problemDetectionService.ts # Detecção de problemas
│       ├── alertService.ts        # Sistema de alertas
│       ├── reportExportService.ts # Exportação de relatórios
│       └── __tests__/
│           └── alertService.test.ts
├── components/
│   └── diagnostic/
│       ├── HealthCheckPanel.tsx   # Painel de saúde
│       ├── ProblemsPanel.tsx      # Painel de problemas
│       ├── AlertsPanel.tsx        # Painel de alertas
│       └── ReportExportPanel.tsx  # Painel de exportação
└── pages/
    └── Diagnostic.tsx             # Página principal
```

### Fluxo de Dados

1. **Health Check Service** → Executa verificações periódicas
2. **Problem Detection Service** → Analisa health checks e detecta problemas
3. **Alert Service** → Cria alertas para problemas críticos
4. **UI Components** → Exibem dados em tempo real
5. **Report Service** → Gera relatórios sob demanda

### Integração com Supabase

Os serviços consultam as seguintes tabelas:
- `leads`: Status de sincronização
- `sync_events`: Eventos de sincronização
- `profiles`: Usuários ativos

## Interface do Usuário

### Navegação

```
/diagnostic
├── 🏥 Saúde do Sistema    # Health checks e métricas
├── ⚠️ Problemas           # Detecção e auto-correção
├── 🔔 Alertas            # Alertas e notificações
└── 📊 Relatórios         # Exportação de relatórios
```

### Permissões

Acesso restrito a administradores (`requireAdmin`).

## Configuração

### Configurações Padrão de Alerta

Inicializadas automaticamente:
- Database connection: critical → email + in-app
- Sync failure: error → in-app
- High error rate: error → email + in-app

### Personalização

Todas as configurações podem ser ajustadas via API:

```typescript
import { updateAlertConfiguration } from '@/lib/diagnostic/alertService';

updateAlertConfiguration(configId, {
  enabled: false,
  threshold: 10,
  recipients: ['new-admin@example.com'],
});
```

## Testes

### Executar Testes

```bash
npm test
```

### Cobertura

- Serviços: ✓ Alert Service (10 testes)
- Health Check: Manual testing via interface
- Problem Detection: Manual testing via interface
- Report Export: Manual testing via interface

## Manutenção

### Adicionando Novos Health Checks

1. Criar função em `healthCheckService.ts`:
```typescript
async function checkNewComponent(): Promise<HealthCheck> {
  // implementação
}
```

2. Adicionar ao `performHealthCheck()`:
```typescript
const checks = await Promise.all([
  checkDatabaseConnection(),
  checkSyncStatus(),
  checkNewComponent(), // novo
]);
```

### Adicionando Novos Tipos de Problema

1. Adicionar tipo em `types/diagnostic.ts`:
```typescript
export type ProblemType = 
  | 'existing_types'
  | 'new_problem_type';
```

2. Implementar detecção em `problemDetectionService.ts`
3. Implementar auto-correção se aplicável

### Adicionando Canais de Notificação

1. Adicionar canal em `types/diagnostic.ts`
2. Implementar função em `alertService.ts`:
```typescript
function sendNewChannelNotification(alert: Alert) {
  // implementação
}
```

## Troubleshooting

### Health Check Falha

- Verifique conexão com Supabase
- Verifique permissões RLS nas tabelas
- Verifique logs do console

### Auto-Correção Não Funciona

- Verifique se `canAutoFix` é `true`
- Verifique permissões de escrita no BD
- Verifique logs de erro retornados

### Relatórios Não Geram

- Verifique período selecionado
- Verifique se há dados no período
- Verifique logs do console

## Roadmap Futuro

### Funcionalidades Planejadas

- [ ] Integração com sistema de notificações externo (Slack, Discord)
- [ ] Dashboard de métricas históricas
- [ ] Alertas baseados em ML/IA
- [ ] Exportação de relatórios em PDF real (usando jsPDF)
- [ ] Scheduled reports (relatórios agendados)
- [ ] Health check customizáveis via UI
- [ ] Auto-correção com aprovação prévia
- [ ] Integração com sistema de tickets

### Melhorias Técnicas

- [ ] Persistência de alertas no Supabase
- [ ] Cache de health checks
- [ ] Rate limiting para auto-correções
- [ ] Logs estruturados de todas as operações
- [ ] Testes E2E com Playwright

## Suporte

Para questões ou problemas:
1. Verifique esta documentação
2. Consulte os logs do sistema
3. Verifique o painel de diagnóstico em `/diagnostic`
4. Contate o time de desenvolvimento

## Contribuindo

Ao adicionar novas funcionalidades:
1. Siga os padrões de código existentes
2. Adicione testes para novas funcionalidades
3. Atualize esta documentação
4. Mantenha a modularidade e separação de responsabilidades
