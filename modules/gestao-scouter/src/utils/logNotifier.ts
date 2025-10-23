/**
 * Log Notification System
 * ========================
 * 
 * Monitors logs and sends notifications for critical events.
 * Supports multiple notification channels and filtering.
 * 
 * Features:
 * - Real-time monitoring
 * - Configurable thresholds
 * - Multiple notification channels (console, toast, webhook)
 * - Rate limiting to prevent spam
 */

import type { SyncLog } from './logValidator';
import { normalizeLogLevel } from './logValidator';
import type { LogAnalysisResult } from './logAnalyzer';

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  filters: NotificationFilter[];
  rateLimit: {
    maxNotificationsPerHour: number;
    cooldownMinutes: number;
  };
}

export type NotificationChannel = 'console' | 'toast' | 'webhook' | 'email';

export interface NotificationFilter {
  logLevel?: ('ERROR' | 'WARN' | 'INFO' | 'LOG')[];
  messageContains?: string[];
  excludeMessageContains?: string[];
}

export interface Notification {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  logs: SyncLog[];
  channel: NotificationChannel;
}

class LogNotificationService {
  private config: NotificationConfig;
  private notificationHistory: Map<string, number> = new Map(); // notification type -> last sent timestamp
  private notificationCount: Map<string, number> = new Map(); // hour key -> count

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      enabled: true,
      channels: ['console', 'toast'],
      filters: [
        {
          logLevel: ['ERROR'],
        },
      ],
      rateLimit: {
        maxNotificationsPerHour: 10,
        cooldownMinutes: 5,
      },
      ...config,
    };
  }

  /**
   * Process new logs and send notifications if needed
   */
  processLogs(logs: SyncLog[]): Notification[] {
    if (!this.config.enabled) {
      return [];
    }

    const notifications: Notification[] = [];

    // Filter logs based on notification filters
    const filteredLogs = this.filterLogs(logs);

    // Group logs by type
    const rlsViolations = filteredLogs.filter((log) =>
      log.event_message.toLowerCase().includes('política de segurança') ||
      log.event_message.toLowerCase().includes('row level security')
    );

    const criticalErrors = filteredLogs.filter(
      (log) =>
        normalizeLogLevel(log.log_level) === 'ERROR' &&
        !rlsViolations.includes(log)
    );

    const warnings = filteredLogs.filter(
      (log) => normalizeLogLevel(log.log_level) === 'WARN'
    );

    // Create notifications for RLS violations
    if (rlsViolations.length > 0 && this.shouldSendNotification('rls-violation')) {
      notifications.push(
        this.createNotification(
          'rls-violation',
          'critical',
          'RLS Policy Violation Detected',
          `${rlsViolations.length} log(s) failed due to Row-Level Security policy violations in sync_logs_detailed table. ` +
            'The sync system cannot write logs. Fix: Add INSERT policy for service_role.',
          rlsViolations
        )
      );
    }

    // Create notifications for critical errors
    if (criticalErrors.length > 0 && this.shouldSendNotification('critical-error')) {
      notifications.push(
        this.createNotification(
          'critical-error',
          'critical',
          'Critical Sync Errors Detected',
          `${criticalErrors.length} critical error(s) detected in sync operations. Review logs immediately.`,
          criticalErrors
        )
      );
    }

    // Create notifications for warnings
    if (warnings.length > 5 && this.shouldSendNotification('multiple-warnings')) {
      notifications.push(
        this.createNotification(
          'multiple-warnings',
          'warning',
          'Multiple Warnings Detected',
          `${warnings.length} warning(s) detected in sync operations. System may be degraded.`,
          warnings
        )
      );
    }

    // Send notifications through configured channels
    notifications.forEach((notification) => {
      this.sendNotification(notification);
    });

    return notifications;
  }

  /**
   * Process analysis results and send notifications
   */
  processAnalysisResult(analysisResult: LogAnalysisResult): Notification[] {
    if (!this.config.enabled) {
      return [];
    }

    const notifications: Notification[] = [];

    // Health score critical
    if (analysisResult.healthScore < 50 && this.shouldSendNotification('health-critical')) {
      notifications.push(
        this.createNotification(
          'health-critical',
          'critical',
          'System Health Critical',
          `Sync system health score is critically low (${analysisResult.healthScore}/100). ` +
            `${analysisResult.issues.critical.length} critical issue(s) detected.`,
          []
        )
      );
    }

    // High error rate
    const errorRate = analysisResult.summary.totalLogs > 0
      ? (analysisResult.summary.errorCount / analysisResult.summary.totalLogs) * 100
      : 0;

    if (errorRate > 50 && this.shouldSendNotification('high-error-rate')) {
      notifications.push(
        this.createNotification(
          'high-error-rate',
          'critical',
          'High Error Rate Detected',
          `Sync error rate is ${errorRate.toFixed(1)}% (${analysisResult.summary.errorCount}/${analysisResult.summary.totalLogs} logs). ` +
            'System is experiencing significant issues.',
          []
        )
      );
    }

    // Send notifications
    notifications.forEach((notification) => {
      this.sendNotification(notification);
    });

    return notifications;
  }

  /**
   * Filter logs based on notification filters
   */
  private filterLogs(logs: SyncLog[]): SyncLog[] {
    if (this.config.filters.length === 0) {
      return logs;
    }

    return logs.filter((log) => {
      return this.config.filters.some((filter) => {
        // Check log level
        if (filter.logLevel && filter.logLevel.length > 0) {
          const level = normalizeLogLevel(log.log_level);
          if (!filter.logLevel.includes(level)) {
            return false;
          }
        }

        // Check message contains
        if (filter.messageContains && filter.messageContains.length > 0) {
          const message = log.event_message.toLowerCase();
          if (!filter.messageContains.some((term) => message.includes(term.toLowerCase()))) {
            return false;
          }
        }

        // Check message excludes
        if (filter.excludeMessageContains && filter.excludeMessageContains.length > 0) {
          const message = log.event_message.toLowerCase();
          if (filter.excludeMessageContains.some((term) => message.includes(term.toLowerCase()))) {
            return false;
          }
        }

        return true;
      });
    });
  }

  /**
   * Check if notification should be sent based on rate limiting
   */
  private shouldSendNotification(notificationType: string): boolean {
    const now = Date.now();
    const lastSent = this.notificationHistory.get(notificationType);

    // Check cooldown
    if (lastSent) {
      const cooldownMs = this.config.rateLimit.cooldownMinutes * 60 * 1000;
      if (now - lastSent < cooldownMs) {
        console.log(
          `[LogNotifier] Skipping notification ${notificationType} - in cooldown period`
        );
        return false;
      }
    }

    // Check hourly limit
    const hourKey = Math.floor(now / (60 * 60 * 1000)).toString();
    const currentHourCount = this.notificationCount.get(hourKey) || 0;

    if (currentHourCount >= this.config.rateLimit.maxNotificationsPerHour) {
      console.log(
        `[LogNotifier] Skipping notification ${notificationType} - hourly limit reached`
      );
      return false;
    }

    // Update tracking
    this.notificationHistory.set(notificationType, now);
    this.notificationCount.set(hourKey, currentHourCount + 1);

    // Clean up old hour entries
    this.cleanupOldEntries();

    return true;
  }

  /**
   * Create notification object
   */
  private createNotification(
    id: string,
    severity: 'critical' | 'warning' | 'info',
    title: string,
    message: string,
    logs: SyncLog[]
  ): Notification {
    return {
      id,
      timestamp: new Date().toISOString(),
      severity,
      title,
      message,
      logs,
      channel: this.config.channels[0], // Use first configured channel
    };
  }

  /**
   * Send notification through configured channels
   */
  private sendNotification(notification: Notification): void {
    this.config.channels.forEach((channel) => {
      switch (channel) {
        case 'console':
          this.sendConsoleNotification(notification);
          break;
        case 'toast':
          this.sendToastNotification(notification);
          break;
        case 'webhook':
          this.sendWebhookNotification(notification);
          break;
        case 'email':
          console.log('[LogNotifier] Email notifications not yet implemented');
          break;
      }
    });
  }

  /**
   * Send console notification
   */
  private sendConsoleNotification(notification: Notification): void {
    const icon = notification.severity === 'critical' ? '🔴' : notification.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.group(`${icon} ${notification.title}`);
    console.log('Severity:', notification.severity);
    console.log('Message:', notification.message);
    console.log('Timestamp:', notification.timestamp);
    if (notification.logs.length > 0) {
      console.log('Affected Logs:', notification.logs.length);
    }
    console.groupEnd();
  }

  /**
   * Send toast notification (requires toast library integration)
   */
  private sendToastNotification(notification: Notification): void {
    // This will be integrated with the app's toast system (Sonner)
    // For now, store in localStorage for UI to pick up
    try {
      const storedNotifications = JSON.parse(
        localStorage.getItem('sync_notifications') || '[]'
      );
      storedNotifications.push(notification);
      // Keep only last 50 notifications
      const trimmed = storedNotifications.slice(-50);
      localStorage.setItem('sync_notifications', JSON.stringify(trimmed));
    } catch (e) {
      console.error('[LogNotifier] Failed to store toast notification:', e);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: Notification): Promise<void> {
    const webhookUrl = import.meta.env.VITE_SYNC_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('[LogNotifier] Webhook URL not configured');
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification,
          timestamp: new Date().toISOString(),
          source: 'gestao-scouter-log-notifier',
        }),
      });
    } catch (e) {
      console.error('[LogNotifier] Failed to send webhook notification:', e);
    }
  }

  /**
   * Clean up old notification tracking entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    // Clean notification history older than 2 hours
    this.notificationHistory.forEach((timestamp, key) => {
      if (timestamp < twoHoursAgo) {
        this.notificationHistory.delete(key);
      }
    });

    // Clean notification counts older than 2 hours
    const currentHourKey = Math.floor(now / (60 * 60 * 1000));
    this.notificationCount.forEach((_, hourKey) => {
      if (parseInt(hourKey) < currentHourKey - 2) {
        this.notificationCount.delete(hourKey);
      }
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get notification history
   */
  getNotificationHistory(): Array<{ type: string; lastSent: number }> {
    return Array.from(this.notificationHistory.entries()).map(([type, lastSent]) => ({
      type,
      lastSent,
    }));
  }

  /**
   * Clear notification history (for testing)
   */
  clearHistory(): void {
    this.notificationHistory.clear();
    this.notificationCount.clear();
  }
}

// Singleton instance
export const logNotifier = new LogNotificationService();

// Export class for testing
export { LogNotificationService };
