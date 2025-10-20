/**
 * Serviço de Alertas
 * Gerencia alertas automáticos para administradores sobre problemas críticos
 */

import type { 
  Alert, 
  DetectedProblem, 
  AlertConfiguration,
  AlertSeverity 
} from "@/types/diagnostic";

// Simulação de storage de alertas (em produção seria no banco)
let alertsStore: Alert[] = [];
let alertConfigStore: AlertConfiguration[] = [];

/**
 * Cria um alerta a partir de um problema detectado
 */
export function createAlert(problem: DetectedProblem): Alert {
  const alert: Alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    severity: problem.severity,
    title: problem.title,
    message: problem.description,
    timestamp: new Date(),
    problem,
    acknowledged: false,
  };

  alertsStore.push(alert);
  
  // Envia notificação se configurado
  sendNotification(alert);
  
  return alert;
}

/**
 * Lista todos os alertas
 */
export function listAlerts(options?: {
  severity?: AlertSeverity;
  acknowledged?: boolean;
  limit?: number;
}): Alert[] {
  let alerts = [...alertsStore];

  if (options?.severity) {
    alerts = alerts.filter(a => a.severity === options.severity);
  }

  if (options?.acknowledged !== undefined) {
    alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
  }

  // Ordena por timestamp (mais recentes primeiro)
  alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options?.limit) {
    alerts = alerts.slice(0, options.limit);
  }

  return alerts;
}

/**
 * Lista apenas alertas não reconhecidos
 */
export function listUnacknowledgedAlerts(): Alert[] {
  return listAlerts({ acknowledged: false });
}

/**
 * Lista alertas críticos não reconhecidos
 */
export function listCriticalAlerts(): Alert[] {
  return listAlerts({ 
    severity: 'critical', 
    acknowledged: false 
  });
}

/**
 * Reconhece um alerta
 */
export function acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert | null {
  const alert = alertsStore.find(a => a.id === alertId);
  
  if (!alert) {
    return null;
  }

  alert.acknowledged = true;
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = acknowledgedBy;

  return alert;
}

/**
 * Reconhece múltiplos alertas
 */
export function acknowledgeMultipleAlerts(alertIds: string[], acknowledgedBy: string): number {
  let count = 0;
  
  for (const id of alertIds) {
    const result = acknowledgeAlert(id, acknowledgedBy);
    if (result) {
      count++;
    }
  }
  
  return count;
}

/**
 * Reconhece todos os alertas não críticos
 */
export function acknowledgeAllNonCritical(acknowledgedBy: string): number {
  const nonCriticalAlerts = alertsStore.filter(
    a => !a.acknowledged && a.severity !== 'critical'
  );
  
  return acknowledgeMultipleAlerts(
    nonCriticalAlerts.map(a => a.id),
    acknowledgedBy
  );
}

/**
 * Remove alertas antigos (útil para limpeza)
 */
export function cleanupOldAlerts(daysToKeep: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const initialCount = alertsStore.length;
  alertsStore = alertsStore.filter(
    a => a.timestamp > cutoffDate || !a.acknowledged
  );
  
  return initialCount - alertsStore.length;
}

/**
 * Obtém estatísticas dos alertas
 */
export function getAlertStatistics() {
  const total = alertsStore.length;
  const unacknowledged = alertsStore.filter(a => !a.acknowledged).length;
  const critical = alertsStore.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const errors = alertsStore.filter(a => a.severity === 'error' && !a.acknowledged).length;
  const warnings = alertsStore.filter(a => a.severity === 'warning' && !a.acknowledged).length;

  return {
    total,
    unacknowledged,
    acknowledged: total - unacknowledged,
    bySeverity: {
      critical,
      error: errors,
      warning: warnings,
      info: unacknowledged - critical - errors - warnings,
    }
  };
}

/**
 * Envia notificação para um alerta
 */
function sendNotification(alert: Alert) {
  // Busca configuração de alerta para o tipo de problema
  if (!alert.problem) {
    return;
  }

  const config = alertConfigStore.find(
    c => c.enabled && c.problemType === alert.problem?.type
  );

  if (!config) {
    // Log para desenvolvimento
    console.log('📢 Novo Alerta:', {
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp,
    });
    return;
  }

  // Verifica se a severidade atinge o threshold
  const severityLevel = {
    'info': 0,
    'warning': 1,
    'error': 2,
    'critical': 3,
  };

  if (severityLevel[alert.severity] < severityLevel[config.severity]) {
    return;
  }

  // Envia notificações conforme canais configurados
  for (const channel of config.notificationChannels) {
    switch (channel) {
      case 'email':
        sendEmailNotification(alert, config.recipients);
        break;
      case 'in-app':
        sendInAppNotification(alert);
        break;
      case 'webhook':
        sendWebhookNotification(alert);
        break;
    }
  }
}

/**
 * Envia notificação por email (placeholder)
 */
function sendEmailNotification(alert: Alert, recipients: string[]) {
  console.log('📧 Email notification enviado para:', recipients);
  console.log('Alerta:', alert.title);
  // Em produção, integrar com serviço de email
}

/**
 * Envia notificação in-app (placeholder)
 */
function sendInAppNotification(alert: Alert) {
  console.log('🔔 Notificação in-app criada:', alert.title);
  // Em produção, usar sistema de notificações do app (toast, etc)
}

/**
 * Envia notificação via webhook (placeholder)
 */
function sendWebhookNotification(alert: Alert) {
  console.log('🔗 Webhook notification enviado:', alert.title);
  // Em produção, fazer POST para webhook configurado
}

/**
 * Cria uma nova configuração de alerta
 */
export function createAlertConfiguration(config: Omit<AlertConfiguration, 'id'>): AlertConfiguration {
  const newConfig: AlertConfiguration = {
    id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...config,
  };

  alertConfigStore.push(newConfig);
  return newConfig;
}

/**
 * Lista todas as configurações de alerta
 */
export function listAlertConfigurations(): AlertConfiguration[] {
  return [...alertConfigStore];
}

/**
 * Atualiza uma configuração de alerta
 */
export function updateAlertConfiguration(
  configId: string, 
  updates: Partial<Omit<AlertConfiguration, 'id'>>
): AlertConfiguration | null {
  const config = alertConfigStore.find(c => c.id === configId);
  
  if (!config) {
    return null;
  }

  Object.assign(config, updates);
  return config;
}

/**
 * Remove uma configuração de alerta
 */
export function deleteAlertConfiguration(configId: string): boolean {
  const initialLength = alertConfigStore.length;
  alertConfigStore = alertConfigStore.filter(c => c.id !== configId);
  return alertConfigStore.length < initialLength;
}

/**
 * Cria alertas para uma lista de problemas
 */
export function createAlertsFromProblems(problems: DetectedProblem[]): Alert[] {
  return problems.map(problem => createAlert(problem));
}

/**
 * Inicializa configurações padrão de alerta
 */
export function initializeDefaultAlertConfigurations() {
  // Limpa configurações existentes
  alertConfigStore = [];

  // Configurações padrão
  const defaultConfigs: Omit<AlertConfiguration, 'id'>[] = [
    {
      enabled: true,
      severity: 'critical',
      problemType: 'database_connection',
      notificationChannels: ['in-app', 'email'],
      recipients: ['admin@example.com'],
    },
    {
      enabled: true,
      severity: 'error',
      problemType: 'sync_failure',
      threshold: 10,
      notificationChannels: ['in-app'],
      recipients: [],
    },
    {
      enabled: true,
      severity: 'error',
      problemType: 'high_error_rate',
      threshold: 30,
      notificationChannels: ['in-app', 'email'],
      recipients: ['admin@example.com'],
    },
  ];

  defaultConfigs.forEach(config => createAlertConfiguration(config));
}
