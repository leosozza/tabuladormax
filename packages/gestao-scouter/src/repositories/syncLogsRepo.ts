import { supabase } from '@/integrations/supabase/client';
import type { SyncLog } from './types';

/**
 * Create a sync log entry
 */
export async function createSyncLog(log: Omit<SyncLog, 'id' | 'created_at'>): Promise<SyncLog | null> {
  try {
    const logEntry = {
      endpoint: log.endpoint || 'unknown',
      table_name: log.table_name || 'unknown',
      status: log.status || 'error',
      records_count: log.records_count,
      execution_time_ms: log.execution_time_ms,
      error_message: log.error_message,
      request_params: log.request_params as any,
      response_data: log.response_data as any,
      created_at: new Date().toISOString(),
    };

    // Log to console
    console.log('📝 [SyncLog]', {
      endpoint: log.endpoint,
      table: log.table_name,
      status: log.status,
      records: log.records_count,
      time: log.execution_time_ms ? `${log.execution_time_ms}ms` : 'N/A',
      error: log.error_message,
    });

    // Try to save to Supabase if table exists
    try {
      const { data, error } = await supabase
        .from('sync_logs_detailed')
        .insert([logEntry])
        .select()
        .single();

      if (error) throw error;
      return data as SyncLog;
    } catch (dbError) {
      // If table doesn't exist or other error, store in localStorage
      console.log('ℹ️ [SyncLogsRepo] Salvando log apenas no localStorage');
      const logs = getLocalSyncLogs();
      logs.unshift(logEntry as SyncLog);
      // Keep only last 100 logs
      const trimmedLogs = logs.slice(0, 100);
      localStorage.setItem('sync_logs_detailed', JSON.stringify(trimmedLogs));
      return logEntry as SyncLog;
    }
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao criar log:', error);
    return null;
  }
}

/**
 * Get recent sync logs
 * Attempts to fetch from sync_logs_detailed, falls back to sync_logs, then localStorage
 */
export async function getSyncLogs(limit: number = 50): Promise<SyncLog[]> {
  try {
    // Try to get from sync_logs_detailed first
    const { data, error } = await supabase
      .from('sync_logs_detailed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If sync_logs_detailed doesn't exist, try sync_logs as fallback
      if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205') {
        console.log('ℹ️ [SyncLogsRepo] Tabela sync_logs_detailed não encontrada, tentando sync_logs...');
        
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('sync_logs')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(limit);

          if (fallbackError) {
            // If both tables don't exist, use localStorage
            if (fallbackError.code === 'PGRST116' || fallbackError.code === '42P01' || fallbackError.code === 'PGRST204' || fallbackError.code === 'PGRST205') {
              console.log('ℹ️ [SyncLogsRepo] Tabela sync_logs também não encontrada, usando localStorage');
              return getLocalSyncLogs().slice(0, limit);
            }
            throw fallbackError;
          }

          // Map sync_logs format to SyncLog format
          const mapped = (fallbackData || []).map(log => ({
            id: log.id,
            endpoint: 'sync_logs',
            table_name: log.sync_direction || 'unknown',
            status: log.errors ? 'error' : 'success',
            records_count: log.records_synced || 0,
            execution_time_ms: log.processing_time_ms,
            error_message: log.errors ? JSON.stringify(log.errors) : undefined,
            created_at: log.started_at,
          }));

          console.log(`✅ [SyncLogsRepo] ${mapped.length} logs carregados de sync_logs (fallback)`);
          return mapped as SyncLog[];
        } catch (fallbackError) {
          console.log('⚠️ [SyncLogsRepo] Erro ao buscar de sync_logs, usando localStorage');
          return getLocalSyncLogs().slice(0, limit);
        }
      }
      throw error;
    }

    return (data || []) as SyncLog[];
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao buscar logs:', error);
    return getLocalSyncLogs().slice(0, limit);
  }
}

/**
 * Get sync logs from localStorage
 */
function getLocalSyncLogs(): SyncLog[] {
  try {
    const stored = localStorage.getItem('sync_logs_detailed');
    if (stored) {
      return JSON.parse(stored) as SyncLog[];
    }
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao ler logs do localStorage:', error);
  }
  return [];
}

/**
 * Clear all sync logs
 */
export async function clearSyncLogs(): Promise<boolean> {
  try {
    // Clear from Supabase
    try {
      const { error } = await supabase
        .from('sync_logs_detailed')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (!error) {
        console.log('✅ [SyncLogsRepo] Logs limpos do Supabase');
      }
    } catch (dbError) {
      console.log('ℹ️ [SyncLogsRepo] Não foi possível limpar logs do Supabase');
    }

    // Clear from localStorage
    localStorage.removeItem('sync_logs_detailed');
    console.log('✅ [SyncLogsRepo] Logs limpos do localStorage');
    return true;
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao limpar logs:', error);
    return false;
  }
}