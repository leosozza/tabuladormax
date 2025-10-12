# Flows v2 - Quick Reference

## Table of Contents
- [Database Schema](#database-schema)
- [Step Types](#step-types)
- [Validation](#validation)
- [Step Runners](#step-runners)
- [Common Patterns](#common-patterns)

## Database Schema

### flow_definitions
Flow metadata and configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| nome | TEXT | Flow name |
| descricao | TEXT | Flow description |
| created_by | UUID | Creator user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| is_active | BOOLEAN | Active status |

### flow_versions
Versioned flow configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| flow_definition_id | UUID | Reference to definition |
| version_number | INTEGER | Sequential version number |
| steps | JSONB | Array of step configurations |
| status | TEXT | draft, published, archived |
| published_at | TIMESTAMPTZ | Publication timestamp |
| created_by | UUID | Creator user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| change_notes | TEXT | Version change notes |

### flow_executions
Execution history and logs.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| flow_definition_id | UUID | Reference to definition |
| flow_version_id | UUID | Reference to version |
| lead_id | INTEGER | Lead ID (optional) |
| status | TEXT | pending, running, completed, failed, cancelled |
| logs | JSONB | Execution logs |
| result | JSONB | Execution result |
| error_message | TEXT | Error message if failed |
| started_at | TIMESTAMPTZ | Start timestamp |
| finished_at | TIMESTAMPTZ | Finish timestamp |
| executed_by | UUID | Executor user ID |
| context | JSONB | Execution context variables |

## Step Types

### Tabular Step
Updates fields in Bitrix/external system via webhook.

```typescript
{
  id: "step-1",
  type: "tabular",
  nome: "Update Status",
  descricao: "Updates lead status",
  enabled: true,
  continue_on_error: false,
  config: {
    webhook_url: "https://api.example.com/webhook",
    field: "STATUS_ID",
    value: "QUALIFIED",
    additional_fields: [
      { field: "PRIORITY", value: "HIGH" }
    ]
  }
}
```

### HTTP Call Step
Makes HTTP request to external API.

```typescript
{
  id: "step-2",
  type: "http_call",
  nome: "Send Notification",
  descricao: "Sends email notification",
  enabled: true,
  continue_on_error: true,
  config: {
    method: "POST",
    url: "https://api.example.com/notify",
    headers: {
      "Authorization": "Bearer {{api_token}}",
      "Content-Type": "application/json"
    },
    body: {
      "leadId": "{{leadId}}",
      "status": "qualified"
    },
    timeout: 30000,
    retry: {
      max_attempts: 3,
      delay: 1000
    }
  }
}
```

### Wait Step
Adds delay between steps.

```typescript
{
  id: "step-3",
  type: "wait",
  nome: "Wait 5 seconds",
  descricao: "Delay before next action",
  enabled: true,
  continue_on_error: false,
  config: {
    seconds: 5,
    reason: "Rate limiting"
  }
}
```

## Validation

### Import Validators
```typescript
import { 
  validateFlowStep,
  validateFlowVersion,
  validateFlowDefinition,
  validateOrThrow
} from '@/lib/flows-v2';
```

### Validate a Step
```typescript
const result = validateFlowStep(stepData);

if (result.success) {
  console.log('Valid step:', result.data);
} else {
  console.error('Errors:', result.errors);
  // [{ path: ['config', 'url'], message: 'Invalid URL' }]
}
```

### Validate or Throw
```typescript
try {
  const validStep = validateOrThrow(FlowStepSchema, stepData);
  // Use validStep...
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Validate Unique Step IDs
```typescript
const result = validateUniqueStepIds(steps);

if (!result.success) {
  // Duplicate IDs found
  console.error(result.errors);
}
```

## Step Runners

### Import Step Runners
```typescript
import { 
  defaultStepRunnerRegistry,
  TabularStepRunner,
  HttpCallStepRunner,
  WaitStepRunner
} from '@/lib/flows-v2';
```

### Execute a Step
```typescript
// Get runner
const runner = defaultStepRunnerRegistry.get('tabular');

// Create context
const context = {
  flowExecutionId: 'exec-id',
  flowDefinitionId: 'def-id',
  flowVersionId: 'ver-id',
  leadId: 12345,
  variables: {
    user_name: 'John',
    api_token: 'secret'
  },
  previousStepResults: {},
  timestamp: new Date().toISOString()
};

// Execute with logging
const result = await runner.execute(
  stepConfig,
  context,
  (log) => {
    console.log(`[${log.level}] ${log.message}`, log.data);
  }
);

// Check result
if (result.success) {
  console.log('Output:', result.output);
  console.log('Duration:', result.duration, 'ms');
} else {
  console.error('Error:', result.error);
}
```

### Create Custom Runner
```typescript
import { BaseStepRunner, StepExecutionContext } from '@/lib/flows-v2';

class CustomStepRunner extends BaseStepRunner<CustomConfig> {
  readonly stepType = 'custom';

  validateConfig(config: CustomConfig) {
    // Validate configuration
    return { valid: true };
  }

  protected async executeStep(
    config: CustomConfig,
    context: StepExecutionContext,
    onLog
  ) {
    this.log('step-id', 'Custom Step', 'info', 'Starting...', {}, onLog);
    
    // Your logic here
    
    return createSuccessResult({ result: 'done' });
  }
}

// Register it
defaultStepRunnerRegistry.register(new CustomStepRunner());
```

## Common Patterns

### Get Latest Published Version
```typescript
const { data: versions } = await supabase
  .from('flow_versions')
  .select('*')
  .eq('flow_definition_id', flowId)
  .eq('status', 'published')
  .order('version_number', { ascending: false })
  .limit(1);

const latestVersion = versions[0];
```

### Create New Version
```typescript
// Get current max version
const { data: versions } = await supabase
  .from('flow_versions')
  .select('version_number')
  .eq('flow_definition_id', flowId)
  .order('version_number', { ascending: false })
  .limit(1);

const nextVersion = (versions[0]?.version_number ?? 0) + 1;

// Create new version
const { data: newVersion } = await supabase
  .from('flow_versions')
  .insert({
    flow_definition_id: flowId,
    version_number: nextVersion,
    steps: modifiedSteps,
    status: 'draft',
    created_by: userId,
    change_notes: 'Updated configuration'
  })
  .select()
  .single();
```

### Publish a Draft
```typescript
const { data } = await supabase
  .from('flow_versions')
  .update({
    status: 'published',
    published_at: new Date().toISOString()
  })
  .eq('id', versionId)
  .eq('status', 'draft')  // Only publish if still draft
  .select()
  .single();
```

### Archive Old Versions
```typescript
// Keep only last N published versions
const { data: publishedVersions } = await supabase
  .from('flow_versions')
  .select('id')
  .eq('flow_definition_id', flowId)
  .eq('status', 'published')
  .order('version_number', { ascending: false })
  .limit(3);

const keepIds = publishedVersions.map(v => v.id);

// Archive older versions
await supabase
  .from('flow_versions')
  .update({ status: 'archived' })
  .eq('flow_definition_id', flowId)
  .eq('status', 'published')
  .not('id', 'in', `(${keepIds.join(',')})`);
```

### Execute Flow with Context
```typescript
const execution = {
  flow_definition_id: flowId,
  flow_version_id: versionId,
  lead_id: leadId,
  status: 'pending',
  executed_by: userId,
  context: {
    user_name: user.name,
    priority: 'high',
    api_token: process.env.API_TOKEN
  }
};

const { data: newExecution } = await supabase
  .from('flow_executions')
  .insert(execution)
  .select()
  .single();

// Execute steps...
// Update execution status
await supabase
  .from('flow_executions')
  .update({
    status: 'completed',
    finished_at: new Date().toISOString(),
    logs: executionLogs,
    result: executionResult
  })
  .eq('id', newExecution.id);
```

### Handle Execution Errors
```typescript
try {
  // Execute flow
  await executeFlowSteps(steps, context);
  
  // Update as completed
  await updateExecutionStatus('completed');
} catch (error) {
  // Update as failed
  await supabase
    .from('flow_executions')
    .update({
      status: 'failed',
      error_message: error.message,
      finished_at: new Date().toISOString()
    })
    .eq('id', executionId);
}
```

### Query Execution History
```typescript
// Get recent executions
const { data: executions } = await supabase
  .from('flow_executions')
  .select(`
    *,
    flow_definitions (nome),
    flow_versions (version_number)
  `)
  .eq('flow_definition_id', flowId)
  .order('started_at', { ascending: false })
  .limit(10);

// Filter by status
const { data: failed } = await supabase
  .from('flow_executions')
  .select('*')
  .eq('status', 'failed')
  .gte('started_at', lastWeek);
```

## Environment Variables

For edge functions:

```bash
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Useful Queries

### Find flows without published versions
```sql
SELECT fd.id, fd.nome
FROM flow_definitions fd
LEFT JOIN flow_versions fv ON fv.flow_definition_id = fd.id AND fv.status = 'published'
WHERE fv.id IS NULL;
```

### Get execution success rate
```sql
SELECT 
  fd.nome,
  COUNT(*) as total_executions,
  SUM(CASE WHEN fe.status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN fe.status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM flow_executions fe
JOIN flow_definitions fd ON fd.id = fe.flow_definition_id
GROUP BY fd.id, fd.nome
ORDER BY total_executions DESC;
```

### Find slow executions
```sql
SELECT 
  fe.id,
  fd.nome,
  fv.version_number,
  EXTRACT(EPOCH FROM (fe.finished_at - fe.started_at)) as duration_seconds
FROM flow_executions fe
JOIN flow_definitions fd ON fd.id = fe.flow_definition_id
JOIN flow_versions fv ON fv.id = fe.flow_version_id
WHERE fe.status = 'completed'
  AND fe.finished_at - fe.started_at > interval '30 seconds'
ORDER BY duration_seconds DESC
LIMIT 10;
```
