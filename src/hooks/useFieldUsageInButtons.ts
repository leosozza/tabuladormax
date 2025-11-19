import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UsageLevel = "critical" | "important" | "moderate" | "none";

export interface FieldUsageInfo {
  isUsedInButtons: boolean;
  buttonCount: number;
  buttonNames: string[];
  usageLevel: UsageLevel;
}

// Campos críticos conhecidos do tabulador
const CRITICAL_FIELDS = [
  "PARENT_ID_1144",
  "UF_CRM_1748961149",
  "UF_CRM_1742410301",
  "UF_CRM_1740763672",
  "STATUS_ID",
  "UF_CRM_1740755176",
];

export function useFieldUsageInButtons() {
  return useQuery({
    queryKey: ["button-field-usage"],
    queryFn: async () => {
      const { data: buttons, error } = await supabase
        .from("button_config")
        .select("id, label, field, additional_fields");

      if (error) throw error;

      // Mapa: bitrixField -> { buttonNames[], count }
      const usageMap = new Map<string, { buttonNames: string[]; count: number }>();

      buttons?.forEach((button) => {
        // Campo principal
        if (button.field) {
          const existing = usageMap.get(button.field) || { buttonNames: [], count: 0 };
          existing.buttonNames.push(button.label);
          existing.count++;
          usageMap.set(button.field, existing);
        }

        // Additional fields
        if (button.additional_fields && Array.isArray(button.additional_fields)) {
          button.additional_fields.forEach((af: any) => {
            if (af.field) {
              const existing = usageMap.get(af.field) || { buttonNames: [], count: 0 };
              existing.buttonNames.push(button.label);
              existing.count++;
              usageMap.set(af.field, existing);
            }
          });
        }
      });

      return usageMap;
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

export function getFieldUsageInfo(
  bitrixField: string | null | undefined,
  usageMap?: Map<string, { buttonNames: string[]; count: number }>
): FieldUsageInfo {
  if (!bitrixField || !usageMap) {
    return {
      isUsedInButtons: false,
      buttonCount: 0,
      buttonNames: [],
      usageLevel: "none",
    };
  }

  const usage = usageMap.get(bitrixField);

  if (!usage) {
    return {
      isUsedInButtons: false,
      buttonCount: 0,
      buttonNames: [],
      usageLevel: "none",
    };
  }

  // Determinar nível de criticidade
  let usageLevel: UsageLevel = "moderate";

  if (CRITICAL_FIELDS.includes(bitrixField)) {
    usageLevel = "critical";
  } else if (usage.count >= 3) {
    usageLevel = "important";
  }

  return {
    isUsedInButtons: true,
    buttonCount: usage.count,
    buttonNames: usage.buttonNames,
    usageLevel,
  };
}
