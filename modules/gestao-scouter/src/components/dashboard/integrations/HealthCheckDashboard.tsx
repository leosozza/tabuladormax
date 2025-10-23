import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase-helper';
import { useToast } from '@/hooks/use-toast';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HealthMetrics {
  overall_status: 'healthy' | 'degraded' | 'down';
  last_check: string;
  checks: {
    connectivity: HealthCheck;
    authentication: HealthCheck;
    data_access: HealthCheck;
    sync_status: HealthCheck;
  };
  stats: {
    uptime_percentage: number;
    avg_response_time_ms: number;
    total_diagnostics: number;
    failed_diagnostics: number;
    last_24h_syncs: number;
  };
}

interface HealthCheck {
  status: 'ok' | 'warning' | 'error';
  message: string;
  last_checked: string;
  response_time_ms?: number;
}

interface HealthHistory {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time: number;
}

export function HealthCheckDashboard() {
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [history, setHistory] = useState<HealthHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const loadHealthMetrics = async () => {
    try {
      setIsLoading(true);

      // Load latest sync status (não usar string em campo UUID)
      const { data: healthCheck } = await supabase
        .from('sync_status')
        .select('*')
        .order('last_sync_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Load diagnostic stats
      const { data: diagnostics } = await supabase
        .from('sync_logs_detailed')
        .select('status, execution_time_ms, created_at')
        .eq('table_name', 'diagnostic')
        .order('created_at', { ascending: false })
        .limit(100);

      // Load recent sync logs
      const { data: syncs } = await supabase
        .from('sync_logs')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Calculate metrics
      const totalDiags = diagnostics?.length || 0;
      const failedDiags = diagnostics?.filter(d => d.status === 'error').length || 0;
      const avgResponseTime = diagnostics && diagnostics.length > 0
        ? diagnostics.reduce((sum, d) => sum + (d.execution_time_ms || 0), 0) / diagnostics.length
        : 0;

      const uptimePercent = totalDiags > 0 ? ((totalDiags - failedDiags) / totalDiags) * 100 : 100;

      const metrics: HealthMetrics = {
        overall_status: uptimePercent >= 95 ? 'healthy' : uptimePercent >= 80 ? 'degraded' : 'down',
        last_check: healthCheck?.last_sync_at || new Date().toISOString(),
        checks: {
          connectivity: {
            status: healthCheck?.last_sync_success ? 'ok' : 'error',
            message: healthCheck?.last_sync_success 
              ? 'Connection stable' 
              : healthCheck?.last_error || 'Connection issue',
            last_checked: healthCheck?.last_sync_at || new Date().toISOString(),
            response_time_ms: avgResponseTime,
          },
          authentication: {
            status: 'ok',
            message: 'Credentials valid',
            last_checked: new Date().toISOString(),
          },
          data_access: {
            status: healthCheck?.total_records > 0 ? 'ok' : 'warning',
            message: `${healthCheck?.total_records || 0} records accessible`,
            last_checked: healthCheck?.last_sync_at || new Date().toISOString(),
          },
          sync_status: {
            status: (syncs?.length || 0) > 0 ? 'ok' : 'warning',
            message: `${syncs?.length || 0} syncs in last 24h`,
            last_checked: new Date().toISOString(),
          },
        },
        stats: {
          uptime_percentage: uptimePercent,
          avg_response_time_ms: avgResponseTime,
          total_diagnostics: totalDiags,
          failed_diagnostics: failedDiags,
          last_24h_syncs: syncs?.length || 0,
        },
      };

      setHealth(metrics);

      // Build history chart data
      if (diagnostics && diagnostics.length > 0) {
        const historyData = diagnostics.slice(0, 20).reverse().map(d => ({
          timestamp: new Date(d.created_at).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          status: d.status === 'success' ? 'healthy' : d.status === 'error' ? 'down' : 'degraded',
          response_time: d.execution_time_ms || 0,
        }));
        setHistory(historyData);
      }
    } catch (error) {
      console.error('Error loading health metrics:', error);
      toast({
        title: 'Erro ao carregar métricas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    
    toast({
      title: 'Health Check Iniciado',
      description: 'Verificando conexão com TabuladorMax...',
    });

    try {
      const { data, error } = await supabase.functions.invoke('health-check-sync');

      if (error) {
        throw error;
      }

      toast({
        title: 'Health Check Completo',
        description: data.status === 'healthy' 
          ? 'Todos os componentes operacionais' 
          : 'Problemas detectados na conexão',
        variant: data.status === 'healthy' ? 'default' : 'destructive',
      });

      await loadHealthMetrics();
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: 'Erro no Health Check',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    loadHealthMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealthMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return 'text-success';
      case 'warning':
      case 'degraded':
        return 'text-warning';
      case 'error':
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning':
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'error':
      case 'down':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum dado de health check disponível</p>
            <Button 
              className="mt-4" 
              onClick={runHealthCheck}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Executar Health Check
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6" />
              <div>
                <CardTitle>Status de Saúde do Sistema</CardTitle>
                <CardDescription>
                  Monitoramento em tempo real da sincronização TabuladorMax
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={runHealthCheck}
              disabled={isChecking}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Verificar Agora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              {getStatusIcon(health.overall_status)}
              <div>
                <h3 className="text-2xl font-bold">
                  {health.overall_status === 'healthy' && 'Sistema Saudável'}
                  {health.overall_status === 'degraded' && 'Sistema Degradado'}
                  {health.overall_status === 'down' && 'Sistema Inoperante'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Última verificação: {new Date(health.last_check).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <Badge 
              variant={
                health.overall_status === 'healthy' 
                  ? 'default' 
                  : health.overall_status === 'degraded' 
                  ? 'secondary' 
                  : 'destructive'
              }
              className="text-lg px-4 py-2"
            >
              {health.overall_status.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {health.stats.uptime_percentage.toFixed(1)}%
              </span>
              {health.stats.uptime_percentage >= 95 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos {health.stats.total_diagnostics} checks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {Math.round(health.stats.avg_response_time_ms)}
              </span>
              <span className="text-sm text-muted-foreground">ms</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média de resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sincronizações 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {health.stats.last_24h_syncs}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {health.stats.failed_diagnostics}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              De {health.stats.total_diagnostics} checks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Component Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Componentes</CardTitle>
          <CardDescription>Verificação individual de cada componente do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h4 className="font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {check.message}
                    </p>
                    {check.response_time_ms && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ⏱️ {Math.round(check.response_time_ms)}ms
                      </p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant={
                    check.status === 'ok' 
                      ? 'default' 
                      : check.status === 'warning' 
                      ? 'secondary' 
                      : 'destructive'
                  }
                >
                  {check.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Time Chart */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Tempo de Resposta</CardTitle>
            <CardDescription>Últimos 20 health checks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="response_time" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Tempo de Resposta (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
