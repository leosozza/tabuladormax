import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RateLimitStats {
  messages_last_hour: number;
  messages_last_24h: number;
  blocked_last_hour: number;
  active_alerts: number;
  critical_alerts: number;
  blocked_numbers: number;
  top_senders: Array<{ phone_number: string; count: number }>;
}

interface LoopAlert {
  id: string;
  phone_number: string;
  alert_type: string;
  severity: 'warning' | 'critical';
  message_count: number;
  time_window_seconds: number;
  details: Record<string, any>;
  resolved: boolean;
  created_at: string;
}

interface BlockedNumber {
  id: string;
  phone_number: string;
  reason: string;
  blocked_until: string | null;
  created_at: string;
}

export function useRateLimitMonitor() {
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [alerts, setAlerts] = useState<LoopAlert[]>([]);
  const [blockedNumbers, setBlockedNumbers] = useState<BlockedNumber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_rate_limit_stats');
      if (error) throw error;
      setStats(data as unknown as RateLimitStats);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  }, []);

  const fetchAlerts = useCallback(async (unresolvedOnly = true) => {
    try {
      let query = supabase
        .from('loop_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (unresolvedOnly) {
        query = query.eq('resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data as LoopAlert[]);
    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
    }
  }, []);

  const fetchBlockedNumbers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_numbers')
        .select('*')
        .is('unblocked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlockedNumbers(data as BlockedNumber[]);
    } catch (err) {
      console.error('Erro ao buscar números bloqueados:', err);
    }
  }, []);

  const unblockNumber = useCallback(async (phoneNumber: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc('unblock_phone_number', {
        p_phone_number: phoneNumber,
        p_user_id: user?.id || null
      });
      
      if (error) throw error;
      
      // Atualizar listas
      await Promise.all([fetchBlockedNumbers(), fetchAlerts(), fetchStats()]);
      
      return true;
    } catch (err) {
      console.error('Erro ao desbloquear número:', err);
      return false;
    }
  }, [fetchBlockedNumbers, fetchAlerts, fetchStats]);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('loop_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', alertId);
      
      if (error) throw error;
      
      await Promise.all([fetchAlerts(), fetchStats()]);
      return true;
    } catch (err) {
      console.error('Erro ao resolver alerta:', err);
      return false;
    }
  }, [fetchAlerts, fetchStats]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchAlerts(), fetchBlockedNumbers()]);
    setLoading(false);
  }, [fetchStats, fetchAlerts, fetchBlockedNumbers]);

  useEffect(() => {
    refresh();

    // Atualizar a cada 30 segundos
    const interval = setInterval(refresh, 30000);

    // Subscribe to realtime updates
    const alertsChannel = supabase
      .channel('loop-alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loop_alerts' },
        () => {
          fetchAlerts();
          fetchStats();
        }
      )
      .subscribe();

    const blockedChannel = supabase
      .channel('blocked-numbers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_numbers' },
        () => {
          fetchBlockedNumbers();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(blockedChannel);
    };
  }, [refresh, fetchAlerts, fetchStats, fetchBlockedNumbers]);

  return {
    stats,
    alerts,
    blockedNumbers,
    loading,
    refresh,
    unblockNumber,
    resolveAlert
  };
}
