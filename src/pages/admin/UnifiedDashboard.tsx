/**
 * Unified Admin Dashboard
 * Aggregates system diagnostics, performance monitoring, problems/alerts and logs
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { HealthCheckPanel } from '@/components/diagnostic/HealthCheckPanel';
import { ProblemsPanel } from '@/components/diagnostic/ProblemsPanel';
import { AlertsPanel } from '@/components/diagnostic/AlertsPanel';
import { PerformanceMonitoringDashboard } from '@/components/monitoring/PerformanceMonitoringDashboard';
import { LogsPanel } from '@/components/admin/Diagnostics/LogsPanel';
import { DataQualityPanel } from '@/components/admin/DataQualityPanel';
import { LeadStatsCards } from '@/components/admin/dashboard/LeadStatsCards';
import { PhotoStatsCard } from '@/components/admin/dashboard/PhotoStatsCard';
import { SystemActivityBar } from '@/components/admin/dashboard/SystemActivityBar';
import { SystemStatusPanel } from '@/components/admin/dashboard/SystemStatusPanel';
import { OnlineUsersPanel } from '@/components/admin/dashboard/OnlineUsersPanel';
import { AlertsOverview } from '@/components/admin/dashboard/AlertsOverview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeadStats {
  total: number;
  confirmadas: number;
  aguardando: number;
  naoConfirmadas: number;
  comFoto: number;
}

export default function UnifiedDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch lead statistics
  const { data: leadStats, isLoading, error } = useQuery<LeadStats>({
    queryKey: ['admin-lead-stats', refreshKey],
    queryFn: async () => {
      // Total leads
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Confirmadas (ficha_confirmada = true)
      const { count: confirmadas } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ficha_confirmada', true);

      // Aguardando (etapa IN ('Agendados', 'Reagendar', 'Em agendamento'))
      const { count: aguardando } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('etapa', ['Agendados', 'Reagendar', 'Em agendamento', 'UC_SARR07', 'UC_QWPO2W', 'UC_DMLQB7']);

      // Não confirmadas (total - confirmadas)
      const naoConfirmadas = (total || 0) - (confirmadas || 0);

      // Com foto
      const { count: comFoto } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('cadastro_existe_foto', true);

      return {
        total: total || 0,
        confirmadas: confirmadas || 0,
        aguardando: aguardando || 0,
        naoConfirmadas,
        comFoto: comFoto || 0,
      };
    },
    refetchInterval: 60000,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AdminPageLayout
      title="Dashboard Geral"
      description="Visão completa do sistema"
      backTo="/admin"
    >
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Visão Geral do Sistema</h2>
            <p className="text-muted-foreground">
              Monitoramento em tempo real de leads, usuários e sistema
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar estatísticas: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        {/* Lead Stats Cards - Row 1 */}
        <LeadStatsCards />

        {/* Photo Stats + Online Users - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PhotoStatsCard />
          <div className="lg:col-span-2">
            <OnlineUsersPanel />
          </div>
        </div>

        {/* System Activity Bar - Full Width Row 3 */}
        <SystemActivityBar />

        {/* System Status + Alerts - Row 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SystemStatusPanel />
          <AlertsOverview />
        </div>

        {/* Detailed Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Detalhadas</CardTitle>
            <CardDescription>
              Acesse informações detalhadas de cada área do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="monitoring" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
                <TabsTrigger value="diagnostics">Diagnósticos</TabsTrigger>
                <TabsTrigger value="quality">Qualidade</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="monitoring" className="space-y-4">
                <PerformanceMonitoringDashboard />
              </TabsContent>

              <TabsContent value="diagnostics" className="space-y-4">
                <div className="grid gap-6">
                  <HealthCheckPanel />
                  <ProblemsPanel />
                  <AlertsPanel />
                </div>
              </TabsContent>

              <TabsContent value="quality" className="space-y-4">
                <DataQualityPanel />
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <LogsPanel />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}
