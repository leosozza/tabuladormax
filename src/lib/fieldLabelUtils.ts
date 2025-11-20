/**
 * Utilitário centralizado para formatar labels de campos do Bitrix
 * REGRA DE UX: Sempre mostrar labels legíveis, nunca nomes técnicos
 */

interface BitrixFieldInfo {
  field_id: string;
  field_title?: string | null;
  display_name?: string | null;
  listLabel?: string | null;
}

/**
 * Obtém o label mais legível disponível para um campo do Bitrix
 * Prioridade: display_name > listLabel > field_title > formatFieldId
 */
export function getBitrixFieldLabel(field: BitrixFieldInfo): string {
  // 1ª prioridade: display_name (customizado pelo admin)
  if (field.display_name?.trim()) {
    return field.display_name.trim();
  }
  
  // 2ª prioridade: listLabel (do metadata do Bitrix)
  if (field.listLabel?.trim()) {
    return field.listLabel.trim();
  }
  
  // 3ª prioridade: field_title
  if (field.field_title?.trim()) {
    return field.field_title.trim();
  }
  
  // Último recurso: formatar o field_id
  return formatFieldId(field.field_id);
}

/**
 * Formata um field_id técnico para ser mais legível
 * Ex: "UF_CRM_1745431662" → "UF CRM 1745431662"
 */
export function formatFieldId(fieldId: string): string {
  return fieldId
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

/**
 * Para uso em tabelas/listas - retorna label + badge com field_id
 */
export function getBitrixFieldLabelWithId(field: BitrixFieldInfo): {
  label: string;
  technicalId: string;
} {
  return {
    label: getBitrixFieldLabel(field),
    technicalId: field.field_id
  };
}
