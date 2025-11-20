/**
 * Bitrix Enum Value Resolver
 * 
 * Resolves Bitrix enum/list field IDs to their human-readable labels
 * using the bitrix_fields_cache table.
 */

import { supabase } from '@/integrations/supabase/client';

interface BitrixListItem {
  ID: string;
  VALUE: string;
}

interface EnumResolution {
  id: string;
  label: string;
  formatted: string; // "Label (ID)"
}

/**
 * Cache de resoluções de enum para evitar múltiplas consultas
 */
const enumCache = new Map<string, Map<string, EnumResolution>>();

/**
 * Resolve um valor de enum do Bitrix para seu label legível
 * @param bitrixField - ID do campo Bitrix (ex: "UF_CRM_...")
 * @param value - Valor a ser resolvido (ID do enum)
 * @param bitrixFieldType - Tipo do campo (opcional, para otimização)
 * @returns Objeto com id, label e formato "Label (ID)"
 */
export async function resolveBitrixEnumValue(
  bitrixField: string,
  value: string | number | null | undefined,
  bitrixFieldType?: string
): Promise<EnumResolution | null> {
  // Se valor é nulo ou vazio, retorna null
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const valueStr = String(value);

  // Se não é um campo de lista/enum, retorna null
  if (bitrixFieldType && !['enumeration', 'crm_status', 'crm_category'].includes(bitrixFieldType)) {
    return null;
  }

  // Verifica cache
  if (enumCache.has(bitrixField)) {
    const fieldCache = enumCache.get(bitrixField)!;
    if (fieldCache.has(valueStr)) {
      return fieldCache.get(valueStr)!;
    }
  }

  try {
    // Busca os list_items do campo no cache
    const { data: fieldData, error } = await supabase
      .from('bitrix_fields_cache')
      .select('list_items')
      .eq('field_id', bitrixField)
      .single();

    if (error || !fieldData?.list_items) {
      console.warn(`⚠️ Enum resolver: Campo ${bitrixField} não encontrado no cache`);
      return null;
    }

    const listItems = fieldData.list_items as unknown as BitrixListItem[];
    
    if (!Array.isArray(listItems) || listItems.length === 0) {
      return null;
    }

    // Inicializa cache para este campo
    if (!enumCache.has(bitrixField)) {
      enumCache.set(bitrixField, new Map());
    }
    const fieldCache = enumCache.get(bitrixField)!;

    // Popula cache com todos os itens
    listItems.forEach((item) => {
      const resolution: EnumResolution = {
        id: item.ID,
        label: item.VALUE,
        formatted: `${item.VALUE} (${item.ID})`
      };
      fieldCache.set(item.ID, resolution);
    });

    // Retorna o valor específico solicitado
    return fieldCache.get(valueStr) || null;
  } catch (error) {
    console.error(`❌ Erro ao resolver enum ${bitrixField}:`, error);
    return null;
  }
}

/**
 * Resolve múltiplos valores de enum de uma vez (otimizado)
 * @param resolutions - Array de { bitrixField, value, bitrixFieldType }
 * @returns Map com chave "bitrixField:value" e valor EnumResolution
 */
export async function resolveBitrixEnumValues(
  resolutions: Array<{
    bitrixField: string;
    value: unknown;
    bitrixFieldType?: string;
  }>
): Promise<Map<string, EnumResolution | null>> {
  const results = new Map<string, EnumResolution | null>();

  // Agrupa por campo para buscar uma vez só
  const fieldGroups = new Map<string, Set<string>>();
  
  resolutions.forEach(({ bitrixField, value, bitrixFieldType }) => {
    if (value === null || value === undefined || value === '') {
      results.set(`${bitrixField}:${value}`, null);
      return;
    }

    // Ignora campos que não são enums
    if (bitrixFieldType && !['enumeration', 'crm_status', 'crm_category'].includes(bitrixFieldType)) {
      results.set(`${bitrixField}:${value}`, null);
      return;
    }

    const valueStr = String(value);
    const key = `${bitrixField}:${valueStr}`;

    // Verifica cache
    if (enumCache.has(bitrixField)) {
      const fieldCache = enumCache.get(bitrixField)!;
      if (fieldCache.has(valueStr)) {
        results.set(key, fieldCache.get(valueStr)!);
        return;
      }
    }

    // Adiciona ao grupo para buscar
    if (!fieldGroups.has(bitrixField)) {
      fieldGroups.set(bitrixField, new Set());
    }
    fieldGroups.get(bitrixField)!.add(valueStr);
  });

  // Busca campos que precisam ser resolvidos
  if (fieldGroups.size > 0) {
    const fieldsToFetch = Array.from(fieldGroups.keys());
    
    const { data: fieldsData, error } = await supabase
      .from('bitrix_fields_cache')
      .select('field_id, list_items')
      .in('field_id', fieldsToFetch);

    if (!error && fieldsData) {
      fieldsData.forEach((fieldData) => {
        const bitrixField = fieldData.field_id;
        const listItems = fieldData.list_items as unknown as BitrixListItem[];

        if (!Array.isArray(listItems)) return;

        // Inicializa cache
        if (!enumCache.has(bitrixField)) {
          enumCache.set(bitrixField, new Map());
        }
        const fieldCache = enumCache.get(bitrixField)!;

        // Popula cache
        listItems.forEach((item) => {
          const resolution: EnumResolution = {
            id: item.ID,
            label: item.VALUE,
            formatted: `${item.VALUE} (${item.ID})`
          };
          fieldCache.set(item.ID, resolution);
        });

        // Adiciona aos resultados
        const valuesToResolve = fieldGroups.get(bitrixField);
        if (valuesToResolve) {
          valuesToResolve.forEach((valueStr) => {
            const key = `${bitrixField}:${valueStr}`;
            results.set(key, fieldCache.get(valueStr) || null);
          });
        }
      });
    }
  }

  return results;
}

/**
 * Limpa o cache de enums (útil para testes ou após atualização do schema)
 */
export function clearEnumCache() {
  enumCache.clear();
}
