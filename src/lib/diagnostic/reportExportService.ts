/**
 * Serviço de Exportação de Relatórios
 * Permite exportar relatórios detalhados sobre diagnóstico e status do sistema
 */

import type { 
  DiagnosticReport, 
  ReportExportOptions,
  DetectedProblem,
  Alert 
} from "@/types/diagnostic";
import { performHealthCheck } from "./healthCheckService";
import { detectProblems } from "./problemDetectionService";
import { listAlerts } from "./alertService";

/**
 * Gera um relatório de diagnóstico completo
 */
export async function generateDiagnosticReport(
  generatedBy: string,
  period?: { start: Date; end: Date }
): Promise<DiagnosticReport> {
  const now = new Date();
  const defaultPeriod = {
    start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // últimas 24 horas
    end: now,
  };

  const reportPeriod = period || defaultPeriod;

  // Coleta dados do sistema
  const systemHealth = await performHealthCheck();
  const problems = await detectProblems();
  const alerts = listAlerts({ limit: 100 });

  // Filtra alertas pelo período
  const periodAlerts = alerts.filter(
    a => a.timestamp >= reportPeriod.start && a.timestamp <= reportPeriod.end
  );

  // Calcula resumo
  const summary = {
    totalProblems: problems.length,
    criticalProblems: problems.filter(p => p.severity === 'critical').length,
    fixedProblems: problems.filter(p => p.fixed).length,
    pendingProblems: problems.filter(p => !p.fixed).length,
  };

  const report: DiagnosticReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: now,
    generatedBy,
    period: reportPeriod,
    systemHealth,
    problems,
    alerts: periodAlerts,
    summary,
  };

  return report;
}

/**
 * Exporta relatório como JSON
 */
export function exportReportAsJSON(report: DiagnosticReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Exporta relatório como CSV
 */
export function exportReportAsCSV(report: DiagnosticReport): string {
  const lines: string[] = [];

  // Cabeçalho do relatório
  lines.push('RELATÓRIO DE DIAGNÓSTICO DO SISTEMA');
  lines.push(`Gerado em: ${report.generatedAt.toLocaleString()}`);
  lines.push(`Gerado por: ${report.generatedBy}`);
  lines.push(`Período: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}`);
  lines.push('');

  // Resumo
  lines.push('RESUMO');
  lines.push('Categoria,Quantidade');
  lines.push(`Total de Problemas,${report.summary.totalProblems}`);
  lines.push(`Problemas Críticos,${report.summary.criticalProblems}`);
  lines.push(`Problemas Corrigidos,${report.summary.fixedProblems}`);
  lines.push(`Problemas Pendentes,${report.summary.pendingProblems}`);
  lines.push('');

  // Status do Sistema
  lines.push('STATUS DO SISTEMA');
  lines.push(`Status Geral,${report.systemHealth.overallStatus}`);
  lines.push('');

  // Métricas
  lines.push('MÉTRICAS');
  lines.push('Métrica,Valor');
  lines.push(`Total de Leads,${report.systemHealth.metrics.totalLeads}`);
  lines.push(`Sincronizações Bem-sucedidas,${report.systemHealth.metrics.syncSuccess}`);
  lines.push(`Falhas de Sincronização,${report.systemHealth.metrics.syncFailures}`);
  lines.push(`Sincronizações Pendentes,${report.systemHealth.metrics.syncPending}`);
  lines.push(`Taxa de Erro,${report.systemHealth.metrics.errorRate.toFixed(2)}%`);
  lines.push(`Tempo Médio de Resposta,${report.systemHealth.metrics.avgResponseTime}ms`);
  lines.push(`Usuários Ativos,${report.systemHealth.metrics.activeUsers}`);
  lines.push('');

  // Health Checks
  lines.push('HEALTH CHECKS');
  lines.push('Nome,Status,Mensagem,Tempo de Resposta (ms)');
  report.systemHealth.checks.forEach(check => {
    lines.push(
      `"${check.name}","${check.status}","${check.message}",${check.responseTime || 'N/A'}`
    );
  });
  lines.push('');

  // Problemas Detectados
  if (report.problems.length > 0) {
    lines.push('PROBLEMAS DETECTADOS');
    lines.push('Tipo,Severidade,Título,Descrição,Componente,Auto-Corrigível,Corrigido');
    report.problems.forEach(problem => {
      lines.push(
        `"${problem.type}","${problem.severity}","${problem.title}","${problem.description}","${problem.component}",${problem.canAutoFix ? 'Sim' : 'Não'},${problem.fixed ? 'Sim' : 'Não'}`
      );
    });
    lines.push('');
  }

  // Alertas
  if (report.alerts.length > 0) {
    lines.push('ALERTAS');
    lines.push('Severidade,Título,Mensagem,Data/Hora,Reconhecido');
    report.alerts.forEach(alert => {
      lines.push(
        `"${alert.severity}","${alert.title}","${alert.message}","${alert.timestamp.toLocaleString()}",${alert.acknowledged ? 'Sim' : 'Não'}`
      );
    });
  }

  return lines.join('\n');
}

/**
 * Exporta relatório como texto formatado
 */
export function exportReportAsText(report: DiagnosticReport): string {
  const lines: string[] = [];

  lines.push('═'.repeat(80));
  lines.push('RELATÓRIO DE DIAGNÓSTICO DO SISTEMA');
  lines.push('═'.repeat(80));
  lines.push('');
  lines.push(`📅 Gerado em: ${report.generatedAt.toLocaleString()}`);
  lines.push(`👤 Gerado por: ${report.generatedBy}`);
  lines.push(`⏰ Período: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}`);
  lines.push('');

  // Resumo
  lines.push('─'.repeat(80));
  lines.push('📊 RESUMO');
  lines.push('─'.repeat(80));
  lines.push(`Total de Problemas: ${report.summary.totalProblems}`);
  lines.push(`Problemas Críticos: ${report.summary.criticalProblems}`);
  lines.push(`Problemas Corrigidos: ${report.summary.fixedProblems}`);
  lines.push(`Problemas Pendentes: ${report.summary.pendingProblems}`);
  lines.push('');

  // Status do Sistema
  lines.push('─'.repeat(80));
  lines.push('🏥 STATUS DO SISTEMA');
  lines.push('─'.repeat(80));
  const statusEmoji = {
    'healthy': '✅',
    'warning': '⚠️',
    'critical': '🔴',
    'unknown': '❓',
  };
  lines.push(`Status Geral: ${statusEmoji[report.systemHealth.overallStatus]} ${report.systemHealth.overallStatus.toUpperCase()}`);
  lines.push('');

  // Métricas
  lines.push('─'.repeat(80));
  lines.push('📈 MÉTRICAS DO SISTEMA');
  lines.push('─'.repeat(80));
  lines.push(`Total de Leads: ${report.systemHealth.metrics.totalLeads}`);
  lines.push(`Sincronizações Bem-sucedidas: ${report.systemHealth.metrics.syncSuccess}`);
  lines.push(`Falhas de Sincronização: ${report.systemHealth.metrics.syncFailures}`);
  lines.push(`Sincronizações Pendentes: ${report.systemHealth.metrics.syncPending}`);
  lines.push(`Taxa de Erro: ${report.systemHealth.metrics.errorRate.toFixed(2)}%`);
  lines.push(`Tempo Médio de Resposta: ${report.systemHealth.metrics.avgResponseTime}ms`);
  lines.push(`Usuários Ativos: ${report.systemHealth.metrics.activeUsers}`);
  if (report.systemHealth.metrics.lastSyncTime) {
    lines.push(`Última Sincronização: ${report.systemHealth.metrics.lastSyncTime.toLocaleString()}`);
  }
  lines.push('');

  // Health Checks
  lines.push('─'.repeat(80));
  lines.push('🔍 HEALTH CHECKS');
  lines.push('─'.repeat(80));
  report.systemHealth.checks.forEach(check => {
    const emoji = statusEmoji[check.status];
    lines.push(`${emoji} ${check.name}`);
    lines.push(`   Status: ${check.status}`);
    lines.push(`   Mensagem: ${check.message}`);
    if (check.responseTime) {
      lines.push(`   Tempo de Resposta: ${check.responseTime}ms`);
    }
    lines.push('');
  });

  // Problemas
  if (report.problems.length > 0) {
    lines.push('─'.repeat(80));
    lines.push('⚠️  PROBLEMAS DETECTADOS');
    lines.push('─'.repeat(80));
    report.problems.forEach((problem, index) => {
      const severityEmoji = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '❌',
        'critical': '🔴',
      };
      lines.push(`${index + 1}. ${severityEmoji[problem.severity]} ${problem.title}`);
      lines.push(`   Tipo: ${problem.type}`);
      lines.push(`   Severidade: ${problem.severity}`);
      lines.push(`   Descrição: ${problem.description}`);
      lines.push(`   Componente: ${problem.component}`);
      lines.push(`   Auto-Corrigível: ${problem.canAutoFix ? 'Sim' : 'Não'}`);
      lines.push(`   Corrigido: ${problem.fixed ? 'Sim' : 'Não'}`);
      lines.push(`   Detectado em: ${problem.detectedAt.toLocaleString()}`);
      lines.push('');
    });
  } else {
    lines.push('─'.repeat(80));
    lines.push('✅ Nenhum problema detectado');
    lines.push('');
  }

  // Alertas
  if (report.alerts.length > 0) {
    lines.push('─'.repeat(80));
    lines.push('🔔 ALERTAS');
    lines.push('─'.repeat(80));
    report.alerts.forEach((alert, index) => {
      const severityEmoji = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '❌',
        'critical': '🔴',
      };
      lines.push(`${index + 1}. ${severityEmoji[alert.severity]} ${alert.title}`);
      lines.push(`   Mensagem: ${alert.message}`);
      lines.push(`   Data/Hora: ${alert.timestamp.toLocaleString()}`);
      lines.push(`   Reconhecido: ${alert.acknowledged ? 'Sim' : 'Não'}`);
      if (alert.acknowledged && alert.acknowledgedBy) {
        lines.push(`   Reconhecido por: ${alert.acknowledgedBy} em ${alert.acknowledgedAt?.toLocaleString()}`);
      }
      lines.push('');
    });
  }

  lines.push('═'.repeat(80));
  lines.push('Fim do Relatório');
  lines.push('═'.repeat(80));

  return lines.join('\n');
}

/**
 * Exporta relatório no formato especificado
 */
export async function exportReport(
  generatedBy: string,
  options: ReportExportOptions
): Promise<{ content: string; filename: string; mimeType: string }> {
  const report = await generateDiagnosticReport(generatedBy, options.period);

  let content: string;
  let filename: string;
  let mimeType: string;

  const timestamp = new Date().toISOString().split('T')[0];

  switch (options.format) {
    case 'json':
      content = exportReportAsJSON(report);
      filename = `diagnostic-report-${timestamp}.json`;
      mimeType = 'application/json';
      break;

    case 'csv':
      content = exportReportAsCSV(report);
      filename = `diagnostic-report-${timestamp}.csv`;
      mimeType = 'text/csv';
      break;

    case 'pdf':
      // Para PDF, usamos o formato texto por enquanto
      // Em produção, usar biblioteca como jsPDF ou pdfmake
      content = exportReportAsText(report);
      filename = `diagnostic-report-${timestamp}.txt`;
      mimeType = 'text/plain';
      break;

    default:
      throw new Error(`Formato não suportado: ${options.format}`);
  }

  return { content, filename, mimeType };
}

/**
 * Faz download do relatório no navegador
 */
export async function downloadReport(
  generatedBy: string,
  options: ReportExportOptions
): Promise<void> {
  const { content, filename, mimeType } = await exportReport(generatedBy, options);

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
