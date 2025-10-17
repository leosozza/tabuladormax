import { format, subDays, subHours, subMinutes, subMonths, subWeeks } from 'date-fns';

export type Period = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface PeriodConfig {
  startDate: Date;
  groupBy: string;
  format: string;
  label: string;
}

export const getPeriodConfig = (period: Period): PeriodConfig => {
  const now = new Date();
  
  switch (period) {
    case 'minute':
      return {
        startDate: subMinutes(now, 60),
        groupBy: 'minute',
        format: 'HH:mm',
        label: 'Últimos 60 minutos'
      };
    case 'hour':
      return {
        startDate: subHours(now, 24),
        groupBy: 'hour',
        format: 'HH:00',
        label: 'Últimas 24 horas'
      };
    case 'day':
      return {
        startDate: subDays(now, 30),
        groupBy: 'day',
        format: 'dd/MM',
        label: 'Últimos 30 dias'
      };
    case 'week':
      return {
        startDate: subWeeks(now, 12),
        groupBy: 'week',
        format: "'Sem' w",
        label: 'Últimas 12 semanas'
      };
    case 'month':
      return {
        startDate: subMonths(now, 12),
        groupBy: 'month',
        format: 'MMM/yy',
        label: 'Últimos 12 meses'
      };
  }
};

export interface SyncEvent {
  created_at: string;
  status: string;
  direction: string;
}

export interface GroupedData {
  period: string;
  success: number;
  error: number;
  total: number;
}

export const groupDataByPeriod = (
  data: SyncEvent[] | null,
  period: Period
): GroupedData[] => {
  if (!data || data.length === 0) {
    console.warn('⚠️ groupDataByPeriod: No data to group');
    return [];
  }

  console.log(`📊 Grouping ${data.length} events by ${period}`);
  
  const config = getPeriodConfig(period);
  const grouped = new Map<string, { success: number; error: number }>();

  data.forEach((event) => {
    const date = new Date(event.created_at);
    const key = format(date, config.format);
    
    if (!grouped.has(key)) {
      grouped.set(key, { success: 0, error: 0 });
    }
    
    const current = grouped.get(key)!;
    if (event.status === 'success') {
      current.success++;
    } else if (event.status === 'error') {
      current.error++;
    }
  });

  const result = Array.from(grouped.entries()).map(([period, counts]) => ({
    period,
    success: counts.success,
    error: counts.error,
    total: counts.success + counts.error
  })).sort((a, b) => a.period.localeCompare(b.period));

  console.log(`✅ Grouped into ${result.length} periods:`, result.slice(0, 5));
  
  return result;
};

export const calculateMetrics = (data: SyncEvent[] | null) => {
  if (!data || data.length === 0) {
    return {
      total: 0,
      success: 0,
      errors: 0,
      successRate: '0',
      avgSpeed: '0'
    };
  }

  const total = data.length;
  const success = data.filter(e => e.status === 'success').length;
  const errors = data.filter(e => e.status === 'error').length;
  const successRate = total > 0 ? (success / total * 100).toFixed(1) : '0';
  const avgSpeed = (total / 5).toFixed(1); // leads/min nos últimos 5min

  return {
    total,
    success,
    errors,
    successRate,
    avgSpeed
  };
};

export const groupByDirection = (data: SyncEvent[] | null) => {
  if (!data || data.length === 0) return [];

  const grouped = new Map<string, number>();
  
  data.forEach((event) => {
    const direction = event.direction;
    grouped.set(direction, (grouped.get(direction) || 0) + 1);
  });

  const directionLabels: Record<string, string> = {
    'bitrix_to_supabase': 'Bitrix → Supabase',
    'supabase_to_bitrix': 'Supabase → Bitrix',
    'supabase_to_gestao_scouter': 'Supabase → Gestão Scouter',
    'gestao_scouter_to_supabase': 'Gestão Scouter → Supabase',
    'csv_import': 'Importação CSV'
  };

  return Array.from(grouped.entries()).map(([name, value]) => ({
    name: directionLabels[name] || name,
    value
  }));
};
