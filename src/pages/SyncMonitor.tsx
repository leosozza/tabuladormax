import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MetricsCards } from "@/components/sync/MetricsCards";
import { PeriodSelector } from "@/components/sync/PeriodSelector";
import { SyncTimelineChart } from "@/components/sync/SyncTimelineChart";
import { SyncDirectionChart } from "@/components/sync/SyncDirectionChart";
import { SyncLogsTable } from "@/components/sync/SyncLogsTable";
import { Period } from "@/lib/syncUtils";
import UserMenu from "@/components/UserMenu";

export default function SyncMonitor() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('day');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Monitoramento de Sincronização
                </h1>
                <p className="text-muted-foreground mt-1">
                  Acompanhe a sincronização entre Bitrix e Supabase em tempo real
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Métricas em tempo real */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Métricas em Tempo Real</h2>
          <MetricsCards />
        </div>

        {/* Seletor de período */}
        <div className="mb-6 flex items-center gap-4">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SyncTimelineChart period={period} />
          <SyncDirectionChart />
        </div>

        {/* Tabela de logs */}
        <SyncLogsTable />
      </main>
    </div>
  );
}
