import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin, requireManager }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Check role if required
      if (requireAdmin || requireManager) {
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ Erro ao verificar permissões:', error);
          // Em caso de erro, bloquear acesso para segurança
          setHasAccess(false);
        } else {
          const userRole = roles?.role || null;
          console.log('✅ Role verificada:', userRole);
          
          if (requireAdmin) {
            setHasAccess(userRole === "admin");
          } else if (requireManager) {
            setHasAccess(userRole === "admin" || userRole === "manager");
          } else {
            setHasAccess(true);
          }
        }
      } else {
        setHasAccess(true);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user);
          checkAuth();
        } else {
          setUser(null);
          setHasAccess(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [requireAdmin, requireManager]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
