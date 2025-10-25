import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

interface RoutePermission {
  canAccess: boolean;
  loading: boolean;
  routeName: string | null;
  routeDescription: string | null;
}

/**
 * Hook para verificar permissão de acesso a uma rota específica
 * Usa o sistema de route_permissions e can_access_route()
 */
export const useRoutePermission = (routePath?: string): RoutePermission => {
  const location = useLocation();
  const [permission, setPermission] = useState<RoutePermission>({
    canAccess: false,
    loading: true,
    routeName: null,
    routeDescription: null,
  });

  const pathToCheck = routePath || location.pathname;

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setPermission({ 
            canAccess: false, 
            loading: false, 
            routeName: null,
            routeDescription: null,
          });
          return;
        }

        // Buscar informações da rota
        const { data: routeData } = await supabase
          .from('app_routes' as any)
          .select('id, name, description')
          .eq('path', pathToCheck)
          .eq('active', true)
          .maybeSingle();

        if (!routeData) {
          // Rota não cadastrada = permitir (backward compatibility)
          setPermission({ 
            canAccess: true, 
            loading: false, 
            routeName: null,
            routeDescription: null,
          });
          return;
        }

        // Verificar permissão usando a function
        const { data, error } = await supabase.rpc('can_access_route' as any, {
          _user_id: user.id,
          _route_path: pathToCheck,
        });

        if (error) {
          console.error('Erro ao verificar permissão de rota:', error);
          throw error;
        }

        setPermission({
          canAccess: data === true,
          loading: false,
          routeName: (routeData as any).name,
          routeDescription: (routeData as any).description,
        });
      } catch (error) {
        console.error('Erro ao verificar permissão de rota:', error);
        // Em caso de erro, negar acesso por segurança
        setPermission({ 
          canAccess: false, 
          loading: false, 
          routeName: null,
          routeDescription: null,
        });
      }
    };

    checkPermission();
  }, [pathToCheck]);

  return permission;
};
