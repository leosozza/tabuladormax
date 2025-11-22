import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useContextualDataFix() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fixScoutersByProject = useMutation({
    mutationFn: async ({
      projectId,
      startDate,
      endDate,
    }: {
      projectId: string;
      startDate: Date;
      endDate: Date;
    }) => {
      const { data, error } = await supabase.rpc('fix_scouter_names_filtered', {
        p_project_id: projectId,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      if (error) throw error;
      return data[0];
    },
    onSuccess: (data) => {
      const { leads_fixed, leads_not_found } = data;
      
      if (leads_fixed > 0) {
        toast({
          title: "✅ Correção Concluída",
          description: `${leads_fixed} scouter(s) corrigido(s) com sucesso!${
            leads_not_found > 0 
              ? ` ${leads_not_found} ID(s) não encontrado(s) no mapeamento.` 
              : ''
          }`,
        });
      } else {
        toast({
          title: "ℹ️ Nenhuma Correção Necessária",
          description: "Todos os scouters já estão com nomes corretos.",
        });
      }

      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['payments-by-project'] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro na Correção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    fixScoutersByProject: fixScoutersByProject.mutate,
    isFixing: fixScoutersByProject.isPending,
  };
}
