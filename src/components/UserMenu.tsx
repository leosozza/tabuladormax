import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Shield, Bug, Users, Network, Activity } from "lucide-react";
import { toast } from "sonner";

const UserMenu = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [userMetadata, setUserMetadata] = useState<any>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserEmail(session.user.email || "");
        setUserMetadata(session.user.user_metadata);
        
        // Tentar buscar role do banco com tratamento de erro
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle(); // maybeSingle() não lança erro se não encontrar
        
        if (error) {
          console.error('❌ Erro ao buscar role:', error);
          toast.error('Erro ao carregar permissões do usuário');
          setUserRole('agent'); // Fallback para agent
        } else if (roles) {
          console.log('✅ Role carregada:', roles.role);
          setUserRole(roles.role);
        } else {
          console.warn('⚠️ Nenhuma role encontrada para usuário');
          setUserRole('agent');
        }
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{userMetadata?.display_name || userEmail}</p>
            {userRole && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {userRole.toUpperCase()}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        {userMetadata?.chatwoot_role && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs text-muted-foreground">Chatwoot</p>
                <p className="text-xs">Role: {userMetadata.chatwoot_role}</p>
              </div>
            </DropdownMenuLabel>
          </>
        )}
        <DropdownMenuSeparator />
        {(userRole === 'admin' || userRole === 'supervisor') && (
          <DropdownMenuItem onClick={() => navigate("/users")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Gerenciar Usuários</span>
          </DropdownMenuItem>
        )}
        {userRole === 'admin' && (
          <DropdownMenuItem onClick={() => navigate("/diagnostic")}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Diagnóstico do Sistema</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate("/debug")}>
          <Bug className="mr-2 h-4 w-4" />
          <span>Modo Debug</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/agent-mapping")}>
          <Network className="mr-2 h-4 w-4" />
          <span>Mapeamento de Agentes</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
