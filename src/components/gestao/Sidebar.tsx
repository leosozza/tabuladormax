import { Link, useLocation } from "react-router-dom";
import { Home, Users, TrendingUp, DollarSign, MapPin, ArrowLeft, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
interface GestaoSidebarProps {
  onNavigate?: () => void;
}
export default function GestaoSidebar({
  onNavigate
}: GestaoSidebarProps = {}) {
  const location = useLocation();

  // Verificar se usuário é admin/manager
  const {
    data: userRole
  } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;
      const {
        data
      } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      return data?.role;
    }
  });
  const isActive = (path: string) => location.pathname === path;
  const navItems = [{
    path: "/scouter",
    label: "Dashboard",
    icon: Home
  }, {
    path: "/scouter/leads",
    label: "Leads",
    icon: Users
  }, {
    path: "/whatsapp",
    label: "Central de Atendimento",
    icon: MessageSquare,
    state: {
      from: 'scouter'
    }
  }, {
    path: "/scouter/scouters",
    label: "Scouters",
    icon: Users
  }, {
    path: "/scouter/projecao",
    label: "Projeção",
    icon: TrendingUp
  }, {
    path: "/scouter/pagamentos",
    label: "Pagamentos",
    icon: DollarSign
  }, {
    path: "/scouter/area",
    label: "Área de Abordagem",
    icon: MapPin
  }, {
    path: "/scouter/relatorios",
    label: "Relatórios",
    icon: FileText
  }];
  return <div className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/home-choice" onClick={onNavigate} className="block mb-3 cursor-pointer hover:text-primary transition-colors">
          <h2 className="text-xl font-bold text-sidebar-foreground">Maxconnect</h2>
        </Link>
        <h3 className="text-lg font-semibold mb-1 text-sidebar-foreground">Gerenciamento de Leads  </h3>
        <p className="text-sm text-sidebar-foreground/70">
      </p>
      </div>
      
      <nav className="flex-1 px-3 py-4">
        {navItems.map(item => {
        const Icon = item.icon;
        return <Link key={item.path} to={item.path} state={item.state} onClick={onNavigate} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200", isActive(item.path) ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-md" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>;
      })}
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <Link to="/home-choice" onClick={onNavigate} className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Menu
        </Link>
      </div>
    </div>;
}