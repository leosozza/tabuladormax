export interface HistoricalAnalysis {
  // Performance por dia da semana (0=domingo, 6=sábado)
  performanceByWeekday: {
    [weekday: number]: {
      avgLeads: number;
      avgFichas: number;
      avgValue: number;
      conversionRate: number;
    };
  };
  
  // Performance por parte do mês
  performanceByMonthPart: {
    inicio: { avgLeads: number; avgFichas: number; avgValue: number };
    meio: { avgLeads: number; avgFichas: number; avgValue: number };
    fim: { avgLeads: number; avgFichas: number; avgValue: number };
  };
  
  // Tendência geral
  trend: {
    totalLeads: number;
    totalFichas: number;
    totalValue: number;
    avgConversionRate: number;
    avgValuePerLead: number;
    daysAnalyzed: number;
  };
}

export interface Projection {
  period: { start: Date; end: Date };
  estimatedLeads: number;
  estimatedFichas: number;
  estimatedValue: number;
  confidenceLevel: number; // 0-100%
  breakdown: {
    byWeekday: { [weekday: number]: number };
    byWeek: { week: number; estimated: number; date: Date }[];
  };
}

export interface ScenarioProjection {
  optimistic: Projection;
  realistic: Projection;
  conservative: Projection;
}

export interface ProjectionAdjustments {
  growthPercentage?: number;
  campaignBoost?: number;
  specialConditions?: string;
}
