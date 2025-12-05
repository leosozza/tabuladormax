import { useState } from "react";
import { SafeSidebarTrigger } from "@/components/SafeSidebarTrigger";
import { MaxconnectAgent } from "@/components/unified/MaxconnectAgent";
import { Button } from "@/components/ui/button";
import { Bot, LayoutDashboard } from "lucide-react";
import { MinimalDateFilter, DateFilterValue, getDefaultMonthFilter } from "@/components/MinimalDateFilter";

// New Dashboard Components
import { LeadStatsCards } from "@/components/admin/dashboard/LeadStatsCards";
import { PhotoStatsCard } from "@/components/admin/dashboard/PhotoStatsCard";
import { SystemActivityBar } from "@/components/admin/dashboard/SystemActivityBar";
import { SystemStatusPanel } from "@/components/admin/dashboard/SystemStatusPanel";
import { OnlineUsersPanel } from "@/components/admin/dashboard/OnlineUsersPanel";
import { AlertsOverview } from "@/components/admin/dashboard/AlertsOverview";
import { ModuleActivityChart } from "@/components/unified/ModuleActivityChart";
import { QuickActionsPanel } from "@/components/unified/QuickActionsPanel";

export default function HomeChoice() {
  const [view, setView] = useState<'dashboard' | 'agent'>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultMonthFilter);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <SafeSidebarTrigger />
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
            size="icon"
            onClick={() => setView('dashboard')}
            title="Dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'agent' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('agent')}
            title="Agente IA"
          >
            <Bot className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {view === 'dashboard' ? (
          <>
            {/* 1-4: Lead Statistics Cards */}
            <LeadStatsCards />

            {/* 5: Photo Stats + Online Users */}
            <div className="grid gap-4 md:grid-cols-3">
              <PhotoStatsCard />
              <OnlineUsersPanel />
            </div>

            {/* 6: System Activity Bar - Full Width */}
            <SystemActivityBar />

            {/* 7: System Status Panel + Alerts */}
            <div className="grid gap-4 md:grid-cols-2">
              <SystemStatusPanel />
              <AlertsOverview />
            </div>

            {/* Charts */}
            <ModuleActivityChart />

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
