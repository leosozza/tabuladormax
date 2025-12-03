import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAllowedRoutes = () => {
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchAllowedRoutes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setAllowedRoutes([]);
          setLoading(false);
          return;
        }

        // Buscar role e department do usuário
        const [roleResult, deptResult] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
          supabase.from('user_departments').select('department').eq('user_id', user.id).single()
        ]);

        // Admin tem acesso a tudo
        if (roleResult.data?.role === 'admin') {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        if (!roleResult.data || !deptResult.data) {
          setAllowedRoutes([]);
          setLoading(false);
          return;
        }

        // Buscar todas as rotas com permissão
        const { data: permissions } = await supabase
          .from('route_permissions')
          .select(`
            can_access,
            route:route_id (
              path,
              active
            )
          `)
          .eq('role', roleResult.data.role)
          .eq('department', deptResult.data.department)
          .eq('can_access', true);

        const routes = permissions
          ?.filter((p: any) => p.route?.active)
          .map((p: any) => p.route.path) || [];

        setAllowedRoutes(routes);
      } catch (error) {
        console.error('Erro ao buscar rotas permitidas:', error);
        setAllowedRoutes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllowedRoutes();

    // Ouvir mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAllowedRoutes();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { allowedRoutes, loading, isAdmin };
};
