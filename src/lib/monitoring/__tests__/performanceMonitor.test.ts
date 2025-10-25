/**
 * Tests for the performance monitoring system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performanceMonitor } from '../performanceMonitor';

describe('Performance Monitor', () => {
  beforeEach(() => {
    // Clear metrics before each test
    performanceMonitor.clear();
  });

  describe('Metric Recording', () => {
    it('should record a performance metric', () => {
      performanceMonitor.recordMetric({
        name: 'test.metric',
        value: 100,
        unit: 'ms',
        timestamp: Date.now(),
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test.metric');
      expect(metrics[0].value).toBe(100);
    });

    it('should record query performance metrics', () => {
      performanceMonitor.recordQueryPerformance({
        queryKey: 'leads',
        value: 150,
        status: 'success',
        dataSize: 1024,
      });

      const metrics = performanceMonitor.getMetrics({ name: 'query' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('query.leads');
    });

    it('should record chart performance metrics', () => {
      performanceMonitor.recordChartPerformance({
        chartType: 'apex',
        dataPoints: 100,
        renderPhase: 'mount',
        value: 250,
      });

      const metrics = performanceMonitor.getMetrics({ name: 'chart' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('chart.apex.mount');
    });
  });

  describe('Alert Generation', () => {
    it('should create alert for slow query', () => {
      performanceMonitor.recordQueryPerformance({
        queryKey: 'slow-query',
        value: 3000, // 3 seconds - exceeds threshold
        status: 'success',
      });

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].level).toBe('warning');
    });

    it('should create alert for slow chart render', () => {
      performanceMonitor.recordChartPerformance({
        chartType: 'apex',
        dataPoints: 1000,
        renderPhase: 'render',
        value: 1500, // 1.5 seconds - exceeds threshold
      });

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Metric Summary', () => {
    it('should calculate summary statistics', () => {
      // Record multiple metrics
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordMetric({
          name: 'test.metric',
          value: i * 100,
          unit: 'ms',
          timestamp: Date.now(),
        });
      }

      const summary = performanceMonitor.getSummary('test.metric');
      expect(summary).toBeDefined();
      expect(summary?.count).toBe(10);
      expect(summary?.min).toBe(0);
      expect(summary?.max).toBe(900);
    });

    it('should return null for non-existent metrics', () => {
      const summary = performanceMonitor.getSummary('non.existent');
      expect(summary).toBeNull();
    });
  });

  describe('Metric Filtering', () => {
    it('should filter metrics by name', () => {
      performanceMonitor.recordMetric({
        name: 'query.leads',
        value: 100,
        unit: 'ms',
        timestamp: Date.now(),
      });

      performanceMonitor.recordMetric({
        name: 'chart.apex',
        value: 200,
        unit: 'ms',
        timestamp: Date.now(),
      });

      const queryMetrics = performanceMonitor.getMetrics({ name: 'query' });
      expect(queryMetrics).toHaveLength(1);
      expect(queryMetrics[0].name).toBe('query.leads');
    });

    it('should filter metrics by timestamp', () => {
      const now = Date.now();
      const past = now - 10000;

      performanceMonitor.recordMetric({
        name: 'old.metric',
        value: 100,
        unit: 'ms',
        timestamp: past,
      });

      performanceMonitor.recordMetric({
        name: 'new.metric',
        value: 200,
        unit: 'ms',
        timestamp: now,
      });

      const recentMetrics = performanceMonitor.getMetrics({ since: now - 5000 });
      expect(recentMetrics).toHaveLength(1);
      expect(recentMetrics[0].name).toBe('new.metric');
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        logToConsole: false,
      };

      performanceMonitor.updateConfig(newConfig);
      const config = performanceMonitor.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.logToConsole).toBe(false);
    });

    it('should respect enabled flag', () => {
      performanceMonitor.updateConfig({ enabled: false });

      performanceMonitor.recordMetric({
        name: 'test.metric',
        value: 100,
        unit: 'ms',
        timestamp: Date.now(),
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(0);
    });

    it('should respect sample rate', () => {
      performanceMonitor.updateConfig({ sampleRate: 0 }); // 0% sampling

      performanceMonitor.recordMetric({
        name: 'test.metric',
        value: 100,
        unit: 'ms',
        timestamp: Date.now(),
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('Resource Metrics', () => {
    it('should capture resource metrics', () => {
      const metrics = performanceMonitor.captureResourceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
    });
  });

  describe('Storage Limits', () => {
    it('should maintain max stored metrics limit', () => {
      // Record more than max limit (1000)
      for (let i = 0; i < 1100; i++) {
        performanceMonitor.recordMetric({
          name: 'test.metric',
          value: i,
          unit: 'ms',
          timestamp: Date.now(),
        });
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });

    it('should maintain max alerts limit', () => {
      // Create more than max limit (100)
      for (let i = 0; i < 120; i++) {
        performanceMonitor.recordQueryPerformance({
          queryKey: `slow-query-${i}`,
          value: 3000, // Slow enough to trigger alert
          status: 'success',
        });
      }

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Clear Function', () => {
    it('should clear all metrics and alerts', () => {
      performanceMonitor.recordMetric({
        name: 'test.metric',
        value: 100,
        unit: 'ms',
        timestamp: Date.now(),
      });

      performanceMonitor.recordQueryPerformance({
        queryKey: 'slow-query',
        value: 3000,
        status: 'success',
      });

      performanceMonitor.clear();

      expect(performanceMonitor.getMetrics()).toHaveLength(0);
      expect(performanceMonitor.getAlerts()).toHaveLength(0);
    });
  });
});
