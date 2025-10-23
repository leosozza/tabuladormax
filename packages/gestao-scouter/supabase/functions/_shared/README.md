# Shared Utilities for Edge Functions

This directory contains shared utilities used across multiple Edge Functions in the Gestão Scouter synchronization system.

## Files

### sync-utils.ts

Comprehensive utility module providing common functionality for all sync Edge Functions.

## Features

### 1. CORS Support

Standard CORS headers for cross-origin requests:

```typescript
import { CORS_HEADERS, handleCorsPreFlight } from '../_shared/sync-utils.ts';

// In your Edge Function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }
  
  // Your logic here
  
  return jsonResponse(data, 200);
});
```

**Headers included:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, prefer`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`

### 2. Structured Logging

JSON-formatted logging for better traceability:

```typescript
import { LogLevel, logMessage } from '../_shared/sync-utils.ts';

// Simple logging
logMessage(
  LogLevel.INFO,
  'my-function',
  'Operation completed',
  { records: 100, duration: 250 },
  250, // duration in ms
  traceId
);

// Output (JSON):
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "function_name": "my-function",
  "message": "Operation completed",
  "metadata": { "records": 100, "duration": 250 },
  "duration_ms": 250,
  "trace_id": "1705315800000-abc123def"
}
```

**Log Levels:**
- `DEBUG`: Detailed debugging information
- `INFO`: General informational messages
- `WARN`: Warning messages
- `ERROR`: Error messages

### 3. Request Tracking

Generate unique trace IDs for correlating logs:

```typescript
import { generateTraceId } from '../_shared/sync-utils.ts';

serve(async (req) => {
  const traceId = generateTraceId();
  
  logMessage(LogLevel.INFO, 'my-function', 'Request started', { trace_id: traceId });
  
  // Your logic here
  
  return jsonResponse({ success: true }, 200);
});
```

### 4. Error Handling

Standardized error responses:

```typescript
import { createErrorResponse, jsonResponse } from '../_shared/sync-utils.ts';

// Create error response
const errorResponse = createErrorResponse(
  'DATABASE_ERROR',
  'Failed to connect to database',
  'ECONNREFUSED',
  { host: 'localhost', port: 5432 },
  ['Check if database is running', 'Verify connection string'],
  traceId
);

return jsonResponse(errorResponse, 500);
```

**Response structure:**
```json
{
  "error": "DATABASE_ERROR",
  "message": "Failed to connect to database",
  "error_code": "ECONNREFUSED",
  "details": {
    "host": "localhost",
    "port": 5432
  },
  "suggestions": [
    "Check if database is running",
    "Verify connection string"
  ],
  "trace_id": "1705315800000-abc123def",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Success Responses

Standardized success responses:

```typescript
import { createSuccessResponse, jsonResponse } from '../_shared/sync-utils.ts';

const data = { processed: 100, failed: 0 };
const successResponse = createSuccessResponse(data, traceId, durationMs);

return jsonResponse(successResponse, 200);
```

**Response structure:**
```json
{
  "status": "success",
  "data": {
    "processed": 100,
    "failed": 0
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "trace_id": "1705315800000-abc123def",
  "duration_ms": 250
}
```

### 6. Performance Tracking

Track execution time and performance metrics:

```typescript
import { PerformanceTimer } from '../_shared/sync-utils.ts';

const timer = new PerformanceTimer();

timer.mark('database_query_start');
await queryDatabase();
timer.mark('database_query_end');

const queryDuration = timer.getDurationBetween('database_query_start', 'database_query_end');

logMessage(
  LogLevel.INFO,
  'my-function',
  'Query completed',
  { duration_ms: queryDuration }
);

// Get all performance marks
const allMarks = timer.getAllMarks();
// { database_query_start: 100, database_query_end: 350 }
```

### 7. Retry Logic

Automatic retry with exponential backoff:

```typescript
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from '../_shared/sync-utils.ts';

const result = await retryWithBackoff(
  async () => {
    // Your operation that might fail
    return await unstableApiCall();
  },
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2
  },
  (attempt, error) => {
    logMessage(
      LogLevel.WARN,
      'my-function',
      'Retrying operation',
      { attempt, error: error.message }
    );
  }
);
```

**Default configuration:**
- Max attempts: 3
- Initial delay: 1000ms
- Backoff multiplier: 2 (delays: 1s, 2s, 4s)

### 8. Environment Validation

Validate required environment variables:

```typescript
import { validateEnvVars } from '../_shared/sync-utils.ts';

const validation = validateEnvVars([
  'TABULADOR_URL',
  'TABULADOR_SERVICE_KEY'
]);

if (!validation.valid) {
  logMessage(
    LogLevel.ERROR,
    'my-function',
    'Missing environment variables',
    { missing: validation.missing }
  );
  
  return jsonResponse(
    createErrorResponse(
      'CONFIG_ERROR',
      `Missing required environment variables: ${validation.missing.join(', ')}`,
      undefined,
      undefined,
      ['Configure missing variables in Supabase Dashboard'],
      traceId
    ),
    500
  );
}
```

### 9. Supabase Error Handling

Extract detailed error information from Supabase errors:

```typescript
import { extractSupabaseError } from '../_shared/sync-utils.ts';

try {
  const { data, error } = await supabase.from('table').select('*');
  
  if (error) {
    const supabaseError = extractSupabaseError(error);
    
    logMessage(
      LogLevel.ERROR,
      'my-function',
      'Database query failed',
      {
        message: supabaseError.message,
        code: supabaseError.code,
        details: supabaseError.details,
        hint: supabaseError.hint
      }
    );
  }
} catch (error) {
  const message = extractErrorMessage(error);
  // Handle generic error
}
```

### 10. Bitrix Notifications

Send notifications to Bitrix (placeholder for future implementation):

```typescript
import { sendBitrixNotification } from '../_shared/sync-utils.ts';

// Send notification on critical error
if (criticalError) {
  await sendBitrixNotification({
    title: 'Sync Health Check Failed',
    message: 'Critical issue detected in synchronization',
    severity: 'error',
    metadata: {
      trace_id: traceId,
      error: errorDetails
    }
  });
}
```

**Enable via environment variable:**
```bash
ENABLE_BITRIX_NOTIFICATIONS=true
```

## Complete Example

Here's a complete Edge Function using all utilities:

```typescript
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CORS_HEADERS,
  LogLevel,
  logMessage,
  generateTraceId,
  createErrorResponse,
  createSuccessResponse,
  jsonResponse,
  handleCorsPreFlight,
  extractSupabaseError,
  PerformanceTimer,
  validateEnvVars,
  retryWithBackoff,
  sendBitrixNotification,
} from '../_shared/sync-utils.ts';

serve(async (req) => {
  const traceId = generateTraceId();
  const timer = new PerformanceTimer();
  const functionName = 'my-function';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  logMessage(LogLevel.INFO, functionName, 'Request started', {
    method: req.method,
    trace_id: traceId,
  });

  try {
    // Validate environment
    timer.mark('validation_start');
    const validation = validateEnvVars(['REQUIRED_VAR']);
    timer.mark('validation_end');

    if (!validation.valid) {
      logMessage(LogLevel.ERROR, functionName, 'Missing environment variables', {
        missing: validation.missing,
        trace_id: traceId,
      });

      return jsonResponse(
        createErrorResponse(
          'CONFIG_ERROR',
          'Missing required configuration',
          undefined,
          { missing: validation.missing },
          ['Configure environment variables in Supabase Dashboard'],
          traceId
        ),
        500
      );
    }

    // Main operation with retry
    timer.mark('operation_start');
    const result = await retryWithBackoff(
      async () => {
        // Your operation here
        return { success: true, data: [] };
      },
      undefined,
      (attempt, error) => {
        logMessage(LogLevel.WARN, functionName, 'Retrying operation', {
          attempt,
          error: error.message,
          trace_id: traceId,
        });
      }
    );
    timer.mark('operation_end');

    const duration = timer.getDuration();

    logMessage(LogLevel.INFO, functionName, 'Operation completed', {
      duration_ms: duration,
      trace_id: traceId,
      performance_marks: timer.getAllMarks(),
    });

    return jsonResponse(
      createSuccessResponse(result, traceId, duration),
      200
    );

  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    logMessage(LogLevel.ERROR, functionName, 'Operation failed', {
      error: errorMessage,
      trace_id: traceId,
      duration_ms: timer.getDuration(),
    });

    // Send Bitrix notification for critical errors
    const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';
    if (enableBitrix) {
      await sendBitrixNotification({
        title: 'Function Failed',
        message: errorMessage,
        severity: 'error',
        metadata: { trace_id: traceId },
      });
    }

    return jsonResponse(
      createErrorResponse(
        'OPERATION_ERROR',
        errorMessage,
        undefined,
        undefined,
        ['Check function logs for details'],
        traceId
      ),
      500
    );
  }
});
```

## Testing

See `../_tests/shared-utils.test.ts` for comprehensive test coverage.

Run tests:
```bash
deno test supabase/functions/_tests/shared-utils.test.ts
```

## Best Practices

1. **Always use trace IDs**: Include trace_id in all log messages for correlation
2. **Log at appropriate levels**: Use INFO for normal operations, WARN for recoverable issues, ERROR for failures
3. **Include metadata**: Add relevant context to log messages
4. **Track performance**: Use PerformanceTimer for operations that might be slow
5. **Handle all errors**: Use extractErrorMessage and extractSupabaseError for consistent error handling
6. **Validate early**: Check environment variables at function start
7. **Provide suggestions**: Include helpful suggestions in error responses
8. **Use retry logic**: Apply retryWithBackoff for operations that might be temporarily unavailable
9. **Send critical notifications**: Use Bitrix notifications for issues requiring immediate attention
10. **Return consistent responses**: Always use jsonResponse for standardized output

## Migration Guide

To migrate existing Edge Functions to use these utilities:

1. **Import utilities**:
   ```typescript
   import {
     CORS_HEADERS,
     LogLevel,
     logMessage,
     generateTraceId,
     jsonResponse,
     handleCorsPreFlight,
   } from '../_shared/sync-utils.ts';
   ```

2. **Add trace ID**:
   ```typescript
   const traceId = generateTraceId();
   ```

3. **Replace console.log with logMessage**:
   ```typescript
   // Before
   console.log('Operation completed');
   
   // After
   logMessage(LogLevel.INFO, functionName, 'Operation completed', { trace_id: traceId });
   ```

4. **Replace Response with jsonResponse**:
   ```typescript
   // Before
   return new Response(JSON.stringify(data), {
     status: 200,
     headers: { 'Content-Type': 'application/json' }
   });
   
   // After
   return jsonResponse(data, 200);
   ```

5. **Standardize error responses**:
   ```typescript
   // Before
   return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
   
   // After
   return jsonResponse(
     createErrorResponse('ERROR', 'Operation failed', undefined, undefined, ['Try again'], traceId),
     500
   );
   ```

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release
- CORS support
- Structured logging
- Trace ID generation
- Error handling utilities
- Performance tracking
- Retry logic
- Environment validation
- Bitrix notification support (placeholder)
