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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Users, 
  FileText, 
  TrendingUp, 
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SystemStats {
  usersCount: number;
  logsCount: number;
  leadsCount: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
}

export default function UnifiedDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Saudável';
      case 'warning':
        return 'Atenção';
      case 'critical':
        return 'Crítico';
      default:
        return 'Desconhecido';
    }
  };

  // Fetch system statistics using React Query
  const { data: stats, isLoading, error } = useQuery<SystemStats>({
    queryKey: ['admin-dashboard-stats', refreshKey],
    queryFn: async () => {
      // Fetch users count
      const { count: usersCount, error: usersError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch logs count
      const { count: logsCount, error: logsError } = await supabase
        .from('lead_logs')
        .select('*', { count: 'exact', head: true });

      if (logsError) throw logsError;

      // Fetch leads count
      const { count: leadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      if (leadsError) throw leadsError;

      // Determine system status based on basic health check
      let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      // Simple health check: if we got all data, system is healthy
      if (usersCount === null && logsCount === null && leadsCount === null) {
        systemStatus = 'critical';
      } else if (usersCount === null || logsCount === null || leadsCount === null) {
        systemStatus = 'warning';
      }

      return {
        usersCount: usersCount || 0,
        logsCount: logsCount || 0,
        leadsCount: leadsCount || 0,
        systemStatus,
      };
    },
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AdminPageLayout
      title="Dashboard Unificado"
      description="Visão geral completa do sistema com diagnósticos, monitoramento e logs"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar estatísticas: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.usersCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Agentes cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.logsCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Registros de atividade
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.leadsCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Leads no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {stats && getStatusIcon(stats.systemStatus)}
                <Badge variant={stats ? getStatusBadgeVariant(stats.systemStatus) : 'outline'}>
                  {isLoading ? '...' : stats ? getStatusLabel(stats.systemStatus) : 'Desconhecido'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Status geral da aplicação
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="health">Saúde do Sistema</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="problems">Problemas</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {/* Visão Geral Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/admin/users')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Gerenciar Usuários
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/admin/logs')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Todos os Logs
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/admin/config')}
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Configurações
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/admin/permissions')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Permissões
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sistema operando normalmente</p>
                        <p className="text-xs text-muted-foreground">
                          Última atualização: {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate('/admin/monitoring')}
                      >
                        Ver Monitoramento Completo
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Saúde do Sistema Tab */}
          <TabsContent value="health" className="space-y-4">
            <HealthCheckPanel />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <PerformanceMonitoringDashboard />
          </TabsContent>

          {/* Problemas Tab */}
          <TabsContent value="problems" className="space-y-4">
            <div className="grid gap-6">
              <ProblemsPanel />
              <AlertsPanel />
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4 py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Total de {stats?.logsCount || 0} registros de logs no sistema
                    </p>
                    <Button onClick={() => navigate('/admin/logs')}>
                      Ver Página Completa de Logs
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminPageLayout>
  );
}
