// Unificar a leitura do "valor da ficha" por linha da planilha.
// Substituir funções antigas duplicadas (parseFichaValue/getValorFicha*) para usar parseBRL.
import { parseBRL } from '@/utils/currency';

// Colunas candidatas (case-insensitive) — tentar em ordem
const VALOR_KEYS = [
  'Valor por Fichas',
  'Valor Ficha',
  'Valor_ficha',
  'R$/Ficha',
  'Valor da Ficha',
  'Valor por Ficha',
  'valor_ficha',
  'valor',                // fallback comum
];

export function getValorFichaFromRow(row: any): number {
  if (!row || typeof row !== 'object') return 0;
  // varrer chaves ignorando maiúsculas/minúsculas e espaços extras
  const entries = Object.entries(row);
  for (const key of VALOR_KEYS) {
    const found = entries.find(([k]) => k && k.toString().trim().toLowerCase() === key.toLowerCase());
    if (found) {
      const v = found[1];
      const parsed = parseBRL(v);
      if (parsed > 0) return parsed;
    }
  }
  // se nenhuma coluna conhecida, tentar heurística: primeira coluna que contenha "valor" e "ficha"
  const fuzzy = entries.find(([k]) => {
    const kk = (k || '').toString().toLowerCase();
    return kk.includes('valor') && (kk.includes('ficha') || kk.includes('por'));
  });
  if (fuzzy) {
    const parsed = parseBRL(fuzzy[1]);
    if (parsed > 0) return parsed;
  }
  return 0;
}

export function mediaValorPorFicha(rows: any[]): number {
  const valores = (rows || []).map(getValorFichaFromRow).filter(v => v > 0);
  if (!valores.length) return 0;
  const soma = valores.reduce((a, b) => a + b, 0);
  return soma / valores.length;
}