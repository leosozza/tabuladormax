/**
 * Testes para o serviço de alertas
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAlert,
  listAlerts,
  acknowledgeAlert,
  getAlertStatistics,
  createAlertConfiguration,
  listAlertConfigurations,
} from '../alertService';
import type { DetectedProblem } from '@/types/diagnostic';

describe('Alert Service', () => {
  beforeEach(() => {
    // Reset alert store for each test
    // (In a real app, we'd inject the store or use a test-specific instance)
  });

  describe('createAlert', () => {
    it('should create an alert from a problem', () => {
      const problem: DetectedProblem = {
        id: 'test-problem-1',
        type: 'sync_failure',
        severity: 'error',
        title: 'Sync Failed',
        description: 'Failed to sync leads',
        detectedAt: new Date(),
        component: 'Sync Service',
        canAutoFix: true,
        fixed: false,
      };

      const alert = createAlert(problem);

      expect(alert.id).toBeDefined();
      expect(alert.severity).toBe('error');
      expect(alert.title).toBe('Sync Failed');
      expect(alert.message).toBe('Failed to sync leads');
      expect(alert.acknowledged).toBe(false);
      expect(alert.problem).toEqual(problem);
    });

    it('should create alerts with unique IDs', () => {
      const problem: DetectedProblem = {
        id: 'test-problem-1',
        type: 'sync_failure',
        severity: 'error',
        title: 'Sync Failed',
        description: 'Failed to sync leads',
        detectedAt: new Date(),
        component: 'Sync Service',
        canAutoFix: true,
        fixed: false,
      };

      const alert1 = createAlert(problem);
      const alert2 = createAlert(problem);

      expect(alert1.id).not.toBe(alert2.id);
    });
  });

  describe('listAlerts', () => {
    it('should list all alerts', () => {
      const problem: DetectedProblem = {
        id: 'test-problem-1',
        type: 'sync_failure',
        severity: 'error',
        title: 'Sync Failed',
        description: 'Failed to sync leads',
        detectedAt: new Date(),
        component: 'Sync Service',
        canAutoFix: true,
        fixed: false,
      };

      createAlert(problem);
      createAlert(problem);

      const alerts = listAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter alerts by severity', () => {
      const criticalProblem: DetectedProblem = {
        id: 'critical-1',
        type: 'database_connection',
        severity: 'critical',
        title: 'DB Connection Lost',
        description: 'Cannot connect to database',
        detectedAt: new Date(),
        component: 'Database',
        canAutoFix: false,
        fixed: false,
      };

      const warningProblem: DetectedProblem = {
        id: 'warning-1',
        type: 'slow_response',
        severity: 'warning',
        title: 'Slow Response',
        description: 'Response time is high',
        detectedAt: new Date(),
        component: 'API',
        canAutoFix: false,
        fixed: false,
      };

      createAlert(criticalProblem);
      createAlert(warningProblem);

      const criticalAlerts = listAlerts({ severity: 'critical' });
      expect(criticalAlerts.some(a => a.severity === 'critical')).toBe(true);
      expect(criticalAlerts.every(a => a.severity === 'critical')).toBe(true);
    });

    it('should filter alerts by acknowledged status', () => {
      const problem: DetectedProblem = {
        id: 'test-problem-1',
        type: 'sync_failure',
        severity: 'error',
        title: 'Sync Failed',
        description: 'Failed to sync leads',
        detectedAt: new Date(),
        component: 'Sync Service',
        canAutoFix: true,
        fixed: false,
      };

      const alert = createAlert(problem);
      acknowledgeAlert(alert.id, 'test-user');

      const unacknowledged = listAlerts({ acknowledged: false });
      expect(unacknowledged.find(a => a.id === alert.id)).toBeUndefined();

      const acknowledged = listAlerts({ acknowledged: true });
      expect(acknowledged.find(a => a.id === alert.id)).toBeDefined();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', () => {
      const problem: DetectedProblem = {
        id: 'test-problem-1',
        type: 'sync_failure',
        severity: 'error',
        title: 'Sync Failed',
        description: 'Failed to sync leads',
        detectedAt: new Date(),
        component: 'Sync Service',
        canAutoFix: true,
        fixed: false,
      };

      const alert = createAlert(problem);
      const acknowledged = acknowledgeAlert(alert.id, 'test-user');

      expect(acknowledged).toBeDefined();
      expect(acknowledged?.acknowledged).toBe(true);
      expect(acknowledged?.acknowledgedBy).toBe('test-user');
      expect(acknowledged?.acknowledgedAt).toBeDefined();
    });

    it('should return null for non-existent alert', () => {
      const result = acknowledgeAlert('non-existent-id', 'test-user');
      expect(result).toBeNull();
    });
  });

  describe('getAlertStatistics', () => {
    it('should return correct statistics', () => {
      const stats = getAlertStatistics();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('unacknowledged');
      expect(stats).toHaveProperty('acknowledged');
      expect(stats).toHaveProperty('bySeverity');
      expect(stats.bySeverity).toHaveProperty('critical');
      expect(stats.bySeverity).toHaveProperty('error');
      expect(stats.bySeverity).toHaveProperty('warning');
    });
  });

  describe('Alert Configurations', () => {
    it('should create an alert configuration', () => {
      const config = createAlertConfiguration({
        enabled: true,
        severity: 'critical',
        problemType: 'database_connection',
        notificationChannels: ['email'],
        recipients: ['admin@example.com'],
      });

      expect(config.id).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.severity).toBe('critical');
    });

    it('should list alert configurations', () => {
      createAlertConfiguration({
        enabled: true,
        severity: 'error',
        problemType: 'sync_failure',
        notificationChannels: ['in-app'],
        recipients: [],
      });

      const configs = listAlertConfigurations();
      expect(configs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
