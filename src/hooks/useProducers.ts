import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Producer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  status: string;
  bitrix_id: number | null;
}

export function useActiveProducers() {
  return useQuery({
    queryKey: ['producers', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, name, email, phone, photo_url, status, bitrix_id')
        .eq('status', 'ativo')
        .order('name');

      if (error) throw error;
      return data as Producer[];
    },
  });
}
