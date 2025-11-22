import type { HistoricalAnalysis } from "@/types/projection";

export interface AggregatedData {
  weekdayStats: {
    [weekday: string]: {
      totalLeads: number;
      totalFichas: number;
      daysCount: number;
    };
  };
  monthPartStats: {
    inicio?: {
      totalLeads: number;
      totalFichas: number;
      daysCount: number;
    };
    meio?: {
      totalLeads: number;
      totalFichas: number;
      daysCount: number;
    };
    fim?: {
      totalLeads: number;
      totalFichas: number;
      daysCount: number;
    };
  };
  totals: {
    totalLeads: number;
    totalFichas: number;
    uniqueDays: number;
  };
  unitValue: number;
  totalValue: number;
}

/**
 * Converte dados agregados vindos do banco de dados para o formato HistoricalAnalysis
 * esperado pelo sistema de projeções
 */
export function convertAggregatedData(data: AggregatedData): HistoricalAnalysis {
  // Processar performance por dia da semana (0-6)
  const performanceByWeekday: HistoricalAnalysis['performanceByWeekday'] = {};
  
  for (let weekday = 0; weekday <= 6; weekday++) {
    const stats = data.weekdayStats[weekday.toString()];
    if (stats) {
      const avgLeads = stats.daysCount > 0 ? stats.totalLeads / stats.daysCount : 0;
      const avgFichas = stats.daysCount > 0 ? stats.totalFichas / stats.daysCount : 0;
      const conversionRate = stats.totalLeads > 0 ? stats.totalFichas / stats.totalLeads : 0;
      
      performanceByWeekday[weekday] = {
        avgLeads,
        avgFichas,
        avgValue: avgLeads * data.unitValue,
        conversionRate,
      };
    } else {
      performanceByWeekday[weekday] = {
        avgLeads: 0,
        avgFichas: 0,
        avgValue: 0,
        conversionRate: 0,
      };
    }
  }

  // Processar performance por parte do mês
  const performanceByMonthPart: HistoricalAnalysis['performanceByMonthPart'] = {
    inicio: { avgLeads: 0, avgFichas: 0, avgValue: 0 },
    meio: { avgLeads: 0, avgFichas: 0, avgValue: 0 },
    fim: { avgLeads: 0, avgFichas: 0, avgValue: 0 },
  };

  if (data.monthPartStats.inicio) {
    const stats = data.monthPartStats.inicio;
    performanceByMonthPart.inicio = {
      avgLeads: stats.daysCount > 0 ? stats.totalLeads / stats.daysCount : 0,
      avgFichas: stats.daysCount > 0 ? stats.totalFichas / stats.daysCount : 0,
      avgValue: stats.daysCount > 0 ? (stats.totalLeads / stats.daysCount) * data.unitValue : 0,
    };
  }

  if (data.monthPartStats.meio) {
    const stats = data.monthPartStats.meio;
    performanceByMonthPart.meio = {
      avgLeads: stats.daysCount > 0 ? stats.totalLeads / stats.daysCount : 0,
      avgFichas: stats.daysCount > 0 ? stats.totalFichas / stats.daysCount : 0,
      avgValue: stats.daysCount > 0 ? (stats.totalLeads / stats.daysCount) * data.unitValue : 0,
    };
  }

  if (data.monthPartStats.fim) {
    const stats = data.monthPartStats.fim;
    performanceByMonthPart.fim = {
      avgLeads: stats.daysCount > 0 ? stats.totalLeads / stats.daysCount : 0,
      avgFichas: stats.daysCount > 0 ? stats.totalFichas / stats.daysCount : 0,
      avgValue: stats.daysCount > 0 ? (stats.totalLeads / stats.daysCount) * data.unitValue : 0,
    };
  }

  // Calcular tendência geral
  const avgConversionRate = data.totals.totalLeads > 0 
    ? data.totals.totalFichas / data.totals.totalLeads 
    : 0;

  const trend: HistoricalAnalysis['trend'] = {
    totalLeads: data.totals.totalLeads,
    totalFichas: data.totals.totalFichas,
    totalValue: data.totalValue,
    avgConversionRate,
    avgValuePerLead: data.unitValue,
    daysAnalyzed: data.totals.uniqueDays,
  };

  return {
    performanceByWeekday,
    performanceByMonthPart,
    trend,
  };
}
