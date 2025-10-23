import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Home, TrendingUp } from "lucide-react";
import { NavLink } from "react-router-dom";

interface MobileSidebarProps {
  isConfigOpen: boolean;
  setIsConfigOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function MobileSidebar({ isConfigOpen, setIsConfigOpen, onLogout }: MobileSidebarProps) {
  return (
    <div className="md:hidden">
      <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <div className="py-4 border-b">
            <h2 className="font-semibold text-lg">Gestão Scouter</h2>
          </div>
          <nav className="flex flex-col space-y-1 mt-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Menu Principal
            </div>
            <NavLink
              to="/"
              onClick={() => setIsConfigOpen(false)}
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
              onClick={() => setIsConfigOpen(false)}
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
        </SheetContent>
      </Sheet>
    </div>
  );
}