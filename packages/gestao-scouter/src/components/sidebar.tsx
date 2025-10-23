import { NavLink } from "react-router-dom";
import { Home, TrendingUp } from "lucide-react";

interface SidebarProps {
  isConfigOpen: boolean;
  setIsConfigOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function Sidebar({ isConfigOpen, setIsConfigOpen, onLogout }: SidebarProps) {
  return (
    <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 bg-card border-r">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Gestão Scouter</h2>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Menu Principal
          </div>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <Home className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink
            to="/projecao"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <TrendingUp className="h-4 w-4" />
            Projeções
          </NavLink>
        </nav>
      </div>
    </div>
  );
}