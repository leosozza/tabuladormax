import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { UnifiedSidebar } from './UnifiedSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Menu } from 'lucide-react';
export function AppLayout() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Listener para detectar mudanças de autenticação
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setAuthLoading(false);
    };
    checkUser();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.id);

      // Atualizar userId imediatamente
      setCurrentUserId(session?.user?.id || null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Limpar TODOS os caches de role
        queryClient.removeQueries({
          queryKey: ['user-role-for-sidebar']
        });
        queryClient.invalidateQueries({
          queryKey: ['user-role-for-sidebar']
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Query com user ID na key para evitar cache incorreto
  const {
    data: userRole,
    isLoading: roleLoading
  } = useQuery({
    queryKey: ['user-role-for-sidebar', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      console.log('Fetching role for user:', currentUserId);
      const {
        data
      } = await supabase.from('user_roles').select('role').eq('user_id', currentUserId).single();
      console.log('User role fetched:', data?.role);
      return data?.role;
    },
    enabled: !!currentUserId,
    staleTime: 0,
    gcTime: 0
  });

  // Mostrar loading enquanto verifica autenticação OU role
  if (authLoading || roleLoading) {
    return <div className="flex min-h-screen w-full bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }

  // Se não tem userId OU é agent → não mostrar sidebar
  const showSidebar = currentUserId && userRole && userRole !== 'agent';
  console.log('Sidebar decision:', {
    currentUserId,
    userRole,
    showSidebar
  });

  // Layout sem sidebar para agentes ou não-autenticados
  if (!showSidebar) {
    return <div className="flex min-h-screen w-full bg-background">
        <div className="flex-1 flex flex-col w-full min-w-0">
          <Outlet />
        </div>
      </div>;
  }

  // Layout com sidebar para outros roles
  return <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        <UnifiedSidebar />
        <div className="flex-1 flex flex-col w-full min-w-0">
          {/* Header com trigger para colapsar sidebar */}
          
          <Outlet />
        </div>
      </div>
    </SidebarProvider>;
}