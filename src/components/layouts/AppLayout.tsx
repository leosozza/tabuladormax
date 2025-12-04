import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { UnifiedSidebar } from './UnifiedSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function AppLayout() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Listener para invalidar cache quando autenticação mudar
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          queryClient.invalidateQueries({ queryKey: ['user-role-for-sidebar'] });
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Verificar o role do usuário
  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role-for-sidebar'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      return data?.role;
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Mostrar loading enquanto verifica o role (sem sidebar)
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Se for agent OU não conseguiu identificar o role, não mostrar sidebar
  const showSidebar = userRole && userRole !== 'agent';

  // Layout sem sidebar para agentes
  if (!showSidebar) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <div className="flex-1 flex flex-col w-full min-w-0">
          <Outlet />
        </div>
      </div>
    );
  }

  // Layout com sidebar para outros roles (supervisor, manager, admin)
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        <UnifiedSidebar />
        <div className="flex-1 flex flex-col w-full min-w-0">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
