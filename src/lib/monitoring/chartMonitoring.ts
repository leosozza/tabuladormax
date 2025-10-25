/**
 * Chart performance monitoring utilities
 * Tracks ApexCharts, Leaflet, and other chart rendering times
 */

import { useEffect, useRef } from 'react';
import { performanceMonitor } from './performanceMonitor';
import type { ChartPerformanceMetric } from './types';

/**
 * Hook to monitor chart rendering performance
 */
export function useChartPerformance(
  chartType: ChartPerformanceMetric['chartType'],
  dataPoints: number,
  dependencies: unknown[] = []
) {
  const mountTimeRef = useRef<number>(0);
  const updateTimeRef = useRef<number>(0);
  const hasMonitored = useRef(false);

  // Track mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      if (!hasMonitored.current && mountTimeRef.current > 0) {
        const duration = performance.now() - mountTimeRef.current;
        performanceMonitor.recordChartPerformance({
          chartType,
          dataPoints,
          renderPhase: 'mount',
          value: duration,
          metadata: {
            unmounted: true,
          },
        });
        hasMonitored.current = true;
      }
    };
  }, [chartType, dataPoints]);

  // Track render complete
  useEffect(() => {
    const renderCompleteTime = performance.now();
    
    if (mountTimeRef.current > 0) {
      const duration = renderCompleteTime - mountTimeRef.current;
      performanceMonitor.recordChartPerformance({
        chartType,
        dataPoints,
        renderPhase: 'render',
        value: duration,
      });
      hasMonitored.current = true;
    }
  }, [chartType, dataPoints]);

  // Track updates
  useEffect(() => {
    if (updateTimeRef.current > 0) {
      const duration = performance.now() - updateTimeRef.current;
      performanceMonitor.recordChartPerformance({
        chartType,
        dataPoints,
        renderPhase: 'update',
        value: duration,
      });
    }
    updateTimeRef.current = performance.now();
  }, [...dependencies]);

  return {
    markRenderComplete: () => {
      if (mountTimeRef.current > 0 && !hasMonitored.current) {
        const duration = performance.now() - mountTimeRef.current;
        performanceMonitor.recordChartPerformance({
          chartType,
          dataPoints,
          renderPhase: 'render',
          value: duration,
        });
        hasMonitored.current = true;
      }
    },
  };
}

/**
 * Manual chart performance tracking
 */
export function trackChartPerformance(
  chartType: ChartPerformanceMetric['chartType'],
  phase: ChartPerformanceMetric['renderPhase'],
  startTime: number,
  dataPoints: number
) {
  const duration = performance.now() - startTime;
  performanceMonitor.recordChartPerformance({
    chartType,
    dataPoints,
    renderPhase: phase,
    value: duration,
  });
}

/**
 * Create a performance marker for chart rendering
 */
export function createChartPerfMarker(name: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure time between two performance markers
 */
export function measureChartPerf(startMark: string, endMark: string, measureName: string): number {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      createChartPerfMarker(endMark);
      performance.measure(measureName, startMark, endMark);
      
      const measures = performance.getEntriesByName(measureName);
      if (measures.length > 0) {
        return measures[measures.length - 1].duration;
      }
    } catch (error) {
      console.warn('[ChartMonitoring] Performance measurement failed:', error);
    }
  }
  return 0;
}
