import { ReactNode } from "react";
import { SafeSidebarTrigger } from "@/components/SafeSidebarTrigger";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
  fullWidth?: boolean;
}

export function MainLayout({
  children,
  title,
  subtitle,
  actions,
  showBackButton = false,
  backTo = "/home-choice",
  fullWidth = false,
}: MainLayoutProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Header responsivo */}
      {(title || actions || showBackButton) && (
        <header className="sticky top-0 z-[500] border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 p-3 md:p-4">
            <SafeSidebarTrigger />

            {/* Botão de voltar */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(backTo)}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}

            {/* Título */}
            {title && (
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs md:text-sm text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Ações do header */}
            {actions && (
              <div className="flex items-center gap-2 shrink-0">
                {actions}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Conteúdo principal com scroll */}
      <main className="flex-1 overflow-auto">
        <div className={fullWidth ? "h-full" : "container mx-auto p-3 md:p-6 max-w-screen-2xl"}>
          {children}
        </div>
      </main>
    </>
  );
}
