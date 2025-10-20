/**
 * Painel de Alertas
 * Gerencia alertas automáticos do sistema
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert as AlertUI, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Bell, CheckCircle2, BellOff } from "lucide-react";
import { 
  listAlerts, 
  acknowledgeAlert, 
  acknowledgeAllNonCritical,
  getAlertStatistics,
  initializeDefaultAlertConfigurations
} from "@/lib/diagnostic/alertService";
import type { Alert } from "@/types/diagnostic";
import { useToast } from "@/hooks/use-toast";

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getAlertStatistics> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadAlerts = () => {
    setLoading(true);
    try {
      const allAlerts = listAlerts({ limit: 100 });
      setAlerts(allAlerts);
      const statistics = getAlertStatistics();
      setStats(statistics);
    } catch (error) {
      toast({
        title: "Erro ao carregar alertas",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Inicializa configurações padrão na primeira carga
    initializeDefaultAlertConfigurations();
    loadAlerts();
    
    // Atualiza a cada 30 segundos
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = (alertId: string) => {
    const result = acknowledgeAlert(alertId, 'admin');
    if (result) {
      toast({
        title: "Alerta reconhecido",
        description: "O alerta foi marcado como reconhecido",
      });
      loadAlerts();
    }
  };

  const handleAcknowledgeAllNonCritical = () => {
    const count = acknowledgeAllNonCritical('admin');
    toast({
      title: "Alertas reconhecidos",
      description: `${count} alertas não-críticos foram reconhecidos`,
    });
    loadAlerts();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Não Reconhecidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.unacknowledged}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Críticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.bySeverity.critical}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Erros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.bySeverity.error}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avisos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.bySeverity.warning}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas Não Reconhecidos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alertas Ativos
              </CardTitle>
              <CardDescription>
                Alertas que requerem atenção
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAlerts}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {unacknowledgedAlerts.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAcknowledgeAllNonCritical}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Reconhecer Todos (exceto críticos)
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unacknowledgedAlerts.length === 0 ? (
            <AlertUI>
              <BellOff className="h-4 w-4" />
              <AlertDescription>
                Nenhum alerta ativo. Todos os alertas foram reconhecidos.
              </AlertDescription>
            </AlertUI>
          ) : (
            <div className="space-y-3">
              {unacknowledgedAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getSeverityIcon(alert.severity)}</span>
                        <h4 className="font-semibold">{alert.title}</h4>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Reconhecer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas Reconhecidos */}
      {acknowledgedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Alertas Reconhecidos
            </CardTitle>
            <CardDescription>
              Histórico de alertas reconhecidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acknowledgedAlerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{getSeverityIcon(alert.severity)}</span>
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reconhecido em: {alert.acknowledgedAt?.toLocaleString()}
                      {alert.acknowledgedBy && ` por ${alert.acknowledgedBy}`}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
