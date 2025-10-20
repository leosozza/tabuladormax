/**
 * Painel de Health Check
 * Exibe o status de saúde do sistema em tempo real
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Activity, Database, RefreshCcw, Clock } from "lucide-react";
import { performHealthCheck } from "@/lib/diagnostic/healthCheckService";
import type { SystemHealth, HealthStatus } from "@/types/diagnostic";
import { useToast } from "@/hooks/use-toast";

export function HealthCheckPanel() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadHealth = async () => {
    setLoading(true);
    try {
      const result = await performHealthCheck();
      setHealth(result);
    } catch (error) {
      toast({
        title: "Erro ao verificar saúde do sistema",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    // Atualiza automaticamente a cada 30 segundos
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: HealthStatus) => {
    const variants: Record<HealthStatus, "default" | "secondary" | "destructive" | "outline"> = {
      'healthy': 'default',
      'warning': 'secondary',
      'critical': 'destructive',
      'unknown': 'outline',
    };
    return variants[status];
  };

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Status Geral do Sistema
              </CardTitle>
              <CardDescription>
                Última verificação: {health.timestamp.toLocaleTimeString()}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHealth}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${getStatusColor(health.overallStatus)} flex items-center justify-center text-white text-2xl font-bold`}>
              {health.overallStatus === 'healthy' && '✓'}
              {health.overallStatus === 'warning' && '!'}
              {health.overallStatus === 'critical' && '×'}
              {health.overallStatus === 'unknown' && '?'}
            </div>
            <div>
              <h3 className="text-2xl font-bold capitalize">{health.overallStatus}</h3>
              <p className="text-muted-foreground">
                {health.overallStatus === 'healthy' && 'Todos os sistemas operando normalmente'}
                {health.overallStatus === 'warning' && 'Alguns sistemas necessitam atenção'}
                {health.overallStatus === 'critical' && 'Problemas críticos detectados'}
                {health.overallStatus === 'unknown' && 'Status desconhecido'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.metrics.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-green-500" />
              Sincronizações OK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{health.metrics.syncSuccess}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-red-500" />
              Falhas de Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{health.metrics.syncFailures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de erro: {health.metrics.errorRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.metrics.avgResponseTime}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Checks Individuais */}
      <Card>
        <CardHeader>
          <CardTitle>Verificações de Saúde</CardTitle>
          <CardDescription>
            Status detalhado de cada componente do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {health.checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(check.status)}`} />
                  <div className="flex-1">
                    <h4 className="font-semibold">{check.name}</h4>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(check.details)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {check.responseTime && (
                    <span className="text-sm text-muted-foreground">
                      {check.responseTime}ms
                    </span>
                  )}
                  <Badge variant={getStatusBadge(check.status)}>
                    {check.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
