export const TABULACAO_MAP: Record<string, string> = {
  '3616': '⚠ Ligação Interrompida',
  '3618': '☎️ Caixa Postal',
  '3620': '✅ Agendado',
  '3622': '❌❌ Sem Interesse',
  '3624': '⛔ Já compareceu',
  '3626': '♻ Retorno',
  '3644': '✅✅ Agendamento confirmado',
  '3648': '❌ Descatar Lead ❌',
  '5514': '❌ Contato incorreto ⚠',
  '5518': '⚠ Requalificar - descarte não autorizado',
  '5522': '✅ Ficha Verificada',
  '5526': '✅ Ficha Verificada por IA',
  '6518': 'Outra Região ⚠',
  '6540': '⚠ Aguardando Qualificação',
  '8998': '❌ Não fez o cadastro ⚠',
};

export function resolveTabulacaoLabel(status: string | null | undefined): string {
  if (!status || status === 'false' || status === 'null') return '⏳ Não tabulado';
  
  // Remove colchetes se existirem: "[3616]" -> "3616"
  const cleanId = status.replace(/[\[\]]/g, '').trim();
  
  // Se vazio após limpeza
  if (!cleanId) return '🔄 Aguardando';
  
  // Se é um ID numérico, busca no mapeamento
  if (/^\d+$/.test(cleanId)) {
    return TABULACAO_MAP[cleanId] || `ID ${cleanId}`;
  }
  
  // Se já é um label amigável, retorna como está
  return status;
}
