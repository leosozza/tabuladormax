/**
 * Performance Monitoring Dashboard Component
 * Displays real-time performance metrics, alerts, and bottleneck analysis
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, AlertTriangle, BarChart3, Clock, Database, TrendingUp } from 'lucide-react';
import { performanceMonitor } from '@/lib/monitoring';
import type { PerformanceMetric, MonitoringAlert } from '@/lib/monitoring/types';

export function PerformanceMonitoringDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      setAlerts(performanceMonitor.getAlerts());
      setRefreshKey(prev => prev + 1);
    }, 5000);

    // Initial load
    setMetrics(performanceMonitor.getMetrics());
    setAlerts(performanceMonitor.getAlerts());

    return () => clearInterval(interval);
  }, []);

  // Calculate summaries by category
  const webVitalsSummary = performanceMonitor.getSummary('webvital');
  const querySummary = performanceMonitor.getSummary('query');
  const chartSummary = performanceMonitor.getSummary('chart');

  // Recent alerts
  const recentAlerts = alerts.slice(-10).reverse();

  // Metrics by category
  const webVitalsMetrics = metrics.filter(m => m.name.startsWith('webvital')).slice(-5);
  const queryMetrics = metrics.filter(m => m.name.startsWith('query')).slice(-10);
  const chartMetrics = metrics.filter(m => m.name.startsWith('chart')).slice(-10);

  const formatValue = (value: number, unit: string) => {
    if (unit === 'ms') {
      return value < 1000 ? `${value.toFixed(0)}ms` : `${(value / 1000).toFixed(2)}s`;
    }
    if (unit === 'bytes') {
      return value < 1024 ? `${value}B` : `${(value / 1024).toFixed(2)}KB`;
    }
    return `${value.toFixed(2)} ${unit}`;
  };

  const getAlertBadgeVariant = (level: MonitoringAlert['level']) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const getRatingColor = (rating?: 'good' | 'needs-improvement' | 'poor') => {
    switch (rating) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Monitoramento de Performance</h2>
          <p className="text-muted-foreground">
            Acompanhe métricas de performance, carga e bottlenecks do sistema
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Activity className="mr-2 h-4 w-4" />
          Atualização automática
        </Badge>
      </div>

      {/* Alert Summary */}
      {recentAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertas Recentes ({recentAlerts.length})</AlertTitle>
          <AlertDescription>
            Existem {recentAlerts.filter(a => a.level === 'critical' || a.level === 'error').length} alertas críticos que requerem atenção.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Web Vitals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {webVitalsSummary ? (
              <>
                <div className="text-2xl font-bold">{webVitalsSummary.avg.toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground">
                  Média • P95: {webVitalsSummary.p95.toFixed(0)}ms
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {querySummary ? (
              <>
                <div className="text-2xl font-bold">{querySummary.avg.toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground">
                  {querySummary.count} queries • P95: {querySummary.p95.toFixed(0)}ms
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gráficos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {chartSummary ? (
              <>
                <div className="text-2xl font-bold">{chartSummary.avg.toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground">
                  Renderização média • Máx: {chartSummary.max.toFixed(0)}ms
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="webvitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webvitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="webvitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Web Vitals Metrics</CardTitle>
              <CardDescription>
                Core Web Vitals - LCP, FID, CLS, TTFB, FCP
              </CardDescription>
            </CardHeader>
            <CardContent>
              {webVitalsMetrics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Métrica</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webVitalsMetrics.map((metric, idx) => {
                      const webVitalMetric = metric as { rating?: 'good' | 'needs-improvement' | 'poor' };
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{metric.name.replace('webvital.', '')}</TableCell>
                          <TableCell>{formatValue(metric.value, metric.unit)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getRatingColor(webVitalMetric.rating)}>
                              {webVitalMetric.rating || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(metric.timestamp).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma métrica Web Vitals registrada ainda</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Query Performance</CardTitle>
              <CardDescription>
                Tempo de execução de queries React Query
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queryMetrics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query Key</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryMetrics.map((metric, idx) => {
                      const queryMetric = metric as { status?: string };
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs max-w-xs truncate">
                            {metric.name.replace('query.', '')}
                          </TableCell>
                          <TableCell>
                            <span className={metric.value > 2000 ? 'text-red-600 font-semibold' : ''}>
                              {formatValue(metric.value, metric.unit)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={queryMetric.status === 'error' ? 'destructive' : 'secondary'}>
                              {queryMetric.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(metric.timestamp).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma query registrada ainda</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chart Rendering Performance</CardTitle>
              <CardDescription>
                Tempo de renderização de gráficos ApexCharts e Leaflet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartMetrics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Data Points</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartMetrics.map((metric, idx) => {
                      const chartMetric = metric as { chartType?: string; renderPhase?: string; dataPoints?: number };
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline">{chartMetric.chartType}</Badge>
                          </TableCell>
                          <TableCell>{chartMetric.renderPhase}</TableCell>
                          <TableCell>
                            <span className={metric.value > 1000 ? 'text-red-600 font-semibold' : ''}>
                              {formatValue(metric.value, metric.unit)}
                            </span>
                          </TableCell>
                          <TableCell>{chartMetric.dataPoints || 'N/A'}</TableCell>
                          <TableCell>{new Date(metric.timestamp).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma métrica de gráficos registrada ainda</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
              <CardDescription>
                Alertas de performance que requerem atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAlerts.length > 0 ? (
                <div className="space-y-2">
                  {recentAlerts.map((alert) => (
                    <Alert key={alert.id} variant={alert.level === 'critical' || alert.level === 'error' ? 'destructive' : 'default'}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Clock className="h-4 w-4 mt-0.5" />
                          <div>
                            <AlertTitle className="flex items-center gap-2">
                              <Badge variant={getAlertBadgeVariant(alert.level)}>{alert.level}</Badge>
                              {alert.message}
                            </AlertTitle>
                            <AlertDescription className="mt-2 text-xs">
                              Métrica: {alert.metric.name} = {formatValue(alert.metric.value, alert.metric.unit)}
                              {alert.threshold && ` (Limite: ${formatValue(alert.threshold, alert.metric.unit)})`}
                            </AlertDescription>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </Alert>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum alerta registrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
