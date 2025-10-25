# Performance Monitoring Guide

## Overview

TabuladorMax now includes comprehensive performance monitoring and telemetry to track, analyze, and optimize system performance. This guide explains how to use the monitoring features.

## Features

### 1. Web Vitals Tracking
Automatically tracks Core Web Vitals metrics:
- **LCP (Largest Contentful Paint)**: Loading performance
- **FID (First Input Delay)**: Interactivity
- **CLS (Cumulative Layout Shift)**: Visual stability
- **TTFB (Time to First Byte)**: Server response time
- **FCP (First Contentful Paint)**: Initial render

### 2. Query Performance Monitoring
Tracks React Query performance:
- Query execution time
- Data size
- Cache hits/misses
- Error tracking
- Automatic alerting for slow queries (>2s)

### 3. Chart Rendering Performance
Monitors ApexCharts and Leaflet rendering:
- Mount, update, and render phases
- Data point counts
- Render time tracking
- Automatic alerting for slow renders

### 4. Edge Function Telemetry
Tracks Supabase Edge Functions:
- Execution time
- Success/error rates
- Memory usage
- Function-specific metrics

## Accessing the Dashboard

The performance monitoring dashboard is available at:
```
/monitoring
```

**Access requirements**: Manager role or higher

## Dashboard Sections

### Summary Cards
Quick overview of:
- Average Web Vitals
- Query performance
- Chart rendering times

### Web Vitals Tab
Detailed Core Web Vitals metrics with ratings:
- Good (green)
- Needs improvement (yellow)
- Poor (red)

### Queries Tab
React Query performance with:
- Query keys
- Execution times
- Status (success/error)
- Timestamp

### Charts Tab
Chart rendering metrics with:
- Chart type (ApexCharts/Leaflet)
- Render phase
- Duration
- Data points

### Alerts Tab
Performance alerts requiring attention:
- Alert level (info/warning/error/critical)
- Metric details
- Threshold violations
- Timestamp

## Configuration

Default thresholds can be adjusted in `/src/lib/monitoring/types.ts`:

```typescript
thresholds: {
  queryDuration: 2000,        // 2 seconds
  chartRenderTime: 1000,      // 1 second
  mapRenderTime: 2000,        // 2 seconds
  edgeFunctionDuration: 5000, // 5 seconds
  webVitals: {
    lcp: 2500,  // Good: < 2.5s
    fid: 100,   // Good: < 100ms
    cls: 0.1,   // Good: < 0.1
    ttfb: 800,  // Good: < 800ms
    fcp: 1800,  // Good: < 1.8s
  },
}
```

## Using Monitoring in Code

### Monitoring Queries

The `useLeads` hook and other query hooks now automatically track performance. For custom monitoring:

```typescript
import { performanceMonitor } from '@/lib/monitoring';

// Record a query metric
performanceMonitor.recordQueryPerformance({
  queryKey: 'my-query',
  value: duration,
  status: 'success',
  dataSize: dataLength,
});
```

### Monitoring Charts

Chart components automatically track performance. For custom charts:

```typescript
import { useChartPerformance } from '@/lib/monitoring';

function MyChart({ data }) {
  const dataPoints = data.length;
  useChartPerformance('apex', dataPoints, [data]);
  // ... render chart
}
```

### Monitoring Edge Functions

In Edge Functions (Deno), use the logger:

```typescript
import { createMonitoredHandler } from '@/lib/monitoring/edgeFunctionMonitoring.ts';

export default createMonitoredHandler('my-function', async (req, logger) => {
  logger.start();
  
  // Your function logic
  const result = await someOperation();
  
  logger.metric('operation-time', operationDuration);
  logger.complete(200);
  
  return new Response(JSON.stringify(result));
});
```

## Interpreting Metrics

### Web Vitals Ratings
- **Good**: Metric is within recommended thresholds
- **Needs Improvement**: Metric is acceptable but could be better
- **Poor**: Metric needs attention and optimization

### Query Performance
- **< 1s**: Excellent
- **1-2s**: Good
- **2-5s**: Needs attention (alert triggered)
- **> 5s**: Poor, requires optimization

### Chart Rendering
- **< 500ms**: Excellent
- **500ms-1s**: Good
- **1-2s**: Needs attention (alert triggered)
- **> 2s**: Poor, requires optimization

## Common Bottlenecks

### Slow Queries
**Causes**:
- Large datasets without pagination
- Missing database indexes
- Complex joins or filters
- Network latency

**Solutions**:
- Implement pagination
- Add database indexes
- Optimize query structure
- Use query result caching

### Slow Chart Rendering
**Causes**:
- Too many data points
- Complex chart types
- Frequent re-renders
- Large DOM manipulations

**Solutions**:
- Reduce data point count
- Use data sampling/aggregation
- Memoize chart data
- Debounce updates

### Poor Web Vitals
**Causes**:
- Large JavaScript bundles
- Unoptimized images
- Render-blocking resources
- Layout shifts

**Solutions**:
- Code splitting
- Image optimization
- Lazy loading
- Fixed dimensions for elements

## Best Practices

1. **Regular Monitoring**: Check the dashboard weekly
2. **Alert Response**: Address critical alerts within 24h
3. **Baseline Tracking**: Establish performance baselines
4. **Progressive Enhancement**: Optimize incrementally
5. **User-Centric**: Focus on metrics affecting user experience

## External Monitoring (Optional)

### Sentry Integration
For error tracking and performance monitoring:

```bash
npm install @sentry/react
```

Configure in `src/main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
```

### LogRocket Integration
For session replay and performance insights:

```bash
npm install logrocket
```

Configure in `src/main.tsx`:
```typescript
import LogRocket from 'logrocket';

LogRocket.init('your-app-id');
```

## Supabase Monitoring

### PostgreSQL Query Logs
Access via Supabase Dashboard:
1. Go to **Database** → **Query Performance**
2. View slow queries
3. Analyze execution plans
4. Identify missing indexes

### Edge Function Logs
Access via Supabase Dashboard:
1. Go to **Edge Functions** → **Logs**
2. View execution times
3. Monitor error rates
4. Track invocation counts

## Troubleshooting

### Metrics Not Appearing
- Ensure monitoring is enabled (default: enabled)
- Check browser console for errors
- Verify sample rate configuration
- Refresh the dashboard page

### Performance Degradation
1. Check alerts for bottlenecks
2. Review recent code changes
3. Analyze query performance
4. Monitor resource usage

### High Memory Usage
1. Check for memory leaks
2. Review stored metrics count
3. Clear old metrics periodically
4. Optimize data structures

## Support

For questions or issues:
- Check this documentation
- Review the monitoring dashboard
- Consult the development team
- Open a GitHub issue

## Changelog

### v1.0.0 (Initial Release)
- Web Vitals tracking
- Query performance monitoring
- Chart rendering metrics
- Edge Function telemetry
- Performance dashboard
- Alert system
- Documentation
