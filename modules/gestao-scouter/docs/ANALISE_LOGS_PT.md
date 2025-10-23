# Sistema de Análise e Monitoramento de Logs

## Visão Geral

O Sistema de Análise e Monitoramento de Logs fornece ferramentas automatizadas para diagnosticar, analisar e monitorar logs de sincronização no Gestão Scouter. Ele resolve problemas comuns como logs JSON malformados, violações de política RLS e erros recorrentes.

## Início Rápido

### Analisando Logs via CLI

```bash
# Analisar logs de um arquivo
npm run analyze-logs -- --input logs.json

# Gerar relatório em Markdown
npm run analyze-logs -- --input logs.json --output relatorio.md --format markdown

# Gerar relatório em HTML com notificações
npm run analyze-logs -- --input logs.json --output relatorio.html --format html --notify

# Mostrar ajuda
npm run analyze-logs -- --help
```

## Problema: Logs Malformados

O sistema foi desenvolvido para resolver o problema de logs malformados como este:

```json
{
  "event_message": "nova linha viola a política de segurança em nível de linha para a tabela \"sync_logs_detailed\"",
  "id": "642d80d6-592a-4fe4-af48-403ea726235d",
  "log_level": "ERRO",
{
  "event_message": "desligamento",
  "event_type": "Desligamento",
  "function_id": "9832ccf7-d2b8-4c90-b47e-18bb1cebca21",
  "id": "69625870-f42a-4a2c-9a67-1fd27f340295",
  "log_level": "registro",
  "carimbo de data/hora": 1760977744435000
}
```

### Solução Automática

O sistema automaticamente:

1. **Repara o JSON malformado**
2. **Extrai objetos de log individuais**
3. **Normaliza campos em português** (carimbo de data/hora → timestamp)
4. **Identifica violações de política RLS**
5. **Fornece recomendações acionáveis**

## Principais Funcionalidades

### 1. Validação de Logs (`logValidator.ts`)

✅ Repara JSON malformado automaticamente
✅ Valida contra esquema Zod
✅ Normaliza nomes de campos em português
✅ Suporta múltiplos formatos de nível de log

### 2. Análise de Logs (`logAnalyzer.ts`)

✅ Detecta violações de política RLS automaticamente
✅ Identifica padrões de erro recorrentes
✅ Calcula pontuação de saúde (0-100)
✅ Fornece recomendações acionáveis
✅ Analisa métricas de desempenho

### 3. Sistema de Notificações (`logNotifier.ts`)

✅ Monitoramento em tempo real
✅ Múltiplos canais (console, toast, webhook)
✅ Limitação de taxa para evitar spam
✅ Filtros configuráveis

### 4. Gerador de Relatórios (`logReporter.ts`)

✅ Múltiplos formatos: JSON, Markdown, HTML, Texto
✅ Métricas e tendências abrangentes
✅ Funcionalidade de exportação

## Resolvendo Problemas Comuns

### Problema 1: Violação de Política RLS

**Sintoma:**
```
"event_message": "nova linha viola a política de segurança em nível de linha para a tabela \"sync_logs_detailed\""
```

**Diagnóstico Automático:**
```
🔴 CRITICAL ISSUES:
   1. RLS_POLICY_VIOLATION (1 ocorrências)
      Violação de política Row-Level Security detectada na tabela sync_logs_detailed
      
      💡 Recomendação:
      O processo de sincronização não consegue escrever em sync_logs_detailed devido a políticas RLS.
      Soluções:
      1. Adicionar política INSERT para service_role:
         CREATE POLICY "service_role_insert" ON sync_logs_detailed 
         FOR INSERT TO service_role USING (true);
      
      2. Ou desabilitar RLS temporariamente:
         ALTER TABLE sync_logs_detailed DISABLE ROW LEVEL SECURITY;
      
      3. Garantir que a Edge Function use a chave service_role, não anon key.
```

**Solução SQL:**
```sql
-- Solução recomendada: Adicionar política RLS para service_role
CREATE POLICY "service_role_all" 
ON sync_logs_detailed 
FOR ALL 
TO service_role 
USING (true);

-- Verificar se a política foi criada
SELECT * FROM pg_policies 
WHERE tablename = 'sync_logs_detailed';
```

### Problema 2: JSON Malformado

**Sintoma:**
- Chaves faltando `}`
- Múltiplos objetos concatenados incorretamente
- Campos em português misturados com inglês

**Solução Automática:**
O sistema extrai e repara automaticamente objetos JSON individuais.

**Exemplo:**
```typescript
import { validateAndNormalizeLogs } from '@/utils/logValidator';

const malformedLog = `...seu log malformado...`;
const result = validateAndNormalizeLogs(malformedLog);

if (result.isValid) {
  console.log(`✅ ${result.logs.length} logs processados com sucesso`);
  result.logs.forEach(log => {
    console.log(`[${log.log_level}] ${log.event_message}`);
  });
} else {
  console.error('Erros:', result.errors);
}
```

### Problema 3: Alta Taxa de Erros

**Sintoma:**
```
⚡ PERFORMANCE ISSUES:
   1. 🔴 HIGH_ERROR_RATE
      Taxa de erro é 55.2% (28/50 logs)
```

**Ações:**
1. Revisar logs de Edge Functions no Supabase Dashboard
2. Verificar conectividade com TabuladorMax
3. Verificar políticas RLS em todas as tabelas
4. Revisar configurações de autenticação

## Uso Programático

### Monitoramento de Saúde do Sistema

```typescript
import { getSyncLogs } from '@/repositories/syncLogsRepo';
import { analyzeLogs } from '@/utils/logAnalyzer';
import { logNotifier } from '@/utils/logNotifier';

// Buscar logs recentes
const logs = await getSyncLogs(100);

// Analisar
const analysis = analyzeLogs(logs);

// Verificar saúde
console.log(`Pontuação de Saúde: ${analysis.healthScore}/100`);
console.log(`Erros: ${analysis.summary.errorCount}`);
console.log(`Avisos: ${analysis.summary.warnCount}`);

// Enviar notificações se crítico
if (analysis.healthScore < 50) {
  logNotifier.processAnalysisResult(analysis);
}
```

### Gerar Relatório Semanal

```typescript
import { generateReport, exportReport } from '@/utils/logReporter';

async function gerarRelatorioSemanal() {
  const logs = await getSyncLogs(1000);
  const analysis = analyzeLogs(logs);
  
  const report = generateReport(analysis, logs, {
    format: 'html',
    includeMetrics: true,
  });
  
  exportReport(report, `relatorio-semanal-${Date.now()}.html`);
}
```

## Interpretação da Pontuação de Saúde

| Pontuação | Status | Ação |
|-----------|--------|------|
| 80-100 | 🟢 Saudável | Continuar monitorando |
| 50-79 | 🟡 Degradado | Revisar avisos |
| 0-49 | 🔴 Crítico | Ação imediata necessária |

## Configuração de Notificações

```typescript
import { logNotifier } from '@/utils/logNotifier';

logNotifier.updateConfig({
  enabled: true,
  channels: ['console', 'toast', 'webhook'],
  filters: [{
    logLevel: ['ERROR'], // Apenas erros
  }],
  rateLimit: {
    maxNotificationsPerHour: 10,
    cooldownMinutes: 5,
  },
});
```

## Formatos de Relatório

### 1. Markdown
Ideal para documentação e README

### 2. HTML
Relatório interativo com estilo, ideal para compartilhar com a equipe

### 3. JSON
Formato legível por máquina, ideal para integração com outros sistemas

### 4. Texto
Formato simples, ideal para logs e console

## Comandos Úteis

```bash
# Analisar logs de exemplo do problema
npm run analyze-logs

# Analisar arquivo específico
npm run analyze-logs -- --input /caminho/para/logs.json

# Gerar relatório HTML
npm run analyze-logs -- --input logs.json --output report.html --format html

# Com notificações habilitadas
npm run analyze-logs -- --input logs.json --notify

# Diagnóstico de sincronização completo
npm run diagnostics:sync

# Verificar saúde da sincronização
npm run diagnostics:sync:write
```

## Integração com Dashboard

O sistema pode ser integrado ao dashboard existente para monitoramento em tempo real:

```typescript
// Componente de monitoramento de saúde
export function SyncHealthMonitor() {
  const { data: logs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => getSyncLogs(100),
    refetchInterval: 60000, // Atualizar a cada minuto
  });
  
  const analysis = logs ? analyzeLogs(logs) : null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saúde da Sincronização</CardTitle>
      </CardHeader>
      <CardContent>
        {analysis && (
          <div>
            <div className="text-4xl font-bold">
              {analysis.healthScore}/100
            </div>
            {analysis.issues.critical.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Problemas Críticos</AlertTitle>
                {analysis.issues.critical.map(issue => (
                  <AlertDescription key={issue.id}>
                    {issue.message}
                  </AlertDescription>
                ))}
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Solução de Problemas

### Erro: "Could not extract any valid JSON objects"

**Causa:** JSON muito malformado para reparar

**Solução:**
1. Verifique se há chaves `{}` faltando
2. Certifique-se de que strings estão entre aspas
3. Remova texto não-JSON

### Notificações Não Enviando

**Causa:** Limitação de taxa ou notificações desabilitadas

**Solução:**
```typescript
logNotifier.updateConfig({
  enabled: true,
  rateLimit: {
    maxNotificationsPerHour: 20,
    cooldownMinutes: 1,
  },
});

// Para testes, limpar histórico
logNotifier.clearHistory();
```

## Melhores Práticas

1. ✅ Execute análise diariamente
2. ✅ Configure notificações automáticas
3. ✅ Mantenha políticas RLS corretas
4. ✅ Monitore pontuação de saúde
5. ✅ Documente padrões recorrentes
6. ✅ Mantenha logs por pelo menos 30 dias
7. ✅ Gere relatórios semanais para a equipe

## Recursos Adicionais

- [Documentação Completa (EN)](./LOG_ANALYSIS.md)
- [Guia de Diagnóstico de Sincronização](./SYNC_DIAGNOSTICS_GUIDE.md)
- [Arquitetura de Sincronização](./SYNC_ARCHITECTURE.md)
- [Configuração TabuladorMax](./TABULADORMAX_CONFIGURATION_GUIDE.md)

## Suporte

Para problemas ou dúvidas:

1. Revise a [documentação completa](./LOG_ANALYSIS.md)
2. Execute `npm run analyze-logs -- --help`
3. Consulte os logs de Edge Functions no Supabase Dashboard
4. Verifique as políticas RLS no SQL Editor
