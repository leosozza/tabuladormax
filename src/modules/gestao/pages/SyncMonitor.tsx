import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Upload,
  List
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-helper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface SyncStatus {
  id: string;
  project_name: string;
  last_sync_at: string | null;
  last_sync_success: boolean | null;
  total_records: number;
  last_error: string | null;
  updated_at: string;
}

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  sync_direction: string;
  records_synced: number;
  records_failed: number;
  processing_time_ms: number | null;
  errors: any;
  metadata: any;
}

interface SyncQueueItem {
  id: string;
  ficha_id: number;
  operation: string;
  sync_direction: string;
  status: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function SyncMonitor() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [autoProcess, setAutoProcess] = useState<boolean>(() => {
    return localStorage.getItem('auto_process_queue') === 'true';
  });
  const { toast } = useToast();

  const loadSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .order('project_name');

      if (error) {
        console.error('Erro ao carregar status:', error);
      } else {
        setSyncStatus(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sync status:', error);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao carregar logs:', error);
      } else {
        setSyncLogs(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sync logs:', error);
    }
  };

  const loadSyncQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao carregar fila:', error);
      } else {
        setSyncQueue(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sync queue:', error);
    }
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    toast({
      title: 'Sincronização iniciada',
      description: 'Aguarde enquanto sincronizamos com TabuladorMax...'
    });

    try {
      const { data, error } = await supabase.functions.invoke('sync-tabulador', {
        body: { manual: true }
      });

      if (error) throw error;

      toast({
        title: 'Sincronização concluída',
        description: `${data?.gestao_to_tabulador || 0} enviados, ${data?.tabulador_to_gestao || 0} recebidos`
      });

      await Promise.all([loadSyncStatus(), loadSyncLogs()]);
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const processQueue = useCallback(async () => {
    setIsProcessingQueue(true);
    toast({
      title: 'Processando fila',
      description: 'Aguarde enquanto processamos os itens pendentes...'
    });

    try {
      const { data, error } = await supabase.functions.invoke('process-sync-queue');

      if (error) throw error;

      toast({
        title: 'Fila processada',
        description: `${data?.succeeded || 0} sucesso, ${data?.failed || 0} falhas`
      });

      await Promise.all([loadSyncQueue(), loadSyncLogs()]);
    } catch (error) {
      console.error('Erro ao processar fila:', error);
      toast({
        title: 'Erro ao processar fila',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingQueue(false);
    }
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadSyncStatus(), loadSyncLogs(), loadSyncQueue()]);
      setIsLoading(false);
    };

    loadData();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-processamento da fila
  useEffect(() => {
    if (!autoProcess) return;

    const queueProcessor = setInterval(async () => {
      const pending = syncQueue.filter(q => q.status === 'pending').length;
      if (pending > 0 && !isProcessingQueue && !isSyncing) {
        console.log(`🔄 Auto-processando ${pending} itens da fila...`);
        await processQueue();
      }
    }, 60000); // 60 segundos

    return () => clearInterval(queueProcessor);
  }, [autoProcess, syncQueue, isProcessingQueue, isSyncing, processQueue]);

  // Calcular estatísticas
  const stats = {
    totalSynced: syncLogs.reduce((sum, log) => sum + log.records_synced, 0),
    totalFailed: syncLogs.reduce((sum, log) => sum + log.records_failed, 0),
    avgProcessingTime: syncLogs.length > 0 
      ? syncLogs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / syncLogs.length 
      : 0,
    queuePending: syncQueue.filter(q => q.status === 'pending').length,
    queueFailed: syncQueue.filter(q => q.status === 'failed').length,
  };

  // Preparar dados para gráfico
  const chartData = syncLogs
    .slice(0, 20)
    .reverse()
    .map(log => ({
      time: new Date(log.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      synced: log.records_synced,
      failed: log.records_failed,
      processingTime: (log.processing_time_ms || 0) / 1000, // converter para segundos
    }));

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monitor de Sincronização</h1>
            <p className="text-muted-foreground">
              Acompanhe a sincronização bidirecional com TabuladorMax
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={processQueue} 
              disabled={isProcessingQueue || isSyncing}
              variant="outline"
            >
              <List className={`h-4 w-4 mr-2 ${isProcessingQueue ? 'animate-spin' : ''}`} />
              Processar Fila
            </Button>
            <Button 
              onClick={triggerSync} 
              disabled={isSyncing || isProcessingQueue}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar Agora
            </Button>
          </div>
        </div>

        {/* Auto-Process Control */}
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-process" className="text-base font-semibold">
                  Processamento Automático
                </Label>
                <p className="text-sm text-muted-foreground">
                  A fila será processada automaticamente a cada 60 segundos enquanto houver itens pendentes
                </p>
              </div>
              <Switch
                id="auto-process"
                checked={autoProcess}
                onCheckedChange={(checked) => {
                  setAutoProcess(checked);
                  localStorage.setItem('auto_process_queue', String(checked));
                  toast({
                    title: checked ? 'Auto-processamento ativado' : 'Auto-processamento desativado',
                    description: checked 
                      ? 'A fila será processada automaticamente a cada 60 segundos'
                      : 'Use o botão "Processar Fila" para processar manualmente'
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sincronizado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSynced.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">Últimas 50 sincronizações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.totalFailed.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">Registros com erro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.avgProcessingTime / 1000).toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">Por sincronização</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fila Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.queuePending.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">{stats.queueFailed} com falha</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sincronizações</CardTitle>
          <CardDescription>Últimas 20 sincronizações executadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="synced" 
                stackId="1"
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
                name="Sincronizados"
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="failed" 
                stackId="1"
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={0.6}
                name="Falhas"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="processingTime" 
                stroke="#3b82f6" 
                name="Tempo (s)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="queue">Fila</TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          {syncStatus.map((status) => (
            <Card key={status.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-6 w-6" />
                    <div>
                      <CardTitle className="capitalize">{status.project_name.replace('_', ' ')}</CardTitle>
                      <CardDescription>
                        Última sincronização: {status.last_sync_at
                          ? formatDistanceToNow(new Date(status.last_sync_at), {
                              addSuffix: true,
                              locale: ptBR
                            })
                          : 'Nunca'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.last_sync_success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <Badge variant="outline" className="text-success border-success">
                          Ativo
                        </Badge>
                      </>
                    ) : status.last_sync_success === false ? (
                      <>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <Badge variant="outline" className="text-destructive border-destructive">
                          Erro
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">Aguardando</Badge>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Registros</p>
                    <p className="text-2xl font-bold">{status.total_records.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atualizado em</p>
                    <p className="text-sm">{new Date(status.updated_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                {status.last_error && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Último Erro:</p>
                      <p className="text-sm text-destructive/80">{status.last_error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Sincronizações</CardTitle>
              <CardDescription>Últimas 50 sincronizações executadas</CardDescription>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma sincronização registrada ainda</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Direção</TableHead>
                        <TableHead className="text-right">Sincronizados</TableHead>
                        <TableHead className="text-right">Falhas</TableHead>
                        <TableHead className="text-right">Tempo (ms)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.started_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {log.sync_direction.includes('tabulador_to') ? (
                                <Download className="h-3 w-3" />
                              ) : log.sync_direction.includes('gestao_to') ? (
                                <Upload className="h-3 w-3" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {log.sync_direction}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {log.records_synced.toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            {log.records_failed > 0 ? (
                              <span className="text-destructive font-medium">
                                {log.records_failed}
                              </span>
                            ) : (
                              log.records_failed
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {log.processing_time_ms?.toLocaleString('pt-BR') || '-'}
                          </TableCell>
                          <TableCell>
                            {log.completed_at ? (
                              log.records_failed === 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-warning" />
                              )
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Fila de Sincronização</CardTitle>
              <CardDescription>Itens aguardando ou em processamento</CardDescription>
            </CardHeader>
            <CardContent>
              {syncQueue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <List className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Fila vazia</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ficha ID</TableHead>
                        <TableHead>Operação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncQueue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.ficha_id}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.operation}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                item.status === 'completed' ? 'default' :
                                item.status === 'failed' ? 'destructive' :
                                item.status === 'processing' ? 'secondary' :
                                'outline'
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.retry_count}/3
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </TableCell>
                          <TableCell>
                            {item.last_error && (
                              <span className="text-xs text-destructive truncate max-w-xs inline-block">
                                {item.last_error}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
