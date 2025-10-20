/**
 * Serviço de Detecção e Auto-Correção de Problemas
 * Detecta problemas no sistema e tenta corrigi-los automaticamente quando possível
 */

import { supabase } from "@/integrations/supabase/client";
import type { 
  DetectedProblem, 
  AutoFixResult, 
  ProblemType,
  AlertSeverity 
} from "@/types/diagnostic";
import { performHealthCheck } from "./healthCheckService";

/**
 * Detecta problemas baseado no health check
 */
export async function detectProblems(): Promise<DetectedProblem[]> {
  const problems: DetectedProblem[] = [];
  const health = await performHealthCheck();

  // Verifica cada health check por problemas
  for (const check of health.checks) {
    if (check.status === 'critical' || check.status === 'warning') {
      const problem = createProblemFromHealthCheck(check);
      if (problem) {
        problems.push(problem);
      }
    }
  }

  // Verifica taxa de erro alta
  if (health.metrics.errorRate > 20) {
    problems.push({
      id: `error-rate-${Date.now()}`,
      type: 'high_error_rate',
      severity: health.metrics.errorRate > 50 ? 'critical' : 'error',
      title: 'Taxa de Erro Elevada',
      description: `Taxa de erro de sincronização está em ${health.metrics.errorRate.toFixed(1)}%`,
      detectedAt: new Date(),
      component: 'Sync System',
      canAutoFix: true,
      fixed: false,
      metadata: { errorRate: health.metrics.errorRate }
    });
  }

  // Verifica resposta lenta
  if (health.metrics.avgResponseTime > 2000) {
    problems.push({
      id: `slow-response-${Date.now()}`,
      type: 'slow_response',
      severity: health.metrics.avgResponseTime > 5000 ? 'error' : 'warning',
      title: 'Resposta Lenta do Sistema',
      description: `Tempo médio de resposta está em ${health.metrics.avgResponseTime}ms`,
      detectedAt: new Date(),
      component: 'Database',
      canAutoFix: false,
      fixed: false,
      metadata: { avgResponseTime: health.metrics.avgResponseTime }
    });
  }

  return problems;
}

/**
 * Cria um problema a partir de um health check
 */
function createProblemFromHealthCheck(check: any): DetectedProblem | null {
  const problemTypeMap: Record<string, ProblemType> = {
    'Database Connection': 'database_connection',
    'Sync Status': 'sync_failure',
    'Recent Sync Events': 'sync_failure',
  };

  const type = problemTypeMap[check.name] || 'unknown';
  const severity: AlertSeverity = check.status === 'critical' ? 'critical' : 'error';

  return {
    id: `${type}-${Date.now()}`,
    type,
    severity,
    title: `Problema: ${check.name}`,
    description: check.message,
    detectedAt: new Date(),
    component: check.name,
    canAutoFix: type === 'sync_failure',
    fixed: false,
    metadata: check.details
  };
}

/**
 * Tenta corrigir automaticamente um problema
 */
export async function autoFixProblem(problem: DetectedProblem): Promise<AutoFixResult> {
  if (!problem.canAutoFix) {
    return {
      problemId: problem.id,
      success: false,
      message: 'Este problema não pode ser corrigido automaticamente',
      timestamp: new Date(),
      actions: []
    };
  }

  const actions: string[] = [];

  try {
    switch (problem.type) {
      case 'sync_failure':
        return await fixSyncFailures(problem, actions);
      
      case 'high_error_rate':
        return await fixHighErrorRate(problem, actions);
      
      default:
        return {
          problemId: problem.id,
          success: false,
          message: 'Tipo de problema não suportado para auto-correção',
          timestamp: new Date(),
          actions
        };
    }
  } catch (error) {
    return {
      problemId: problem.id,
      success: false,
      message: 'Erro durante auto-correção',
      timestamp: new Date(),
      actions,
      error: String(error)
    };
  }
}

/**
 * Corrige falhas de sincronização
 */
async function fixSyncFailures(problem: DetectedProblem, actions: string[]): Promise<AutoFixResult> {
  actions.push('Identificando leads com falha de sincronização');
  
  // Busca leads com erro de sincronização
  const { data: failedLeads, error: queryError } = await supabase
    .from('leads')
    .select('id, sync_status')
    .eq('sync_status', 'error')
    .limit(50);

  if (queryError) {
    return {
      problemId: problem.id,
      success: false,
      message: 'Erro ao buscar leads com falha',
      timestamp: new Date(),
      actions,
      error: queryError.message
    };
  }

  if (!failedLeads || failedLeads.length === 0) {
    actions.push('Nenhum lead com falha encontrado');
    return {
      problemId: problem.id,
      success: true,
      message: 'Nenhum lead com falha para corrigir',
      timestamp: new Date(),
      actions
    };
  }

  actions.push(`Encontrados ${failedLeads.length} leads com falha`);
  actions.push('Resetando status para permitir nova tentativa');

  // Reseta status dos leads para pending para nova tentativa
  const { error: updateError } = await supabase
    .from('leads')
    .update({ sync_status: 'pending' })
    .in('id', failedLeads.map(l => l.id));

  if (updateError) {
    return {
      problemId: problem.id,
      success: false,
      message: 'Erro ao resetar status dos leads',
      timestamp: new Date(),
      actions,
      error: updateError.message
    };
  }

  actions.push(`${failedLeads.length} leads resetados para nova tentativa`);

  return {
    problemId: problem.id,
    success: true,
    message: `${failedLeads.length} leads foram resetados e serão sincronizados novamente`,
    timestamp: new Date(),
    actions
  };
}

/**
 * Tenta corrigir alta taxa de erro
 */
async function fixHighErrorRate(problem: DetectedProblem, actions: string[]): Promise<AutoFixResult> {
  actions.push('Analisando leads com erro de sincronização');
  
  // Busca leads recentes com erro
  const { data: recentFailures, error } = await supabase
    .from('leads')
    .select('id, sync_status, sync_error, updated_at')
    .eq('sync_status', 'error')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error || !recentFailures || recentFailures.length === 0) {
    actions.push('Nenhum erro recente encontrado ou erro ao buscar');
    return {
      problemId: problem.id,
      success: false,
      message: 'Não foi possível analisar erros',
      timestamp: new Date(),
      actions,
      error: error?.message
    };
  }

  actions.push(`Analisados ${recentFailures.length} erros recentes`);

  // Conta erros por tipo
  const errorTypes: Record<string, number> = {};
  recentFailures.forEach(lead => {
    const errorType = lead.sync_error || 'unknown';
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
  });

  const mostCommonError = Object.entries(errorTypes)
    .sort(([, a], [, b]) => b - a)[0];

  actions.push(`Erro mais comum: ${mostCommonError[0]} (${mostCommonError[1]} ocorrências)`);

  // Tenta resetar leads com erros mais antigos (mais de 1 hora)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oldFailures = recentFailures.filter(l => l.updated_at < oneHourAgo);

  if (oldFailures.length > 0) {
    actions.push(`Resetando ${oldFailures.length} erros antigos para nova tentativa`);
    
    const { error: updateError } = await supabase
      .from('leads')
      .update({ sync_status: 'pending', sync_error: null })
      .in('id', oldFailures.map(l => l.id));

    if (updateError) {
      return {
        problemId: problem.id,
        success: false,
        message: 'Erro ao resetar leads',
        timestamp: new Date(),
        actions,
        error: updateError.message
      };
    }

    actions.push('Leads resetados com sucesso');
  }

  return {
    problemId: problem.id,
    success: true,
    message: `Auto-correção aplicada para ${oldFailures.length} leads`,
    timestamp: new Date(),
    actions
  };
}

/**
 * Lista todos os problemas detectados e corrigidos
 */
export async function listProblems(): Promise<{
  active: DetectedProblem[];
  fixed: DetectedProblem[];
}> {
  const allProblems = await detectProblems();
  
  return {
    active: allProblems.filter(p => !p.fixed),
    fixed: allProblems.filter(p => p.fixed)
  };
}

/**
 * Executa auto-correção em todos os problemas que podem ser corrigidos
 */
export async function autoFixAll(): Promise<AutoFixResult[]> {
  const { active } = await listProblems();
  const fixableProblems = active.filter(p => p.canAutoFix);
  
  const results: AutoFixResult[] = [];
  
  for (const problem of fixableProblems) {
    const result = await autoFixProblem(problem);
    results.push(result);
    
    // Aguarda um pouco entre correções para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}
