import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import GestaoSidebar from '@/components/gestao/Sidebar';

interface GestaoPageLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function GestaoPageLayout({
  children,
  title,
  description,
  actions,
}: GestaoPageLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile: Sheet Sidebar */}
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <GestaoSidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Sidebar sempre visível */
        <GestaoSidebar />
      )}
      
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="px-4 md:px-6 lg:px-8 py-3 md:py-4">
            <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
              <div className={isMobile ? 'ml-14' : ''}>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{title}</h1>
                {description && (
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{description}</p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
