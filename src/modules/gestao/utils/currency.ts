// Criar utilitário único para parsing de moeda BR (pt-BR)
export function parseBRL(input: unknown): number {
  if (input == null) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  const s = String(input)
    .replace(/\s/g, '')              // espaços (incl. NBSP)
    .replace(/[Rr]\$?/g, '')         // R$, r$, R$
    .replace(/\./g, '')              // separador de milhar BR
    .replace(/,/g, '.');             // vírgula -> ponto
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Formatação opcional centralizada
export function formatBRL(n: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
  } catch {
    return `R$ ${ (n || 0).toFixed(2) }`;
  }
}