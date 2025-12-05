import { useState } from "react";
import { SafeSidebarTrigger } from "@/components/SafeSidebarTrigger";
import { MaxconnectAgent } from "@/components/unified/MaxconnectAgent";
import { Button } from "@/components/ui/button";
import { Bot, LayoutDashboard, Target, UserSearch } from "lucide-react";
import { MinimalDateFilter, DateFilterValue, getDefaultMonthFilter } from "@/components/MinimalDateFilter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Dashboard Components
import { LeadStatsCards } from "@/components/admin/dashboard/LeadStatsCards";
import { PhotoStatsCard } from "@/components/admin/dashboard/PhotoStatsCard";
import { SystemActivityBar } from "@/components/admin/dashboard/SystemActivityBar";
import { SystemStatusPanel } from "@/components/admin/dashboard/SystemStatusPanel";
import { TeamStatusPanel } from "@/components/admin/dashboard/TeamStatusPanel";
import { AlertsOverview } from "@/components/admin/dashboard/AlertsOverview";
import { AgendadosStatsCard } from "@/components/admin/dashboard/AgendadosStatsCard";
import { ComparecidosStatsCard } from "@/components/admin/dashboard/ComparecidosStatsCard";
import { LeadrometroCard } from "@/components/admin/dashboard/LeadrometroCard";
import { ModuleActivityChart } from "@/components/unified/ModuleActivityChart";
import { QuickActionsPanel } from "@/components/unified/QuickActionsPanel";

export default function HomeChoice() {
  const [view, setView] = useState<'dashboard' | 'agent'>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultMonthFilter);
  const [showMeta, setShowMeta] = useState(true);
  const [showScouter, setShowScouter] = useState(true);

  // Derive source filter for components
  const sourceFilter = showMeta && showScouter ? 'all' : showMeta ? 'meta' : showScouter ? 'scouter' : 'all';

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
          {view === 'dashboard' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showMeta ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowMeta(!showMeta)}
                  >
                    <Target className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Meta</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showScouter ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowScouter(!showScouter)}
                  >
                    <UserSearch className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Scouter</TooltipContent>
              </Tooltip>
              <div className="w-px h-6 bg-border mx-1 self-center" />
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={view === 'dashboard' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView('dashboard')}
              >
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dashboard</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={view === 'agent' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView('agent')}
              >
                <Bot className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Agente IA</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto">
        {view === 'dashboard' ? (
          <>
            {/* Row 1: Lead Stats - 4 cards */}
            <LeadStatsCards dateFilter={dateFilter} sourceFilter={sourceFilter} />

            {/* Row 2: Foto + Agendados + Comparecidos + A Definir */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <PhotoStatsCard dateFilter={dateFilter} sourceFilter={sourceFilter} />
              <AgendadosStatsCard dateFilter={dateFilter} sourceFilter={sourceFilter} />
              <ComparecidosStatsCard dateFilter={dateFilter} sourceFilter={sourceFilter} />
              <LeadrometroCard dateFilter={dateFilter} sourceFilter={sourceFilter} />
            </div>

            {/* Row 3: Gráfico de Atividade - Full Width */}
            <ModuleActivityChart dateFilter={dateFilter} sourceFilter={sourceFilter} />

            {/* Row 4: Equipe - Status + Rankings */}
            <TeamStatusPanel sourceFilter={sourceFilter} />

            {/* Row 5: Sistema - Status + Alerts + Activity */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <SystemStatusPanel />
              <AlertsOverview />
              <SystemActivityBar />
            </div>

            {/* Row 6: Ações Rápidas */}
            <QuickActionsPanel />
          </>
        ) : (
          <MaxconnectAgent />
        )}
      </main>
    </>
  );
}
