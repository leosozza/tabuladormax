export type ButtonCategory = "NAO_AGENDADO" | "RETORNAR" | "AGENDAR";

export interface ButtonLayout {
  category: ButtonCategory;
  index: number;
  w: number;
  h: number;
}

export const BUTTON_CATEGORIES = [
  { id: "NAO_AGENDADO" as ButtonCategory, label: "Não Agendado" },
  { id: "RETORNAR" as ButtonCategory, label: "Retornar" },
  { id: "AGENDAR" as ButtonCategory, label: "Agendar" },
];

export const categoryOrder: ButtonCategory[] = ["NAO_AGENDADO", "RETORNAR", "AGENDAR"];

export function createDefaultLayout(category: ButtonCategory = "NAO_AGENDADO", index: number = 0): ButtonLayout {
  return {
    category,
    index,
    w: 1,
    h: 1,
  };
}

export function ensureButtonLayout(layout: Partial<ButtonLayout> | null | undefined, defaultIndex: number = 0): ButtonLayout {
  if (!layout || typeof layout !== 'object') {
    return createDefaultLayout("NAO_AGENDADO", defaultIndex);
  }

  const category = categoryOrder.includes(layout.category as ButtonCategory)
    ? (layout.category as ButtonCategory)
    : "NAO_AGENDADO";

  return {
    category,
    index: typeof layout.index === 'number' ? layout.index : defaultIndex,
    w: typeof layout.w === 'number' && layout.w >= 1 && layout.w <= 3 ? layout.w : 1,
    h: typeof layout.h === 'number' && layout.h >= 1 && layout.h <= 3 ? layout.h : 1,
  };
}
