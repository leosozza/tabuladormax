/**
 * Automated Log Analyzer
 * =======================
 * 
 * Analyzes sync logs to identify patterns, issues, and trends.
 * Provides automated diagnosis and recommendations for sync problems.
 * 
 * Features:
 * - Pattern detection (recurring errors)
 * - RLS policy violation analysis
 * - Performance metrics analysis
 * - Automatic recommendations
 */

import type { SyncLog } from './logValidator';
import { normalizeLogLevel } from './logValidator';

export interface LogAnalysisResult {
  summary: {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    timeRange: {
      start: string | null;
      end: string | null;
    };
  };
  issues: {
    critical: LogIssue[];
    warnings: LogIssue[];
  };
  patterns: {
    recurringErrors: RecurringPattern[];
    performanceIssues: PerformanceIssue[];
  };
  recommendations: string[];
  healthScore: number; // 0-100
}

export interface LogIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  count: number;
  firstOccurrence: string | null;
  lastOccurrence: string | null;
  affectedLogs: string[]; // log IDs
  recommendation?: string;
}

export interface RecurringPattern {
  errorType: string;
  message: string;
  occurrences: number;
  frequency: string; // e.g., "3 times in last hour"
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface PerformanceIssue {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  metrics: Record<string, number>;
}

/**
 * Main analysis function
 */
export function analyzeLogs(logs: SyncLog[]): LogAnalysisResult {
  const result: LogAnalysisResult = {
    summary: {
      totalLogs: logs.length,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      timeRange: {
        start: null,
        end: null,
      },
    },
    issues: {
      critical: [],
      warnings: [],
    },
    patterns: {
      recurringErrors: [],
      performanceIssues: [],
    },
    recommendations: [],
    healthScore: 100,
  };

  if (logs.length === 0) {
    result.recommendations.push('No logs to analyze. Ensure logging is enabled.');
    return result;
  }

  // Calculate summary statistics
  calculateSummary(logs, result);

  // Detect critical issues
  detectCriticalIssues(logs, result);

  // Find recurring patterns
  findRecurringPatterns(logs, result);

  // Analyze performance
  analyzePerformance(logs, result);

  // Generate recommendations
  generateRecommendations(result);

  // Calculate health score
  calculateHealthScore(result);

  return result;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(logs: SyncLog[], result: LogAnalysisResult): void {
  const timestamps: number[] = [];

  logs.forEach((log) => {
    const level = normalizeLogLevel(log.log_level);

    switch (level) {
      case 'ERROR':
        result.summary.errorCount++;
        break;
      case 'WARN':
        result.summary.warnCount++;
        break;
      case 'INFO':
      case 'LOG':
        result.summary.infoCount++;
        break;
    }

    if (log.timestamp) {
      timestamps.push(typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime());
    }
  });

  if (timestamps.length > 0) {
    const sortedTimestamps = timestamps.sort((a, b) => a - b);
    result.summary.timeRange.start = new Date(sortedTimestamps[0]).toISOString();
    result.summary.timeRange.end = new Date(sortedTimestamps[sortedTimestamps.length - 1]).toISOString();
  }
}

/**
 * Detect critical issues like RLS violations
 */
function detectCriticalIssues(logs: SyncLog[], result: LogAnalysisResult): void {
  const rlsViolations: SyncLog[] = [];
  const shutdownEvents: SyncLog[] = [];
  const unknownErrors: SyncLog[] = [];

  logs.forEach((log) => {
    const message = log.event_message.toLowerCase();
    const level = normalizeLogLevel(log.log_level);

    // Check for RLS policy violations
    if (
      message.includes('política de segurança') ||
      message.includes('row level security') ||
      message.includes('rls') ||
      message.includes('violates row-level security')
    ) {
      rlsViolations.push(log);
    }

    // Check for shutdown events
    if (message.includes('desligamento') || message.includes('shutdown')) {
      shutdownEvents.push(log);
    }

    // Check for generic errors
    if (level === 'ERROR' && !rlsViolations.includes(log) && !shutdownEvents.includes(log)) {
      unknownErrors.push(log);
    }
  });

  // Add RLS violation issue
  if (rlsViolations.length > 0) {
    result.issues.critical.push({
      id: 'rls-violation',
      severity: 'critical',
      type: 'RLS_POLICY_VIOLATION',
      message: 'Row-Level Security policy violation detected in sync_logs_detailed table',
      count: rlsViolations.length,
      firstOccurrence: rlsViolations[0].timestamp
        ? new Date(rlsViolations[0].timestamp).toISOString()
        : null,
      lastOccurrence: rlsViolations[rlsViolations.length - 1].timestamp
        ? new Date(rlsViolations[rlsViolations.length - 1].timestamp).toISOString()
        : null,
      affectedLogs: rlsViolations.map((l) => l.id || 'unknown'),
      recommendation: 
        'The sync process is unable to write to sync_logs_detailed due to RLS policies. ' +
        'Solutions:\n' +
        '1. Add INSERT policy for service_role: CREATE POLICY "service_role_insert" ON sync_logs_detailed FOR INSERT TO service_role USING (true);\n' +
        '2. Or disable RLS temporarily: ALTER TABLE sync_logs_detailed DISABLE ROW LEVEL SECURITY;\n' +
        '3. Ensure the Edge Function uses service_role key, not anon key.',
    });
  }

  // Add shutdown warnings
  if (shutdownEvents.length > 0) {
    result.issues.warnings.push({
      id: 'shutdown-events',
      severity: 'warning',
      type: 'SHUTDOWN_EVENT',
      message: 'Function shutdown events detected',
      count: shutdownEvents.length,
      firstOccurrence: shutdownEvents[0].timestamp
        ? new Date(shutdownEvents[0].timestamp).toISOString()
        : null,
      lastOccurrence: shutdownEvents[shutdownEvents.length - 1].timestamp
        ? new Date(shutdownEvents[shutdownEvents.length - 1].timestamp).toISOString()
        : null,
      affectedLogs: shutdownEvents.map((l) => l.id || 'unknown'),
      recommendation: 'Functions are shutting down normally. Monitor for unexpected shutdowns.',
    });
  }

  // Add unknown errors
  if (unknownErrors.length > 0) {
    result.issues.critical.push({
      id: 'unknown-errors',
      severity: 'critical',
      type: 'UNKNOWN_ERROR',
      message: 'Unclassified errors detected',
      count: unknownErrors.length,
      firstOccurrence: unknownErrors[0].timestamp
        ? new Date(unknownErrors[0].timestamp).toISOString()
        : null,
      lastOccurrence: unknownErrors[unknownErrors.length - 1].timestamp
        ? new Date(unknownErrors[unknownErrors.length - 1].timestamp).toISOString()
        : null,
      affectedLogs: unknownErrors.map((l) => l.id || 'unknown'),
      recommendation: 'Review error messages for specific issues. Check Edge Function logs for details.',
    });
  }
}

/**
 * Find recurring error patterns
 */
function findRecurringPatterns(logs: SyncLog[], result: LogAnalysisResult): void {
  const errorGroups = new Map<string, SyncLog[]>();

  // Group errors by message
  logs
    .filter((log) => normalizeLogLevel(log.log_level) === 'ERROR')
    .forEach((log) => {
      const key = log.event_message.substring(0, 100); // Use first 100 chars as key
      const existing = errorGroups.get(key) || [];
      existing.push(log);
      errorGroups.set(key, existing);
    });

  // Find patterns with 2+ occurrences
  errorGroups.forEach((group, message) => {
    if (group.length >= 2) {
      const timestamps = group
        .map((l) => (l.timestamp ? new Date(l.timestamp).getTime() : 0))
        .filter((t) => t > 0)
        .sort((a, b) => a - b);

      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (timestamps.length >= 3) {
        const firstHalfAvg = timestamps.slice(0, Math.floor(timestamps.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(timestamps.length / 2);
        const secondHalfAvg = timestamps.slice(Math.floor(timestamps.length / 2)).reduce((a, b) => a + b, 0) / (timestamps.length - Math.floor(timestamps.length / 2));
        const diff = secondHalfAvg - firstHalfAvg;
        if (diff > 60000) trend = 'increasing'; // More frequent if gap decreasing
        else if (diff < -60000) trend = 'decreasing';
      }

      let frequency = `${group.length} occurrences`;
      if (timestamps.length >= 2) {
        const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
        const hours = Math.floor(timeSpan / (1000 * 60 * 60));
        if (hours > 0) {
          frequency += ` over ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
          const minutes = Math.floor(timeSpan / (1000 * 60));
          frequency += ` over ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
      }

      result.patterns.recurringErrors.push({
        errorType: message.includes('política de segurança') ? 'RLS_VIOLATION' : 'UNKNOWN_ERROR',
        message: message,
        occurrences: group.length,
        frequency,
        trend,
      });
    }
  });
}

/**
 * Analyze performance issues
 */
function analyzePerformance(logs: SyncLog[], result: LogAnalysisResult): void {
  const errorRate = result.summary.totalLogs > 0 
    ? (result.summary.errorCount / result.summary.totalLogs) * 100 
    : 0;

  if (errorRate > 50) {
    result.patterns.performanceIssues.push({
      type: 'HIGH_ERROR_RATE',
      description: `Error rate is ${errorRate.toFixed(1)}% (${result.summary.errorCount}/${result.summary.totalLogs} logs)`,
      severity: 'high',
      metrics: {
        errorRate,
        totalErrors: result.summary.errorCount,
        totalLogs: result.summary.totalLogs,
      },
    });
  } else if (errorRate > 20) {
    result.patterns.performanceIssues.push({
      type: 'MODERATE_ERROR_RATE',
      description: `Error rate is ${errorRate.toFixed(1)}% (${result.summary.errorCount}/${result.summary.totalLogs} logs)`,
      severity: 'medium',
      metrics: {
        errorRate,
        totalErrors: result.summary.errorCount,
        totalLogs: result.summary.totalLogs,
      },
    });
  }
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(result: LogAnalysisResult): void {
  // RLS-specific recommendations
  const hasRlsIssue = result.issues.critical.some((i) => i.type === 'RLS_POLICY_VIOLATION');
  if (hasRlsIssue) {
    result.recommendations.push('🔴 CRITICAL: Fix RLS policy for sync_logs_detailed table');
    result.recommendations.push('   Run SQL: CREATE POLICY "service_role_all" ON sync_logs_detailed FOR ALL TO service_role USING (true);');
  }

  // High error rate
  if (result.patterns.performanceIssues.some((p) => p.severity === 'high')) {
    result.recommendations.push('🔴 CRITICAL: High error rate detected - investigate sync function logs');
  }

  // Recurring errors
  if (result.patterns.recurringErrors.length > 0) {
    result.recommendations.push(
      `⚠️  WARNING: ${result.patterns.recurringErrors.length} recurring error pattern${result.patterns.recurringErrors.length !== 1 ? 's' : ''} detected`
    );
  }

  // General health
  if (result.summary.errorCount === 0) {
    result.recommendations.push('✅ No errors detected - system is healthy');
  }

  // Monitoring suggestion
  if (result.summary.totalLogs < 10) {
    result.recommendations.push('ℹ️  INFO: Limited log data available - consider increasing logging or checking longer time period');
  }
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(result: LogAnalysisResult): void {
  let score = 100;

  // Deduct for critical issues
  score -= result.issues.critical.length * 30;

  // Deduct for warnings
  score -= result.issues.warnings.length * 10;

  // Deduct for recurring errors
  score -= result.patterns.recurringErrors.length * 5;

  // Deduct for error rate
  const errorRate = result.summary.totalLogs > 0 
    ? (result.summary.errorCount / result.summary.totalLogs) * 100 
    : 0;
  score -= Math.min(errorRate, 40); // Max 40 points deduction

  result.healthScore = Math.max(0, Math.min(100, score));
}

/**
 * Format analysis result for display
 */
export function formatAnalysisResult(result: LogAnalysisResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('AUTOMATED LOG ANALYSIS REPORT');
  lines.push('='.repeat(80));

  // Health Score
  const healthEmoji = result.healthScore >= 80 ? '🟢' : result.healthScore >= 50 ? '🟡' : '🔴';
  lines.push(`\n${healthEmoji} Health Score: ${result.healthScore}/100`);

  // Summary
  lines.push('\n📊 SUMMARY:');
  lines.push(`   Total Logs: ${result.summary.totalLogs}`);
  lines.push(`   ❌ Errors: ${result.summary.errorCount}`);
  lines.push(`   ⚠️  Warnings: ${result.summary.warnCount}`);
  lines.push(`   ℹ️  Info: ${result.summary.infoCount}`);
  if (result.summary.timeRange.start) {
    lines.push(`   Time Range: ${result.summary.timeRange.start} to ${result.summary.timeRange.end}`);
  }

  // Critical Issues
  if (result.issues.critical.length > 0) {
    lines.push('\n🔴 CRITICAL ISSUES:');
    result.issues.critical.forEach((issue, i) => {
      lines.push(`\n   ${i + 1}. ${issue.type} (${issue.count} occurrences)`);
      lines.push(`      ${issue.message}`);
      if (issue.recommendation) {
        lines.push(`      💡 Recommendation:`);
        issue.recommendation.split('\n').forEach((line) => {
          lines.push(`         ${line}`);
        });
      }
    });
  }

  // Warnings
  if (result.issues.warnings.length > 0) {
    lines.push('\n⚠️  WARNINGS:');
    result.issues.warnings.forEach((issue, i) => {
      lines.push(`   ${i + 1}. ${issue.type}: ${issue.message} (${issue.count} occurrences)`);
    });
  }

  // Recurring Patterns
  if (result.patterns.recurringErrors.length > 0) {
    lines.push('\n🔄 RECURRING PATTERNS:');
    result.patterns.recurringErrors.forEach((pattern, i) => {
      const trendIcon = pattern.trend === 'increasing' ? '📈' : pattern.trend === 'decreasing' ? '📉' : '➡️';
      lines.push(`   ${i + 1}. ${pattern.errorType} ${trendIcon}`);
      lines.push(`      Message: ${pattern.message.substring(0, 80)}...`);
      lines.push(`      Frequency: ${pattern.frequency}`);
    });
  }

  // Performance Issues
  if (result.patterns.performanceIssues.length > 0) {
    lines.push('\n⚡ PERFORMANCE ISSUES:');
    result.patterns.performanceIssues.forEach((issue, i) => {
      const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`   ${i + 1}. ${severityIcon} ${issue.type}`);
      lines.push(`      ${issue.description}`);
    });
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('\n💡 RECOMMENDATIONS:');
    result.recommendations.forEach((rec) => {
      lines.push(`   ${rec}`);
    });
  }

  lines.push('\n' + '='.repeat(80));

  return lines.join('\n');
}
