export const ETAPA_COLORS: Record<string, { bg: string; text: string; label?: string }> = {
  // Positivas (verdes)
  'Agendados': { bg: 'bg-green-500', text: 'text-white' },
  'UC_QWPO2W': { bg: 'bg-green-500', text: 'text-white', label: 'Agendados' },
  'Lead convertido': { bg: 'bg-emerald-600', text: 'text-white' },
  'CONVERTED': { bg: 'bg-emerald-600', text: 'text-white', label: 'Lead convertido' },
  
  // Em andamento (amarelos/laranjas)
  'Em agendamento': { bg: 'bg-amber-500', text: 'text-white' },
  'UC_SARR07': { bg: 'bg-amber-500', text: 'text-white', label: 'Em agendamento' },
  'Retornar Ligação': { bg: 'bg-orange-500', text: 'text-white' },
  'UC_MWJM5G': { bg: 'bg-orange-500', text: 'text-white', label: 'Retornar Ligação' },
  'Reagendar': { bg: 'bg-yellow-500', text: 'text-black' },
  'UC_DMLQB7': { bg: 'bg-yellow-500', text: 'text-black', label: 'Reagendar' },
  
  // Triagem/Qualificação (azuis)
  'Lead a Qualificar': { bg: 'bg-blue-500', text: 'text-white' },
  'UC_DDVFX3': { bg: 'bg-blue-500', text: 'text-white', label: 'Lead a Qualificar' },
  'Triagem': { bg: 'bg-sky-500', text: 'text-white' },
  'UC_AU7EMM': { bg: 'bg-sky-500', text: 'text-white', label: 'Triagem' },
  'Leads a Qualificar - META': { bg: 'bg-indigo-500', text: 'text-white' },
  'UC_DIEP95': { bg: 'bg-indigo-500', text: 'text-white', label: 'Leads a Qualificar - META' },
  
  // Neutros (cinzas/roxos)
  'StandyBy': { bg: 'bg-purple-500', text: 'text-white' },
  'UC_8WYI7Q': { bg: 'bg-purple-500', text: 'text-white', label: 'StandyBy' },
  'Banco de Leads': { bg: 'bg-slate-500', text: 'text-white' },
  'UC_EEE2MB': { bg: 'bg-slate-500', text: 'text-white', label: 'Banco de Leads' },
  'Fichas Formulario de internet': { bg: 'bg-cyan-500', text: 'text-white' },
  'UC_ON6WVP': { bg: 'bg-cyan-500', text: 'text-white', label: 'Fichas Formulario de internet' },
  
  // Negativos (vermelhos)
  'Analizar - Sem interesse': { bg: 'bg-red-400', text: 'text-white' },
  'UC_GPH3PL': { bg: 'bg-red-400', text: 'text-white', label: 'Analizar - Sem interesse' },
  'Analizar - Não Confirmados': { bg: 'bg-red-500', text: 'text-white' },
  '1': { bg: 'bg-red-500', text: 'text-white', label: 'Analizar - Não Confirmados' },
  'Excluir Lead': { bg: 'bg-red-700', text: 'text-white' },
  'JUNK': { bg: 'bg-red-700', text: 'text-white', label: 'Excluir Lead' },
  
  // Outros
  'nativo': { bg: 'bg-gray-500', text: 'text-white' },
  'NEW': { bg: 'bg-gray-500', text: 'text-white', label: 'nativo' },
};

export function getEtapaStyle(etapa: string | null | undefined) {
  if (!etapa) return { bg: 'bg-muted', text: 'text-muted-foreground', label: etapa };
  
  const style = ETAPA_COLORS[etapa];
  if (style) {
    return {
      bg: style.bg,
      text: style.text,
      label: style.label || etapa
    };
  }
  
  // Fallback para etapas não mapeadas
  return { bg: 'bg-muted', text: 'text-muted-foreground', label: etapa };
}
