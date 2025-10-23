# Sync Functions - Quick Reference Card

## Quick Start

### Basic Edge Function Template
```typescript
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import {
  LogLevel,
  logMessage,
  generateTraceId,
  jsonResponse,
  handleCorsPreFlight,
  createErrorResponse,
  createSuccessResponse,
  PerformanceTimer,
} from '../_shared/sync-utils.ts';

serve(async (req) => {
  const traceId = generateTraceId();
  const timer = new PerformanceTimer();
  const functionName = 'my-function';

  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  logMessage(LogLevel.INFO, functionName, 'Started', { trace_id: traceId });

  try {
    // Your logic here
    const result = { success: true };
    
    return jsonResponse(
      createSuccessResponse(result, traceId, timer.getDuration()),
      200
    );
  } catch (error) {
    logMessage(LogLevel.ERROR, functionName, 'Failed', {
      error: error.message,
      trace_id: traceId,
    });

    return jsonResponse(
      createErrorResponse('ERROR', error.message, undefined, undefined, ['Check logs'], traceId),
      500
    );
  }
});
```

## Common Patterns

### 1. CORS Handling
```typescript
if (req.method === 'OPTIONS') {
  return handleCorsPreFlight();
}
```

### 2. Logging
```typescript
// Info
logMessage(LogLevel.INFO, 'function-name', 'Message', { key: 'value' }, durationMs, traceId);

// Warning
logMessage(LogLevel.WARN, 'function-name', 'Warning', { issue: 'details' }, undefined, traceId);

// Error
logMessage(LogLevel.ERROR, 'function-name', 'Error', { error: 'details' }, undefined, traceId);
```

### 3. Error Responses
```typescript
// Simple
return jsonResponse(
  createErrorResponse('ERROR_CODE', 'Error message', undefined, undefined, ['Suggestion'], traceId),
  500
);

// With details
return jsonResponse(
  createErrorResponse(
    'VALIDATION_ERROR',
    'Invalid input',
    'ERR001',
    { field: 'email', value: 'invalid' },
    ['Check email format', 'Try again'],
    traceId
  ),
  400
);
```

### 4. Success Responses
```typescript
// Simple
return jsonResponse(
  createSuccessResponse({ data: 'value' }, traceId),
  200
);

// With duration
return jsonResponse(
  createSuccessResponse(
    { records: 100, processed: 95 },
    traceId,
    timer.getDuration()
  ),
  200
);
```

### 5. Performance Tracking
```typescript
const timer = new PerformanceTimer();

timer.mark('operation_start');
await doOperation();
timer.mark('operation_end');

const duration = timer.getDurationBetween('operation_start', 'operation_end');
logMessage(LogLevel.INFO, 'function', 'Done', { duration_ms: duration });

// Get all marks
const allMarks = timer.getAllMarks();
```

### 6. Retry Logic
```typescript
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from '../_shared/sync-utils.ts';

const result = await retryWithBackoff(
  async () => {
    return await unstableOperation();
  },
  { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 },
  (attempt, error) => {
    logMessage(LogLevel.WARN, 'function', 'Retrying', { attempt, error: error.message });
  }
);
```

### 7. Environment Validation
```typescript
import { validateEnvVars } from '../_shared/sync-utils.ts';

const validation = validateEnvVars(['REQUIRED_VAR_1', 'REQUIRED_VAR_2']);

if (!validation.valid) {
  return jsonResponse(
    createErrorResponse(
      'CONFIG_ERROR',
      `Missing: ${validation.missing.join(', ')}`,
      undefined,
      { missing: validation.missing },
      ['Configure in Supabase Dashboard'],
      traceId
    ),
    500
  );
}
```

### 8. Supabase Error Handling
```typescript
import { extractSupabaseError } from '../_shared/sync-utils.ts';

const { data, error } = await supabase.from('table').select('*');

if (error) {
  const supabaseError = extractSupabaseError(error);
  logMessage(LogLevel.ERROR, 'function', 'Query failed', {
    message: supabaseError.message,
    code: supabaseError.code,
    details: supabaseError.details,
    hint: supabaseError.hint,
  });
}
```

### 9. Bitrix Notifications
```typescript
import { sendBitrixNotification } from '../_shared/sync-utils.ts';

const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';

if (enableBitrix && criticalError) {
  await sendBitrixNotification({
    title: 'Critical Error',
    message: 'Something went wrong',
    severity: 'error',
    metadata: { trace_id: traceId, error: details },
  });
}
```

## Environment Variables

### Required
```bash
TABULADOR_URL=https://project.supabase.co
TABULADOR_SERVICE_KEY=your_service_key
```

### Auto-Injected by Supabase
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=auto_injected
```

### Optional
```bash
ENABLE_BITRIX_NOTIFICATIONS=true
```

## HTTP Status Codes

```typescript
200 - OK (success)
207 - Multi-Status (partial success/degraded)
400 - Bad Request (validation error)
401 - Unauthorized (auth error)
403 - Forbidden (permission denied)
404 - Not Found
405 - Method Not Allowed
500 - Internal Server Error (general error)
503 - Service Unavailable (temporary issue)
```

## Testing

### Run All Tests
```bash
deno test supabase/functions/_tests/
```

### Run Specific Test
```bash
deno test supabase/functions/_tests/shared-utils.test.ts
```

### Test with Coverage
```bash
deno test --coverage=coverage supabase/functions/_tests/
deno coverage coverage
```

### Watch Mode
```bash
deno test --watch supabase/functions/_tests/
```

## Deployment

### Deploy Function
```bash
supabase functions deploy function-name
```

### Set Environment Variable
```bash
# Via Supabase Dashboard:
# Project Settings → Edge Functions → Secrets
```

### View Logs
```bash
# Via Dashboard: Logs → Edge Functions
# Filter by trace_id, level, or function_name
```

## Debugging

### Find Logs by Trace ID
```bash
# In logs, search for:
"trace_id": "1705315800000-abc123def"
```

### Common Log Patterns
```bash
# All errors
level=error

# Specific function
function_name=sync-health

# Performance issues
duration_ms>5000
```

## Best Practices

### ✅ DO
- Always use trace IDs
- Log at appropriate levels (INFO, WARN, ERROR)
- Include metadata in logs
- Track performance for critical operations
- Validate environment early
- Provide helpful error suggestions
- Use retry logic for unstable operations
- Return consistent response formats

### ❌ DON'T
- Use console.log (use logMessage instead)
- Create raw Response objects (use jsonResponse)
- Ignore errors silently
- Return inconsistent response formats
- Hard-code credentials
- Skip environment validation
- Leave out trace IDs

## Cheat Sheet

| Need | Import | Usage |
|------|--------|-------|
| CORS | `CORS_HEADERS, handleCorsPreFlight` | `handleCorsPreFlight()` |
| Logging | `LogLevel, logMessage` | `logMessage(LogLevel.INFO, ...)` |
| Trace ID | `generateTraceId` | `const id = generateTraceId()` |
| Error Response | `createErrorResponse` | `createErrorResponse('ERR', 'msg', ...)` |
| Success Response | `createSuccessResponse` | `createSuccessResponse(data, ...)` |
| JSON Response | `jsonResponse` | `jsonResponse(body, 200)` |
| Performance | `PerformanceTimer` | `new PerformanceTimer()` |
| Retry | `retryWithBackoff` | `await retryWithBackoff(fn, config)` |
| Env Check | `validateEnvVars` | `validateEnvVars(['VAR1'])` |
| Extract Error | `extractErrorMessage` | `extractErrorMessage(error)` |
| Supabase Error | `extractSupabaseError` | `extractSupabaseError(error)` |
| Notifications | `sendBitrixNotification` | `await sendBitrixNotification({...})` |

## Examples

### Minimal Function
```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreFlight();
  const traceId = generateTraceId();
  
  try {
    return jsonResponse(createSuccessResponse({ ok: true }, traceId), 200);
  } catch (error) {
    return jsonResponse(createErrorResponse('ERROR', error.message, undefined, undefined, [], traceId), 500);
  }
});
```

### With Validation
```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreFlight();
  const traceId = generateTraceId();
  
  const validation = validateEnvVars(['REQUIRED_VAR']);
  if (!validation.valid) {
    return jsonResponse(
      createErrorResponse('CONFIG', 'Missing vars', undefined, { missing: validation.missing }, ['Configure vars'], traceId),
      500
    );
  }
  
  // Continue...
});
```

### With Retry and Performance
```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreFlight();
  const traceId = generateTraceId();
  const timer = new PerformanceTimer();
  
  try {
    timer.mark('operation_start');
    const result = await retryWithBackoff(async () => await doWork());
    timer.mark('operation_end');
    
    return jsonResponse(
      createSuccessResponse(result, traceId, timer.getDuration()),
      200
    );
  } catch (error) {
    return jsonResponse(
      createErrorResponse('ERROR', error.message, undefined, undefined, ['Try again'], traceId),
      500
    );
  }
});
```

## Support

- 📖 [Full Documentation](supabase/functions/_shared/README.md)
- 🧪 [Testing Guide](supabase/functions/_tests/TESTING_GUIDE.md)
- 📋 [Complete Summary](SYNC_FUNCTIONS_REFACTORING_SUMMARY.md)
- 💬 Questions? Check existing functions for examples
