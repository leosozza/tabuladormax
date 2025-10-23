import { format, parse, differenceInMinutes, differenceInHours } from 'date-fns';
import type { Lead } from '@/repositories/types';

/**
 * Extrai a data e hora de um lead, priorizando hora_criacao_ficha + criado,
 * e usando datahoracel como fallback
 */
function getLeadDateTime(lead: Lead): Date | null {
  try {
    // Prioridade 1: criado como timestamp
    if (lead.criado) {
      const date = new Date(lead.criado);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Fallback: data_criacao_ficha
    if (lead.data_criacao_ficha) {
      const date = new Date(lead.data_criacao_ficha);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao extrair data/hora do lead:', error);
    return null;
  }
}

/**
 * Agrupa leads por scouter e data
 */
function groupLeadsByScouterAndDate(leads: Lead[]): Record<string, Record<string, Lead[]>> {
  const grouped: Record<string, Record<string, Lead[]>> = {};

  leads.forEach(lead => {
    const scouter = lead.scouter || 'Sem Scouter';
    const dateTime = getLeadDateTime(lead);
    
    if (!dateTime) return;

    const dateKey = format(dateTime, 'yyyy-MM-dd');

    if (!grouped[scouter]) {
      grouped[scouter] = {};
    }
    if (!grouped[scouter][dateKey]) {
      grouped[scouter][dateKey] = [];
    }

    grouped[scouter][dateKey].push(lead);
  });

  return grouped;
}

/**
 * Calcula as horas trabalhadas por dia por scouter
 */
export function calculateWorkingHours(leads: Lead[]): {
  totalHours: number;
  averageHoursPerDay: number;
  dayCount: number;
} {
  const grouped = groupLeadsByScouterAndDate(leads);
  let totalHours = 0;
  let dayCount = 0;

  Object.values(grouped).forEach(scouterDays => {
    Object.values(scouterDays).forEach(dayLeads => {
      if (dayLeads.length === 0) return;

      const sortedLeads = dayLeads
        .map(lead => ({ lead, dateTime: getLeadDateTime(lead) }))
        .filter(item => item.dateTime !== null)
        .sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());

      if (sortedLeads.length === 0) return;
      if (sortedLeads.length === 1) {
        dayCount++;
        return;
      }

      const firstLead = sortedLeads[0].dateTime!;
      const lastLead = sortedLeads[sortedLeads.length - 1].dateTime!;
      const hoursWorked = differenceInHours(lastLead, firstLead, { roundingMethod: 'round' });

      totalHours += hoursWorked;
      dayCount++;
    });
  });

  return {
    totalHours,
    averageHoursPerDay: dayCount > 0 ? totalHours / dayCount : 0,
    dayCount
  };
}

/**
 * Calcula o tempo médio entre leads
 */
export function calculateAverageTimeBetweenLeads(leads: Lead[]): {
  averageMinutes: number;
  totalIntervals: number;
} {
  const grouped = groupLeadsByScouterAndDate(leads);
  let totalMinutes = 0;
  let intervalCount = 0;

  Object.values(grouped).forEach(scouterDays => {
    Object.values(scouterDays).forEach(dayLeads => {
      if (dayLeads.length < 2) return;

      const sortedLeads = dayLeads
        .map(lead => ({ lead, dateTime: getLeadDateTime(lead) }))
        .filter(item => item.dateTime !== null)
        .sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());

      if (sortedLeads.length < 2) return;

      for (let i = 1; i < sortedLeads.length; i++) {
        const prevLead = sortedLeads[i - 1].dateTime!;
        const currentLead = sortedLeads[i].dateTime!;
        const minutesBetween = differenceInMinutes(currentLead, prevLead);

        totalMinutes += minutesBetween;
        intervalCount++;
      }
    });
  });

  return {
    averageMinutes: intervalCount > 0 ? totalMinutes / intervalCount : 0,
    totalIntervals: intervalCount
  };
}

/**
 * Formata minutos em formato legível
 */
export function formatMinutesToReadable(minutes: number): string {
  if (minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

/**
 * Formata horas em formato legível
 */
export function formatHoursToReadable(hours: number): string {
  if (hours === 0) return '0h';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}min`;
  }
}
