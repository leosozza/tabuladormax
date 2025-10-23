// @ts-nocheck
// Repositório de projeções - 100% Supabase
import { getValorFichaFromRow, mediaValorPorFicha } from '@/utils/values';
import { supabase } from '@/integrations/supabase/client';
import { toISODate } from '@/utils/normalize';

export interface ProjectionData {
  name: string; // Pode ser scouter ou projeto
  semana_futura: number;
  semana_label: string;
  weekly_goal: number;
  tier_name: string;
  projecao_conservadora: number;
  projecao_provavel: number;
  projecao_agressiva: number;
  projecao_historica: number;
  conversion_rate: number;  
  avg_weekly_leads: number;
}

export type ProjectionType = 'scouter' | 'projeto';
export type Granularidade = 'diaria' | 'semanal' | 'mensal';

// New interfaces for linear projection
export interface LinearProjectionData {
  periodo: {
    inicio: string;
    fim: string;
    hoje_limite: string;
    dias_passados: number;
    dias_restantes: number;
    dias_totais: number;
  };
  realizado: {
    leads: number;
    fichas: number; // alias para compatibilidade
    valor: number;
  };
  projetado_restante: {
    leads: number;
    fichas: number; // alias para compatibilidade
    valor: number;
  };
  total_projetado: {
    leads: number;
    fichas: number; // alias para compatibilidade
    valor: number;
  };
  serie_real: Array<{ dia: string; leads: number; acumulado: number }>;
  serie_proj: Array<{ dia: string; leads: number; acumulado: number }>;
  media_diaria: number;
  valor_medio_por_ficha: number;
}

// Advanced projection with separate analysis and projection periods
export interface AdvancedProjectionData {
  periodoAnalise: {
    inicio: string;
    fim: string;
    dias: number;
    totalLeads: number;
    mediaDiaria: number;
  };
  periodoProjecao: {
    inicio: string;
    fim: string;
    dias: number;
    unidades: number; // quantidade de dias/semanas/meses
  };
  granularidade: Granularidade;
  realizado: {
    leads: number;
    valor: number;
  };
  projetado: {
    leads: number;
    valor: number;
  };
  fallbackUsado: boolean;
  valor_medio_por_ficha: number;
  serie_analise: Array<{ dia: string; leads: number; acumulado: number }>;
  serie_projecao: Array<{ dia: string; leads: number; acumulado: number }>;
}

export async function getProjectionData(type: ProjectionType = 'scouter', selectedFilter?: string): Promise<ProjectionData[]> {
  try {
    return await fetchProjectionsFromSupabase(type, selectedFilter);
  } catch (error) {
    console.error('Error fetching projections:', error);
    return [];
  }
}

type ProjecaoFiltro = { inicio: string; fim: string; scouter?: string; projeto?: string; valor_ficha_padrao?: number }

// Helper to normalize "affirmative" values across types
function isAffirmative(v: any): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'sim' || s === 'confirmado' || s === 'yes';
}

export async function fetchLinearProjection(p: ProjecaoFiltro): Promise<LinearProjectionData> {
  const S = new Date(p.inicio);
  const E = new Date(p.fim);
  const hoje = new Date();
  const To = new Date(Math.min(+E, +hoje));
  const toISO = (d: Date) => toISODate(d);
  const dtTo = toISO(To);

  // Buscar leads do Supabase
  let query = supabase.from('leads').select('*').or('deleted.is.false,deleted.is.null');
  if (p.scouter) query = query.ilike('scouter', `%${p.scouter}%`);
  if (p.projeto) query = query.ilike('projeto', `%${p.projeto}%`);

  const { data: rows, error } = await query;
  if (error) throw error;

  if (!rows) return {
    periodo: { inicio: p.inicio, hoje_limite: dtTo, fim: p.fim, dias_passados: 0, dias_restantes: 0, dias_totais: 0 },
    realizado: { fichas: 0, valor: 0 },
    projetado_restante: { fichas: 0, valor: 0 },
    total_projetado: { fichas: 0, valor: 0 },
    media_diaria: 0,
    valor_medio_por_ficha: 0,
    serie_real: [],
    serie_proj: []
  };

  // Filtrar por período - support both criado and created_at
  const data = rows.filter((r: any) => {
    const rawData = r.criado || r.created_at;
    if (!rawData) return false;
    const iso = toISODate(new Date(rawData));
    if (!iso) return false;
    if (iso < p.inicio || iso > p.fim) return false;
    (r as any).__iso = iso;
    return true;
  });

  // (1) Realizado (período de análise): somar valor linha-a-linha
  const realizadas = data.filter((r: any) => (r as any).__iso <= dtTo);
  const fichas_real = realizadas.length;
  const valor_real = realizadas.reduce((acc: number, r: any) => acc + getValorFichaFromRow(r), 0);

  const dias_passados  = Math.floor((+To - +S) / 86400000) + 1;
  const dias_totais    = Math.floor((+E  - +S) / 86400000) + 1;
  const dias_restantes = Math.max(0, dias_totais - dias_passados);

  const media_diaria = dias_passados > 0 ? fichas_real / dias_passados : 0;

  // (2) Para projetar o valor:
  // - Calcular valor_medio_por_ficha a partir do período de análise (apenas valores > 0).
  // - Se não houver dados, usar p.valor_ficha_padrao (fallback).
  let valor_medio_por_ficha = mediaValorPorFicha(realizadas);
  if (valor_medio_por_ficha <= 0) {
    valor_medio_por_ficha = p.valor_ficha_padrao ?? 0;
  }

  const proj_restante_qtde  = Math.round(media_diaria * dias_restantes);
  const proj_restante_valor = +(proj_restante_qtde * valor_medio_por_ficha).toFixed(2);

  // séries para o gráfico
  const serie_real: Array<{ dia: string; leads: number; acumulado: number }> = [];
  const serie_proj: Array<{ dia: string; leads: number; acumulado: number }> = [];

  // acumulado diário realizado
  const mapCount: Record<string, number> = {};
  for (const r of realizadas) {
    const d = (r as any).__iso as string;
    mapCount[d] = (mapCount[d] ?? 0) + 1;
  }

  // construir série do início até To
  let cursor = new Date(S);
  let acc = 0;
  while (cursor <= To) {
    const key = toISO(cursor);
    const fichasDia = mapCount[key] ?? 0;
    acc += fichasDia;
    serie_real.push({ dia: key, fichas: fichasDia, acumulado: acc });
    cursor = new Date(+cursor + 86400000);
  }

  // prolongamento linear To -> E
  const ultimo = acc;
  let projAcc = ultimo;
  let c2 = new Date(+To + 86400000);
  for (let i = 0; c2 <= E; i++, c2 = new Date(+c2 + 86400000)) {
    projAcc = Math.round(ultimo + media_diaria * (i + 1));
    serie_proj.push({ dia: toISO(c2), fichas: media_diaria, acumulado: projAcc });
  }

  return {
    periodo: { inicio: p.inicio, hoje_limite: dtTo, fim: p.fim, dias_passados, dias_restantes, dias_totais },
    realizado: { fichas: fichas_real, valor: +valor_real.toFixed(2) },
    projetado_restante: { fichas: proj_restante_qtde, valor: proj_restante_valor },
    total_projetado: { fichas: fichas_real + proj_restante_qtde, valor: +(valor_real + proj_restante_valor).toFixed(2) },
    media_diaria,
    valor_medio_por_ficha: +valor_medio_por_ficha.toFixed(2),
    serie_real,
    serie_proj
  };
}

type ProjecaoFiltroAdvanced = {
  dataInicioAnalise: string;
  dataFimAnalise: string;
  dataInicioProj: string;
  dataFimProj: string;
  granularidade: Granularidade;
  scouter?: string;
  projeto?: string;
  valor_ficha_padrao?: number;
}

export async function fetchProjectionAdvanced(p: ProjecaoFiltroAdvanced): Promise<AdvancedProjectionData> {
  const toISO = (d: Date) => toISODate(d);
  
  // Parse dates
  const analiseInicio = new Date(p.dataInicioAnalise);
  const analiseFim = new Date(p.dataFimAnalise);
  const projInicio = new Date(p.dataInicioProj);
  const projFim = new Date(p.dataFimProj);

  // Buscar leads do Supabase
  let query = supabase.from('leads').select('*').or('deleted.is.false,deleted.is.null');
  if (p.scouter) query = query.ilike('scouter', `%${p.scouter}%`);
  if (p.projeto) query = query.ilike('projeto', `%${p.projeto}%`);

  const { data: rows, error } = await query;
  if (error) throw error;

  if (!rows || rows.length === 0) {
    return {
      periodoAnalise: {
        inicio: p.dataInicioAnalise,
        fim: p.dataFimAnalise,
        dias: 0,
        totalLeads: 0,
        mediaDiaria: 0
      },
      periodoProjecao: {
        inicio: p.dataInicioProj,
        fim: p.dataFimProj,
        dias: 0,
        unidades: 0
      },
      granularidade: p.granularidade,
      realizado: { fichas: 0, valor: 0 },
      projetado: { fichas: 0, valor: 0 },
      fallbackUsado: false,
      valor_medio_por_ficha: 0,
      serie_analise: [],
      serie_projecao: []
    };
  }

  // Helper: filtrar por período (suporta criado/created_at) e adicionar __iso
  const filterByPeriod = (start: Date, end: Date, sourceRows: any[]) => {
    const s = toISO(start);
    const e = toISO(end);
    return sourceRows.filter((r: any) => {
      const dateStr = r.criado || r.created_at;
      if (!dateStr) return false;
      const iso = toISODate(new Date(dateStr));
      if (!iso) return false;
      (r as any).__iso = iso;
      return iso >= s && iso <= e;
    });
  };

  // Série de análise com os rows atuais (já filtrados por scouter/projeto se fornecidos)
  let fichasAnalise = filterByPeriod(analiseInicio, analiseFim, rows);

  // Fallback: se não houver dados, tentar obter média global do período (sem filtros)
  let fallbackUsado = false;
  if (fichasAnalise.length === 0) {
    const { data: allRows, error: allErr } = await supabase
      .from('leads')
      .select('*')
      .or('deleted.is.false,deleted.is.null');
    if (!allErr && allRows) {
      const todasFichasAnalise = filterByPeriod(analiseInicio, analiseFim, allRows);
      if (todasFichasAnalise.length > 0) {
        fichasAnalise = todasFichasAnalise;
        fallbackUsado = true;
      }
    }
  }

  // Métricas do período de análise
  const diasAnalise = Math.floor((+analiseFim - +analiseInicio) / 86400000) + 1;
  const totalFichasAnalise = fichasAnalise.length;
  const mediaDiaria = diasAnalise > 0 ? totalFichasAnalise / diasAnalise : 0;

  const valorRealizado = fichasAnalise.reduce((acc: number, r: any) => acc + getValorFichaFromRow(r), 0);

  let valor_medio_por_ficha = mediaValorPorFicha(fichasAnalise);
  if (valor_medio_por_ficha <= 0) {
    valor_medio_por_ficha = p.valor_ficha_padrao ?? 0;
    fallbackUsado = true;
  }

  // Métricas do período de projeção
  const diasProjecao = Math.floor((+projFim - +projInicio) / 86400000) + 1;

  // Cálculo de unidades por granularidade (informativo)
  let unidades: number;
  let mediaGranularidade: number;
  switch (p.granularidade) {
    case 'semanal':
      unidades = Math.ceil(diasProjecao / 7);
      mediaGranularidade = mediaDiaria * 7;
      break;
    case 'mensal':
      unidades = Math.ceil(diasProjecao / 30);
      mediaGranularidade = mediaDiaria * 30;
      break;
    case 'diaria':
    default:
      unidades = diasProjecao;
      mediaGranularidade = mediaDiaria;
      break;
  }

  // Projeção simples baseada na média diária
  const fichasProjetadas = Math.round(mediaDiaria * diasProjecao);
  const valorProjetado = +(fichasProjetadas * valor_medio_por_ficha).toFixed(2);

  // Construir série de análise (acumulado diário)
  const serie_analise: Array<{ dia: string; leads: number; acumulado: number }> = [];
  const mapCountAnalise: Record<string, number> = {};
  for (const r of fichasAnalise) {
    const d = (r as any).__iso as string;
    mapCountAnalise[d] = (mapCountAnalise[d] ?? 0) + 1;
  }
  let cursor = new Date(analiseInicio);
  let acc = 0;
  while (cursor <= analiseFim) {
    const key = toISO(cursor);
    const fichasDia = mapCountAnalise[key] ?? 0;
    acc += fichasDia;
    serie_analise.push({ dia: key, fichas: fichasDia, acumulado: acc });
    cursor = new Date(+cursor + 86400000);
  }

  // Construir série de projeção a partir do fim da análise
  const serie_projecao: Array<{ dia: string; leads: number; acumulado: number }> = [];
  const inicioAcc = acc;
  let projAcc = inicioAcc;
  let cursor2 = new Date(projInicio);
  let daysCount = 0;
  while (cursor2 <= projFim) {
    daysCount++;
    projAcc = Math.round(inicioAcc + mediaDiaria * daysCount);
    serie_projecao.push({ dia: toISO(cursor2), fichas: mediaDiaria, acumulado: projAcc });
    cursor2 = new Date(+cursor2 + 86400000);
  }

  return {
    periodoAnalise: {
      inicio: p.dataInicioAnalise,
      fim: p.dataFimAnalise,
      dias: diasAnalise,
      totalLeads: totalFichasAnalise,
      mediaDiaria: +mediaDiaria.toFixed(2)
    },
    periodoProjecao: {
      inicio: p.dataInicioProj,
      fim: p.dataFimProj,
      dias: diasProjecao,
      unidades
    },
    granularidade: p.granularidade,
    realizado: {
      fichas: totalFichasAnalise,
      valor: +valorRealizado.toFixed(2)
    },
    projetado: {
      fichas: fichasProjetadas,
      valor: valorProjetado
    },
    fallbackUsado,
    valor_medio_por_ficha: +valor_medio_por_ficha.toFixed(2),
    serie_analise,
    serie_projecao
  };
}

export async function getAvailableFilters(): Promise<{ scouters: string[], projetos: string[] }> {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('scouter, projeto')
      .or('deleted.is.false,deleted.is.null');
    
    if (error) throw error;
    
    const sc = new Set<string>();
    const pr = new Set<string>();
    
    for (const r of (leads || [])) {
      if (r.scouter) sc.add(String(r.scouter).trim());
      if (r.projeto) pr.add(String(r.projeto).trim());
    }
    
    return { 
      scouters: Array.from(sc).sort(), 
      projetos: Array.from(pr).sort() 
    };
  } catch (e) {
    console.error("getAvailableFilters failed:", e);
    return { scouters: [], projetos: [] };
  }
}

async function fetchProjectionsFromSupabase(type: ProjectionType, selectedFilter?: string): Promise<ProjectionData[]> {
  try {
    // Buscar leads dos últimos 30 dias para análise histórica
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];
    
    let query = supabase
      .from('leads')
      .select('*')
      .or(`criado.gte.${since},created_at.gte.${since}`)
      .or('deleted.is.false,deleted.is.null');

    // Aplicar filtro específico se selecionado
    if (selectedFilter) {
      if (type === 'scouter') {
        query = query.eq('scouter', selectedFilter);
      } else {
        query = query.eq('commercial_project_id', selectedFilter);
      }
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    // Agrupar por scouter ou projeto
    const groupedData = new Map();
    
    rows.forEach((row: any) => {
      const groupKey = type === 'scouter' 
        ? (row.scouter || 'Desconhecido')
        : (row.projeto || 'Sem Projeto');
        
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          fichas: [],
          weeklyData: new Map() // Para calcular média semanal
        });
      }
      groupedData.get(groupKey).fichas.push(row);
      
      // Agrupar por semana para calcular performance semanal
      const weekKey = getWeekKey(row.criado || row.created_at);
      const weeklyData = groupedData.get(groupKey).weeklyData;
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey).push(row);
    });

    // Calcular projeções para cada item (scouter ou projeto)
    return Array.from(groupedData.entries()).map(([name, data]: any[]) => {
      const totalLeads = data.fichas.length;
      
      // Calcular taxa de confirmação (normalizando valores)
      const confirmedFichas = data.fichas.filter((f: any) => isAffirmative(f.confirmado)).length;
      const conversionRate = totalLeads > 0 ? (confirmedFichas / totalLeads) : 0;
      
      // Calcular média semanal
      const weeklyTotals = Array.from(data.weeklyData.values()).map((week: any[]) => week.length);
      const avgWeeklyFichas = weeklyTotals.length > 0 
        ? weeklyTotals.reduce((sum: number, count: number) => sum + count, 0) / weeklyTotals.length 
        : 0;
      
      // Determinar tier baseado na performance
      const tier_name = getTierFromPerformance(avgWeeklyFichas, conversionRate);
      const weekly_goal = getWeeklyGoalFromTier(tier_name);
      
      // Calcular projeções baseadas na tendência recente
      const recentWeeks = weeklyTotals.slice(-2); // Últimas 2 semanas
      const recentAvg = recentWeeks.length > 0 
        ? recentWeeks.reduce((sum: number, count: number) => sum + count, 0) / recentWeeks.length 
        : avgWeeklyFichas;
      
      // Base da projeção: combinação da média histórica com tendência recente
      const baseProjection = Math.max(
        (avgWeeklyFichas * 0.6) + (recentAvg * 0.4), // 60% histórico, 40% recente
        weekly_goal * 0.3 // Mínimo de 30% da meta
      );
      
      return {
        name,
        semana_futura: 1,
        semana_label: 'Sem+1',
        weekly_goal,
        tier_name,
        projecao_conservadora: Math.round(baseProjection * 0.75),
        projecao_provavel: Math.round(baseProjection),
        projecao_agressiva: Math.round(baseProjection * 1.3),
        projecao_historica: totalLeads,
        conversion_rate: Math.round(conversionRate * 100),
        avg_weekly_fichas: Math.round(avgWeeklyFichas)
      } as ProjectionData;
    });
  } catch (error) {
    console.error('Error in fetchProjectionsFromSupabase:', error);
    return [];
  }
}

// Função auxiliar para gerar chave da semana
function getWeekKey(dateString: string): string {
  if (!dateString) return '';
  try {
    let date: Date;
    if (dateString.includes('/')) {
      // Formato dd/mm/yyyy ou mm/dd/yyyy
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Assumir dd/mm/yyyy
        date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      } else {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '';
    }
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Início da semana (domingo)
    return weekStart.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return '';
  }
}

// Função para determinar tier baseado na performance
function getTierFromPerformance(avgWeekly: number, conversionRate: number): string {
  const performance = avgWeekly * (1 + conversionRate); // Score combinado
  if (performance >= 80) return 'Diamante';
  if (performance >= 60) return 'Ouro';
  if (performance >= 40) return 'Prata';
  return 'Bronze';
}

// Função para obter meta semanal baseada no tier
function getWeeklyGoalFromTier(tier: string): number {
  const goals: Record<string, number> = {
    'Diamante': 100,
    'Ouro': 80,
    'Prata': 60,
    'Bronze': 40
  };
  return goals[tier] || 50;
}

// Helper functions for linear projection
function parseDate(dateString: string): string | null {
  if (!dateString) return null;
  try {
    let date: Date;
    if (dateString.includes('/')) {
      // Formato dd/mm/yyyy
      const parts = dateString.split('/');
      if (parts.length === 3) {
        date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      } else {
        date = new Date(dateString);
      }
    } else {
      // Formato ISO ou outro
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function generateDailySeries(
  startDate: Date, 
  endDate: Date, 
  fichas: any[], 
  type: 'real'
): Array<{ dia: string; leads: number; acumulado: number }> {
  const series: Array<{ dia: string; leads: number; acumulado: number }> = [];
  const current = new Date(startDate);
  let acumulado = 0;
  
  // Group fichas by date - support both criado and created_at
  const fichasByDate = fichas.reduce((acc: Record<string, number>, ficha: any) => {
    const dateKey = parseDate(ficha.criado || ficha.created_at);
    if (dateKey) {
      acc[dateKey] = (acc[dateKey] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  while (current <= endDate) {
    const dateKey = current.toISOString().slice(0, 10);
    const dayLeads = fichasByDate[dateKey] || 0;
    acumulado += dayLeads;
    series.push({ dia: dateKey, fichas: dayLeads, acumulado });
    current.setDate(current.getDate() + 1);
  }
  
  return series;
}

function generateProjectionSeries(
  startDate: Date,
  endDate: Date,
  mediaDiaria: number,
  serieReal: Array<{ dia: string; leads: number; acumulado: number }>
): Array<{ dia: string; leads: number; acumulado: number }> {
  const series: Array<{ dia: string; leads: number; acumulado: number }> = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1); // Start from next day
  
  let acumulado = serieReal.length > 0 ? serieReal[serieReal.length - 1].acumulado : 0;
  while (current <= endDate) {
    const dateKey = current.toISOString().slice(0, 10);
    const dayLeads = Math.round(mediaDiaria);
    acumulado += dayLeads;
    series.push({ dia: dateKey, fichas: dayLeads, acumulado });
    current.setDate(current.getDate() + 1);
  }
  return series;
}