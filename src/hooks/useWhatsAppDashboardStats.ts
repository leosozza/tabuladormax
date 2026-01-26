import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardKPIs {
  total: number;
  open_windows: number;
  waiting: number;
  never: number;
  replied: number;
  unread: number;
}

interface DailyVolume {
  date: string;
  received: number;
  sent: number;
}

interface HourlyDistribution {
  hour: number;
  count: number;
}

interface TopOperator {
  name: string;
  messages: number;
}

interface StatusDistribution {
  replied: number;
  waiting: number;
  never: number;
}

interface DashboardStats {
  kpis: DashboardKPIs;
  daily_volume: DailyVolume[];
  hourly_distribution: HourlyDistribution[];
  top_operators: TopOperator[];
  closed_count: number;
  status_distribution: StatusDistribution;
}

export function useWhatsAppDashboardStats() {
  return useQuery({
    queryKey: ['whatsapp-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc('get_whatsapp_dashboard_stats');
      
      if (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
      
      return data as unknown as DashboardStats;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
  });
}

export type { DashboardStats, DashboardKPIs, DailyVolume, HourlyDistribution, TopOperator, StatusDistribution };
