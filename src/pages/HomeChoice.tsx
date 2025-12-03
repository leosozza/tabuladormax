import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GeneralStatsCards } from "@/components/unified/GeneralStatsCards";
import { ModuleActivityChart } from "@/components/unified/ModuleActivityChart";
import { QuickActionsPanel } from "@/components/unified/QuickActionsPanel";
import { SystemHealthPanel } from "@/components/unified/SystemHealthPanel";
import { MaxconnectAgent } from "@/components/unified/MaxconnectAgent";
import { Button } from "@/components/ui/button";
import { Bot, LayoutDashboard } from "lucide-react";
import { MinimalDateFilter, DateFilterValue, getDefaultMonthFilter } from "@/components/MinimalDateFilter";

export default function HomeChoice() {
  const [view, setView] = useState<'dashboard' | 'agent'>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultMonthFilter);
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['general-stats-filtered', dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_general_stats_filtered', {
        p_start_date: dateFilter.startDate.toISOString(),
        p_end_date: dateFilter.endDate.toISOString(),
      }).single();
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <SidebarTrigger />
        <div className="flex items-center gap-2 flex-1">
          <div>
            <h1 className="text-2xl font-bold">
              {view === 'dashboard' ? 'Dashboard Geral' : 'Agente MAXconnect'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {view === 'dashboard' 
                ? 'Visão consolidada do sistema' 
                : 'Análise de dados por IA conversacional'
              }
            </p>
          </div>
          {view === 'dashboard' && (
            <div className="flex items-center gap-1 ml-2">
              <MinimalDateFilter value={dateFilter} onChange={setDateFilter} />
              <span className="text-xs text-muted-foreground capitalize">
                {dateFilter.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'dashboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={view === 'agent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('agent')}
          >
            <Bot className="mr-2 h-4 w-4" />
            Agente IA
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {view === 'dashboard' ? (
          <>
            {/* Statistics Cards */}
            <GeneralStatsCards stats={stats} isLoading={isLoading} periodLabel={dateFilter.label} />

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
          </>
        ) : (
          <MaxconnectAgent />
        )}
      </main>
    </>
  );
}
