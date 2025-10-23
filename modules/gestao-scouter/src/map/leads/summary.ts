/**
 * Fichas Summary Module
 * Generates summary statistics by projeto and scouter
 */

import { LeadDataPoint, groupByProjeto, groupByScouter } from './data';

export interface ProjetoSummary {
  projeto: string;
  count: number;
  percentage: number;
}

export interface ScouterSummary {
  scouter: string;
  count: number;
  percentage: number;
}

export interface LeadsSummaryData {
  total: number;
  byProjeto: ProjetoSummary[];
  byScouter: ScouterSummary[];
  topProjeto: ProjetoSummary | null;
  topScouter: ScouterSummary | null;
}

/**
 * Generate complete summary statistics from fichas data
 */
export function generateSummary(fichas: LeadDataPoint[]): LeadsSummaryData {
  console.log(`📊 [Fichas Summary] Generating summary for ${fichas.length} fichas`);
  
  const total = fichas.length;
  
  if (total === 0) {
    return {
      total: 0,
      byProjeto: [],
      byScouter: [],
      topProjeto: null,
      topScouter: null
    };
  }

  // Group by projeto
  const projetoGroups = groupByProjeto(fichas);
  const byProjeto: ProjetoSummary[] = Array.from(projetoGroups.entries())
    .map(([projeto, fichasInProjeto]) => ({
      projeto,
      count: fichasInProjeto.length,
      percentage: (fichasInProjeto.length / total) * 100
    }))
    .sort((a, b) => b.count - a.count);

  // Group by scouter
  const scouterGroups = groupByScouter(fichas);
  const byScouter: ScouterSummary[] = Array.from(scouterGroups.entries())
    .map(([scouter, fichasInScouter]) => ({
      scouter,
      count: fichasInScouter.length,
      percentage: (fichasInScouter.length / total) * 100
    }))
    .sort((a, b) => b.count - a.count);

  const summary = {
    total,
    byProjeto,
    byScouter,
    topProjeto: byProjeto.length > 0 ? byProjeto[0] : null,
    topScouter: byScouter.length > 0 ? byScouter[0] : null
  };

  console.log('✅ [Fichas Summary] Summary generated:', {
    total: summary.total,
    projetos: summary.byProjeto.length,
    scouters: summary.byScouter.length
  });

  return summary;
}

/**
 * Format summary data as readable text
 */
export function formatSummaryText(summary: LeadsSummaryData): string {
  if (summary.total === 0) {
    return 'Nenhuma ficha selecionada';
  }

  const lines: string[] = [];
  
  lines.push(`📊 Total de Fichas: ${summary.total}`);
  lines.push('');
  
  // Projeto summary
  if (summary.byProjeto.length > 0) {
    lines.push('🎯 Por Projeto:');
    summary.byProjeto.forEach(p => {
      lines.push(`  • ${p.projeto}: ${p.count} (${p.percentage.toFixed(1)}%)`);
    });
    lines.push('');
  }
  
  // Scouter summary
  if (summary.byScouter.length > 0) {
    lines.push('👤 Por Scouter:');
    summary.byScouter.forEach(s => {
      lines.push(`  • ${s.scouter}: ${s.count} (${s.percentage.toFixed(1)}%)`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Compare two summaries and return difference
 */
export function compareSummaries(
  before: LeadsSummaryData,
  after: LeadsSummaryData
): {
  totalDiff: number;
  projetosAdded: string[];
  projetosRemoved: string[];
  scoutersAdded: string[];
  scoutersRemoved: string[];
} {
  const totalDiff = after.total - before.total;
  
  const beforeProjetos = new Set(before.byProjeto.map(p => p.projeto));
  const afterProjetos = new Set(after.byProjeto.map(p => p.projeto));
  
  const projetosAdded = Array.from(afterProjetos).filter(p => !beforeProjetos.has(p));
  const projetosRemoved = Array.from(beforeProjetos).filter(p => !afterProjetos.has(p));
  
  const beforeScouters = new Set(before.byScouter.map(s => s.scouter));
  const afterScouters = new Set(after.byScouter.map(s => s.scouter));
  
  const scoutersAdded = Array.from(afterScouters).filter(s => !beforeScouters.has(s));
  const scoutersRemoved = Array.from(beforeScouters).filter(s => !afterScouters.has(s));
  
  return {
    totalDiff,
    projetosAdded,
    projetosRemoved,
    scoutersAdded,
    scoutersRemoved
  };
}

/**
 * Generate HTML summary for display
 */
export function generateSummaryHTML(summary: LeadsSummaryData): string {
  if (summary.total === 0) {
    return '<div class="text-muted-foreground">Nenhuma ficha selecionada</div>';
  }

  const html: string[] = [];
  
  html.push(`<div class="space-y-4">`);
  html.push(`<div class="text-lg font-semibold">📊 Total: ${summary.total} fichas</div>`);
  
  // Projeto summary
  if (summary.byProjeto.length > 0) {
    html.push(`<div>`);
    html.push(`<div class="font-medium mb-2">🎯 Por Projeto:</div>`);
    html.push(`<div class="space-y-1 ml-4">`);
    summary.byProjeto.forEach(p => {
      html.push(`<div class="flex justify-between">`);
      html.push(`<span>${p.projeto}:</span>`);
      html.push(`<span class="font-medium">${p.count} (${p.percentage.toFixed(1)}%)</span>`);
      html.push(`</div>`);
    });
    html.push(`</div></div>`);
  }
  
  // Scouter summary
  if (summary.byScouter.length > 0) {
    html.push(`<div>`);
    html.push(`<div class="font-medium mb-2">👤 Por Scouter:</div>`);
    html.push(`<div class="space-y-1 ml-4">`);
    summary.byScouter.forEach(s => {
      html.push(`<div class="flex justify-between">`);
      html.push(`<span>${s.scouter}:</span>`);
      html.push(`<span class="font-medium">${s.count} (${s.percentage.toFixed(1)}%)</span>`);
      html.push(`</div>`);
    });
    html.push(`</div></div>`);
  }
  
  html.push(`</div>`);
  
  return html.join('');
}
