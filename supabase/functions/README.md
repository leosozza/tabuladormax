# Supabase Edge Functions

This directory contains Supabase Edge Functions implemented in TypeScript for the Deno runtime. These functions provide various backend capabilities including diagnostics, monitoring, and administrative operations.

## Diagnostics Functions

### 1. diagnostics/metrics

**Endpoint:** `GET /functions/v1/diagnostics/metrics`

Returns real-time system metrics snapshot with mocked data.

**Response:**
```json
{
  "snapshot": {
    "req_per_s": 35,
    "latency_p95_ms": 145,
    "error_rate_pct": "0.85",
    "db_connections": 12
  }
}
```

**Usage:**
```bash
curl https://your-project.supabase.co/functions/v1/diagnostics/metrics
```

### 2. diagnostics/logs

**Endpoint:** `GET /functions/v1/diagnostics/logs`

Returns paginated log entries with filtering support.

**Query Parameters:**
- `cursor` (optional) - Pagination cursor from previous response
- `level` (optional) - Filter by log level: info, warn, error, debug, or all (default)
- `q` (optional) - Search query to filter logs

**Response:**
```json
{
  "items": [
    {
      "id": "log-0-0",
      "timestamp": "2025-10-25T15:00:00.000Z",
      "level": "info",
      "message": "Database query completed successfully",
      "function_name": "edge-function-3",
      "duration_ms": 145
    }
  ],
  "next_cursor": "cursor-1729870800000"
}
```

**Usage:**
```bash
# Get all logs
curl https://your-project.supabase.co/functions/v1/diagnostics/logs

# Filter by level
curl https://your-project.supabase.co/functions/v1/diagnostics/logs?level=error

# Search logs
curl https://your-project.supabase.co/functions/v1/diagnostics/logs?q=database

# Paginate
curl https://your-project.supabase.co/functions/v1/diagnostics/logs?cursor=cursor-1729870800000
```

### 3. diagnostics/health

**Endpoint:** `GET /functions/v1/diagnostics/health`

Returns health check status for various system components.

**Response:**
```json
[
  {
    "name": "Database",
    "status": "healthy",
    "latency_ms": 25,
    "description": "PostgreSQL connection pool status"
  },
  {
    "name": "Edge Functions",
    "status": "healthy",
    "latency_ms": 15,
    "description": "Deno runtime and function execution"
  }
]
```

**Usage:**
```bash
curl https://your-project.supabase.co/functions/v1/diagnostics/health
```

### 4. diagnostics/auto-fix

**Endpoint:** `POST /functions/v1/diagnostics/auto-fix`

Initiates an automated fix job for a specific issue.

**Request Body:**
```json
{
  "issueId": "issue-123"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Auto-fix job initiated for issue issue-123",
  "jobId": "job-1729870800000-abc123",
  "estimatedDuration": "2-5 minutes"
}
```

**Usage:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/diagnostics/auto-fix \
  -H "Content-Type: application/json" \
  -d '{"issueId": "issue-123"}'
```

## Administrative Functions

### reload-gestao-scouter-schema-cache

**Endpoint:** `POST /functions/v1/reload-gestao-scouter-schema-cache`

Triggers a schema cache reload for the Gestão Scouter integration. This function requires authentication via a shared secret.

**Authentication:**

Option 1 - Header:
```
x-shared-secret: your-secret-here
```

Option 2 - Request Body:
```json
{
  "secret": "your-secret-here"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "message": "Cache recarregado com sucesso"
}
```

**Response (Unauthorized):**
```json
{
  "error": "Unauthorized: Invalid or missing secret"
}
```

**Usage:**
```bash
# Using header
curl -X POST https://your-project.supabase.co/functions/v1/reload-gestao-scouter-schema-cache \
  -H "x-shared-secret: your-secret-here"

# Using body
curl -X POST https://your-project.supabase.co/functions/v1/reload-gestao-scouter-schema-cache \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secret-here"}'
```

## Environment Variables

The following environment variables must be configured for the functions to work properly:

### Required for all functions:
- `SUPABASE_URL` - Your Supabase project URL (automatically provided)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (automatically provided for deployed functions)

### Required for reload-gestao-scouter-schema-cache:
- `RELOAD_SCHEMA_SECRET` - Shared secret for authentication (must be set manually)

### Setting Environment Variables

**Via Supabase CLI:**
```bash
supabase secrets set RELOAD_SCHEMA_SECRET=your-secret-here
```

**Via Supabase Dashboard:**
1. Go to Project Settings > Edge Functions
2. Add the secret in the Environment Variables section

## Deployment

### Prerequisites
- Install [Supabase CLI](https://supabase.com/docs/guides/cli)
- Login to your project: `supabase login`
- Link to your project: `supabase link --project-ref your-project-ref`

### Deploy All Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy diagnostics/metrics
supabase functions deploy diagnostics/logs
supabase functions deploy diagnostics/health
supabase functions deploy diagnostics/auto-fix
supabase functions deploy reload-gestao-scouter-schema-cache
```

### Deploy with Environment Variables
```bash
# Set the secret before deploying
supabase secrets set RELOAD_SCHEMA_SECRET=your-secret-here

# Deploy the function
supabase functions deploy reload-gestao-scouter-schema-cache
```

## Local Testing

### Using Supabase CLI

**Start local development server:**
```bash
supabase start
supabase functions serve
```

**Test individual functions:**
```bash
# Test metrics endpoint
curl http://localhost:54321/functions/v1/diagnostics/metrics

# Test logs endpoint
curl http://localhost:54321/functions/v1/diagnostics/logs?level=error

# Test health endpoint
curl http://localhost:54321/functions/v1/diagnostics/health

# Test auto-fix endpoint
curl -X POST http://localhost:54321/functions/v1/diagnostics/auto-fix \
  -H "Content-Type: application/json" \
  -d '{"issueId": "test-issue"}'

# Test reload-schema-cache (with local secret)
curl -X POST http://localhost:54321/functions/v1/reload-gestao-scouter-schema-cache \
  -H "x-shared-secret: test-secret"
```

**Set local environment variables:**

Create a `.env` file in the function directory or use:
```bash
supabase functions serve --env-file .env.local
```

Example `.env.local`:
```
RELOAD_SCHEMA_SECRET=test-secret-for-local-dev
```

### Using Deno Directly

```bash
# Navigate to function directory
cd supabase/functions/diagnostics/metrics

# Run with Deno
deno run --allow-net --allow-env index.ts
```

## Testing with Frontend

All diagnostics functions return mocked data, making them ideal for frontend development without requiring actual backend infrastructure or data.

**Example integration with fetch:**
```typescript
// Fetch metrics
const metricsResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/diagnostics/metrics`
);
const { snapshot } = await metricsResponse.json();

// Fetch logs with filtering
const logsResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/diagnostics/logs?level=error`
);
const { items, next_cursor } = await logsResponse.json();

// Trigger reload with secret
const reloadResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/reload-gestao-scouter-schema-cache`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ secret: 'your-secret' }),
  }
);
const { ok, message } = await reloadResponse.json();
```

## Security Considerations

1. **CORS Headers**: All functions include permissive CORS headers (`*`) for development. In production, consider restricting to specific origins.

2. **Shared Secret**: The `reload-gestao-scouter-schema-cache` function uses a shared secret instead of service role keys to prevent exposing sensitive credentials to clients. Keep the `RELOAD_SCHEMA_SECRET` secure and rotate it periodically.

3. **Rate Limiting**: Consider implementing rate limiting for production deployments to prevent abuse.

4. **Input Validation**: All functions validate HTTP methods and required parameters, returning appropriate error codes.

## Function Structure

All functions follow the Supabase Edge Function pattern:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Function logic...
});
```

## Monitoring and Debugging

**View function logs:**
```bash
# View logs for a specific function
supabase functions logs diagnostics/metrics

# Follow logs in real-time
supabase functions logs diagnostics/metrics --follow
```

**Check function status:**
```bash
# List all deployed functions
supabase functions list
```

## Troubleshooting

**Function not responding:**
- Check that the function is deployed: `supabase functions list`
- Verify environment variables are set: `supabase secrets list`
- Check function logs: `supabase functions logs <function-name>`

**401 Unauthorized on reload-schema-cache:**
- Verify `RELOAD_SCHEMA_SECRET` is set correctly
- Ensure the secret in your request matches the environment variable
- Check function logs for authentication attempts

**CORS errors:**
- Ensure the function includes proper CORS headers
- Check that OPTIONS requests are handled correctly
- Verify the origin in the CORS headers matches your frontend domain

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Manual](https://deno.land/manual)
- [Edge Functions Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)
