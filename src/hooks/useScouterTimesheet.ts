import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimesheetEntry {
  work_date: string;
  clock_in: string;
  clock_out: string;
  total_leads: number;
  hours_worked: number;
}

export function useScouterTimesheet(
  scouterName: string | null,
  startDate?: string,
  endDate?: string,
  limit: number = 30
) {
  return useQuery({
    queryKey: ["scouter-timesheet", scouterName, startDate, endDate, limit],
    queryFn: async () => {
      if (!scouterName) return [];

      const { data, error } = await supabase.rpc("get_scouter_timesheet", {
        p_scouter_name: scouterName,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_limit: limit,
      });

      if (error) throw error;
      return (data || []) as TimesheetEntry[];
    },
    enabled: !!scouterName,
  });
}
