// Sistema de validação e detecção de campos ausentes
import type { LeadDataPoint } from '@/types/lead';

// Campos obrigatórios por tabela
const REQUIRED_FIELDS = {
  leads: ['scouter', 'projeto', 'criado', 'valor_ficha', 'nome'],
  scouter_profiles: ['nome', 'telefone', 'ativo'],
  leads_geo: ['latitude', 'longitude', 'lat', 'lng']
} as const;

// Aliases comuns para campos
const FIELD_ALIASES = {
  scouter: ['Gestão de Scouter', 'Scouter', 'Gestão do Scouter', 'scouter'],
  projeto: ['Projetos Comerciais', 'Projetos Cormeciais', 'Projeto', 'projeto'],
  criado: ['Data', 'Data_criacao_Ficha', 'Criado', 'criado'],
  valor_ficha: ['Valor da Ficha', 'Valor Ficha', 'valor_ficha'],
  nome: ['Nome', 'nome', 'Nome Completo'],
  latitude: ['latitude', 'lat', 'Latitude'],
  longitude: ['longitude', 'lng', 'lon', 'Longitude']
} as const;

export interface FieldValidationResult {
  isValid: boolean;
  missingFields: string[];
  suggestions: Map<string, string>;
}

/**
 * Detecta campos ausentes nos dados
 */
export function detectMissingFields(
  data: any[], 
  table: keyof typeof REQUIRED_FIELDS
): string[] {
  if (!data || data.length === 0) return [];
  
  const required = REQUIRED_FIELDS[table] || [];
  const firstRow = data[0];
  
  return required.filter(field => {
    // Verifica se o campo existe diretamente
    if (firstRow[field] !== undefined && firstRow[field] !== null) return false;
    
    // Verifica aliases comuns
    const aliases = FIELD_ALIASES[field as keyof typeof FIELD_ALIASES] || [];
    return !aliases.some(alias => 
      firstRow[alias] !== undefined && firstRow[alias] !== null
    );
  });
}

/**
 * Obtém sugestões de mapeamento para campos ausentes
 */
export function getMappingSuggestion(missingField: string): string {
  const suggestions = FIELD_ALIASES[missingField as keyof typeof FIELD_ALIASES];
  
  if (suggestions && suggestions.length > 0) {
    return `Tente mapear: ${suggestions.join(', ')}`;
  }
  
  return 'Configure em Mapeamento de Campos';
}

/**
 * Valida estrutura completa dos dados
 */
export function validateDataStructure(
  data: any[],
  table: keyof typeof REQUIRED_FIELDS
): FieldValidationResult {
  const missingFields = detectMissingFields(data, table);
  const suggestions = new Map<string, string>();
  
  missingFields.forEach(field => {
    suggestions.set(field, getMappingSuggestion(field));
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    suggestions
  };
}

/**
 * Normaliza coordenadas de vários formatos possíveis
 */
export function normalizeCoordinates(row: any): { lat: number | null; lng: number | null } {
  // Tenta latitude
  const lat = row.latitude ?? row.lat ?? row.Latitude ?? null;
  
  // Tenta longitude
  const lng = row.longitude ?? row.lng ?? row.lon ?? row.Longitude ?? null;
  
  // Converte para número se for string
  return {
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null
  };
}

/**
 * Verifica se dados têm coordenadas válidas
 */
export function hasValidCoordinates(data: any[]): boolean {
  if (!data || data.length === 0) return false;
  
  return data.some(row => {
    const { lat, lng } = normalizeCoordinates(row);
    return lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  });
}
