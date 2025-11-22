import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDataQuality() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Contar leads com IDs numéricos no campo scouter
  const { data: numericScouterCount, isLoading } = useQuery({
    queryKey: ['data-quality', 'numeric-scouters'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .filter('scouter', 'match', '^[0-9]+$');

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Mutation para executar correção
  const fixScouterNames = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fix-scouter-names');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Correção Concluída",
        description: `${data.leadsFixed} leads foram corrigidos com sucesso!`,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['data-quality'] });
      queryClient.invalidateQueries({ queryKey: ['payments-by-project'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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
    numericScouterCount,
    isLoading,
    fixScouterNames: fixScouterNames.mutate,
    isFixing: fixScouterNames.isPending,
    fixResult: fixScouterNames.data,
  };
}
