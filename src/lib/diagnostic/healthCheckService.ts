/**
 * Serviço de Health Check
 * Responsável por verificar a saúde de diferentes componentes do sistema
 */

import { supabase } from "@/integrations/supabase/client";
import type { 
  HealthCheck, 
  SystemHealth, 
  HealthStatus, 
  SystemMetrics 
} from "@/types/diagnostic";

/**
 * Verifica a conexão com o banco de dados
 */
async function checkDatabaseConnection(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const { error } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        name: 'Database Connection',
        status: 'critical',
        message: `Falha na conexão: ${error.message}`,
        lastChecked: new Date(),
        responseTime,
        details: { error: error.message }
      };
    }

    const status: HealthStatus = responseTime > 1000 ? 'warning' : 'healthy';
    const message = responseTime > 1000 
      ? `Conexão lenta (${responseTime}ms)` 
      : 'Conexão estável';

    return {
      name: 'Database Connection',
      status,
      message,
      lastChecked: new Date(),
      responseTime,
    };
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'critical',
      message: 'Erro crítico na conexão',
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      details: { error: String(error) }
    };
  }
}

/**
 * Verifica o status de sincronização com Bitrix
 */
async function checkSyncStatus(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Verifica eventos de sync recentes com Bitrix (ambas direções)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: events, error } = await supabase
      .from('sync_events')
      .select('status, direction, error_message')
      .gte('created_at', oneHourAgo)
      .or('direction.eq.bitrix_to_supabase,direction.eq.supabase_to_bitrix')
      .order('created_at', { ascending: false })
      .limit(500);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        name: 'Bitrix Sync',
        status: 'warning',
        message: `Erro ao verificar sincronização: ${error.message}`,
        lastChecked: new Date(),
        responseTime,
      };
    }

    if (!events || events.length === 0) {
      return {
        name: 'Bitrix Sync',
        status: 'warning',
        message: 'Nenhum evento de sincronização na última hora',
        lastChecked: new Date(),
        responseTime,
      };
    }

    // Calcula métricas por direção
    const bitrixToSupabase = events.filter(e => e.direction === 'bitrix_to_supabase');
    const supabaseToBitrix = events.filter(e => e.direction === 'supabase_to_bitrix');
    
    const failedCount = events.filter(e => e.status === 'error').length;
    const failureRate = (failedCount / events.length) * 100;
    
    // Identifica o erro mais comum
    const errorMessages = events
      .filter(e => e.status === 'error' && e.error_message)
      .map(e => e.error_message);
    const commonError = errorMessages.length > 0 
      ? errorMessages[0]?.substring(0, 50) + (errorMessages[0]?.length > 50 ? '...' : '')
      : null;

    let status: HealthStatus = 'healthy';
    let message = `Sincronização operando normalmente (${events.length} eventos, ${(100 - failureRate).toFixed(1)}% sucesso)`;

    if (failureRate > 50) {
      status = 'critical';
      message = `Taxa de falha crítica: ${failureRate.toFixed(1)}%`;
    } else if (failureRate > 20) {
      status = 'warning';
      message = `Taxa de falha elevada: ${failureRate.toFixed(1)}%`;
    } else if (failedCount > 0) {
      // Erros baixos (< 20%) ainda mostram como healthy, mas com info
      message = `${events.length} eventos (${failedCount} erros, ${(100 - failureRate).toFixed(1)}% sucesso)`;
    }

    return {
      name: 'Bitrix Sync',
      status,
      message,
      lastChecked: new Date(),
      responseTime,
      details: { 
        totalEvents: events.length, 
        failedCount, 
        failureRate: failureRate.toFixed(2),
        byDirection: {
          bitrix_to_supabase: {
            total: bitrixToSupabase.length,
            errors: bitrixToSupabase.filter(e => e.status === 'error').length
          },
          supabase_to_bitrix: {
            total: supabaseToBitrix.length,
            errors: supabaseToBitrix.filter(e => e.status === 'error').length
          }
        },
        commonError
      }
    };
  } catch (error) {
    return {
      name: 'Bitrix Sync',
      status: 'warning',
      message: 'Erro ao verificar sincronização',
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      details: { error: String(error) }
    };
  }
}

/**
 * Verifica eventos de sincronização recentes
 */
async function checkRecentSyncEvents(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: events, error } = await supabase
      .from('sync_events')
      .select('status, created_at')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        name: 'Recent Sync Events',
        status: 'warning',
        message: `Erro ao verificar eventos: ${error.message}`,
        lastChecked: new Date(),
        responseTime,
      };
    }

    if (!events || events.length === 0) {
      return {
        name: 'Recent Sync Events',
        status: 'warning',
        message: 'Nenhum evento de sincronização na última hora',
        lastChecked: new Date(),
        responseTime,
      };
    }

    const failedEvents = events.filter(e => e.status === 'error').length;
    const successRate = ((events.length - failedEvents) / events.length) * 100;

    let status: HealthStatus = 'healthy';
    let message = `${events.length} eventos processados com sucesso`;

    if (successRate < 50) {
      status = 'critical';
      message = `Taxa de sucesso crítica: ${successRate.toFixed(1)}%`;
    } else if (successRate < 80) {
      status = 'warning';
      message = `Taxa de sucesso baixa: ${successRate.toFixed(1)}%`;
    }

    return {
      name: 'Recent Sync Events',
      status,
      message,
      lastChecked: new Date(),
      responseTime,
      details: { 
        totalEvents: events.length, 
        failedEvents, 
        successRate: successRate.toFixed(2) 
      }
    };
  } catch (error) {
    return {
      name: 'Recent Sync Events',
      status: 'warning',
      message: 'Erro ao verificar eventos recentes',
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      details: { error: String(error) }
    };
  }
}

/**
 * Coleta métricas do sistema
 */
async function collectSystemMetrics(): Promise<SystemMetrics> {
  try {
    // Busca estatísticas gerais dos leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Busca eventos de sync recentes (última hora)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: syncEvents } = await supabase
      .from('sync_events')
      .select('status, created_at')
      .gte('created_at', oneHourAgo);

    const syncSuccess = syncEvents?.filter(e => e.status === 'success').length || 0;
    const syncFailures = syncEvents?.filter(e => e.status === 'error').length || 0;
    const syncPending = 0; // Não temos mais fila de sync
    
    const errorRate = syncEvents && syncEvents.length > 0 
      ? (syncFailures / syncEvents.length) * 100 
      : 0;
    
    const lastSyncTime = syncEvents?.[0]?.created_at 
      ? new Date(syncEvents[0].created_at) 
      : undefined;

    // Busca usuários ativos
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    return {
      totalLeads: totalLeads || 0,
      syncSuccess,
      syncFailures,
      syncPending,
      errorRate,
      avgResponseTime: 0, // Calculado pelos health checks
      activeUsers: activeUsers || 0,
      lastSyncTime,
    };
  } catch (error) {
    console.error('Error collecting system metrics:', error);
    return {
      totalLeads: 0,
      syncSuccess: 0,
      syncFailures: 0,
      syncPending: 0,
      errorRate: 0,
      avgResponseTime: 0,
      activeUsers: 0,
    };
  }
}

/**
 * Determina o status geral do sistema baseado nos checks individuais
 */
function determineOverallStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.some(check => check.status === 'critical')) {
    return 'critical';
  }
  if (checks.some(check => check.status === 'warning')) {
    return 'warning';
  }
  if (checks.every(check => check.status === 'healthy')) {
    return 'healthy';
  }
  return 'unknown';
}

/**
 * Executa todos os health checks e retorna o status do sistema
 */
export async function performHealthCheck(): Promise<SystemHealth> {
  const checks = await Promise.all([
    checkDatabaseConnection(),
    checkSyncStatus(),
    checkRecentSyncEvents(),
  ]);

  const metrics = await collectSystemMetrics();

  // Calcula tempo médio de resposta
  const avgResponseTime = checks
    .filter(c => c.responseTime !== undefined)
    .reduce((sum, c) => sum + (c.responseTime || 0), 0) / checks.length;

  metrics.avgResponseTime = Math.round(avgResponseTime);

  const overallStatus = determineOverallStatus(checks);

  return {
    overallStatus,
    timestamp: new Date(),
    checks,
    metrics,
  };
}

/**
 * Executa um health check específico por nome
 */
export async function performSpecificCheck(checkName: string): Promise<HealthCheck | null> {
  switch (checkName.toLowerCase()) {
    case 'database':
    case 'database connection':
      return checkDatabaseConnection();
    case 'sync':
    case 'sync status':
      return checkSyncStatus();
    case 'events':
    case 'sync events':
      return checkRecentSyncEvents();
    default:
      return null;
  }
}
