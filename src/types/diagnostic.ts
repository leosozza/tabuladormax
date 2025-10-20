/**
 * Tipos para o sistema de diagnóstico
 * Define interfaces e tipos para saúde do sistema, alertas e relatórios
 */

// Status de saúde do sistema
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

// Severidade dos alertas
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Tipo de problema detectado
export type ProblemType = 
  | 'database_connection'
  | 'sync_failure'
  | 'high_error_rate'
  | 'slow_response'
  | 'resource_exhaustion'
  | 'configuration_error'
  | 'api_error'
  | 'unknown';

// Interface para check de saúde de um componente
export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  lastChecked: Date;
  responseTime?: number;
  details?: Record<string, unknown>;
}

// Interface para o status geral do sistema
export interface SystemHealth {
  overallStatus: HealthStatus;
  timestamp: Date;
  checks: HealthCheck[];
  metrics: SystemMetrics;
}

// Métricas do sistema
export interface SystemMetrics {
  totalLeads: number;
  syncSuccess: number;
  syncFailures: number;
  syncPending: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  lastSyncTime?: Date;
}

// Interface para um problema detectado
export interface DetectedProblem {
  id: string;
  type: ProblemType;
  severity: AlertSeverity;
  title: string;
  description: string;
  detectedAt: Date;
  component: string;
  canAutoFix: boolean;
  fixed: boolean;
  fixedAt?: Date;
  metadata?: Record<string, unknown>;
}

// Interface para um alerta
export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  problem?: DetectedProblem;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// Interface para relatório de diagnóstico
export interface DiagnosticReport {
  id: string;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  systemHealth: SystemHealth;
  problems: DetectedProblem[];
  alerts: Alert[];
  summary: {
    totalProblems: number;
    criticalProblems: number;
    fixedProblems: number;
    pendingProblems: number;
  };
}

// Opções para exportação de relatório
export interface ReportExportOptions {
  format: 'pdf' | 'csv' | 'json';
  includeCharts: boolean;
  includeLogs: boolean;
  period?: {
    start: Date;
    end: Date;
  };
}

// Resultado de uma operação de auto-correção
export interface AutoFixResult {
  problemId: string;
  success: boolean;
  message: string;
  timestamp: Date;
  actions: string[];
  error?: string;
}

// Configuração de alertas
export interface AlertConfiguration {
  id: string;
  enabled: boolean;
  severity: AlertSeverity;
  problemType: ProblemType;
  threshold?: number;
  notificationChannels: ('email' | 'in-app' | 'webhook')[];
  recipients: string[];
}
