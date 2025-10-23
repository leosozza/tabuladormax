# Log Analysis and Monitoring System

## Overview

The Log Analysis and Monitoring System provides automated tools for diagnosing, analyzing, and monitoring synchronization logs in Gestão Scouter. It addresses common issues like malformed JSON logs, RLS policy violations, and recurring errors.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Components](#components)
3. [Usage Examples](#usage-examples)
4. [Integration Guide](#integration-guide)
5. [Troubleshooting](#troubleshooting)
6. [API Reference](#api-reference)

## Quick Start

### Analyzing Logs via CLI

```bash
# Analyze logs from a file
npm run analyze-logs -- --input logs.json

# Generate Markdown report
npm run analyze-logs -- --input logs.json --output report.md --format markdown

# Generate HTML report with notifications
npm run analyze-logs -- --input logs.json --output report.html --format html --notify

# Show help
npm run analyze-logs -- --help
```

### Analyzing Logs Programmatically

```typescript
import { validateAndNormalizeLogs } from '@/utils/logValidator';
import { analyzeLogs } from '@/utils/logAnalyzer';
import { generateReport } from '@/utils/logReporter';

// Load log data
const rawLogs = `...malformed JSON...`;

// Step 1: Validate and normalize
const validationResult = validateAndNormalizeLogs(rawLogs);

if (validationResult.isValid) {
  // Step 2: Analyze
  const analysis = analyzeLogs(validationResult.logs);
  
  // Step 3: Generate report
  const report = generateReport(analysis, validationResult.logs, {
    format: 'markdown',
    includeRawLogs: false,
  });
  
  console.log(report.content);
}
```

## Components

### 1. Log Validator (`logValidator.ts`)

**Purpose:** Validates and normalizes log entries, handling malformed JSON.

**Key Features:**
- Automatic JSON repair
- Schema validation with Zod
- Portuguese field name normalization
- Multiple log level support

**Example:**
```typescript
import { validateAndNormalizeLogs, formatValidationResult } from '@/utils/logValidator';

const result = validateAndNormalizeLogs(malformedJson);
console.log(formatValidationResult(result));

// Access validated logs
result.logs.forEach(log => {
  console.log(`[${log.log_level}] ${log.event_message}`);
});
```

### 2. Log Analyzer (`logAnalyzer.ts`)

**Purpose:** Analyzes logs to identify patterns, issues, and trends.

**Key Features:**
- RLS policy violation detection
- Recurring pattern identification
- Health score calculation (0-100)
- Actionable recommendations

**Example:**
```typescript
import { analyzeLogs, formatAnalysisResult } from '@/utils/logAnalyzer';

const analysis = analyzeLogs(validatedLogs);
console.log(formatAnalysisResult(analysis));

// Check for critical issues
if (analysis.issues.critical.length > 0) {
  console.error('Critical issues detected!');
  analysis.issues.critical.forEach(issue => {
    console.error(`- ${issue.message}`);
    if (issue.recommendation) {
      console.log(`  Fix: ${issue.recommendation}`);
    }
  });
}

// Check health score
if (analysis.healthScore < 50) {
  console.warn(`System health is critical: ${analysis.healthScore}/100`);
}
```

### 3. Log Notifier (`logNotifier.ts`)

**Purpose:** Monitors logs and sends notifications for critical events.

**Key Features:**
- Real-time monitoring
- Multiple channels (console, toast, webhook)
- Rate limiting to prevent spam
- Configurable filters

**Example:**
```typescript
import { logNotifier } from '@/utils/logNotifier';

// Configure notifier
logNotifier.updateConfig({
  enabled: true,
  channels: ['console', 'toast', 'webhook'],
  filters: [{
    logLevel: ['ERROR'],
  }],
  rateLimit: {
    maxNotificationsPerHour: 10,
    cooldownMinutes: 5,
  },
});

// Process logs
const notifications = logNotifier.processLogs(validatedLogs);

// Or process analysis results
const analysisNotifications = logNotifier.processAnalysisResult(analysisResult);
```

### 4. Log Reporter (`logReporter.ts`)

**Purpose:** Generates comprehensive reports in multiple formats.

**Key Features:**
- Multiple formats: JSON, Markdown, HTML, Text
- Customizable content
- Export functionality
- Beautiful HTML reports with styling

**Example:**
```typescript
import { generateReport, exportReport } from '@/utils/logReporter';

// Generate report
const report = generateReport(analysisResult, logs, {
  format: 'html',
  includeRawLogs: true,
  includeTimeline: true,
  includeMetrics: true,
});

// Export to file
exportReport(report, 'sync-analysis-report.html');

// Or use the content directly
console.log(report.content);
```

## Usage Examples

### Example 1: Diagnosing RLS Policy Violations

The most common issue is RLS policy violations in the `sync_logs_detailed` table.

**Problem Log:**
```json
{
  "event_message": "nova linha viola a política de segurança em nível de linha para a tabela \"sync_logs_detailed\"",
  "log_level": "ERRO"
}
```

**Analysis Output:**
```
🔴 CRITICAL ISSUES:
   1. RLS_POLICY_VIOLATION (1 occurrences)
      Row-Level Security policy violation detected in sync_logs_detailed table
      
      💡 Recommendation:
      The sync process is unable to write to sync_logs_detailed due to RLS policies.
      Solutions:
      1. Add INSERT policy for service_role:
         CREATE POLICY "service_role_insert" ON sync_logs_detailed 
         FOR INSERT TO service_role USING (true);
      
      2. Or disable RLS temporarily:
         ALTER TABLE sync_logs_detailed DISABLE ROW LEVEL SECURITY;
      
      3. Ensure the Edge Function uses service_role key, not anon key.
```

**Fix:**
```sql
-- Solution 1: Add RLS policy for service_role
CREATE POLICY "service_role_all" 
ON sync_logs_detailed 
FOR ALL 
TO service_role 
USING (true);

-- Solution 2: Or disable RLS (not recommended for production)
ALTER TABLE sync_logs_detailed DISABLE ROW LEVEL SECURITY;
```

### Example 2: Monitoring Sync Health

```typescript
import { getSyncLogs } from '@/repositories/syncLogsRepo';
import { analyzeLogs } from '@/utils/logAnalyzer';
import { logNotifier } from '@/utils/logNotifier';

// Fetch recent logs
const recentLogs = await getSyncLogs(100);

// Analyze
const analysis = analyzeLogs(recentLogs);

// Send notifications if health is poor
if (analysis.healthScore < 50) {
  logNotifier.processAnalysisResult(analysis);
}

// Display health dashboard
console.log(`System Health: ${analysis.healthScore}/100`);
console.log(`Errors: ${analysis.summary.errorCount}`);
console.log(`Warnings: ${analysis.summary.warnCount}`);
```

### Example 3: Generating Weekly Reports

```typescript
import { getSyncLogs } from '@/repositories/syncLogsRepo';
import { analyzeLogs } from '@/utils/logAnalyzer';
import { generateReport, exportReport } from '@/utils/logReporter';

async function generateWeeklyReport() {
  // Get last week's logs
  const logs = await getSyncLogs(1000); // Adjust as needed
  
  // Analyze
  const analysis = analyzeLogs(logs);
  
  // Generate HTML report
  const report = generateReport(analysis, logs, {
    format: 'html',
    includeMetrics: true,
    includeTimeline: true,
  });
  
  // Export
  exportReport(report, `weekly-sync-report-${Date.now()}.html`);
  
  // Email to team (implement email sending)
  // await emailReport(report.content);
}

// Schedule weekly
setInterval(generateWeeklyReport, 7 * 24 * 60 * 60 * 1000);
```

### Example 4: Processing Malformed Logs from Edge Functions

When Edge Functions log to Supabase and the logs come back malformed:

```typescript
import { validateAndNormalizeLogs } from '@/utils/logValidator';
import { analyzeLogs, formatAnalysisResult } from '@/utils/logAnalyzer';

// Malformed log from problem statement
const malformedLog = `{
  "event_message": "nova linha viola a política de segurança em nível de linha para a tabela \\"sync_logs_detailed\\"",
  "id": "642d80d6-592a-4fe4-af48-403ea726235d",
  "log_level": "ERRO",
{
  "event_message": "desligamento",
  "event_type": "Desligamento",
  "function_id": "9832ccf7-d2b8-4c90-b47e-18bb1cebca21",
  "id": "69625870-f42a-4a2c-9a67-1fd27f340295",
  "log_level": "registro",
  "carimbo de data/hora": 1760977744435000
}`;

// Validate and repair
const validation = validateAndNormalizeLogs(malformedLog);

if (validation.isValid) {
  // Analyze repaired logs
  const analysis = analyzeLogs(validation.logs);
  console.log(formatAnalysisResult(analysis));
} else {
  console.error('Could not repair logs:', validation.errors);
}
```

## Integration Guide

### Integrating with Existing Sync System

#### 1. Add to Sync Repository

Modify `src/repositories/syncLogsRepo.ts` to use the new analysis tools:

```typescript
import { validateAndNormalizeLogs } from '@/utils/logValidator';
import { analyzeLogs } from '@/utils/logAnalyzer';
import { logNotifier } from '@/utils/logNotifier';

export async function createSyncLog(log: Omit<SyncLog, 'id' | 'created_at'>): Promise<SyncLog | null> {
  // Existing code...
  
  // After creating log, check for issues
  const recentLogs = await getSyncLogs(50);
  const analysis = analyzeLogs(recentLogs);
  
  if (analysis.healthScore < 70) {
    logNotifier.processAnalysisResult(analysis);
  }
  
  return data as SyncLog;
}
```

#### 2. Add to Dashboard

Create a new component `src/components/sync/LogAnalysisDashboard.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getSyncLogs } from '@/repositories/syncLogsRepo';
import { analyzeLogs } from '@/utils/logAnalyzer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function LogAnalysisDashboard() {
  const { data: logs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => getSyncLogs(100),
    refetchInterval: 60000, // Refresh every minute
  });
  
  const analysis = logs ? analyzeLogs(logs) : null;
  
  if (!analysis) return <div>Loading...</div>;
  
  const healthColor = analysis.healthScore >= 80 ? 'green' : 
                      analysis.healthScore >= 50 ? 'yellow' : 'red';
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sync Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold text-${healthColor}-500`}>
            {analysis.healthScore}/100
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-red-500">
                {analysis.summary.errorCount}
              </div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">
                {analysis.summary.warnCount}
              </div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {analysis.summary.infoCount}
              </div>
              <div className="text-sm text-gray-600">Info</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {analysis.issues.critical.length > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.issues.critical.map((issue, i) => (
              <div key={i} className="mb-4">
                <div className="font-bold">{issue.type}</div>
                <div className="text-sm">{issue.message}</div>
                {issue.recommendation && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Fix:</strong> {issue.recommendation}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

#### 3. Add to Edge Functions

Modify Edge Functions to validate logs before processing:

```typescript
// In diagnose-tabulador-sync/index.ts
import { validateAndNormalizeLogs } from '../_shared/logValidator.ts';

serve(async (req) => {
  // ... existing code ...
  
  // Before returning, validate logs
  const logsToValidate = JSON.stringify(result.tests);
  const validation = validateAndNormalizeLogs(logsToValidate);
  
  if (!validation.isValid) {
    console.error('Log validation failed:', validation.errors);
  }
  
  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Could not extract any valid JSON objects from input"

**Cause:** The input is too malformed to parse.

**Solution:**
- Manually format the JSON
- Check for missing braces `{}` or brackets `[]`
- Ensure strings are properly quoted
- Remove any non-JSON text

#### 2. "Validation error - log_level: Invalid enum value"

**Cause:** The log level is not in the expected format.

**Solution:**
The validator accepts these log levels:
- Error: `ERRO`, `erro`, `ERROR`, `error`
- Info: `informações`, `info`, `INFO`
- Warning: `warning`, `WARN`, `aviso`
- Log: `registro`, `log`

Update your logs to use one of these values.

#### 3. RLS Policy Violations Keep Appearing

**Cause:** The `sync_logs_detailed` table has RLS enabled but no policy for service_role.

**Solution:**
```sql
-- Add policy for service_role
CREATE POLICY "service_role_all" 
ON sync_logs_detailed 
FOR ALL 
TO service_role 
USING (true);

-- Verify policy was created
SELECT * FROM pg_policies 
WHERE tablename = 'sync_logs_detailed';
```

#### 4. Notifications Not Sending

**Cause:** Rate limiting or notifications disabled.

**Solution:**
```typescript
// Check notifier config
import { logNotifier } from '@/utils/logNotifier';

// Enable notifications
logNotifier.updateConfig({
  enabled: true,
  channels: ['console', 'toast'],
  rateLimit: {
    maxNotificationsPerHour: 20, // Increase limit
    cooldownMinutes: 1, // Reduce cooldown
  },
});

// Clear history (for testing only)
logNotifier.clearHistory();
```

## API Reference

### Log Validator

#### `validateAndNormalizeLogs(input: string): ValidationResult`

Validates and normalizes log entries from raw input.

**Parameters:**
- `input` (string): Raw log data (JSON or text)

**Returns:** `ValidationResult`
```typescript
interface ValidationResult {
  isValid: boolean;
  logs: SyncLog[];
  errors: string[];
  warnings: string[];
  originalInput: string;
  repairedJson?: string;
}
```

#### `formatValidationResult(result: ValidationResult): string`

Formats validation results for display.

### Log Analyzer

#### `analyzeLogs(logs: SyncLog[]): LogAnalysisResult`

Analyzes logs to identify issues and patterns.

**Parameters:**
- `logs` (SyncLog[]): Array of validated log entries

**Returns:** `LogAnalysisResult`
```typescript
interface LogAnalysisResult {
  summary: {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    timeRange: { start: string | null; end: string | null };
  };
  issues: {
    critical: LogIssue[];
    warnings: LogIssue[];
  };
  patterns: {
    recurringErrors: RecurringPattern[];
    performanceIssues: PerformanceIssue[];
  };
  recommendations: string[];
  healthScore: number; // 0-100
}
```

#### `formatAnalysisResult(result: LogAnalysisResult): string`

Formats analysis results for display.

### Log Notifier

#### `logNotifier.processLogs(logs: SyncLog[]): Notification[]`

Processes logs and sends notifications for critical events.

#### `logNotifier.processAnalysisResult(result: LogAnalysisResult): Notification[]`

Processes analysis results and sends notifications.

#### `logNotifier.updateConfig(config: Partial<NotificationConfig>): void`

Updates notifier configuration.

### Log Reporter

#### `generateReport(analysis: LogAnalysisResult, logs: SyncLog[], config?: Partial<ReportConfig>): Report`

Generates a report from analysis results.

**Parameters:**
- `analysis` (LogAnalysisResult): Analysis results
- `logs` (SyncLog[]): Log entries
- `config` (Partial<ReportConfig>): Optional configuration

**Returns:** `Report`
```typescript
interface Report {
  id: string;
  generatedAt: string;
  format: 'json' | 'markdown' | 'html' | 'text';
  content: string;
  metadata: {
    totalLogs: number;
    analysisResults: LogAnalysisResult;
    timeRange: { start: string | null; end: string | null };
  };
}
```

#### `exportReport(report: Report, filename?: string): void`

Exports report to file.

## Best Practices

1. **Regular Monitoring:** Run log analysis at least daily to catch issues early.

2. **Automation:** Set up automated reports and notifications for critical issues.

3. **RLS Policies:** Always ensure proper RLS policies are in place for `sync_logs_detailed`.

4. **Rate Limiting:** Configure notification rate limiting to prevent spam.

5. **Health Score Thresholds:**
   - 80-100: Healthy
   - 50-79: Warning (review recommended)
   - 0-49: Critical (immediate action required)

6. **Log Retention:** Keep logs for at least 30 days for trend analysis.

7. **Documentation:** Document any recurring patterns and their solutions.

## Further Reading

- [Sync Architecture Documentation](./SYNC_ARCHITECTURE.md)
- [Sync Diagnostics Guide](./SYNC_DIAGNOSTICS_GUIDE.md)
- [TabuladorMax Configuration](./TABULADORMAX_CONFIGURATION_GUIDE.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
