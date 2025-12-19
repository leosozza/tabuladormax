// Tipo flexível para permitir categorias dinâmicas do banco de dados
export type ButtonCategory = string;

export interface ButtonLayout {
  category: ButtonCategory;
  index: number;
  w: number;
  h: number;
}

// Categorias padrão para fallback quando banco não está disponível
export const DEFAULT_BUTTON_CATEGORIES = [
  { id: "AGENDAR", label: "Agendar" },
  { id: "RETORNAR", label: "Retornar" },
  { id: "NAO_AGENDADO", label: "Não Agendado" },
];

// Mantido para compatibilidade - use categories do banco quando possível
export const BUTTON_CATEGORIES = DEFAULT_BUTTON_CATEGORIES;

// Ordem padrão - use sort_order do banco quando possível
export const categoryOrder: ButtonCategory[] = ["AGENDAR", "RETORNAR", "NAO_AGENDADO"];

export function createDefaultLayout(category: ButtonCategory = "NAO_AGENDADO", index: number = 0): ButtonLayout {
  return {
    category,
    index,
    w: 1,
    h: 1,
  };
}

export function ensureButtonLayout(
  layout: Partial<ButtonLayout> | null | undefined,
  defaultIndex: number = 0,
  validCategories?: string[]
): ButtonLayout {
  if (!layout || typeof layout !== 'object') {
    const defaultCategory = validCategories?.[0] || "NAO_AGENDADO";
    return createDefaultLayout(defaultCategory, defaultIndex);
  }

  // Se validCategories foi passado, usar para validar; senão, aceitar qualquer categoria
  let finalCategory = layout.category || "NAO_AGENDADO";
  
  if (validCategories && validCategories.length > 0) {
    if (!validCategories.includes(finalCategory)) {
      finalCategory = validCategories[0];
    }
  }

  return {
    category: finalCategory,
    index: typeof layout.index === 'number' ? layout.index : defaultIndex,
    w: typeof layout.w === 'number' && layout.w >= 1 && layout.w <= 3 ? layout.w : 1,
    h: typeof layout.h === 'number' && layout.h >= 1 && layout.h <= 3 ? layout.h : 1,
  };
}
