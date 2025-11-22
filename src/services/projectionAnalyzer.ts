import { startOfDay, getDay } from 'date-fns';
import type { HistoricalAnalysis } from '@/types/projection';

interface Lead {
  criado: string | null;
  ficha_confirmada: boolean | null;
  valor_ficha: number | null;
}

function calculateUnitValue(leads: Lead[]) {
  const leadsWithValue = leads.filter(l => l.valor_ficha !== null && l.valor_ficha !== undefined);
  
  if (leadsWithValue.length === 0) {
    return {
      unitValue: 0,
      totalValue: 0,
    };
  }

  const totalValueFromPaid = leadsWithValue.reduce(
    (sum, l) => sum + (Number(l.valor_ficha) || 0),
    0
  );

  const unitValue = totalValueFromPaid / leadsWithValue.length;
  const totalLeads = leads.length;
  const normalizedTotalValue = unitValue * totalLeads;

  return {
    unitValue,
    totalValue: normalizedTotalValue,
  };
}

export function analyzeHistoricalData(leads: Lead[]): HistoricalAnalysis {
  const { unitValue, totalValue } = calculateUnitValue(leads);
  
  const performanceByWeekday = calculateWeekdayPerformance(leads, unitValue);
  const performanceByMonthPart = calculateMonthPartPerformance(leads, unitValue);
  const trend = calculateTrends(leads, unitValue, totalValue);
  
  return {
    performanceByWeekday,
    performanceByMonthPart,
    trend,
  };
}

function calculateWeekdayPerformance(leads: Lead[], unitValue: number) {
  const weekdayData: {
    [key: number]: {
      leads: number;
      fichas: number;
      days: Set<string>;
    };
  } = {};
  
  // Inicializar dados para cada dia da semana
  for (let i = 0; i < 7; i++) {
    weekdayData[i] = { leads: 0, fichas: 0, days: new Set() };
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
      avgValue: (data.leads / daysCount) * unitValue,
      conversionRate: data.leads > 0 ? (data.fichas / data.leads) * 100 : 0,
    };
  }
  
  return result;
}

function calculateMonthPartPerformance(leads: Lead[], unitValue: number) {
  const partData = {
    inicio: { leads: 0, fichas: 0, days: new Set<string>() },
    meio: { leads: 0, fichas: 0, days: new Set<string>() },
    fim: { leads: 0, fichas: 0, days: new Set<string>() },
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
    }
  });
  
  // Calcular médias
  return {
    inicio: {
      avgLeads: partData.inicio.leads / (partData.inicio.days.size || 1),
      avgFichas: partData.inicio.fichas / (partData.inicio.days.size || 1),
      avgValue: (partData.inicio.leads / (partData.inicio.days.size || 1)) * unitValue,
    },
    meio: {
      avgLeads: partData.meio.leads / (partData.meio.days.size || 1),
      avgFichas: partData.meio.fichas / (partData.meio.days.size || 1),
      avgValue: (partData.meio.leads / (partData.meio.days.size || 1)) * unitValue,
    },
    fim: {
      avgLeads: partData.fim.leads / (partData.fim.days.size || 1),
      avgFichas: partData.fim.fichas / (partData.fim.days.size || 1),
      avgValue: (partData.fim.leads / (partData.fim.days.size || 1)) * unitValue,
    },
  };
}

function calculateTrends(leads: Lead[], unitValue: number, totalValue: number) {
  const totalLeads = leads.length;
  const fichasConfirmadas = leads.filter(l => l.ficha_confirmada);
  const totalFichas = fichasConfirmadas.length;
  
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
    avgValuePerLead: unitValue,
    daysAnalyzed: uniqueDays.size,
  };
}
