/**
 * Types for performance monitoring and telemetry
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface WebVitalsMetric extends PerformanceMetric {
  id: string;
  navigationType?: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

export interface QueryPerformanceMetric extends PerformanceMetric {
  queryKey: string;
  status: 'success' | 'error' | 'loading';
  dataSize?: number;
  cached?: boolean;
}

export interface ChartPerformanceMetric extends PerformanceMetric {
  chartType: 'apex' | 'leaflet' | 'recharts';
  dataPoints: number;
  renderPhase: 'mount' | 'update' | 'render';
}

export interface EdgeFunctionMetric extends PerformanceMetric {
  functionName: string;
  status: 'success' | 'error';
  executionTime: number;
  memoryUsed?: number;
  errorMessage?: string;
}

export interface DatabaseMetric extends PerformanceMetric {
  query: string;
  duration: number;
  rowsAffected?: number;
  cached?: boolean;
}

export interface ResourceMetric {
  timestamp: number;
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
  navigation?: {
    type: string;
    redirectCount: number;
  };
  connection?: {
    effectiveType: string;
    downlink?: number;
    rtt?: number;
  };
}

export interface MonitoringAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metric: PerformanceMetric;
  threshold?: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of events to capture
  logToConsole: boolean;
  sendToBackend: boolean;
  thresholds: {
    queryDuration: number; // ms
    chartRenderTime: number; // ms
    mapRenderTime: number; // ms
    edgeFunctionDuration: number; // ms
    webVitals: {
      lcp: number; // ms - Largest Contentful Paint
      fid: number; // ms - First Input Delay
      cls: number; // score - Cumulative Layout Shift
      ttfb: number; // ms - Time to First Byte
      fcp: number; // ms - First Contentful Paint
    };
  };
}

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  sampleRate: 1.0,
  logToConsole: import.meta.env.DEV,
  sendToBackend: false,
  thresholds: {
    queryDuration: 2000, // 2 seconds
    chartRenderTime: 1000, // 1 second
    mapRenderTime: 2000, // 2 seconds
    edgeFunctionDuration: 5000, // 5 seconds
    webVitals: {
      lcp: 2500, // Good: < 2.5s
      fid: 100, // Good: < 100ms
      cls: 0.1, // Good: < 0.1
      ttfb: 800, // Good: < 800ms
      fcp: 1800, // Good: < 1.8s
    },
  },
};
