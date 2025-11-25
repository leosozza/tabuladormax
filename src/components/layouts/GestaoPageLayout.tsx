import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { UnifiedSidebar } from './UnifiedSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        <UnifiedSidebar />
        
        <div className="flex-1 flex flex-col w-full min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="px-4 md:px-6 lg:px-8 py-3 md:py-4">
              <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{title}</h1>
                    {description && (
                      <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{description}</p>
                    )}
                  </div>
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
    </SidebarProvider>
  );
}
