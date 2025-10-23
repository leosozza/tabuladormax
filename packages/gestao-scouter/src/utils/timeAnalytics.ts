/**
 * Time-based analytics utilities for dashboard performance metrics
 * Calculates intervals between fichas, work hours, and time-based insights
 */

import { parseISO, isValid, parse } from 'date-fns';

interface Lead {
  criado?: string;
  hora_criacao_ficha?: string;
  datahoracel?: string;
  [key: string]: any;
}

interface TimeMetrics {
  avgIntervalMinutes: number;
  workStartTime: string | null;
  workEndTime: string | null;
  totalWorkHours: number;
  leadsPerHour: number;
  fichasPerHour: number; // alias para compatibilidade
}

interface DailyTimeMetrics {
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  leadsCount: number;
  fichasCount: number; // alias para compatibilidade
  avgIntervalMinutes: number;
}

/**
 * Parse time from hora_criacao_ficha field (HH:mm format)
 */
function parseTime(timeStr: string | undefined): Date | null {
  if (!timeStr) return null;
  
  try {
    // Try parsing HH:mm format
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
    }
  } catch (error) {
    console.error('Error parsing time:', timeStr, error);
  }
  
  return null;
}

/**
 * Parse date from criado field (dd/MM/yyyy format)
 */
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  try {
    // Handle dd/MM/yyyy format
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split(' ')[0].split('/');
      if (day && month && year) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // Handle ISO format (yyyy-MM-dd)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateStr.slice(0, 10);
    }
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
  }
  
  return null;
}

/**
 * Calculate time interval in minutes between two times
 */
function getIntervalMinutes(time1: Date, time2: Date): number {
  return Math.abs((time2.getTime() - time1.getTime()) / (1000 * 60));
}

/**
 * Calculate overall time metrics for a set of fichas
 */
export function calculateTimeMetrics(fichas: Lead[]): TimeMetrics {
  const defaultMetrics: TimeMetrics = {
    avgIntervalMinutes: 0,
    workStartTime: null,
    workEndTime: null,
    totalWorkHours: 0,
    leadsPerHour: 0,
    fichasPerHour: 0,
  };

  if (!fichas || fichas.length === 0) return defaultMetrics;

  // Parse all times and dates
  const fichasWithTime = fichas
    .map(ficha => ({
      ficha,
      date: parseDate(ficha.criado),
      time: parseTime(ficha.hora_criacao_ficha),
    }))
    .filter(item => item.time !== null);

  if (fichasWithTime.length === 0) return defaultMetrics;

  // Sort by time
  fichasWithTime.sort((a, b) => {
    if (a.time && b.time) {
      return a.time.getTime() - b.time.getTime();
    }
    return 0;
  });

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < fichasWithTime.length; i++) {
    const prev = fichasWithTime[i - 1];
    const curr = fichasWithTime[i];
    
    if (prev.time && curr.time && prev.date === curr.date) {
      // Only calculate intervals for fichas on the same day
      const intervalMinutes = getIntervalMinutes(prev.time, curr.time);
      if (intervalMinutes > 0 && intervalMinutes < 300) { // Ignore intervals > 5 hours (likely different work sessions)
        intervals.push(intervalMinutes);
      }
    }
  }

  const avgIntervalMinutes = intervals.length > 0
    ? intervals.reduce((sum, val) => sum + val, 0) / intervals.length
    : 0;

  // Find work start and end times
  const firstTime = fichasWithTime[0]?.time;
  const lastTime = fichasWithTime[fichasWithTime.length - 1]?.time;

  const workStartTime = firstTime 
    ? `${String(firstTime.getHours()).padStart(2, '0')}:${String(firstTime.getMinutes()).padStart(2, '0')}`
    : null;

  const workEndTime = lastTime
    ? `${String(lastTime.getHours()).padStart(2, '0')}:${String(lastTime.getMinutes()).padStart(2, '0')}`
    : null;

  // Calculate total work hours (difference between first and last ficha)
  let totalWorkHours = 0;
  if (firstTime && lastTime) {
    totalWorkHours = getIntervalMinutes(firstTime, lastTime) / 60;
  }

  const fichasPerHour = totalWorkHours > 0 ? fichas.length / totalWorkHours : 0;
  const leadsPerHour = fichasPerHour; // mesmo valor

  return {
    avgIntervalMinutes: Math.round(avgIntervalMinutes),
    workStartTime,
    workEndTime,
    totalWorkHours: Number(totalWorkHours.toFixed(2)),
    leadsPerHour: Number(leadsPerHour.toFixed(2)),
    fichasPerHour: Number(fichasPerHour.toFixed(2)),
  };
}

/**
 * Calculate daily time metrics (work hours per day)
 */
export function calculateDailyTimeMetrics(fichas: Lead[]): DailyTimeMetrics[] {
  if (!fichas || fichas.length === 0) return [];

  // Group fichas by date
  const fichasByDate = new Map<string, Lead[]>();
  
  for (const ficha of fichas) {
    const date = parseDate(ficha.criado);
    if (date) {
      if (!fichasByDate.has(date)) {
        fichasByDate.set(date, []);
      }
      fichasByDate.get(date)!.push(ficha);
    }
  }

  // Calculate metrics for each day
  const dailyMetrics: DailyTimeMetrics[] = [];

  for (const [date, dayLeads] of fichasByDate.entries()) {
    // Parse all times for this day
    const times = dayLeads
      .map(ficha => parseTime(ficha.hora_criacao_ficha))
      .filter((time): time is Date => time !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    if (times.length === 0) continue;

    const firstTime = times[0];
    const lastTime = times[times.length - 1];

    const startTime = `${String(firstTime.getHours()).padStart(2, '0')}:${String(firstTime.getMinutes()).padStart(2, '0')}`;
    const endTime = `${String(lastTime.getHours()).padStart(2, '0')}:${String(lastTime.getMinutes()).padStart(2, '0')}`;

    const workHours = getIntervalMinutes(firstTime, lastTime) / 60;

    // Calculate intervals for this day
    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      const intervalMinutes = getIntervalMinutes(times[i - 1], times[i]);
      if (intervalMinutes > 0 && intervalMinutes < 300) {
        intervals.push(intervalMinutes);
      }
    }

    const avgIntervalMinutes = intervals.length > 0
      ? intervals.reduce((sum, val) => sum + val, 0) / intervals.length
      : 0;

    dailyMetrics.push({
      date,
      startTime,
      endTime,
      workHours: Number(workHours.toFixed(2)),
      leadsCount: dayLeads.length,
      fichasCount: dayLeads.length, // alias para compatibilidade
      avgIntervalMinutes: Math.round(avgIntervalMinutes),
    });
  }

  return dailyMetrics.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Format minutes to hours:minutes string
 */
export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h${mins > 0 ? mins + 'm' : ''}`;
}

/**
 * Get insights from time metrics
 */
export function getTimeInsights(metrics: TimeMetrics, dailyMetrics: DailyTimeMetrics[]): string[] {
  const insights: string[] = [];

  if (metrics.avgIntervalMinutes > 0) {
    if (metrics.avgIntervalMinutes < 10) {
      insights.push(`⚡ Ritmo muito rápido: ${metrics.avgIntervalMinutes}min entre fichas - ótima produtividade!`);
    } else if (metrics.avgIntervalMinutes < 20) {
      insights.push(`✅ Bom ritmo: ${metrics.avgIntervalMinutes}min entre fichas em média`);
    } else if (metrics.avgIntervalMinutes < 30) {
      insights.push(`⚠️ Ritmo moderado: ${metrics.avgIntervalMinutes}min entre fichas - pode melhorar`);
    } else {
      insights.push(`🐌 Ritmo lento: ${metrics.avgIntervalMinutes}min entre fichas - revisar estratégia`);
    }
  }

  if (metrics.workStartTime && metrics.workEndTime) {
    insights.push(`🕐 Horário de trabalho: ${metrics.workStartTime} às ${metrics.workEndTime}`);
  }

  if (metrics.totalWorkHours > 0) {
    if (metrics.totalWorkHours < 4) {
      insights.push(`⏱️ Jornada curta: ${metrics.totalWorkHours.toFixed(1)}h de trabalho`);
    } else if (metrics.totalWorkHours > 8) {
      insights.push(`💪 Jornada extensa: ${metrics.totalWorkHours.toFixed(1)}h de trabalho`);
    } else {
      insights.push(`⏰ Jornada regular: ${metrics.totalWorkHours.toFixed(1)}h de trabalho`);
    }
  }

  if (metrics.leadsPerHour > 0) {
    insights.push(`📊 Produtividade: ${metrics.leadsPerHour.toFixed(1)} fichas/hora`);
  }

  // Analyze daily consistency
  if (dailyMetrics.length > 1) {
    const avgDailyHours = dailyMetrics.reduce((sum, d) => sum + d.workHours, 0) / dailyMetrics.length;
    const variance = dailyMetrics.reduce((sum, d) => sum + Math.pow(d.workHours - avgDailyHours, 2), 0) / dailyMetrics.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 1) {
      insights.push(`🎯 Consistência excelente: jornada diária muito regular`);
    } else if (stdDev < 2) {
      insights.push(`📈 Boa consistência nas jornadas diárias`);
    } else {
      insights.push(`📉 Jornadas diárias variáveis - buscar mais regularidade`);
    }
  }

  return insights;
}
