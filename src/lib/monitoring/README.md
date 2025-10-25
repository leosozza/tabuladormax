# Performance Monitoring Module

Comprehensive performance monitoring and telemetry system for TabuladorMax.

## Overview

This module provides real-time performance tracking for:
- Web Vitals (LCP, FID, CLS, TTFB, FCP)
- React Query operations
- Chart rendering (ApexCharts, Leaflet)
- Edge Function execution
- Browser resource usage

## Quick Start

### Basic Usage

```typescript
import { performanceMonitor } from '@/lib/monitoring';

// Monitor automatically collects Web Vitals
// Access metrics at /monitoring dashboard
```

### Monitor Custom Operations

```typescript
import { performanceMonitor } from '@/lib/monitoring';

// Record a custom metric
performanceMonitor.recordMetric({
  name: 'custom.operation',
  value: duration,
  unit: 'ms',
  timestamp: Date.now(),
});
```

### Monitor Queries

```typescript
import { useMonitoredQuery } from '@/lib/monitoring';

// Use monitored query hook (same API as useQuery)
const { data } = useMonitoredQuery({
  queryKey: ['my-data'],
  queryFn: fetchData,
});
```

### Monitor Charts

```typescript
import { useChartPerformance } from '@/lib/monitoring';

function MyChart({ data }) {
  useChartPerformance('apex', data.length, [data]);
  return <Chart data={data} />;
}
```

## Module Structure

```
monitoring/
├── types.ts                    # TypeScript types
├── performanceMonitor.ts       # Core monitoring service
├── queryMonitoring.tsx         # React Query integration
├── chartMonitoring.ts          # Chart performance tracking
├── edgeFunctionMonitoring.ts   # Edge Function telemetry
├── index.ts                    # Module exports
└── __tests__/
    └── performanceMonitor.test.ts
```

## Features

### Automatic Tracking

The monitor automatically tracks:
- Page load performance (Web Vitals)
- Resource usage every 30 seconds
- Query execution times (when using enhanced hooks)
- Chart rendering (when using useChartPerformance)

### Configurable Thresholds

```typescript
import { performanceMonitor } from '@/lib/monitoring';

performanceMonitor.updateConfig({
  thresholds: {
    queryDuration: 3000,      // Alert if query takes >3s
    chartRenderTime: 1500,    // Alert if chart renders >1.5s
    // ... other thresholds
  }
});
```

### Alert System

Alerts are automatically generated when:
- Queries exceed duration threshold
- Charts take too long to render
- Web Vitals are rated "poor"

### Dashboard

Access the monitoring dashboard at `/monitoring` to view:
- Real-time metrics
- Performance alerts
- Summary statistics
- Historical data

## API Reference

### PerformanceMonitor

Main monitoring service (singleton).

#### Methods

- `recordMetric(metric: PerformanceMetric)` - Record a custom metric
- `recordQueryPerformance(metric)` - Record query performance
- `recordChartPerformance(metric)` - Record chart rendering
- `getMetrics(filter?)` - Get all metrics (optionally filtered)
- `getAlerts(filter?)` - Get all alerts (optionally filtered)
- `getSummary(metricName?)` - Get statistical summary
- `captureResourceMetrics()` - Capture current resource usage
- `updateConfig(config)` - Update configuration
- `clear()` - Clear all stored data

### Hooks

#### useChartPerformance

```typescript
useChartPerformance(
  chartType: 'apex' | 'leaflet' | 'recharts',
  dataPoints: number,
  dependencies: unknown[]
)
```

Tracks chart rendering performance across mount, update, and render phases.

#### useMonitoredQuery

```typescript
useMonitoredQuery<TData, TError>(
  options: UseQueryOptions<TData, TError>
)
```

Drop-in replacement for `useQuery` with automatic performance tracking.

### Edge Function Logger

For use in Supabase Edge Functions:

```typescript
import { EdgeFunctionLogger } from './monitoring';

const logger = new EdgeFunctionLogger('function-name');
logger.start();

// ... your code ...

logger.metric('operation-name', duration);
logger.complete(200);
```

## Configuration

Default configuration in `types.ts`:

```typescript
{
  enabled: true,
  sampleRate: 1.0,              // 100% sampling
  logToConsole: import.meta.env.DEV,
  sendToBackend: false,
  thresholds: {
    queryDuration: 2000,        // 2s
    chartRenderTime: 1000,      // 1s
    mapRenderTime: 2000,        // 2s
    edgeFunctionDuration: 5000, // 5s
    webVitals: {
      lcp: 2500,  // Good: < 2.5s
      fid: 100,   // Good: < 100ms
      cls: 0.1,   // Good: < 0.1
      ttfb: 800,  // Good: < 800ms
      fcp: 1800,  // Good: < 1.8s
    }
  }
}
```

## Best Practices

1. **Monitor What Matters**: Focus on user-facing operations
2. **Set Realistic Thresholds**: Based on your specific needs
3. **Regular Review**: Check dashboard weekly
4. **Act on Alerts**: Investigate and optimize slow operations
5. **Test Performance**: Include performance tests in CI/CD

## Performance Impact

The monitoring system is designed to be lightweight:
- Minimal overhead (<1ms per metric)
- Configurable sampling rate
- Automatic cleanup of old metrics
- No impact when disabled

## Troubleshooting

### Metrics Not Appearing

1. Check if monitoring is enabled
2. Verify sample rate (should be >0)
3. Check browser console for errors
4. Try clearing and re-recording

### High Memory Usage

1. Review metrics storage limit (default: 1000)
2. Clear old metrics periodically
3. Adjust sample rate for high-traffic operations

### Dashboard Not Loading

1. Verify route is registered in App.tsx
2. Check user permissions (requires Manager role)
3. Review browser console for errors

## Testing

Run tests with:

```bash
npm test src/lib/monitoring
```

## Related Documentation

- [Performance Monitoring Guide](../../../docs/guides/performance-monitoring.md)
- [Dashboard Component](../../components/monitoring/PerformanceMonitoringDashboard.tsx)
- [Example Edge Function](../../../supabase/functions/_example-monitored-function/)

## Future Enhancements

- [ ] Backend metric storage
- [ ] Sentry integration
- [ ] LogRocket integration
- [ ] Performance regression detection
- [ ] Automated optimization suggestions
- [ ] Export/import metric data
- [ ] Custom metric aggregations
- [ ] Performance budgets

## License

Part of TabuladorMax - See main project license
