/**
 * Extrai o ID do lead de um token ofuscado
 * Formato do token: P{random}L{leadId}S{random}
 * Exemplo: P4L819378S584 -> 819378
 */
export function extractLeadIdFromToken(token: string): string | null {
  if (!token) return null;
  
  // Tenta extrair ID do formato ofuscado: P4L819378S584
  const match = token.match(/L(\d+)S/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Retrocompatibilidade: se for apenas números, retorna direto
  if (/^\d+$/.test(token)) {
    return token;
  }
  
  return null;
}

/**
 * Gera um token ofuscado para um lead ID
 * Formato: P{random}L{leadId}S{random}
 */
export function generateLeadToken(leadId: number | string): string {
  const prefix = Math.random().toString(36).substring(2, 4).toUpperCase();
  const suffix = Math.floor(Math.random() * 1000);
  return `P${prefix}L${leadId}S${suffix}`;
}
