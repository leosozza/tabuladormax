# Flows v2 Foundation - Implementation Guide

This document describes the Flows v2 foundation infrastructure added to the Flow Builder system.

## Overview

Flows v2 introduces a robust, production-ready foundation for the Flow Builder with:

- **Flow Versioning**: Complete version control system for flows
- **JSON Schema Validation**: Strict validation of flow definitions
- **Modular Step Runners**: Extensible infrastructure for step execution
- **Utilities**: Tools for version management and validation
- **Unit Tests**: Comprehensive test suite structure
- **Migration Support**: Automated migration from v1 to versioned flows

## New Database Tables

### `flow_versions`

Stores complete version history of flows:

```sql
CREATE TABLE public.flow_versions (
  id UUID PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.flows(id),
  version_number INTEGER NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  definition JSONB NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  notas_versao TEXT,
  UNIQUE(flow_id, version_number)
);
```

Key features:
- Sequential version numbering per flow
- Complete flow definition stored as JSONB
- Schema version tracking (v1, v2, etc.)
- Active version indicator
- Version notes for changelog

## New TypeScript Utilities

### Flow Schema Validator (`src/utils/flowSchemaValidator.ts`)

Validates flow definitions against versioned schemas:

```typescript
import { validateFlowDefinition, createFlowDefinition } from '@/utils/flowSchemaValidator';

// Validate a flow definition
const result = validateFlowDefinition(definition, 'v1');
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Create a flow definition
const definition = createFlowDefinition(steps, { custom: 'metadata' });
```

### Flow Version Manager (`src/utils/flowVersionManager.ts`)

Manages flow versions:

```typescript
import {
  createFlowVersion,
  getFlowVersions,
  getActiveVersion,
  activateVersion,
  compareVersions
} from '@/utils/flowVersionManager';

// Create new version
const { data: version } = await createFlowVersion(
  flowId,
  'Flow Name',
  definition,
  { activate: true, notas_versao: 'Added new step' }
);

// Get version history
const { data: versions } = await getFlowVersions(flowId);

// Compare versions
const diff = compareVersions(version1, version2);
console.log('Changes:', diff.changes);
```

## Step Runner Infrastructure

### Base Step Runner (`src/stepRunners/BaseStepRunner.ts`)

Abstract base class for all step runners:

```typescript
export interface StepRunner<TConfig = any> {
  readonly type: string;
  readonly displayName: string;
  validate(config: TConfig): { valid: boolean; errors?: string[] };
  execute(config: TConfig, context: StepExecutionContext): Promise<StepExecutionResult>;
}
```

### Step Runner Registry (`src/stepRunners/StepRunnerRegistry.ts`)

Central registry for step runner implementations:

```typescript
import { stepRunnerRegistry } from '@/stepRunners';

// Get runner for a step type
const runner = stepRunnerRegistry.get('tabular');

// Check if runner exists
if (stepRunnerRegistry.has('custom_type')) {
  // Runner is registered
}

// Get all registered types
const types = stepRunnerRegistry.getRegisteredTypes();
```

### Built-in Step Runners

1. **TabularStepRunner** (`src/stepRunners/TabularStepRunner.ts`)
   - Executes Bitrix webhook actions
   - Validates required fields
   - Replaces placeholders

2. **HttpCallStepRunner** (`src/stepRunners/HttpCallStepRunner.ts`)
   - Makes HTTP requests
   - Supports all HTTP methods
   - Handles timeouts and errors

3. **WaitStepRunner** (`src/stepRunners/WaitStepRunner.ts`)
   - Adds delays between steps
   - Validates wait duration
   - Prevents excessive wait times

### Creating Custom Step Runners

```typescript
import { BaseStepRunner, type StepExecutionContext } from '@/stepRunners/BaseStepRunner';
import { stepRunnerRegistry } from '@/stepRunners/StepRunnerRegistry';

export interface MyCustomConfig {
  customField: string;
}

export class MyCustomStepRunner extends BaseStepRunner<MyCustomConfig> {
  readonly type = 'my_custom';
  readonly displayName = 'My Custom Action';
  
  validate(config: MyCustomConfig) {
    if (!config.customField) {
      return { valid: false, errors: ['customField is required'] };
    }
    return { valid: true };
  }
  
  async execute(config: MyCustomConfig, context: StepExecutionContext) {
    // Implement your logic here
    return this.createSuccessResult({ result: 'success' });
  }
}

// Register the runner
stepRunnerRegistry.register(new MyCustomStepRunner());
```

## Database Functions

### `get_next_flow_version(p_flow_id UUID)`

Returns the next available version number for a flow.

### `activate_flow_version(p_version_id UUID)`

Activates a specific version and deactivates all others for the same flow.

### `validate_flow_definition(p_definition JSONB, p_schema_version TEXT)`

Validates a flow definition against the specified schema version.

## Migration Scripts

### `20251012032351_create_flow_versions.sql`

Creates the `flow_versions` table and related infrastructure:
- Table definition with constraints
- Indexes for performance
- RLS policies
- Helper functions

### `20251012032352_migrate_flows_to_versions.sql`

Migrates existing flows to the versioning system:
- Creates version 1 for each existing flow
- Validates definitions before migration
- Updates flows to reference their versions
- Idempotent (safe to run multiple times)

## Unit Test Structure

Test files are located in `src/__tests__/`:

```
src/__tests__/
├── setup.ts                                    # Global test setup
├── utils/
│   ├── flowSchemaValidator.test.ts            # Schema validation tests
│   └── flowVersionManager.test.ts             # Version management tests
└── stepRunners/
    ├── stepRunners.test.ts                    # Step runner tests
    └── StepRunnerRegistry.test.ts             # Registry tests
```

### Running Tests

```bash
# Install test dependencies (if not already installed)
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/ui

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

Add these scripts to `package.json` if not present:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Applying Migrations

### Using Supabase CLI

```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
supabase db push --include-all
```

### Using Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Create a new query
3. Copy the migration SQL content
4. Execute the query

### Verify Migration

```sql
-- Check if flow_versions table exists
SELECT * FROM information_schema.tables WHERE table_name = 'flow_versions';

-- Check existing flows have versions
SELECT 
  f.id, 
  f.nome, 
  f.current_version_id,
  fv.version_number
FROM flows f
LEFT JOIN flow_versions fv ON f.current_version_id = fv.id;
```

## Best Practices

### Version Management

1. **Always create versions for significant changes**
   ```typescript
   await createFlowVersion(flowId, name, definition, {
     notas_versao: 'Describe what changed',
     activate: true
   });
   ```

2. **Keep version notes descriptive**
   - Document what changed
   - Reference ticket/issue numbers
   - Note breaking changes

3. **Test before activating**
   - Create version without activating
   - Test in development
   - Activate when ready

### Schema Validation

1. **Validate before saving**
   ```typescript
   const validation = validateFlowDefinition(definition, 'v1');
   if (!validation.valid) {
     // Show errors to user
     return;
   }
   ```

2. **Handle validation errors gracefully**
   - Show clear error messages
   - Highlight problematic fields
   - Suggest fixes

### Step Runners

1. **Always validate config**
   ```typescript
   const validation = runner.validate(config);
   if (!validation.valid) {
     throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
   }
   ```

2. **Log execution details**
   ```typescript
   const logs = [];
   logs.push('Starting execution...');
   // ... execution logic
   return { success: true, logs };
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     // execution logic
   } catch (error) {
     return this.createErrorResult(error.message);
   }
   ```

## Troubleshooting

### Version creation fails

- Check RLS policies are applied
- Verify user has admin/manager role
- Check flow_id exists
- Validate definition first

### Migration script fails

- Check all flows have valid steps
- Ensure no circular references
- Verify RLS policies allow access

### Step runner not found

```typescript
import '@/stepRunners'; // Ensure runners are registered
```

### Tests failing

- Check `vitest.config.ts` is present
- Verify test setup file exists
- Install all test dependencies

## Future Enhancements

Potential v3 features:

- [ ] Conditional step execution
- [ ] Parallel step execution
- [ ] Sub-flow support
- [ ] Step retry policies
- [ ] Version rollback UI
- [ ] Version diff visualization
- [ ] Schema migration tools
- [ ] Performance monitoring
- [ ] A/B testing support

## Related Documentation

- [Flow Builder Documentation](./docs/flows.md) - Main Flow Builder docs
- [Edge Functions](./supabase/functions/) - Server-side execution
- [Database Migrations](./supabase/migrations/) - Schema changes
