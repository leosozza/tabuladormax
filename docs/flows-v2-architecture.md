# Flows v2 - Architecture Documentation

## Overview

Flows v2 is a comprehensive refactoring of the Flow Builder system that introduces versioning, better separation of concerns, and improved maintainability. The v2 architecture separates flow metadata from flow configurations, enabling versioned flows with rollback capabilities.

## Key Improvements Over v1

### 1. **Versioning System**
- Flow definitions are now separate from flow configurations
- Each flow can have multiple versions (draft, published, archived)
- Supports rollback to previous versions
- Better change tracking with version notes

### 2. **Enhanced Data Model**
- **flow_definitions**: Stores flow metadata (name, description, ownership)
- **flow_versions**: Stores versioned flow configurations with steps
- **flow_executions**: Enhanced execution tracking with version references

### 3. **JSON Schema Validation**
- Zod-based schemas for all flow components
- Runtime validation for steps, configurations, and requests
- Type-safe interfaces derived from schemas

### 4. **Modular Step Runners**
- Abstract base class for step runners
- Standardized execution interface
- Built-in error handling and timing
- Extensible registry system

### 5. **Better Execution Context**
- Richer context passed to step runners
- Support for variables and previous step results
- Improved logging and error tracking

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Flows v2 System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐      ┌───────────────┐      ┌────────────┐  │
│  │     Client    │─────▶│  Edge         │─────▶│  Database  │  │
│  │     (UI)      │      │  Functions    │      │  (Supabase)│  │
│  └───────────────┘      └───────────────┘      └────────────┘  │
│                                │                                │
│                                │                                │
│                         ┌──────▼──────────┐                     │
│                         │  Step Runners   │                     │
│                         │  - Tabular      │                     │
│                         │  - HTTP Call    │                     │
│                         │  - Wait         │                     │
│                         └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### flow_definitions
Stores flow metadata and configuration.

```sql
CREATE TABLE flow_definitions (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);
```

**Purpose**: Represents a flow at the conceptual level. Contains metadata only.

### flow_versions
Stores versioned flow configurations with steps.

```sql
CREATE TABLE flow_versions (
  id UUID PRIMARY KEY,
  flow_definition_id UUID REFERENCES flow_definitions(id),
  version_number INTEGER NOT NULL,
  steps JSONB NOT NULL,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE,
  change_notes TEXT,
  UNIQUE (flow_definition_id, version_number)
);
```

**Purpose**: Contains the actual flow configuration (steps) for a specific version.

**Version Lifecycle**:
1. **draft**: Work in progress, not yet published
2. **published**: Active version available for execution
3. **archived**: Deprecated version, kept for history

### flow_executions
Enhanced execution tracking (replaces flows_runs from v1).

```sql
CREATE TABLE flow_executions (
  id UUID PRIMARY KEY,
  flow_definition_id UUID REFERENCES flow_definitions(id),
  flow_version_id UUID REFERENCES flow_versions(id),
  lead_id INTEGER,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  logs JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  executed_by UUID REFERENCES auth.users(id),
  context JSONB
);
```

**Purpose**: Tracks execution history with version references for complete traceability.

## Step Runners

### Base Interface

All step runners implement the `StepRunner` interface:

```typescript
interface StepRunner<TConfig> {
  readonly stepType: string;
  validateConfig(config: TConfig): { valid: boolean; errors?: string[] };
  execute(
    config: TConfig,
    context: StepExecutionContext,
    onLog?: (log: StepLogEntry) => void
  ): Promise<StepExecutionResult>;
  cleanup?(context: StepExecutionContext): Promise<void>;
}
```

### Tabular Step Runner

Handles Bitrix field updates via webhook.

**Configuration**:
```typescript
{
  webhook_url: string;
  field: string;
  value: string | number | boolean;
  additional_fields?: Array<{ field: string; value: any }>;
}
```

**Features**:
- Placeholder replacement ({{leadId}}, {{variables}})
- Additional fields support
- Error handling and retries

### HTTP Call Step Runner

Makes HTTP requests to external APIs.

**Configuration**:
```typescript
{
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  timeout?: number;
  retry?: {
    max_attempts: number;
    delay: number;
  };
}
```

**Features**:
- Automatic retries with configurable delay
- Timeout support
- Placeholder replacement in URL, headers, and body
- JSON and text response handling

### Wait Step Runner

Adds delays between steps.

**Configuration**:
```typescript
{
  seconds: number;  // Max 3600 (1 hour)
  reason?: string;
}
```

**Features**:
- Simple delay implementation
- Validation of wait time limits

## JSON Schema Validation

Flows v2 uses Zod for runtime validation and type inference.

### Example Usage

```typescript
import { 
  FlowStepSchema, 
  validateFlowStep,
  validateOrThrow 
} from '@/lib/flows-v2';

// Validate a step
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
if (result.success) {
  console.log('Valid step:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}

// Or throw on error
const validatedStep = validateOrThrow(FlowStepSchema, step);
```

## Migration from v1 to v2

### Automatic Migration

The migration script (`migrate_flows_to_v2.sql`) automatically converts existing v1 flows to v2:

1. Each flow in `flows` table → `flow_definitions` entry
2. Each flow's steps → `flow_versions` entry (version 1)
3. Each run in `flows_runs` → `flow_executions` entry

### Manual Steps

After running the migration:

1. **Update Edge Functions**: Deploy updated flows-api and flows-executor
2. **Update UI Components**: Use new v2 schemas and APIs
3. **Test Existing Flows**: Verify all migrated flows work correctly
4. **Deprecate v1 Tables**: After verification, consider archiving old tables

## RLS (Row Level Security) Policies

### flow_definitions
- **SELECT**: Authenticated users can view active definitions or their own definitions
- **INSERT**: Admins and managers only
- **UPDATE**: Admins and managers only
- **DELETE**: Admins only

### flow_versions
- **SELECT**: Users can view published versions or their own versions
- **INSERT**: Admins and managers only
- **UPDATE**: Admins and managers only
- **DELETE**: Admins only

### flow_executions
- **SELECT**: Users can view their own executions; admins/managers can view all
- **INSERT**: All authenticated users
- **UPDATE**: All authenticated users (for updating execution status)
- **DELETE**: Not allowed (executions are immutable history)

## Indexes for Performance

### flow_definitions
- `idx_flow_definitions_active`: On `is_active` (partial index for active flows)
- `idx_flow_definitions_created_by`: On `created_by`
- `idx_flow_definitions_created_at`: On `created_at DESC`

### flow_versions
- `idx_flow_versions_flow_def`: On `flow_definition_id`
- `idx_flow_versions_status`: On `status`
- `idx_flow_versions_version_number`: On `(flow_definition_id, version_number DESC)`
- `idx_flow_versions_published`: On `(flow_definition_id, published_at DESC)` for published versions

### flow_executions
- `idx_flow_executions_flow_def`: On `flow_definition_id`
- `idx_flow_executions_flow_version`: On `flow_version_id`
- `idx_flow_executions_lead`: On `lead_id`
- `idx_flow_executions_status`: On `status`
- `idx_flow_executions_executed_by`: On `executed_by`
- `idx_flow_executions_started_at`: On `started_at DESC`

## Best Practices

### 1. Version Management
- Always create a draft version first
- Test thoroughly before publishing
- Add meaningful change notes
- Archive old versions after a grace period

### 2. Step Configuration
- Use descriptive step names
- Enable `continue_on_error` for non-critical steps
- Add timeouts to HTTP calls
- Use placeholders for dynamic values

### 3. Execution Context
- Pass relevant variables in context
- Use previous step results for conditional logic
- Log important decisions and state changes

### 4. Error Handling
- Use retry mechanisms for HTTP calls
- Set appropriate timeouts
- Provide clear error messages
- Log errors with context

### 5. Testing
- Test each version before publishing
- Use draft versions for experimentation
- Keep published versions stable
- Monitor execution logs for issues

## Future Enhancements

1. **Conditional Steps**: Support for if/else logic
2. **Parallel Execution**: Execute multiple steps simultaneously
3. **Sub-flows**: Call other flows as steps
4. **Webhooks**: Trigger flows from external events
5. **Scheduled Execution**: Cron-like scheduling
6. **Visual Editor**: Drag-and-drop flow builder UI
7. **Templates**: Pre-built flow templates
8. **Version Comparison**: Diff between versions
9. **A/B Testing**: Run multiple versions simultaneously
10. **Monitoring**: Real-time execution dashboards

## API Reference

See the following documentation for detailed API reference:
- [Edge Functions API](./flows-v2-api.md)
- [Step Runner API](./flows-v2-runners.md)
- [Validation API](./flows-v2-validation.md)
