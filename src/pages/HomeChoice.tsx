import { useState } from "react";
import { SafeSidebarTrigger } from "@/components/SafeSidebarTrigger";
import { MaxconnectAgent } from "@/components/unified/MaxconnectAgent";
import { Button } from "@/components/ui/button";
import { Bot, LayoutDashboard } from "lucide-react";
import { MinimalDateFilter, DateFilterValue, getDefaultMonthFilter } from "@/components/MinimalDateFilter";

// Dashboard Components
import { LeadStatsCards } from "@/components/admin/dashboard/LeadStatsCards";
import { PhotoStatsCard } from "@/components/admin/dashboard/PhotoStatsCard";
import { SystemActivityBar } from "@/components/admin/dashboard/SystemActivityBar";
import { SystemStatusPanel } from "@/components/admin/dashboard/SystemStatusPanel";
import { OnlineUsersPanel } from "@/components/admin/dashboard/OnlineUsersPanel";
import { AlertsOverview } from "@/components/admin/dashboard/AlertsOverview";
import { AgendadosStatsCard } from "@/components/admin/dashboard/AgendadosStatsCard";
import { ComparecidosStatsCard } from "@/components/admin/dashboard/ComparecidosStatsCard";
import { PlaceholderStatsCard } from "@/components/admin/dashboard/PlaceholderStatsCard";
import { ModuleActivityChart } from "@/components/unified/ModuleActivityChart";
import { QuickActionsPanel } from "@/components/unified/QuickActionsPanel";

export default function HomeChoice() {
  const [view, setView] = useState<'dashboard' | 'agent'>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultMonthFilter);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
        <SafeSidebarTrigger />
        <div className="flex items-center gap-2 flex-1">
          <h1 className="text-lg font-semibold">
            {view === 'dashboard' ? 'Dashboard Geral' : 'Agente MAXconnect'}
          </h1>
          {view === 'dashboard' && (
            <div className="flex items-center gap-1 ml-4">
              <MinimalDateFilter value={dateFilter} onChange={setDateFilter} />
              <span className="text-xs text-muted-foreground capitalize hidden sm:inline">
                {dateFilter.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === 'dashboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button
            variant={view === 'agent' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('agent')}
          >
            <Bot className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">IA</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto">
        {view === 'dashboard' ? (
          <>
            {/* Row 1: Lead Stats - 4 cards */}
            <LeadStatsCards dateFilter={dateFilter} />

            {/* Row 2: Leads com Foto */}
            <PhotoStatsCard dateFilter={dateFilter} />

            {/* Row 3: Gráfico de Atividade - Full Width */}
            <ModuleActivityChart dateFilter={dateFilter} />

            {/* Row 4: Agendados + Comparecidos + Placeholder */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <AgendadosStatsCard dateFilter={dateFilter} />
              <ComparecidosStatsCard dateFilter={dateFilter} />
              <PlaceholderStatsCard />
            </div>

            {/* Row 5: Status + Online + Alerts */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <SystemStatusPanel />
              <OnlineUsersPanel />
              <AlertsOverview />
            </div>

            {/* Row 6: Quick Actions + System Activity */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <QuickActionsPanel />
              <div className="lg:col-span-2">
                <SystemActivityBar />
              </div>
            </div>
          </>
        ) : (
          <MaxconnectAgent />
        )}
      </main>
    </>
  );
}
