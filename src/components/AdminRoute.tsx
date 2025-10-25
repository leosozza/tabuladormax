import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Componente de proteção de rotas administrativas
 * 
 * Segurança implementada:
 * 1. Autenticação: Verifica sessão ativa via Supabase Auth
 * 2. Autorização: Valida role 'admin' consultando user_profiles
 * 3. Redirecionamento: Usuários não autenticados → /auth, não-admins → /403
 * 4. Loading state: Evita flash de conteúdo não autorizado
 * 
 * Uso: <AdminRoute><ComponenteAdmin /></AdminRoute>
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setLoading(false);
          return;
        }

        setUser(session.user);

        // Buscar role do perfil do usuário
        // Utiliza user_profiles para consistência com o sistema existente
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error('❌ [AdminRoute] Erro ao verificar role:', error);
          // Em caso de erro, bloquear acesso por segurança
          setIsAdmin(false);
        } else {
          // Apenas usuários com role 'admin' têm acesso
          setIsAdmin(profile?.role === 'admin');
          console.log('✅ [AdminRoute] Role verificada:', profile?.role);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ [AdminRoute] Erro na verificação:', error);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    checkAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setUser(session.user);
          checkAuth();
        } else {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Loading state - Evita flash de conteúdo
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Não autenticado - Redireciona para login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Não é admin - Redireciona para página 403
  if (isAdmin === false) {
    return <Navigate to="/403" replace />;
  }

  // Admin autenticado - Renderiza conteúdo
  return <>{children}</>;
};

export default AdminRoute;
