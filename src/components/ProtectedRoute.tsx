import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRoutePermission } from "@/hooks/useRoutePermission";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
  requireSupervisor?: boolean;
  checkRoutePermission?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAdmin, 
  requireManager,
  requireSupervisor,
  checkRoutePermission = false
}: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "manager" | "supervisor" | "agent" | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hook para verificar permissão de rota (novo sistema)
  const { canAccess: routeAllowed, loading: routeLoading } = useRoutePermission();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Se usa novo sistema de permissões por rota
      if (checkRoutePermission) {
        if (!routeLoading) {
          setHasAccess(routeAllowed);
          setLoading(false);
        }
        return;
      }

      // Check role if required (sistema antigo)
      if (requireAdmin || requireManager || requireSupervisor) {
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
          const roleValue = roles?.role as "admin" | "manager" | "supervisor" | "agent" | null;
          setUserRole(roleValue);
          console.log('✅ Role verificada:', roleValue);
          
          if (requireAdmin) {
            setHasAccess(roleValue === "admin");
          } else if (requireManager) {
            setHasAccess(roleValue === "admin" || roleValue === "manager");
          } else if (requireSupervisor) {
            setHasAccess(
              roleValue === "admin" || 
              roleValue === "manager" || 
              roleValue === "supervisor"
            );
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
  }, [requireAdmin, requireManager, requireSupervisor, checkRoutePermission, routeAllowed, routeLoading]);

  if (loading || (checkRoutePermission && routeLoading)) {
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
