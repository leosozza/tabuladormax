import { normalize } from './normalize';

/**
 * Calcula a distância de Levenshtein entre duas strings
 * (número mínimo de edições necessárias para transformar uma string em outra)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calcula a similaridade entre duas strings (0 a 1, onde 1 é idêntico)
 * Usa distância de Levenshtein normalizada
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalize(str1).toLowerCase();
  const normalized2 = normalize(str2).toLowerCase();
  
  if (normalized1 === normalized2) return 1;
  if (!normalized1 || !normalized2) return 0;

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  return 1 - (distance / maxLength);
}

/**
 * Verifica se uma string contém palavras-chave de outra (match contextual)
 */
export function hasContextualMatch(csvHeader: string, targetField: string): boolean {
  const normalizedCsv = normalize(csvHeader).toLowerCase();
  const normalizedTarget = normalize(targetField).toLowerCase();
  
  // Divide em palavras
  const csvWords = normalizedCsv.split(/[\s_-]+/).filter(w => w.length > 2);
  const targetWords = normalizedTarget.split(/[\s_-]+/).filter(w => w.length > 2);
  
  // Verifica se há palavras em comum
  const commonWords = csvWords.filter(word => 
    targetWords.some(targetWord => 
      targetWord.includes(word) || word.includes(targetWord)
    )
  );
  
  return commonWords.length > 0;
}

/**
 * Encontra o melhor match para um campo CSV entre os campos disponíveis
 * Retorna { field, score, matchType }
 */
export function findBestMatch(
  csvHeader: string,
  availableFields: Array<{ name: string; aliases?: string[] }>,
  threshold: number = 0.6
): { field: string; score: number; matchType: 'exact' | 'high' | 'contextual' | null } | null {
  const normalizedCsv = normalize(csvHeader).toLowerCase();
  
  let bestMatch: { field: string; score: number; matchType: 'exact' | 'high' | 'contextual' | null } | null = null;

  for (const field of availableFields) {
    // 1. Match exato (case-insensitive)
    const allNames = [field.name, ...(field.aliases || [])];
    for (const name of allNames) {
      const normalizedName = normalize(name).toLowerCase();
      
      if (normalizedCsv === normalizedName) {
        return { field: field.name, score: 1, matchType: 'exact' };
      }
    }

    // 2. Match por similaridade alta
    for (const name of allNames) {
      const similarity = calculateSimilarity(csvHeader, name);
      
      if (similarity >= 0.8 && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = { field: field.name, score: similarity, matchType: 'high' };
      }
    }

    // 3. Match contextual (palavras-chave)
    if (!bestMatch || bestMatch.score < 0.7) {
      for (const name of allNames) {
        if (hasContextualMatch(csvHeader, name)) {
          const similarity = calculateSimilarity(csvHeader, name);
          
          if (similarity >= threshold && (!bestMatch || similarity > bestMatch.score)) {
            bestMatch = { field: field.name, score: similarity, matchType: 'contextual' };
          }
        }
      }
    }
  }

  return bestMatch && bestMatch.score >= threshold ? bestMatch : null;
}
