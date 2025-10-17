# Flows v2 Foundation - Migration Guide

## Overview

This guide helps you migrate from Flows v1 to Flows v2. The v2 architecture introduces versioning, better separation of concerns, and improved maintainability.

## What's New in v2?

### 1. **Versioning System**
Flows now support multiple versions with draft, published, and archived states. This enables:
- Safe experimentation with draft versions
- Rollback to previous published versions
- Better change tracking with version notes

### 2. **Separated Concerns**
The data model is now split into three tables:
- `flow_definitions`: Flow metadata (name, description, ownership)
- `flow_versions`: Versioned configurations (steps, status)
- `flow_executions`: Execution history with version tracking

### 3. **Enhanced Type Safety**
- Zod-based runtime validation
- Type-safe interfaces derived from schemas
- Better error messages

## Migration Steps

### Automatic Migration

1. **Run Database Migrations**
   ```bash
   # Apply the v2 foundation migration
   # This creates new tables: flow_definitions, flow_versions, flow_executions
   supabase db push
   
   # Or via SQL
   psql -f supabase/migrations/20251012030958_*_flows_v2_foundation.sql
   ```

2. **Run Data Migration**
   ```bash
   # This converts existing flows and flows_runs to v2 format
   psql -f supabase/migrations/20251012031000_migrate_flows_to_v2.sql
   ```

   The migration will:
   - Copy each flow from `flows` → `flow_definitions`
   - Create version 1 for each flow in `flow_versions`
   - Convert each flow run to `flow_executions`
   - Preserve all IDs and timestamps

3. **Verify Migration**
   ```sql
   -- Check migration results
   SELECT 
     (SELECT COUNT(*) FROM flows) as v1_flows,
     (SELECT COUNT(*) FROM flow_definitions) as v2_definitions,
     (SELECT COUNT(*) FROM flow_versions) as v2_versions,
     (SELECT COUNT(*) FROM flows_runs) as v1_runs,
     (SELECT COUNT(*) FROM flow_executions) as v2_executions;
   ```

### Code Changes

#### Before (v1)
```typescript
// Fetching a flow
const { data: flow } = await supabase
  .from('flows')
  .select('*')
  .eq('id', flowId)
  .single();

// Executing a flow
await supabase
  .from('flows_runs')
  .insert({
    flow_id: flowId,
    status: 'running',
    logs: []
  });
```

#### After (v2)
```typescript
// Fetching a flow (now requires definition + version)
const { data: definition } = await supabase
  .from('flow_definitions')
  .select('*, flow_versions(*)')
  .eq('id', flowId)
  .single();

// Get latest published version
const latestVersion = definition.flow_versions
  .filter(v => v.status === 'published')
  .sort((a, b) => b.version_number - a.version_number)[0];

// Executing a flow
await supabase
  .from('flow_executions')
  .insert({
    flow_definition_id: flowId,
    flow_version_id: latestVersion.id,
    status: 'running',
    logs: []
  });
```

### Using the New Validation Library

```typescript
import { 
  validateFlowStep, 
  validateFlowVersion,
  FlowStepSchema 
} from '@/lib/flows-v2';

// Validate a step before saving
const step = {
  id: 'step-1',
  type: 'tabular',
  nome: 'Update Status',
  config: {
    webhook_url: 'https://api.example.com/webhook',
    field: 'STATUS_ID',
    value: 'QUALIFIED'
  }
};

const result = validateFlowStep(step);
if (!result.success) {
  console.error('Validation errors:', result.errors);
  return;
}

// Create a new version
const versionData = {
  flow_definition_id: flowId,
  version_number: 2,
  steps: [result.data],
  status: 'draft'
};

const versionResult = validateFlowVersion(versionData);
```

### Using Step Runners

```typescript
import { 
  defaultStepRunnerRegistry,
  StepExecutionContext 
} from '@/lib/flows-v2';

// Get a step runner
const runner = defaultStepRunnerRegistry.get('tabular');

// Prepare execution context
const context: StepExecutionContext = {
  flowExecutionId: executionId,
  flowDefinitionId: definitionId,
  flowVersionId: versionId,
  leadId: 12345,
  variables: {},
  previousStepResults: {},
  timestamp: new Date().toISOString()
};

// Execute the step
const result = await runner.execute(
  step.config,
  context,
  (log) => console.log(log)
);

if (result.success) {
  console.log('Step completed:', result.output);
} else {
  console.error('Step failed:', result.error);
}
```

## API Changes

### Edge Functions

#### flows-api

**Old (v1):**
```
GET  /flows-api          - List all flows
POST /flows-api          - Create flow
GET  /flows-api/{id}     - Get flow
PUT  /flows-api/{id}     - Update flow
DELETE /flows-api/{id}   - Delete flow
```

**New (v2):**
```
# Flow Definitions
GET    /flows-api/definitions              - List all definitions
POST   /flows-api/definitions              - Create definition
GET    /flows-api/definitions/{id}         - Get definition
PUT    /flows-api/definitions/{id}         - Update definition
DELETE /flows-api/definitions/{id}         - Delete definition

# Flow Versions
GET    /flows-api/definitions/{id}/versions         - List versions
POST   /flows-api/definitions/{id}/versions         - Create version
GET    /flows-api/definitions/{id}/versions/{ver}   - Get version
PUT    /flows-api/definitions/{id}/versions/{ver}   - Update version
POST   /flows-api/definitions/{id}/versions/{ver}/publish - Publish version
```

#### flows-executor

**Old (v1):**
```json
POST /flows-executor
{
  "flowId": "uuid",
  "leadId": 123
}
```

**New (v2):**
```json
POST /flows-executor
{
  "flow_definition_id": "uuid",
  "flow_version_id": "uuid",  // Optional, uses latest published if omitted
  "leadId": 123,
  "context": {
    "custom_var": "value"
  }
}
```

## Best Practices for v2

### 1. Version Management

**Always start with a draft:**
```typescript
// Create new version as draft
const newVersion = {
  flow_definition_id: flowId,
  version_number: nextVersion,
  steps: modifiedSteps,
  status: 'draft',
  change_notes: 'Updated webhook URLs'
};
```

**Test before publishing:**
```typescript
// Test with draft version
await executeFlow(flowId, draftVersionId, testLeadId);

// If successful, publish
await publishVersion(draftVersionId);
```

**Archive old versions:**
```typescript
// After grace period, archive old versions
await supabase
  .from('flow_versions')
  .update({ status: 'archived' })
  .eq('id', oldVersionId);
```

### 2. Error Handling

**Use continue_on_error for non-critical steps:**
```typescript
const step = {
  id: 'notification',
  type: 'http_call',
  nome: 'Send Notification',
  continue_on_error: true,  // Don't fail flow if notification fails
  config: { /* ... */ }
};
```

**Add retry logic for HTTP calls:**
```typescript
const step = {
  id: 'api-call',
  type: 'http_call',
  nome: 'External API',
  config: {
    method: 'POST',
    url: 'https://api.example.com/endpoint',
    retry: {
      max_attempts: 3,
      delay: 1000
    }
  }
};
```

### 3. Context Variables

**Pass context for dynamic values:**
```typescript
const execution = await executeFlow(flowId, versionId, leadId, {
  user_name: user.name,
  department: user.department,
  priority: 'high'
});

// In step config, use placeholders
const step = {
  config: {
    webhook_url: 'https://api.example.com/webhook',
    field: 'ASSIGNED_TO',
    value: '{{user_name}}'  // Replaced at runtime
  }
};
```

## Rollback Plan

If you need to rollback to v1:

1. **Keep v1 tables**: Don't delete `flows` and `flows_runs` tables until fully migrated
2. **Update edge functions**: Revert to v1 edge function code
3. **Update UI**: Revert to v1 API calls

The migration is non-destructive - v1 tables remain untouched, so you can rollback at any time.

## FAQ

### Q: Can I use both v1 and v2 simultaneously?
**A:** Yes, both systems can coexist. v1 tables are not modified by the migration.

### Q: What happens to existing flow executions?
**A:** They are copied to `flow_executions` with version references. Original records in `flows_runs` remain unchanged.

### Q: How do I get the latest version of a flow?
**A:** Query `flow_versions` filtered by `status = 'published'` and ordered by `version_number DESC`.

### Q: Can I delete old versions?
**A:** Yes, but we recommend archiving instead. Set `status = 'archived'` to keep history.

### Q: How do I test a new version without affecting production?
**A:** Create a version with `status = 'draft'` and test it by explicitly specifying the version ID in execution requests.

## Support

For questions or issues with migration:
1. Check the logs in `flow_executions` for execution issues
2. Review the architecture documentation: `docs/flows-v2-architecture.md`
3. Check test examples in `src/lib/flows-v2/__tests__/`

## Deprecation Timeline

- **Now**: v2 infrastructure available, v1 still supported
- **Phase 1** (1 month): Dual support, encourage v2 adoption
- **Phase 2** (2 months): v2 recommended, v1 maintenance only
- **Phase 3** (3+ months): v1 deprecated, v2 required
