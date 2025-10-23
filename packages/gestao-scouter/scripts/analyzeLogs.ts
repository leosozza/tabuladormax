#!/usr/bin/env node
/**
 * CLI Tool for Log Analysis
 * ==========================
 * 
 * Analyzes sync logs from various sources and generates reports.
 * 
 * Usage:
 *   npm run analyze-logs -- --input logs.json
 *   npm run analyze-logs -- --input logs.txt --format markdown
 *   npx tsx scripts/analyzeLogs.ts --input example.json --output report.md
 * 
 * Options:
 *   --input <file>     Input log file (JSON or text)
 *   --output <file>    Output report file
 *   --format <type>    Report format: json, markdown, html, text (default: markdown)
 *   --notify           Enable notifications for critical issues
 *   --help             Show help
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateAndNormalizeLogs,
  formatValidationResult,
} from '../src/utils/logValidator';
import { analyzeLogs, formatAnalysisResult } from '../src/utils/logAnalyzer';
import { generateReport, exportReport } from '../src/utils/logReporter';
import {
  logNotifier,
  type NotificationConfig,
} from '../src/utils/logNotifier';

interface CliArgs {
  input?: string;
  output?: string;
  format: 'json' | 'markdown' | 'html' | 'text';
  notify: boolean;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    return { format: 'markdown', notify: false, help: true };
  }

  const result: CliArgs = {
    format: 'markdown',
    notify: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--input':
      case '-i':
        result.input = args[++i];
        break;
      case '--output':
      case '-o':
        result.output = args[++i];
        break;
      case '--format':
      case '-f':
        const format = args[++i];
        if (['json', 'markdown', 'html', 'text'].includes(format)) {
          result.format = format as CliArgs['format'];
        }
        break;
      case '--notify':
      case '-n':
        result.notify = true;
        break;
    }
  }

  return result;
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
🔍 Log Analysis Tool
====================

Analyzes sync logs and generates diagnostic reports.

Usage:
  npm run analyze-logs -- --input logs.json
  npx tsx scripts/analyzeLogs.ts --input logs.txt --format markdown

Options:
  --input, -i <file>      Input log file (JSON or text) [required]
  --output, -o <file>     Output report file (optional)
  --format, -f <type>     Report format: json, markdown, html, text (default: markdown)
  --notify, -n            Enable notifications for critical issues
  --help, -h              Show this help message

Examples:
  # Analyze logs and display in console
  npm run analyze-logs -- --input logs.json

  # Generate markdown report
  npm run analyze-logs -- --input logs.json --output report.md --format markdown

  # Generate HTML report with notifications
  npm run analyze-logs -- --input logs.json --output report.html --format html --notify

  # Analyze the example from problem statement
  npm run analyze-logs -- --input /tmp/example-logs.json

Report Formats:
  - json      : Machine-readable JSON format
  - markdown  : Human-readable Markdown format (default)
  - html      : Interactive HTML report
  - text      : Plain text format

For more information, see: docs/LOG_ANALYSIS.md
`);
}

/**
 * Read and parse input file
 */
function readInputFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Example log data from problem statement
 */
const EXAMPLE_LOGS = `{
  "event_message": "nova linha viola a política de segurança em nível de linha para a tabela \\"sync_logs_detailed\\"",
  "id": "642d80d6-592a-4fe4-af48-403ea726235d",
  "log_level": "ERRO",
{
  "event_message": "desligamento",
  "event_type": "Desligamento",
  "function_id": "9832ccf7-d2b8-4c90-b47e-18bb1cebca21",
  "id": "69625870-f42a-4a2c-9a67-1fd27f340295",
  "log_level": "registro",
  "carimbo de data/hora": 1760977744435000
}  "{
  "event_message": "✅ [Diagnóstico] Diagnóstico completo!\\n",
  "event_type": "Registro",
  "function_id": "9832ccf7-d2b8-4c90-b47e-18bb1cebca21",
  "id": "4379e35e-ce2b-4ca8-812e-d8f42719734b",
  "log_level": "informações",
  "carimbo de data/hora": 1760977552029000
}carimbo de data/hora": 1760977552196000
}`;

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔍 Starting Log Analysis...\n');

  // Read input
  let inputContent: string;
  if (args.input) {
    console.log(`📂 Reading input from: ${args.input}`);
    inputContent = readInputFile(args.input);
  } else {
    console.log('📂 No input file specified, using example from problem statement');
    inputContent = EXAMPLE_LOGS;
  }

  // Step 1: Validate and normalize logs
  console.log('\n📋 Step 1: Validating and normalizing logs...');
  const validationResult = validateAndNormalizeLogs(inputContent);

  console.log(formatValidationResult(validationResult));

  if (!validationResult.isValid || validationResult.logs.length === 0) {
    console.error('\n❌ Failed to validate logs. Cannot proceed with analysis.');
    process.exit(1);
  }

  // Step 2: Analyze logs
  console.log('\n🔎 Step 2: Analyzing logs...');
  const analysisResult = analyzeLogs(validationResult.logs);

  console.log(formatAnalysisResult(analysisResult));

  // Step 3: Send notifications if enabled
  if (args.notify) {
    console.log('\n🔔 Step 3: Checking for notifications...');
    logNotifier.updateConfig({
      enabled: true,
      channels: ['console'],
    });

    const notifications = logNotifier.processLogs(validationResult.logs);
    const analysisNotifications = logNotifier.processAnalysisResult(analysisResult);

    const totalNotifications = notifications.length + analysisNotifications.length;
    if (totalNotifications > 0) {
      console.log(`✅ Sent ${totalNotifications} notification(s)`);
    } else {
      console.log('✅ No notifications needed');
    }
  }

  // Step 4: Generate report
  console.log('\n📊 Step 4: Generating report...');
  const report = generateReport(analysisResult, validationResult.logs, {
    format: args.format,
    includeRawLogs: args.format === 'json',
    includeTimeline: true,
    includeMetrics: true,
  });

  // Save or display report
  if (args.output) {
    const outputPath = path.resolve(args.output);
    fs.writeFileSync(outputPath, report.content, 'utf-8');
    console.log(`✅ Report saved to: ${outputPath}`);
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('GENERATED REPORT');
    console.log('='.repeat(80));
    console.log(report.content);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Processed ${validationResult.logs.length} log(s)`);
  console.log(`📊 Health Score: ${analysisResult.healthScore}/100`);
  console.log(`🔴 Critical Issues: ${analysisResult.issues.critical.length}`);
  console.log(`⚠️  Warnings: ${analysisResult.issues.warnings.length}`);

  if (analysisResult.healthScore < 50) {
    console.log('\n⚠️  WARNING: System health is critical. Review issues immediately!');
    process.exit(1);
  } else if (analysisResult.healthScore < 80) {
    console.log('\n⚠️  WARNING: System health is degraded. Review recommendations.');
    process.exit(0);
  } else {
    console.log('\n✅ System health is good!');
    process.exit(0);
  }
}

// Execute
main().catch((err) => {
  console.error('\n💥 FATAL ERROR:');
  console.error(err);
  process.exit(2);
});
