import { Link, useLocation } from "react-router-dom";
import { Home, Users, TrendingUp, DollarSign, MapPin, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GestaoSidebar() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: "/scouter", label: "Dashboard", icon: Home },
    { path: "/scouter/leads", label: "Leads", icon: Users },
    { path: "/scouter/scouters", label: "Scouters", icon: Users },
    { path: "/scouter/projecao", label: "Projeção", icon: TrendingUp },
    { path: "/scouter/pagamentos", label: "Pagamentos", icon: DollarSign },
    { path: "/scouter/area", label: "Área de Abordagem", icon: MapPin },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-green-900 to-green-950 text-white min-h-screen flex flex-col">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">Gestão Scouter</h2>
        <p className="text-sm text-green-200">Gerenciamento de Leads</p>
      </div>
      
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors",
                isActive(item.path)
                  ? "bg-green-700 text-white font-medium"
                  : "text-green-100 hover:bg-green-800/50"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-green-800">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-green-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Tabulador
        </Link>
      </div>
    </div>
  );
}
