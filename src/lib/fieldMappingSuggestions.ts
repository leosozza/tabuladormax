// FASE 5.1: Auto-sugestões inteligentes de mapeamento de campos

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const costs: number[] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  
  return costs[s2.length];
}

/**
 * Calcula similaridade entre duas strings (0-1, sendo 1 = idêntico)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(str1, str2);
  return (maxLength - distance) / maxLength;
}

/**
 * Normaliza nome de campo para comparação
 */
function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^uf_crm_/i, '')
    .replace(/^uf_/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mapeamentos comuns conhecidos
 */
const COMMON_MAPPINGS: Record<string, string[]> = {
  'name': ['nome', 'name', 'title', 'nome_completo', 'full_name'],
  'email': ['email', 'e-mail', 'correio', 'mail'],
  'phone': ['telefone', 'phone', 'celular', 'tel', 'mobile', 'phone_number'],
  'age': ['idade', 'age', 'anos'],
  'address': ['endereco', 'address', 'local', 'rua', 'logradouro'],
  'cpf': ['cpf', 'documento', 'doc', 'tax_id'],
  'rg': ['rg', 'identidade', 'identity'],
  'responsible': ['responsavel', 'responsible', 'atribuido', 'assigned'],
  'scouter': ['scouter', 'captador', 'olheiro'],
  'status': ['status', 'estado', 'state', 'situacao'],
  'photo': ['foto', 'photo', 'imagem', 'image', 'avatar'],
  'date': ['data', 'date', 'quando'],
  'created_at': ['criado', 'created', 'data_criacao'],
  'updated_at': ['atualizado', 'updated', 'modificado', 'modified'],
};

/**
 * Compatibilidade de tipos entre sistemas
 */
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  'string': ['text', 'varchar', 'character varying', 'char'],
  'text': ['string', 'varchar', 'character varying'],
  'integer': ['bigint', 'smallint', 'int', 'numeric', 'number'],
  'bigint': ['integer', 'int', 'numeric', 'number'],
  'boolean': ['bool', 'bit'],
  'date': ['timestamp', 'timestamp with time zone', 'timestamptz', 'datetime'],
  'timestamp': ['date', 'timestamp with time zone', 'timestamptz', 'datetime'],
  'jsonb': ['json', 'object'],
  'array': ['list'],
};

/**
 * Verifica se dois tipos são compatíveis
 */
export function areTypesCompatible(type1: string, type2: string): boolean {
  const t1 = type1.toLowerCase();
  const t2 = type2.toLowerCase();
  
  if (t1 === t2) return true;
  
  for (const [baseType, compatibleTypes] of Object.entries(TYPE_COMPATIBILITY)) {
    if (t1 === baseType && compatibleTypes.includes(t2)) return true;
    if (t2 === baseType && compatibleTypes.includes(t1)) return true;
  }
  
  return false;
}

/**
 * Sugere transformação necessária entre tipos incompatíveis
 */
export function suggestTransformation(sourceType: string, targetType: string): string | null {
  const s = sourceType.toLowerCase();
  const t = targetType.toLowerCase();
  
  if (areTypesCompatible(s, t)) return null;
  
  // String → Number
  if ((s === 'string' || s === 'text') && 
      (t === 'integer' || t === 'bigint' || t === 'numeric' || t === 'number')) {
    return 'toNumber';
  }
  
  // Number → String
  if ((s === 'integer' || s === 'bigint' || s === 'numeric' || s === 'number') && 
      (t === 'string' || t === 'text')) {
    return 'toString';
  }
  
  // String → Boolean
  if ((s === 'string' || s === 'text') && (t === 'boolean' || t === 'bool')) {
    return 'toBoolean';
  }
  
  // String → Date/Timestamp
  if ((s === 'string' || s === 'text') && 
      (t === 'date' || t === 'timestamp' || t === 'datetime')) {
    return t === 'date' ? 'toDate' : 'toTimestamp';
  }
  
  return null;
}

export interface FieldSuggestion {
  sourceField: string;
  targetField: string;
  similarity: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  transformationNeeded?: string;
}

/**
 * Sugere mapeamentos entre campos de origem e destino
 */
export function suggestFieldMappings(
  sourceFields: Array<{ field_id: string; field_title?: string; field_type?: string }>,
  targetFields: Array<{ column_name: string; data_type?: string }>,
  existingMappings: Array<{ bitrix_field?: string; tabuladormax_field?: string; source_field?: string; target_field?: string }> = []
): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];
  const mappedSourceFields = new Set(
    existingMappings.map(m => m.bitrix_field || m.source_field).filter(Boolean)
  );
  const mappedTargetFields = new Set(
    existingMappings.map(m => m.tabuladormax_field || m.target_field).filter(Boolean)
  );
  
  for (const sourceField of sourceFields) {
    // Pular campos já mapeados
    if (mappedSourceFields.has(sourceField.field_id)) continue;
    
    const sourceNormalized = normalizeFieldName(sourceField.field_title || sourceField.field_id);
    
    for (const targetField of targetFields) {
      // Pular campos já mapeados
      if (mappedTargetFields.has(targetField.column_name)) continue;
      
      const targetNormalized = normalizeFieldName(targetField.column_name);
      
      // 1. Verificar mapeamentos conhecidos
      let found = false;
      for (const [commonKey, variations] of Object.entries(COMMON_MAPPINGS)) {
        if (variations.some(v => sourceNormalized.includes(v)) &&
            variations.some(v => targetNormalized.includes(v))) {
          suggestions.push({
            sourceField: sourceField.field_id,
            targetField: targetField.column_name,
            similarity: 1.0,
            reason: `Mapeamento comum conhecido: ${commonKey}`,
            confidence: 'high',
            transformationNeeded: suggestTransformation(
              sourceField.field_type || 'string',
              targetField.data_type || 'string'
            ) || undefined
          });
          found = true;
          break;
        }
      }
      
      if (found) continue;
      
      // 2. Calcular similaridade por nome
      const similarity = calculateSimilarity(sourceNormalized, targetNormalized);
      
      if (similarity >= 0.7) {
        suggestions.push({
          sourceField: sourceField.field_id,
          targetField: targetField.column_name,
          similarity,
          reason: `Alta similaridade de nome (${Math.round(similarity * 100)}%)`,
          confidence: similarity >= 0.9 ? 'high' : 'medium',
          transformationNeeded: suggestTransformation(
            sourceField.field_type || 'string',
            targetField.data_type || 'string'
          ) || undefined
        });
      } else if (similarity >= 0.5) {
        suggestions.push({
          sourceField: sourceField.field_id,
          targetField: targetField.column_name,
          similarity,
          reason: `Similaridade moderada de nome (${Math.round(similarity * 100)}%)`,
          confidence: 'low',
          transformationNeeded: suggestTransformation(
            sourceField.field_type || 'string',
            targetField.data_type || 'string'
          ) || undefined
        });
      }
    }
  }
  
  // Ordenar por confiança e similaridade
  return suggestions.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    if (confidenceDiff !== 0) return confidenceDiff;
    return b.similarity - a.similarity;
  });
}

/**
 * Valida um mapeamento proposto
 */
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateMapping(
  sourceField: { field_id: string; field_type?: string },
  targetField: { column_name: string; data_type?: string }
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Verificar compatibilidade de tipos
  if (sourceField.field_type && targetField.data_type) {
    const compatible = areTypesCompatible(sourceField.field_type, targetField.data_type);
    
    if (!compatible) {
      const transformation = suggestTransformation(sourceField.field_type, targetField.data_type);
      if (transformation) {
        warnings.push(
          `Tipos incompatíveis (${sourceField.field_type} → ${targetField.data_type}). ` +
          `Sugestão: usar transformação "${transformation}"`
        );
      } else {
        errors.push(
          `Tipos incompatíveis e sem transformação disponível ` +
          `(${sourceField.field_type} → ${targetField.data_type})`
        );
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}
