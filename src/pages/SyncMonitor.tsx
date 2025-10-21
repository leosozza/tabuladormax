import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { MetricsCards } from "@/components/sync/MetricsCards";
import { GestaoScouterMetrics } from "@/components/sync/GestaoScouterMetrics";
import { PeriodSelector } from "@/components/sync/PeriodSelector";
import { SyncTimelineChart } from "@/components/sync/SyncTimelineChart";
import { SyncDirectionChart } from "@/components/sync/SyncDirectionChart";

import { BitrixImportTab } from "@/components/sync/BitrixImportTab";
import { CSVImportTab } from "@/components/sync/CSVImportTab";
import { GestaoScouterExportTab } from "@/components/sync/GestaoScouterExportTab";
import { BatchUpdateTab } from "@/components/sync/BatchUpdateTab";
import { IntegrationTab } from "@/components/sync/IntegrationTab";
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
                  Central de Sincronização
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie todas as operações de sincronização e importação em um só lugar
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="monitoring" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="monitoring">📊 Monitoramento</TabsTrigger>
            <TabsTrigger value="integration">🔗 Integração</TabsTrigger>
            <TabsTrigger value="imports">📥 Importações</TabsTrigger>
            <TabsTrigger value="batch-update">🔄 Atualização em Lote</TabsTrigger>
          </TabsList>

          {/* Tab de Monitoramento (conteúdo atual) */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Métricas em Tempo Real - Bitrix</h2>
                <MetricsCards />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4">Métricas - Gestão Scouter</h2>
                <GestaoScouterMetrics />
              </div>
            </div>

            <SyncDirectionChart />

            <div className="flex items-center gap-4">
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>

            <SyncTimelineChart period={period} />
          </TabsContent>

          {/* Tab de Integração */}
          <TabsContent value="integration" className="space-y-6">
            <IntegrationTab />
          </TabsContent>

          {/* Tab de Importações */}
          <TabsContent value="imports" className="space-y-6">
            <Tabs defaultValue="bitrix" className="space-y-6">
              <TabsList>
                <TabsTrigger value="bitrix">Bitrix</TabsTrigger>
                <TabsTrigger value="csv">CSV</TabsTrigger>
                <TabsTrigger value="gestao-scouter">Gestão Scouter</TabsTrigger>
              </TabsList>

              <TabsContent value="bitrix">
                <BitrixImportTab />
              </TabsContent>

              <TabsContent value="csv">
                <CSVImportTab />
              </TabsContent>

              <TabsContent value="gestao-scouter">
                <GestaoScouterExportTab />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tab de Atualização em Lote */}
          <TabsContent value="batch-update">
            <BatchUpdateTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
