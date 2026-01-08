import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Flow {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  steps: unknown[];
  created_at: string;
}

export function useActiveFlows() {
  return useQuery({
    queryKey: ['active-flows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flows')
        .select('id, nome, descricao, ativo, steps, created_at')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return (data || []) as Flow[];
    },
  });
}
