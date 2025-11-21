import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UnifiedSidebar } from "@/components/layouts/UnifiedSidebar";
import { GeneralStatsCards } from "@/components/unified/GeneralStatsCards";
import { ModuleActivityChart } from "@/components/unified/ModuleActivityChart";
import { QuickActionsPanel } from "@/components/unified/QuickActionsPanel";
import { SystemHealthPanel } from "@/components/unified/SystemHealthPanel";

export default function HomeChoice() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['general-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_general_stats').single();
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <UnifiedSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Dashboard Geral</h1>
              <p className="text-sm text-muted-foreground">Visão consolidada do sistema</p>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
            {/* Statistics Cards */}
            <GeneralStatsCards stats={stats} isLoading={isLoading} />

            {/* Charts and Health */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ModuleActivityChart />
              </div>
              <div>
                <SystemHealthPanel />
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActionsPanel />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
