import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemUser {
  id: string;
  display_name: string | null;
  email: string | null;
}

export function useSystemUsers() {
  return useQuery({
    queryKey: ['system-users'],
    queryFn: async (): Promise<SystemUser[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
