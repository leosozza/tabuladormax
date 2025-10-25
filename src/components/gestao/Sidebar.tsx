import { Link, useLocation } from "react-router-dom";
import { Home, Users, TrendingUp, DollarSign, MapPin, ArrowLeft, Heart, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GestaoSidebar() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: "/scouter", label: "Dashboard", icon: Home },
    { path: "/scouter/leads", label: "Leads", icon: Users },
    { path: "/scouter/analise", label: "Análise de Leads", icon: Heart },
    { path: "/scouter/scouters", label: "Scouters", icon: Users },
    { path: "/scouter/projecao", label: "Projeção", icon: TrendingUp },
    { path: "/scouter/pagamentos", label: "Pagamentos", icon: DollarSign },
    { path: "/scouter/area", label: "Área de Abordagem", icon: MapPin },
    { path: "/scouter/relatorios", label: "Relatórios", icon: FileText },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-2xl font-bold mb-2 text-sidebar-foreground">Gestão Scouter</h2>
        <p className="text-sm text-sidebar-foreground/70">Gerenciamento de Leads</p>
      </div>
      
      <nav className="flex-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200",
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-md"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <Link
          to="/home-choice"
          className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Menu
        </Link>
      </div>
    </div>
  );
}
