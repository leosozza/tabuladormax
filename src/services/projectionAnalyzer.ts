import { startOfDay, getDay } from 'date-fns';
import type { HistoricalAnalysis } from '@/types/projection';

interface Lead {
  criado: string | null;
  ficha_confirmada: boolean | null;
  valor_ficha: number | null;
}

export function analyzeHistoricalData(leads: Lead[]): HistoricalAnalysis {
  const performanceByWeekday = calculateWeekdayPerformance(leads);
  const performanceByMonthPart = calculateMonthPartPerformance(leads);
  const trend = calculateTrends(leads);
  
  return {
    performanceByWeekday,
    performanceByMonthPart,
    trend,
  };
}

function calculateWeekdayPerformance(leads: Lead[]) {
  const weekdayData: {
    [key: number]: {
      leads: number;
      fichas: number;
      totalValue: number;
      days: Set<string>;
    };
  } = {};
  
  // Inicializar dados para cada dia da semana
  for (let i = 0; i < 7; i++) {
    weekdayData[i] = { leads: 0, fichas: 0, totalValue: 0, days: new Set() };
  }
  
  leads.forEach(lead => {
    if (!lead.criado) return;
    
    const date = new Date(lead.criado);
    const weekday = getDay(date);
    const dayKey = startOfDay(date).toISOString();
    
    weekdayData[weekday].days.add(dayKey);
    weekdayData[weekday].leads++;
    
    if (lead.ficha_confirmada) {
      weekdayData[weekday].fichas++;
      weekdayData[weekday].totalValue += Number(lead.valor_ficha) || 0;
    }
  });
  
  // Calcular médias
  const result: HistoricalAnalysis['performanceByWeekday'] = {};
  
  for (let i = 0; i < 7; i++) {
    const data = weekdayData[i];
    const daysCount = data.days.size || 1;
    
    result[i] = {
      avgLeads: data.leads / daysCount,
      avgFichas: data.fichas / daysCount,
      avgValue: data.totalValue / daysCount,
      conversionRate: data.leads > 0 ? (data.fichas / data.leads) * 100 : 0,
    };
  }
  
  return result;
}

function calculateMonthPartPerformance(leads: Lead[]) {
  const partData = {
    inicio: { leads: 0, fichas: 0, totalValue: 0, days: new Set<string>() },
    meio: { leads: 0, fichas: 0, totalValue: 0, days: new Set<string>() },
    fim: { leads: 0, fichas: 0, totalValue: 0, days: new Set<string>() },
  };
  
  leads.forEach(lead => {
    if (!lead.criado) return;
    
    const date = new Date(lead.criado);
    const dayOfMonth = date.getDate();
    const dayKey = startOfDay(date).toISOString();
    
    let part: 'inicio' | 'meio' | 'fim';
    if (dayOfMonth <= 10) {
      part = 'inicio';
    } else if (dayOfMonth <= 20) {
      part = 'meio';
    } else {
      part = 'fim';
    }
    
    partData[part].days.add(dayKey);
    partData[part].leads++;
    
    if (lead.ficha_confirmada) {
      partData[part].fichas++;
      partData[part].totalValue += Number(lead.valor_ficha) || 0;
    }
  });
  
  // Calcular médias
  return {
    inicio: {
      avgLeads: partData.inicio.leads / (partData.inicio.days.size || 1),
      avgFichas: partData.inicio.fichas / (partData.inicio.days.size || 1),
      avgValue: partData.inicio.totalValue / (partData.inicio.days.size || 1),
    },
    meio: {
      avgLeads: partData.meio.leads / (partData.meio.days.size || 1),
      avgFichas: partData.meio.fichas / (partData.meio.days.size || 1),
      avgValue: partData.meio.totalValue / (partData.meio.days.size || 1),
    },
    fim: {
      avgLeads: partData.fim.leads / (partData.fim.days.size || 1),
      avgFichas: partData.fim.fichas / (partData.fim.days.size || 1),
      avgValue: partData.fim.totalValue / (partData.fim.days.size || 1),
    },
  };
}

function calculateTrends(leads: Lead[]) {
  const totalLeads = leads.length;
  const fichasConfirmadas = leads.filter(l => l.ficha_confirmada);
  const totalFichas = fichasConfirmadas.length;
  const totalValue = fichasConfirmadas.reduce(
    (sum, l) => sum + (Number(l.valor_ficha) || 0),
    0
  );
  
  // Calcular dias únicos analisados
  const uniqueDays = new Set(
    leads
      .filter(l => l.criado)
      .map(l => startOfDay(new Date(l.criado!)).toISOString())
  );
  
  return {
    totalLeads,
    totalFichas,
    totalValue,
    avgConversionRate: totalLeads > 0 ? (totalFichas / totalLeads) * 100 : 0,
    avgValuePerFicha: totalFichas > 0 ? totalValue / totalFichas : 0,
    daysAnalyzed: uniqueDays.size,
  };
}
