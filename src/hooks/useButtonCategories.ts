import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_BUTTON_CATEGORIES } from "@/lib/button-layout";

export interface ButtonCategoryData {
  id: string;
  name: string;
  label: string;
  sort_order: number;
}

export function useButtonCategories() {
  return useQuery({
    queryKey: ["button-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("button_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Erro ao carregar categorias:", error);
        // Retornar categorias padrão em caso de erro
        return DEFAULT_BUTTON_CATEGORIES.map((cat, idx) => ({
          id: cat.id,
          name: cat.id,
          label: cat.label,
          sort_order: idx,
        }));
      }

      // Se não há categorias no banco, retornar padrão
      if (!data || data.length === 0) {
        return DEFAULT_BUTTON_CATEGORIES.map((cat, idx) => ({
          id: cat.id,
          name: cat.id,
          label: cat.label,
          sort_order: idx,
        }));
      }

      return data as ButtonCategoryData[];
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// Helper para obter nomes das categorias para validação
export function getCategoryNames(categories: ButtonCategoryData[]): string[] {
  return categories.map((cat) => cat.name);
}
