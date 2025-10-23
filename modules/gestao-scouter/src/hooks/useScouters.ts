import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScouterProfile {
  id: number;
  nome: string;
  telefone?: string;
  supervisor?: string;
  ativo: boolean;
  user_id?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

export function useScouters() {
  return useQuery({
    queryKey: ['scouters'],
    queryFn: async (): Promise<ScouterProfile[]> => {
      const { data, error } = await supabase
        .from('scouter_profiles')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });
}
