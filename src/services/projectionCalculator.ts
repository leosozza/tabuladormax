import { 
  getDay, 
  eachDayOfInterval, 
  startOfWeek, 
  addDays,
  differenceInDays
} from 'date-fns';
import type { HistoricalAnalysis, Projection, ScenarioProjection, ProjectionAdjustments } from '@/types/projection';
import { getHolidays, isHoliday } from './holidayService';

export function calculateProjection(
  analysis: HistoricalAnalysis,
  startDate: Date,
  endDate: Date,
  adjustments?: ProjectionAdjustments
): Projection {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const holidays = getHolidays(startDate.getFullYear());
  if (endDate.getFullYear() > startDate.getFullYear()) {
    holidays.push(...getHolidays(endDate.getFullYear()));
  }
  
  const unitValue = analysis.trend.avgValuePerLead || 0;
  
  let estimatedLeads = 0;
  let estimatedFichas = 0;
  let estimatedValue = 0;
  
  const byWeekday: { [key: number]: number } = {};
  const byWeek: { week: number; estimated: number; date: Date }[] = [];
  
  let currentWeek = 0;
  let weekStart = startOfWeek(startDate);
  let weekEstimate = 0;
  
  days.forEach((day, index) => {
    // Verificar se mudou de semana
    const dayWeekStart = startOfWeek(day);
    if (dayWeekStart.getTime() !== weekStart.getTime()) {
      if (weekEstimate > 0) {
        byWeek.push({ week: currentWeek, estimated: weekEstimate, date: weekStart });
      }
      currentWeek++;
      weekStart = dayWeekStart;
      weekEstimate = 0;
    }
    
    // Pular apenas feriados
    if (isHoliday(day, holidays)) {
      return;
    }
    
    const weekday = getDay(day);
    const dayOfMonth = day.getDate();
    
    // Determinar parte do mês
    let monthPart: 'inicio' | 'meio' | 'fim';
    if (dayOfMonth <= 10) {
      monthPart = 'inicio';
    } else if (dayOfMonth <= 20) {
      monthPart = 'meio';
    } else {
      monthPart = 'fim';
    }
    
    // Pegar performance base do dia da semana
    const weekdayPerf = analysis.performanceByWeekday[weekday];
    const monthPartPerf = analysis.performanceByMonthPart[monthPart];
    
    // Calcular estimativa baseada em média ponderada
    const dayFichas = (weekdayPerf.avgFichas * 0.6 + monthPartPerf.avgFichas * 0.4);
    const dayLeads = (weekdayPerf.avgLeads * 0.6 + monthPartPerf.avgLeads * 0.4);
    const dayValue = dayLeads * unitValue;
    
    // Aplicar ajustes se fornecidos
    let adjustmentFactor = 1;
    if (adjustments) {
      if (adjustments.growthPercentage) {
        adjustmentFactor *= (1 + adjustments.growthPercentage / 100);
      }
      if (adjustments.campaignBoost) {
        adjustmentFactor *= (1 + adjustments.campaignBoost / 100);
      }
    }
    
    estimatedLeads += dayLeads * adjustmentFactor;
    estimatedFichas += dayFichas * adjustmentFactor;
    estimatedValue += dayValue * adjustmentFactor;
    
    byWeekday[weekday] = (byWeekday[weekday] || 0) + dayFichas * adjustmentFactor;
    weekEstimate += dayFichas * adjustmentFactor;
  });
  
  // Adicionar última semana
  if (weekEstimate > 0) {
    byWeek.push({ week: currentWeek, estimated: weekEstimate, date: weekStart });
  }
  
  // Calcular nível de confiança baseado em quantidade de dados históricos
  const confidenceLevel = calculateConfidenceLevel(analysis);
  
  return {
    period: { start: startDate, end: endDate },
    estimatedLeads: Math.round(estimatedLeads),
    estimatedFichas: Math.round(estimatedFichas),
    estimatedValue: Math.round(estimatedValue),
    confidenceLevel,
    breakdown: {
      byWeekday,
      byWeek,
    },
  };
}

export function calculateScenarioProjections(
  analysis: HistoricalAnalysis,
  startDate: Date,
  endDate: Date,
  adjustments?: ProjectionAdjustments
): ScenarioProjection {
  // Cenário realista (base)
  const realistic = calculateProjection(analysis, startDate, endDate, adjustments);
  
  // Cenário otimista (+20%)
  const optimisticAdj = {
    ...adjustments,
    growthPercentage: (adjustments?.growthPercentage || 0) + 20,
  };
  const optimistic = calculateProjection(analysis, startDate, endDate, optimisticAdj);
  
  // Cenário conservador (-20%)
  const conservativeAdj = {
    ...adjustments,
    growthPercentage: (adjustments?.growthPercentage || 0) - 20,
  };
  const conservative = calculateProjection(analysis, startDate, endDate, conservativeAdj);
  
  return {
    optimistic,
    realistic,
    conservative,
  };
}

function calculateConfidenceLevel(analysis: HistoricalAnalysis): number {
  const { daysAnalyzed, totalLeads } = analysis.trend;
  
  // Base: mínimo 7 dias e 50 leads para confiança razoável
  let confidence = 0;
  
  // Fator dias (máximo 50 pontos)
  if (daysAnalyzed >= 90) {
    confidence += 50;
  } else if (daysAnalyzed >= 60) {
    confidence += 40;
  } else if (daysAnalyzed >= 30) {
    confidence += 30;
  } else if (daysAnalyzed >= 14) {
    confidence += 20;
  } else if (daysAnalyzed >= 7) {
    confidence += 10;
  }
  
  // Fator volume de leads (máximo 50 pontos)
  if (totalLeads >= 500) {
    confidence += 50;
  } else if (totalLeads >= 300) {
    confidence += 40;
  } else if (totalLeads >= 150) {
    confidence += 30;
  } else if (totalLeads >= 75) {
    confidence += 20;
  } else if (totalLeads >= 30) {
    confidence += 10;
  }
  
  return Math.min(confidence, 100);
}
