# Diagnostics & Monitoring System - README

## Overview

This document describes the Admin Diagnostics & Monitoring system, including the unified diagnostics page, permissions tabs, and the Edge Functions that power the real-time monitoring capabilities.

## Components

### 1. PermissionsTabs (`src/components/admin/PermissionsTabs.tsx`)

A tabbed interface for managing permissions with two views:
- **Por Recurso**: Permissions organized by system resources
- **Por Página**: Permissions organized by application pages/routes

**Features:**
- On mount, validates schema cache by calling `POST /functions/validate-gestao-scouter-schema`
- If cache is invalid, displays a warning banner with reload button
- Reload button calls `useReloadSchemaCache` hook to trigger cache reload

### 2. Unified Diagnostics Page (`src/pages/admin/Diagnostics.tsx`)

A comprehensive admin dashboard that integrates:
- **LiveMetrics**: Real-time system metrics (CPU, Memory, Connections, Requests, Error Rate)
- **PerformanceChart**: Visual representation of current metrics
- **MonitoringPanel**: Health status of core services (Database, Cache, API)
- **AutoRepairPanel**: Automatic detection and fixing of system issues
- **LogsPanel**: System logs with filtering and live updates

### 3. Component Details

#### LiveMetrics
- Polls metrics every 5 seconds
- Displays 5 metric cards with icons and current values
- Uses `useLiveMetrics` hook

#### PerformanceChart
- Simple SVG bar chart showing CPU, Memory, and Error Rate
- Updates in real-time with metrics
- Responsive design

#### LogsPanel
- Displays last 100 log entries
- Filter by level (info, warning, error)
- Scrollable area with formatted timestamps
- Uses `useLogs` hook

#### AutoRepairPanel
- Lists detected issues that can be auto-fixed
- Trigger button for each fixable issue
- Severity badges (low, medium, high)
- Removes fixed issues from list

#### MonitoringPanel
- Shows health status of core services
- Polls every 30 seconds
- Overall system status badge
- Manual refresh button

## Hooks

### useReloadSchemaCache
**Location:** `src/hooks/useReloadSchemaCache.ts`

Manages schema cache reload functionality.

```typescript
const { reload, loading } = useReloadSchemaCache();
const success = await reload();
```

### useLiveMetrics
**Location:** `src/hooks/useLiveMetrics.ts`

Fetches and polls live metrics from the backend.

```typescript
const { metrics, loading, error, refresh } = useLiveMetrics(5000); // 5 second interval
```

### useLogs
**Location:** `src/hooks/useLogs.ts`

Fetches system logs with optional filtering.

```typescript
const { logs, loading, error, refresh } = useLogs(levelFilter, 100); // level filter, limit
```

## API Utilities

### diagnosticsApi.ts
**Location:** `src/utils/diagnosticsApi.ts`

Provides typed wrappers for Edge Function endpoints:

- `fetchLiveMetrics()`: Get current system metrics
- `fetchLogs(level?, limit?)`: Get filtered logs
- `fetchHealthStatus()`: Get service health status
- `triggerAutoFix(issueId)`: Trigger automatic fix for issue

## Edge Functions (Backend)

The following Edge Functions must be deployed to Supabase for full functionality:

### 1. POST /functions/validate-gestao-scouter-schema
Validates that the schema cache is present and valid.

**Response:**
```json
{
  "valid": true|false,
  "message": "optional message"
}
```

### 2. POST /functions/reload-gestao-scouter-schema-cache
Reloads the gestao-scouter schema cache.

**Response:**
```json
{
  "success": true|false,
  "error": "optional error message"
}
```

### 3. GET /functions/diagnostics/metrics
Returns current system metrics.

**Response:**
```json
{
  "cpu": 45.2,
  "memory": 67.8,
  "activeConnections": 12,
  "requestsPerMinute": 234,
  "errorRate": 0.5,
  "timestamp": "2025-10-25T15:00:00Z"
}
```

### 4. GET /functions/diagnostics/logs?level=error&limit=100
Returns system logs with optional filtering.

**Query Parameters:**
- `level`: Optional filter (info, warning, error)
- `limit`: Maximum number of logs (default: 100)

**Response:**
```json
[
  {
    "id": "log-123",
    "timestamp": "2025-10-25T15:00:00Z",
    "level": "error",
    "message": "Connection timeout",
    "source": "api-gateway"
  }
]
```

### 5. GET /functions/diagnostics/health
Returns health status of system services.

**Response:**
```json
{
  "status": "healthy|warning|critical",
  "services": {
    "database": true,
    "cache": true,
    "api": true
  },
  "lastCheck": "2025-10-25T15:00:00Z"
}
```

### 6. POST /functions/diagnostics/auto-fix
Triggers automatic fix for a detected issue.

**Request Body:**
```json
{
  "issueId": "issue-123"
}
```

**Response:**
```json
{
  "success": true|false,
  "error": "optional error message"
}
```

## Security Considerations

### Authentication & Authorization
- All Edge Functions must validate authentication using Supabase Auth
- Ensure only admin users can access diagnostics endpoints
- Use Row Level Security (RLS) for database operations

### Rate Limiting
- Implement rate limiting on Edge Functions to prevent abuse
- Consider caching metrics for 5-10 seconds to reduce load

### Sensitive Data
- Never expose credentials, API keys, or internal IPs in responses
- Sanitize log messages before returning to client
- Filter sensitive information from error messages

### Example Security Check (Edge Function):
```typescript
const { data: { user } } = await supabaseClient.auth.getUser();
if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
    status: 401 
  });
}

// Check if user is admin
const { data: profile } = await supabaseClient
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { 
    status: 403 
  });
}
```

## Testing Locally

### 1. Start Development Server
```bash
npm run dev
```

### 2. Navigate to Diagnostics Page
```
http://localhost:5173/admin/diagnostics
```

### 3. Check Network Calls
Open browser DevTools (F12) → Network tab:
- Look for calls to `/functions/diagnostics/*`
- Verify metrics polling every 5 seconds
- Check health status polling every 30 seconds

### 4. Test Features
- **Metrics**: Verify live updates of CPU, Memory, etc.
- **Chart**: Check that bars update with current values
- **Logs**: Test filtering by level (info, warning, error)
- **Auto-Repair**: Trigger a fix and verify success toast
- **Monitoring**: Check service status indicators

### 5. Test Schema Cache (PermissionsTabs)
```
http://localhost:5173/admin/permissions
```
- Verify schema validation on mount
- If invalid, test the reload button
- Check that toast notifications appear

## Deploying Edge Functions

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Project linked: `supabase link --project-ref <your-project-ref>`

### Deploy Commands
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy diagnostics-metrics
supabase functions deploy diagnostics-logs
supabase functions deploy diagnostics-health
supabase functions deploy diagnostics-auto-fix
supabase functions deploy validate-gestao-scouter-schema
supabase functions deploy reload-gestao-scouter-schema-cache
```

### Environment Variables
Set required environment variables for Edge Functions:
```bash
supabase secrets set DATABASE_URL=<your-database-url>
supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>
```

## Integration Checklist

- [ ] Deploy all required Edge Functions to Supabase
- [ ] Set environment variables for Edge Functions
- [ ] Test authentication and authorization
- [ ] Verify metrics are being collected
- [ ] Test log aggregation
- [ ] Configure health check thresholds
- [ ] Set up auto-fix rules
- [ ] Test in production environment
- [ ] Monitor error rates and performance
- [ ] Set up alerts for critical issues

## Troubleshooting

### Metrics Not Loading
- Check that Edge Function is deployed: `supabase functions list`
- Verify authentication token is valid
- Check browser console for error messages
- Ensure CORS is configured correctly

### Schema Cache Issues
- Manually trigger cache reload
- Check Edge Function logs: `supabase functions logs reload-gestao-scouter-schema-cache`
- Verify database permissions

### Logs Not Appearing
- Check log collection is configured
- Verify Edge Function has access to logs
- Check filter settings (may be too restrictive)

### Auto-Fix Not Working
- Verify issue type is supported
- Check Edge Function has necessary permissions
- Review function logs for error details

## Future Enhancements

1. **Historical Data**: Store and visualize metrics over time
2. **Alerts**: Email/SMS notifications for critical issues
3. **Custom Dashboards**: User-configurable layouts
4. **Advanced Analytics**: Trends, predictions, anomaly detection
5. **Integration**: Connect with external monitoring tools (DataDog, New Relic)
6. **Export**: Download logs and metrics as CSV/JSON
7. **Real-time Streaming**: WebSocket-based live updates

## Support

For questions or issues:
1. Check this documentation
2. Review Edge Function logs
3. Check browser console for client-side errors
4. Review network requests in DevTools
5. Contact development team

---

**Last Updated**: 2025-10-25  
**Version**: 1.0.0
