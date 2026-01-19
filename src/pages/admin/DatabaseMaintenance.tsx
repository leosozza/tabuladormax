import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  HardDrive,
  Activity,
  Loader2,
  Play,
  Square,
  AlertCircle,
  Copy
} from 'lucide-react';

interface MaintenanceStats {
  sync_events: {
    total: number;
    older_than_30_days: number;
    oldest_record: string | null;
    newest_record: string | null;
  };
  actions_log: {
    total: number;
    older_than_60_days: number;
    oldest_record: string | null;
    newest_record: string | null;
  };
  message_rate_limits: {
    total: number;
    older_than_7_days: number;
    oldest_record: string | null;
    newest_record: string | null;
  };
  leads: {
    total: number;
    with_sync_errors: number;
    oldest_record: string | null;
    newest_record: string | null;
  };
}

interface CleanupResult {
  deleted: number;
  remaining: number;
  has_more: boolean;
  cutoff_date: string;
}

interface CleanupProgress {
  isRunning: boolean;
  totalDeleted: number;
  remaining: number;
  iterations: number;
}

interface LoadError {
  message: string;
  code?: string;
  details?: string;
}

export default function DatabaseMaintenance() {
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const loadingRef = useRef(false);
  const [cleanupProgress, setCleanupProgress] = useState<Record<string, CleanupProgress>>({
    sync_events: { isRunning: false, totalDeleted: 0, remaining: 0, iterations: 0 },
    actions_log: { isRunning: false, totalDeleted: 0, remaining: 0, iterations: 0 },
    rate_limits: { isRunning: false, totalDeleted: 0, remaining: 0, iterations: 0 },
  });
  const [stopRequested, setStopRequested] = useState<Record<string, boolean>>({});

  const loadStats = useCallback(async () => {
    // Prevent duplicate calls
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.rpc('get_maintenance_stats' as any);
      if (error) throw error;
      setStats(data as unknown as MaintenanceStats);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      setLoadError({
        message: error?.message || 'Erro desconhecido ao carregar estatísticas',
        code: error?.code,
        details: JSON.stringify(error, null, 2)
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const copyErrorDetails = () => {
    if (loadError?.details) {
      navigator.clipboard.writeText(loadError.details);
      toast.success('Detalhes copiados para a área de transferência');
    }
  };

  const runCleanupBatch = async (
    type: 'sync_events' | 'actions_log' | 'rate_limits',
    rpcName: string,
    daysToKeep: number
  ) => {
    setCleanupProgress(prev => ({
      ...prev,
      [type]: { isRunning: true, totalDeleted: 0, remaining: 0, iterations: 0 }
    }));
    setStopRequested(prev => ({ ...prev, [type]: false }));

    let totalDeleted = 0;
    let iterations = 0;
    let hasMore = true;

    try {
      while (hasMore && !stopRequested[type] && iterations < 100) {
        const { data, error } = await supabase.rpc(rpcName as any, {
          days_to_keep: daysToKeep,
          batch_size: 5000
        });

        if (error) throw error;

        const result = data as CleanupResult;
        totalDeleted += result.deleted;
        iterations++;
        hasMore = result.has_more;

        setCleanupProgress(prev => ({
          ...prev,
          [type]: {
            isRunning: true,
            totalDeleted,
            remaining: result.remaining,
            iterations
          }
        }));

        // Pequena pausa entre lotes para não sobrecarregar
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      toast.success(`Limpeza concluída: ${totalDeleted.toLocaleString()} registros removidos`);
      loadStats();
    } catch (error) {
      console.error('Erro na limpeza:', error);
      toast.error('Erro durante a limpeza');
    } finally {
      setCleanupProgress(prev => ({
        ...prev,
        [type]: { ...prev[type], isRunning: false }
      }));
    }
  };

  const stopCleanup = (type: string) => {
    setStopRequested(prev => ({ ...prev, [type]: true }));
  };

  const formatNumber = (num: number) => num?.toLocaleString('pt-BR') ?? '0';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CleanupCard = ({
    title,
    description,
    icon: Icon,
    total,
    toDelete,
    daysToKeep,
    oldestRecord,
    type,
    rpcName,
    color
  }: {
    title: string;
    description: string;
    icon: React.ElementType;
    total: number;
    toDelete: number;
    daysToKeep: number;
    oldestRecord: string | null;
    type: 'sync_events' | 'actions_log' | 'rate_limits';
    rpcName: string;
    color: string;
  }) => {
    const progress = cleanupProgress[type];
    const percentToDelete = total > 0 ? ((toDelete / total) * 100).toFixed(1) : '0';

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </div>
            </div>
            {toDelete > 0 && (
              <Badge variant="destructive" className="text-xs">
                {formatNumber(toDelete)} para limpar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total de registros</p>
              <p className="font-semibold text-lg">{formatNumber(total)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mais antigo que {daysToKeep} dias</p>
              <p className="font-semibold text-lg text-destructive">{formatNumber(toDelete)}</p>
            </div>
          </div>

          {total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Dados a limpar</span>
                <span>{percentToDelete}%</span>
              </div>
              <Progress value={parseFloat(percentToDelete)} className="h-2" />
            </div>
          )}

          {oldestRecord && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Registro mais antigo: {formatDate(oldestRecord)}
            </div>
          )}

          {progress.isRunning && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Limpando...
                </span>
                <span className="text-muted-foreground">
                  Lote {progress.iterations}
                </span>
              </div>
              <div className="text-xs space-y-1">
                <p>Removidos: <span className="font-semibold text-green-600">{formatNumber(progress.totalDeleted)}</span></p>
                <p>Restantes: <span className="font-semibold">{formatNumber(progress.remaining)}</span></p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {progress.isRunning ? (
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex-1"
                onClick={() => stopCleanup(type)}
              >
                <Square className="h-4 w-4 mr-2" />
                Parar
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                disabled={toDelete === 0 || loading}
                onClick={() => runCleanupBatch(type, rpcName, daysToKeep)}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Limpeza
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminPageLayout
      title="Manutenção do Banco"
      description="Limpeza e otimização do banco de dados"
      actions={
        <Button onClick={loadStats} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar estatísticas</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{loadError.message}</p>
              {loadError.code && (
                <p className="text-xs opacity-80">Código: {loadError.code}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={loadStats}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button variant="ghost" size="sm" onClick={copyErrorDetails}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar detalhes
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Eventos de Sync</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{formatNumber(stats?.sync_events?.total ?? 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Logs de Ações</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{formatNumber(stats?.actions_log?.total ?? 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <HardDrive className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rate Limits</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{formatNumber(stats?.message_rate_limits?.total ?? 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leads com Erros</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{formatNumber(stats?.leads?.with_sync_errors ?? 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Cards de Limpeza */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Limpeza por Tabela
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CleanupCard
              title="Eventos de Sincronização"
              description="Histórico de sincronizações Bitrix"
              icon={Database}
              total={stats?.sync_events?.total ?? 0}
              toDelete={stats?.sync_events?.older_than_30_days ?? 0}
              daysToKeep={30}
              oldestRecord={stats?.sync_events?.oldest_record ?? null}
              type="sync_events"
              rpcName="cleanup_sync_events_batch"
              color="bg-blue-500/10 text-blue-600"
            />

            <CleanupCard
              title="Logs de Ações"
              description="Histórico de ações do tabulador"
              icon={Activity}
              total={stats?.actions_log?.total ?? 0}
              toDelete={stats?.actions_log?.older_than_60_days ?? 0}
              daysToKeep={60}
              oldestRecord={stats?.actions_log?.oldest_record ?? null}
              type="actions_log"
              rpcName="cleanup_actions_log_batch"
              color="bg-purple-500/10 text-purple-600"
            />

            <CleanupCard
              title="Rate Limits"
              description="Controle de limite de mensagens"
              icon={HardDrive}
              total={stats?.message_rate_limits?.total ?? 0}
              toDelete={stats?.message_rate_limits?.older_than_7_days ?? 0}
              daysToKeep={7}
              oldestRecord={null}
              type="rate_limits"
              rpcName="cleanup_rate_limits_batch"
              color="bg-orange-500/10 text-orange-600"
            />
          </div>
        </div>

        {/* Dicas */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Dicas de Manutenção</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>A limpeza é executada em lotes de 5.000 registros para evitar timeout</li>
                  <li>Você pode parar a limpeza a qualquer momento e continuar depois</li>
                  <li>Recomendado executar a limpeza semanalmente para manter o desempenho</li>
                  <li>Eventos de sync mais antigos que 30 dias são removidos automaticamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}
