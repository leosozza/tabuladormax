# Sistema de Diagnóstico - Início Rápido

## Acesso

**URL:** `/diagnostic`

**Permissão necessária:** Admin

**Acesso via menu:** Menu do usuário → "Diagnóstico do Sistema"

## Funcionalidades

### 🏥 Saúde do Sistema
- Status geral em tempo real
- Métricas de desempenho
- Health checks detalhados
- Atualização automática a cada 30s

### ⚠️ Problemas
- Detecção automática de problemas
- Auto-correção com um clique
- Histórico de problemas corrigidos
- Classificação por severidade

### 🔔 Alertas
- Alertas em tempo real
- Sistema de reconhecimento
- Estatísticas por severidade
- Configuração personalizável

### 📊 Relatórios
- Exportação em CSV, JSON, PDF
- Períodos personalizados
- Opções de exportação rápida
- Download instantâneo

## Uso Rápido

### Verificar saúde do sistema
1. Acesse `/diagnostic`
2. Veja o status geral no topo
3. Revise as métricas e health checks
4. Clique em "Atualizar" para refresh manual

### Corrigir problemas
1. Vá para a aba "Problemas"
2. Veja problemas detectados
3. Clique em "Corrigir" para problemas individuais
4. Ou use "Corrigir Todos" para auto-correção em lote

### Gerenciar alertas
1. Acesse a aba "Alertas"
2. Veja alertas não reconhecidos
3. Clique em "Reconhecer" para marcar como visto
4. Use "Reconhecer Todos" para limpeza em massa

### Exportar relatórios
1. Vá para "Relatórios"
2. Use botões rápidos (24h, 7d, 30d, 90d) OU
3. Configure período e formato personalizados
4. Clique em "Exportar Relatório"

## Desenvolvimento

### Importar serviços

```typescript
import {
  performHealthCheck,
  detectProblems,
  autoFixProblem,
  createAlert,
  downloadReport
} from '@/lib/diagnostic';
```

### Exemplo de uso programático

```typescript
// Health check
const health = await performHealthCheck();

// Detectar e corrigir problemas
const problems = await detectProblems();
if (problems.length > 0) {
  const result = await autoFixProblem(problems[0]);
  console.log('Correção:', result);
}

// Criar alerta
const alert = createAlert(problem);

// Exportar relatório (use o ID do usuário atual)
const { data: { user } } = await supabase.auth.getUser();
await downloadReport(user?.email || 'admin', {
  format: 'csv',
  period: { start: new Date('2025-01-01'), end: new Date() }
});
```

## Arquitetura

```
/diagnostic
├── Health Check Service    → Monitora componentes
├── Problem Detection       → Detecta e corrige problemas
├── Alert Service          → Gerencia alertas
└── Report Export          → Gera relatórios
```

## Documentação Completa

Ver `docs/DIAGNOSTIC_SYSTEM.md` para documentação detalhada.

## Troubleshooting

### Página não carrega
- Verifique se você é admin
- Verifique conexão com Supabase
- Veja logs do console

### Auto-correção falha
- Verifique permissões no banco
- Veja detalhes do erro retornado
- Alguns problemas não são auto-corrigíveis

### Relatório não exporta
- Verifique período selecionado
- Verifique se há dados no período
- Tente formato diferente

## Suporte

Problemas? Consulte:
1. Documentação completa em `docs/DIAGNOSTIC_SYSTEM.md`
2. Logs do sistema
3. Painel de diagnóstico
