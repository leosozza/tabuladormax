import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimesheetEntry {
  work_date: string;
  clock_in: string;
  clock_out: string;
  total_leads: number;
  hours_worked: number;
  projects: string;
}

export function useScouterTimesheet(
  scouterName: string | null,
  startDate?: string,
  endDate?: string,
  limit: number = 30
) {
  return useQuery({
    queryKey: ["scouter-timesheet", scouterName?.trim(), startDate, endDate, limit],
    queryFn: async () => {
      if (!scouterName) return [];

      const { data, error } = await supabase.rpc("get_scouter_timesheet", {
        p_scouter_name: scouterName.trim(),
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_limit: limit,
      });

      if (error) {
        console.error("❌ [ERROR] Erro ao buscar timesheet:", error);
        throw error;
      }
      return (data || []) as TimesheetEntry[];
    },
    enabled: !!scouterName,
    retry: 1,
  });
}
