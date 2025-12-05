import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRole() {
  const { data, isLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.user.id)
        .single();

      return roleData?.role ?? null;
    },
  });

  return {
    role: data,
    isLoading,
    isAdmin: data === 'admin',
    isManager: data === 'manager',
    canManageRoadmap: data === 'admin' || data === 'manager',
  };
}
