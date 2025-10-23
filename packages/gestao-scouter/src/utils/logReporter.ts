/**
 * Log Report Generator
 * =====================
 * 
 * Generates comprehensive reports from log analysis.
 * Supports multiple output formats (JSON, Markdown, HTML).
 * 
 * Features:
 * - Multiple report formats
 * - Summary and detailed reports
 * - Time-based analysis
 * - Export functionality
 */

import type { LogAnalysisResult, LogIssue } from './logAnalyzer';
import type { SyncLog } from './logValidator';

export interface ReportConfig {
  format: 'json' | 'markdown' | 'html' | 'text';
  includeRawLogs: boolean;
  includeTimeline: boolean;
  includeMetrics: boolean;
}

export interface Report {
  id: string;
  generatedAt: string;
  format: ReportConfig['format'];
  content: string;
  metadata: {
    totalLogs: number;
    analysisResults: LogAnalysisResult;
    timeRange: {
      start: string | null;
      end: string | null;
    };
  };
}

/**
 * Generate report from analysis results
 */
export function generateReport(
  analysisResult: LogAnalysisResult,
  logs: SyncLog[],
  config: Partial<ReportConfig> = {}
): Report {
  const reportConfig: ReportConfig = {
    format: 'markdown',
    includeRawLogs: false,
    includeTimeline: true,
    includeMetrics: true,
    ...config,
  };

  const report: Report = {
    id: `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    format: reportConfig.format,
    content: '',
    metadata: {
      totalLogs: logs.length,
      analysisResults: analysisResult,
      timeRange: analysisResult.summary.timeRange,
    },
  };

  // Generate content based on format
  switch (reportConfig.format) {
    case 'markdown':
      report.content = generateMarkdownReport(analysisResult, logs, reportConfig);
      break;
    case 'html':
      report.content = generateHtmlReport(analysisResult, logs, reportConfig);
      break;
    case 'json':
      report.content = generateJsonReport(analysisResult, logs, reportConfig);
      break;
    case 'text':
      report.content = generateTextReport(analysisResult, logs, reportConfig);
      break;
  }

  return report;
}

/**
 * Generate Markdown format report
 */
function generateMarkdownReport(
  analysisResult: LogAnalysisResult,
  logs: SyncLog[],
  config: ReportConfig
): string {
  const lines: string[] = [];

  // Header
  lines.push('# Sync Log Analysis Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`**Time Range:** ${analysisResult.summary.timeRange.start || 'N/A'} to ${analysisResult.summary.timeRange.end || 'N/A'}`);
  lines.push('');

  // Health Score
  const healthEmoji = analysisResult.healthScore >= 80 ? '🟢' : analysisResult.healthScore >= 50 ? '🟡' : '🔴';
  lines.push(`## ${healthEmoji} Health Score: ${analysisResult.healthScore}/100`);
  lines.push('');

  // Summary
  lines.push('## 📊 Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total Logs | ${analysisResult.summary.totalLogs} |`);
  lines.push(`| ❌ Errors | ${analysisResult.summary.errorCount} |`);
  lines.push(`| ⚠️ Warnings | ${analysisResult.summary.warnCount} |`);
  lines.push(`| ℹ️ Info | ${analysisResult.summary.infoCount} |`);
  lines.push('');

  // Critical Issues
  if (analysisResult.issues.critical.length > 0) {
    lines.push('## 🔴 Critical Issues');
    lines.push('');
    analysisResult.issues.critical.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${issue.type}`);
      lines.push('');
      lines.push(`**Message:** ${issue.message}`);
      lines.push('');
      lines.push(`**Occurrences:** ${issue.count}`);
      lines.push('');
      if (issue.firstOccurrence) {
        lines.push(`**First:** ${issue.firstOccurrence}`);
        lines.push('');
        lines.push(`**Last:** ${issue.lastOccurrence}`);
        lines.push('');
      }
      if (issue.recommendation) {
        lines.push('**Recommendation:**');
        lines.push('```');
        lines.push(issue.recommendation);
        lines.push('```');
        lines.push('');
      }
    });
  }

  // Warnings
  if (analysisResult.issues.warnings.length > 0) {
    lines.push('## ⚠️ Warnings');
    lines.push('');
    analysisResult.issues.warnings.forEach((issue, i) => {
      lines.push(`${i + 1}. **${issue.type}**: ${issue.message} (${issue.count} occurrences)`);
    });
    lines.push('');
  }

  // Recurring Patterns
  if (analysisResult.patterns.recurringErrors.length > 0) {
    lines.push('## 🔄 Recurring Error Patterns');
    lines.push('');
    analysisResult.patterns.recurringErrors.forEach((pattern, i) => {
      const trendIcon = pattern.trend === 'increasing' ? '📈' : pattern.trend === 'decreasing' ? '📉' : '➡️';
      lines.push(`### ${i + 1}. ${pattern.errorType} ${trendIcon}`);
      lines.push('');
      lines.push(`**Occurrences:** ${pattern.occurrences}`);
      lines.push('');
      lines.push(`**Frequency:** ${pattern.frequency}`);
      lines.push('');
      lines.push(`**Message Preview:**`);
      lines.push('```');
      lines.push(pattern.message.substring(0, 200));
      lines.push('```');
      lines.push('');
    });
  }

  // Performance Issues
  if (analysisResult.patterns.performanceIssues.length > 0) {
    lines.push('## ⚡ Performance Issues');
    lines.push('');
    analysisResult.patterns.performanceIssues.forEach((issue, i) => {
      const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`${i + 1}. ${severityIcon} **${issue.type}**: ${issue.description}`);
    });
    lines.push('');
  }

  // Recommendations
  if (analysisResult.recommendations.length > 0) {
    lines.push('## 💡 Recommendations');
    lines.push('');
    analysisResult.recommendations.forEach((rec) => {
      lines.push(`- ${rec}`);
    });
    lines.push('');
  }

  // Metrics
  if (config.includeMetrics) {
    lines.push('## 📈 Metrics');
    lines.push('');
    const errorRate = analysisResult.summary.totalLogs > 0
      ? ((analysisResult.summary.errorCount / analysisResult.summary.totalLogs) * 100).toFixed(2)
      : '0.00';
    lines.push(`- **Error Rate:** ${errorRate}%`);
    lines.push(`- **Critical Issues:** ${analysisResult.issues.critical.length}`);
    lines.push(`- **Warnings:** ${analysisResult.issues.warnings.length}`);
    lines.push(`- **Recurring Patterns:** ${analysisResult.patterns.recurringErrors.length}`);
    lines.push('');
  }

  // Raw logs
  if (config.includeRawLogs && logs.length > 0) {
    lines.push('## 📋 Raw Logs');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(logs.slice(0, 10), null, 2)); // Only first 10
    if (logs.length > 10) {
      lines.push(`... and ${logs.length - 10} more`);
    }
    lines.push('```');
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('*Generated by Gestão Scouter Log Analysis System*');

  return lines.join('\n');
}

/**
 * Generate HTML format report
 */
function generateHtmlReport(
  analysisResult: LogAnalysisResult,
  logs: SyncLog[],
  config: ReportConfig
): string {
  const healthColor = analysisResult.healthScore >= 80 ? '#22c55e' : analysisResult.healthScore >= 50 ? '#eab308' : '#ef4444';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sync Log Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f9fafb;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .health-score {
      font-size: 48px;
      font-weight: bold;
      color: ${healthColor};
      text-align: center;
      margin: 20px 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #1f2937;
    }
    .metric-label {
      color: #6b7280;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .issue {
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 15px 0;
      background: #fef2f2;
      border-radius: 4px;
    }
    .warning {
      border-left: 4px solid #eab308;
      padding: 15px;
      margin: 15px 0;
      background: #fefce8;
      border-radius: 4px;
    }
    .recommendation {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    h1, h2 { color: #1f2937; }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 Sync Log Analysis Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Time Range:</strong> ${analysisResult.summary.timeRange.start || 'N/A'} to ${analysisResult.summary.timeRange.end || 'N/A'}</p>
  </div>

  <div class="section">
    <h2>Health Score</h2>
    <div class="health-score">${analysisResult.healthScore}/100</div>
  </div>

  <div class="summary">
    <div class="metric-card">
      <div class="metric-value">${analysisResult.summary.totalLogs}</div>
      <div class="metric-label">Total Logs</div>
    </div>
    <div class="metric-card">
      <div class="metric-value" style="color: #ef4444;">${analysisResult.summary.errorCount}</div>
      <div class="metric-label">Errors</div>
    </div>
    <div class="metric-card">
      <div class="metric-value" style="color: #eab308;">${analysisResult.summary.warnCount}</div>
      <div class="metric-label">Warnings</div>
    </div>
    <div class="metric-card">
      <div class="metric-value" style="color: #3b82f6;">${analysisResult.summary.infoCount}</div>
      <div class="metric-label">Info</div>
    </div>
  </div>

  ${analysisResult.issues.critical.length > 0 ? `
    <div class="section">
      <h2>🔴 Critical Issues</h2>
      ${analysisResult.issues.critical.map((issue) => `
        <div class="issue">
          <h3>${issue.type}</h3>
          <p><strong>Message:</strong> ${issue.message}</p>
          <p><strong>Occurrences:</strong> ${issue.count}</p>
          ${issue.recommendation ? `
            <div class="recommendation">
              <strong>💡 Recommendation:</strong><br>
              <code>${issue.recommendation.replace(/\n/g, '<br>')}</code>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysisResult.recommendations.length > 0 ? `
    <div class="section">
      <h2>💡 Recommendations</h2>
      ${analysisResult.recommendations.map((rec) => `
        <div class="recommendation">${rec}</div>
      `).join('')}
    </div>
  ` : ''}

  <div class="section">
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      Generated by Gestão Scouter Log Analysis System
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate JSON format report
 */
function generateJsonReport(
  analysisResult: LogAnalysisResult,
  logs: SyncLog[],
  config: ReportConfig
): string {
  const report = {
    generatedAt: new Date().toISOString(),
    analysisResult,
    logs: config.includeRawLogs ? logs : undefined,
    summary: {
      totalLogs: logs.length,
      healthScore: analysisResult.healthScore,
      criticalIssues: analysisResult.issues.critical.length,
      warnings: analysisResult.issues.warnings.length,
    },
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Generate text format report
 */
function generateTextReport(
  analysisResult: LogAnalysisResult,
  logs: SyncLog[],
  config: ReportConfig
): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('SYNC LOG ANALYSIS REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Time Range: ${analysisResult.summary.timeRange.start || 'N/A'} to ${analysisResult.summary.timeRange.end || 'N/A'}`);
  lines.push('');
  lines.push(`Health Score: ${analysisResult.healthScore}/100`);
  lines.push('');

  lines.push('SUMMARY:');
  lines.push(`  Total Logs: ${analysisResult.summary.totalLogs}`);
  lines.push(`  Errors: ${analysisResult.summary.errorCount}`);
  lines.push(`  Warnings: ${analysisResult.summary.warnCount}`);
  lines.push(`  Info: ${analysisResult.summary.infoCount}`);
  lines.push('');

  if (analysisResult.issues.critical.length > 0) {
    lines.push('CRITICAL ISSUES:');
    analysisResult.issues.critical.forEach((issue, i) => {
      lines.push(`  ${i + 1}. ${issue.type}`);
      lines.push(`     ${issue.message}`);
      lines.push(`     Occurrences: ${issue.count}`);
      if (issue.recommendation) {
        lines.push(`     Recommendation: ${issue.recommendation.substring(0, 100)}...`);
      }
      lines.push('');
    });
  }

  if (analysisResult.recommendations.length > 0) {
    lines.push('RECOMMENDATIONS:');
    analysisResult.recommendations.forEach((rec) => {
      lines.push(`  - ${rec}`);
    });
    lines.push('');
  }

  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Export report to file
 */
export function exportReport(report: Report, filename?: string): void {
  const name = filename || `sync-log-report-${Date.now()}.${getFileExtension(report.format)}`;
  const blob = new Blob([report.content], {
    type: getMimeType(report.format),
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get file extension for format
 */
function getFileExtension(format: ReportConfig['format']): string {
  switch (format) {
    case 'markdown':
      return 'md';
    case 'html':
      return 'html';
    case 'json':
      return 'json';
    case 'text':
      return 'txt';
    default:
      return 'txt';
  }
}

/**
 * Get MIME type for format
 */
function getMimeType(format: ReportConfig['format']): string {
  switch (format) {
    case 'markdown':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'json':
      return 'application/json';
    case 'text':
      return 'text/plain';
    default:
      return 'text/plain';
  }
}
