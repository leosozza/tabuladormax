import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ResourceScope = 'global' | 'department' | 'own' | 'none';

export const useResourceScope = (resourceCode: string) => {
  const query = useQuery({
    queryKey: ['resource-scope', resourceCode],
    queryFn: async (): Promise<ResourceScope> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return 'none';
      }

      const { data, error } = await supabase.rpc('get_user_resource_scope', {
        _user_id: user.id,
        _resource_code: resourceCode,
      });

      if (error) {
        console.error('Error checking resource scope:', error);
        return 'none';
      }

      return (data as ResourceScope) || 'none';
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  return {
    scope: query.data || 'none',
    loading: query.isLoading,
    isOwnOnly: query.data === 'own',
    isGlobal: query.data === 'global',
    isDepartment: query.data === 'department',
  };
};
