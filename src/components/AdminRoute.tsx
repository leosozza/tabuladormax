import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute - Componente de proteção de rotas administrativas
 * 
 * Funcionalidades de Segurança:
 * 1. Autenticação: Verifica se o usuário está autenticado via Supabase Auth
 * 2. Autorização: Valida se o usuário possui role 'admin' através da tabela user_profiles
 * 3. Redirecionamento seguro:
 *    - Usuários não autenticados → /auth (página de login)
 *    - Usuários autenticados mas não-admins → /403 (acesso negado)
 * 4. Loading state: Previne flash de conteúdo durante verificação de permissões
 * 
 * Uso recomendado:
 * <Route path="/admin/diagnostics" element={
 *   <AdminRoute>
 *     <Suspense fallback={<Loading />}>
 *       <DiagnosticsPage />
 *     </Suspense>
 *   </AdminRoute>
 * } />
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // 1. Verificar autenticação do usuário
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('❌ [AdminRoute] Erro ao verificar sessão:', authError);
          setLoading(false);
          return;
        }

        if (!session) {
          console.log('⚠️ [AdminRoute] Usuário não autenticado');
          setLoading(false);
          return;
        }

        setUser(session.user);

        // 2. Verificar role do usuário na tabela user_profiles
        // Nota: user_profiles.role é a fonte de verdade para permissões
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('❌ [AdminRoute] Erro ao buscar perfil do usuário:', profileError);
          // Em caso de erro, bloquear acesso por segurança
          setUserRole(null);
          setLoading(false);
          return;
        }

        const role = profile?.role || null;
        setUserRole(role);
        console.log(`✅ [AdminRoute] Usuário autenticado com role: ${role}`);
        setLoading(false);

      } catch (error) {
        console.error('❌ [AdminRoute] Erro inesperado:', error);
        setLoading(false);
      }
    };

    checkAdminAccess();

    // 3. Listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          checkAdminAccess();
        } else {
          setUser(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Loading state: evita flash de conteúdo não autorizado
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Redirecionar não autenticados para login
  if (!user) {
    console.log('🔒 [AdminRoute] Redirecionando para /auth');
    return <Navigate to="/auth" replace />;
  }

  // Redirecionar não-admins para página de acesso negado
  if (userRole !== 'admin') {
    console.log(`🚫 [AdminRoute] Acesso negado para role: ${userRole}`);
    return <Navigate to="/403" replace />;
  }

  // Usuário é admin, permitir acesso
  return <>{children}</>;
};

export default AdminRoute;
