import { supabase } from "@/integrations/supabase/client";

export interface SpaEntity {
  entity_type_id: number;
  bitrix_item_id: number;
  title: string;
}

export interface SpaResolution {
  name: string;
  id: number;
}

/**
 * Resolve um ID de entidade SPA para seu nome
 */
export async function resolveSpaEntity(
  entityTypeId: number,
  bitrixItemId: number | null
): Promise<SpaResolution | null> {
  if (!bitrixItemId) return null;

  const { data, error } = await supabase
    .from('bitrix_spa_entities')
    .select('title, bitrix_item_id')
    .eq('entity_type_id', entityTypeId)
    .eq('bitrix_item_id', bitrixItemId)
    .maybeSingle();

  if (error || !data) {
    console.warn(`Entidade SPA não encontrada: ${entityTypeId}/${bitrixItemId}`);
    return null;
  }

  return {
    name: data.title,
    id: data.bitrix_item_id
  };
}

/**
 * Resolve múltiplos IDs de entidades SPA de uma vez
 */
export async function resolveSpaEntities(
  requests: Array<{ entityTypeId: number; bitrixItemId: number }>
): Promise<Map<string, SpaResolution>> {
  const results = new Map<string, SpaResolution>();

  if (requests.length === 0) return results;

  // Agrupar por entityTypeId para buscar em lote
  const byType = requests.reduce((acc, req) => {
    if (!acc[req.entityTypeId]) acc[req.entityTypeId] = [];
    acc[req.entityTypeId].push(req.bitrixItemId);
    return acc;
  }, {} as Record<number, number[]>);

  // Buscar cada tipo em lote
  for (const [entityTypeId, ids] of Object.entries(byType)) {
    const { data } = await supabase
      .from('bitrix_spa_entities')
      .select('entity_type_id, bitrix_item_id, title')
      .eq('entity_type_id', Number(entityTypeId))
      .in('bitrix_item_id', ids);

    if (data) {
      for (const entity of data) {
        const key = `${entity.entity_type_id}-${entity.bitrix_item_id}`;
        results.set(key, {
          name: entity.title,
          id: entity.bitrix_item_id
        });
      }
    }
  }

  return results;
}

/**
 * Helper para identificar o entity_type_id pelo campo Bitrix
 */
export function getEntityTypeFromField(bitrixField: string): number | null {
  const map: Record<string, number> = {
    'PARENT_ID_1096': 1096, // Scouters
    'PARENT_ID_1120': 1120, // Projetos Comerciais
    'PARENT_ID_1144': 1144, // Telemarketing
    'PARENT_ID_1156': 1156, // Produtores
  };
  return map[bitrixField] || null;
}
