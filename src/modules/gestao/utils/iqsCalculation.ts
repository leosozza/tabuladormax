import type { Lead } from '@/repositories/types';
import type { AppSettings } from '@/repositories/types';

/**
 * Calcula o IQS (Índice de Qualidade do Scouter) para uma ficha individual.
 * IQS = (soma dos pontos ponderados / total de pesos aplicáveis) * 100
 */
export function calculateLeadIQS(lead: Lead, settings: AppSettings): number {
  let pontosPonderados = 0;
  let totalPesos = 0;

  // Foto
  if (lead.cadastro_existe_foto === 'SIM' || lead.foto === '1') {
    pontosPonderados += settings.peso_foto;
  }
  totalPesos += settings.peso_foto;

  // Confirmada
  if (lead.ficha_confirmada === 'Confirmada' || lead.confirmado === '1') {
    pontosPonderados += settings.peso_confirmada;
  }
  totalPesos += settings.peso_confirmada;

  // Conseguiu Contato
  if (lead.presenca_confirmada === 'Sim') {
    pontosPonderados += settings.peso_contato;
  }
  totalPesos += settings.peso_contato;

  // Agendado
  if (lead.agendado === '1') {
    pontosPonderados += settings.peso_agendado;
  }
  totalPesos += settings.peso_agendado;

  // Compareceu
  if (lead.compareceu === '1') {
    pontosPonderados += settings.peso_compareceu;
  }
  totalPesos += settings.peso_compareceu;

  // Tabulação - Interesse
  if (lead.tabulacao && lead.tabulacao.toLowerCase().includes('interesse')) {
    pontosPonderados += settings.peso_interesse;
  }
  totalPesos += settings.peso_interesse;

  // Tabulação - Conclusão Positiva
  if (lead.tabulacao && (
    lead.tabulacao.toLowerCase().includes('conclusão positiva') ||
    lead.tabulacao.toLowerCase().includes('conclusao positiva')
  )) {
    pontosPonderados += settings.peso_concl_pos;
  }
  totalPesos += settings.peso_concl_pos;

  // Tabulação - Conclusão Negativa
  if (lead.tabulacao && (
    lead.tabulacao.toLowerCase().includes('conclusão negativa') ||
    lead.tabulacao.toLowerCase().includes('conclusao negativa')
  )) {
    pontosPonderados += settings.peso_concl_neg;
    totalPesos += settings.peso_concl_neg;
  }

  // Tabulação - Sem Interesse Definitivo
  if (lead.tabulacao && lead.tabulacao.toLowerCase().includes('sem interesse definitivo')) {
    pontosPonderados += settings.peso_sem_interesse_def;
    totalPesos += settings.peso_sem_interesse_def;
  }

  // Tabulação - Sem Contato
  if (lead.tabulacao && lead.tabulacao.toLowerCase().includes('sem contato')) {
    pontosPonderados += settings.peso_sem_contato;
    totalPesos += settings.peso_sem_contato;
  }

  // Tabulação - Sem Interesse no Momento
  if (lead.tabulacao && lead.tabulacao.toLowerCase().includes('sem interesse no momento')) {
    pontosPonderados += settings.peso_sem_interesse_momento;
    totalPesos += settings.peso_sem_interesse_momento;
  }

  // Calcular IQS como percentual
  if (totalPesos === 0) return 0;
  return (pontosPonderados / totalPesos) * 100;
}

/**
 * Calcula o IQS médio para um array de leads.
 */
export function calculateAverageIQS(leads: Lead[], settings: AppSettings): number {
  if (leads.length === 0) return 0;
  
  const totalIQS = leads.reduce((sum, lead) => {
    return sum + calculateLeadIQS(lead, settings);
  }, 0);

  return totalIQS / leads.length;
}

/**
 * Calcula métricas detalhadas por tabulação.
 */
export function calculateTabulationMetrics(leads: Lead[]) {
  return {
    interesse: leads.filter(lead => 
      lead.tabulacao && lead.tabulacao.toLowerCase().includes('interesse')
    ).length,
    conclusaoPositiva: leads.filter(lead => 
      lead.tabulacao && (
        lead.tabulacao.toLowerCase().includes('conclusão positiva') ||
        lead.tabulacao.toLowerCase().includes('conclusao positiva')
      )
    ).length,
    conclusaoNegativa: leads.filter(lead => 
      lead.tabulacao && (
        lead.tabulacao.toLowerCase().includes('conclusão negativa') ||
        lead.tabulacao.toLowerCase().includes('conclusao negativa')
      )
    ).length,
    semInteresseDefinitivo: leads.filter(lead => 
      lead.tabulacao && lead.tabulacao.toLowerCase().includes('sem interesse definitivo')
    ).length,
    semContato: leads.filter(lead => 
      lead.tabulacao && lead.tabulacao.toLowerCase().includes('sem contato')
    ).length,
    semInteresseMomento: leads.filter(lead => 
      lead.tabulacao && lead.tabulacao.toLowerCase().includes('sem interesse no momento')
    ).length,
  };
}
