/**
 * Core performance monitoring service
 * Tracks Web Vitals, custom metrics, and resource usage
 */

import type {
  PerformanceMetric,
  WebVitalsMetric,
  QueryPerformanceMetric,
  ChartPerformanceMetric,
  ResourceMetric,
  MonitoringAlert,
  MonitoringConfig,
} from './types';
import { DEFAULT_MONITORING_CONFIG } from './types';

class PerformanceMonitor {
  private config: MonitoringConfig = DEFAULT_MONITORING_CONFIG;
  private metrics: PerformanceMetric[] = [];
  private alerts: MonitoringAlert[] = [];
  private maxStoredMetrics = 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializeResourceMonitoring();
    }
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals() {
    // Observer for Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
            renderTime?: number;
            loadTime?: number;
          };
          
          const lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
          this.recordWebVital('LCP', lcp);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // Observer for First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fidEntry = entry as PerformanceEventTiming;
            const fid = fidEntry.processingStart - fidEntry.startTime;
            this.recordWebVital('FID', fid);
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // Observer for Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const layoutShiftEntry = entry as LayoutShift;
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          });
          this.recordWebVital('CLS', clsValue);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (error) {
        console.warn('[PerformanceMonitor] Web Vitals observer setup failed:', error);
      }

      // Navigation Timing API for TTFB and FCP
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const ttfb = navigation.responseStart - navigation.requestStart;
          this.recordWebVital('TTFB', ttfb);
        }

        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          this.recordWebVital('FCP', fcp.startTime);
        }
      });
    }
  }

  /**
   * Initialize resource monitoring
   */
  private initializeResourceMonitoring() {
    setInterval(() => {
      const metric = this.captureResourceMetrics();
      if (this.config.logToConsole) {
        console.log('[PerformanceMonitor] Resources:', metric);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Record a Web Vitals metric
   */
  private recordWebVital(name: string, value: number) {
    const threshold = this.config.thresholds.webVitals[name.toLowerCase() as keyof typeof this.config.thresholds.webVitals];
    
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
    if (name === 'CLS') {
      rating = value < 0.1 ? 'good' : value < 0.25 ? 'needs-improvement' : 'poor';
    } else if (threshold) {
      rating = value < threshold ? 'good' : value < threshold * 2 ? 'needs-improvement' : 'poor';
    }

    const metric: WebVitalsMetric = {
      name: `webvital.${name}`,
      value,
      unit: name === 'CLS' ? 'count' : 'ms',
      timestamp: Date.now(),
      id: `${name}-${Date.now()}`,
      rating,
    };

    this.recordMetric(metric);

    if (rating === 'poor') {
      this.createAlert('warning', `${name} is poor: ${value.toFixed(2)}`, metric, threshold);
    }
  }

  /**
   * Record a query performance metric
   */
  recordQueryPerformance(metric: Omit<QueryPerformanceMetric, 'timestamp' | 'unit' | 'name'>) {
    const fullMetric: QueryPerformanceMetric = {
      ...metric,
      name: `query.${metric.queryKey}`,
      unit: 'ms',
      timestamp: Date.now(),
    };

    this.recordMetric(fullMetric);

    if (metric.value > this.config.thresholds.queryDuration && metric.status === 'success') {
      this.createAlert(
        'warning',
        `Slow query: ${metric.queryKey} took ${metric.value}ms`,
        fullMetric,
        this.config.thresholds.queryDuration
      );
    }
  }

  /**
   * Record a chart rendering performance metric
   */
  recordChartPerformance(metric: Omit<ChartPerformanceMetric, 'timestamp' | 'unit' | 'name'>) {
    const fullMetric: ChartPerformanceMetric = {
      ...metric,
      name: `chart.${metric.chartType}.${metric.renderPhase}`,
      unit: 'ms',
      timestamp: Date.now(),
    };

    this.recordMetric(fullMetric);

    const threshold = metric.chartType === 'leaflet' 
      ? this.config.thresholds.mapRenderTime 
      : this.config.thresholds.chartRenderTime;

    if (metric.value > threshold) {
      this.createAlert(
        'warning',
        `Slow ${metric.chartType} chart render: ${metric.value}ms`,
        fullMetric,
        threshold
      );
    }
  }

  /**
   * Record a generic performance metric
   */
  recordMetric(metric: PerformanceMetric) {
    if (!this.config.enabled) return;
    if (Math.random() > this.config.sampleRate) return;

    this.metrics.push(metric);

    // Maintain max metrics limit
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }

    if (this.config.logToConsole) {
      console.log(`[PerformanceMonitor] ${metric.name}:`, metric.value, metric.unit, metric.metadata);
    }

    // Send to backend if configured
    if (this.config.sendToBackend) {
      this.sendMetricToBackend(metric);
    }
  }

  /**
   * Capture current resource metrics
   */
  captureResourceMetrics(): ResourceMetric {
    const metric: ResourceMetric = {
      timestamp: Date.now(),
    };

    // Memory info (Chrome only)
    if ('memory' in performance && (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memInfo = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      metric.memory = {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit,
      };
    }

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metric.navigation = {
        type: navigation.type,
        redirectCount: navigation.redirectCount,
      };
    }

    // Network information (experimental)
    if ('connection' in navigator) {
      const conn = (navigator as Navigator & { connection?: { effectiveType: string; downlink?: number; rtt?: number } }).connection;
      if (conn) {
        metric.connection = {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
        };
      }
    }

    return metric;
  }

  /**
   * Create a monitoring alert
   */
  private createAlert(
    level: MonitoringAlert['level'],
    message: string,
    metric: PerformanceMetric,
    threshold?: number
  ) {
    const alert: MonitoringAlert = {
      id: `alert-${Date.now()}`,
      level,
      message,
      timestamp: Date.now(),
      metric,
      threshold,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    if (this.config.logToConsole) {
      console.warn(`[PerformanceMonitor] Alert [${level}]:`, message);
    }
  }

  /**
   * Send metric to backend (placeholder for future implementation)
   */
  private sendMetricToBackend(metric: PerformanceMetric) {
    // TODO: Implement backend sending when ready
    // Could use Supabase Edge Function or external service
    console.debug('[PerformanceMonitor] Would send to backend:', metric);
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(filter?: { name?: string; since?: number }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filter?.name) {
      filtered = filtered.filter(m => m.name.includes(filter.name));
    }

    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since!);
    }

    return filtered;
  }

  /**
   * Get all alerts
   */
  getAlerts(filter?: { level?: MonitoringAlert['level']; since?: number }): MonitoringAlert[] {
    let filtered = this.alerts;

    if (filter?.level) {
      filtered = filtered.filter(a => a.level === filter.level);
    }

    if (filter?.since) {
      filtered = filtered.filter(a => a.timestamp >= filter.since);
    }

    return filtered;
  }

  /**
   * Get metrics summary
   */
  getSummary(metricName?: string) {
    const metricsToAnalyze = metricName 
      ? this.metrics.filter(m => m.name.includes(metricName))
      : this.metrics;

    if (metricsToAnalyze.length === 0) {
      return null;
    }

    const values = metricsToAnalyze.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: metricsToAnalyze.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg,
      median,
      p95,
      p99,
    };
  }

  /**
   * Clear all stored data
   */
  clear() {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitoringConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
