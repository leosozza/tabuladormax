import { useState, useEffect, useCallback } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, PlayCircle, AlertTriangle, CheckCircle2, Database, 
  XCircle, Clock, Loader2, History 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReprocessJob {
  id: string;
  status: string;
  total_leads: number;
  processed_leads: number;
  updated_leads: number;
  skipped_leads: number;
  error_leads: number;
  last_processed_id: number | null;
  batch_size: number;
  only_missing_fields: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_details: any[];
}

export default function LeadsReprocess() {
  const [loading, setLoading] = useState(false);
  const [totalToProcess, setTotalToProcess] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [jobs, setJobs] = useState<ReprocessJob[]>([]);
  const [onlyMissingFields, setOnlyMissingFields] = useState(false);

  // Load count and jobs on mount
  useEffect(() => {
    loadData();
  }, []);

  // Polling for active jobs
  useEffect(() => {
    const hasActiveJob = jobs.some(j => j.status === 'running');
    if (!hasActiveJob) return;

    const interval = setInterval(() => {
      loadJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCount(), loadJobs()]);
    } finally {
      setLoading(false);
    }
  }, [onlyMissingFields]);

  const loadCount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-leads-background', {
        body: { action: 'count', onlyMissingFields }
      });
      if (error) throw error;
      setTotalToProcess(data.count);
    } catch (error) {
      console.error('Error loading count:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-leads-background', {
        body: { action: 'status' }
      });
      if (error) throw error;
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const startReprocessing = async () => {
    if (!totalToProcess || totalToProcess === 0) {
      toast.info('Não há leads para processar');
      return;
    }

    // Check if there's already a running job
    if (jobs.some(j => j.status === 'running')) {
      toast.warning('Já existe um job em execução');
      return;
    }

    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-leads-background', {
        body: { 
          action: 'start',
          onlyMissingFields,
          batchSize: 5000
        }
      });

      if (error) throw error;

      toast.success('Processamento iniciado em background!');
      await loadJobs();
    } catch (error) {
      console.error('Error starting reprocess:', error);
      toast.error('Erro ao iniciar processamento');
    } finally {
      setIsStarting(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase.functions.invoke('reprocess-leads-background', {
        body: { action: 'cancel', jobId }
      });

      if (error) throw error;

      toast.success('Job cancelado');
      await loadJobs();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Erro ao cancelar job');
    }
  };

  const activeJob = jobs.find(j => j.status === 'running');
  const completedJobs = jobs.filter(j => j.status !== 'running');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processando</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminPageLayout 
      title="Re-processar Leads (Background)"
      description="Re-processar leads históricos em segundo plano - continua mesmo se fechar a página"
    >
      <div className="space-y-6">
        {/* Active Job */}
        {activeJob && (
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processamento em Andamento
                </CardTitle>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => cancelJob(activeJob.id)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
              <CardDescription>
                Pode fechar esta página - o processamento continua em segundo plano
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progresso</span>
                    <span className="font-mono">
                      {activeJob.processed_leads.toLocaleString('pt-BR')} / {activeJob.total_leads.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <Progress 
                    value={(activeJob.processed_leads / activeJob.total_leads) * 100} 
                    className="h-3"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-500">
                      {activeJob.updated_leads.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">Atualizados</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-2xl font-bold">
                      {activeJob.processed_leads.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">Processados</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {(activeJob.total_leads - activeJob.processed_leads).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">Restantes</div>
                  </div>
                </div>

                {activeJob.started_at && (
                  <div className="text-xs text-muted-foreground text-center">
                    Iniciado {formatDistanceToNow(new Date(activeJob.started_at), { locale: ptBR, addSuffix: true })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start New Job */}
        {!activeJob && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Novo Re-processamento
              </CardTitle>
              <CardDescription>
                Processa leads em batches de 5.000 usando SQL puro (sem API)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Count Display */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{totalToProcess?.toLocaleString('pt-BR') || '...'} leads</strong> serão processados
                    {onlyMissingFields && ' (apenas com campos faltando)'}
                  </AlertDescription>
                </Alert>

                {/* Options */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="only-missing">Apenas leads com campos faltando</Label>
                    <p className="text-xs text-muted-foreground">
                      Scouter, fonte, etapa ou projeto NULL
                    </p>
                  </div>
                  <Switch
                    id="only-missing"
                    checked={onlyMissingFields}
                    onCheckedChange={(checked) => {
                      setOnlyMissingFields(checked);
                      // Reload count when option changes
                      setTimeout(loadCount, 100);
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    onClick={loadData} 
                    disabled={loading}
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button 
                    onClick={startReprocessing}
                    disabled={isStarting || loading || !totalToProcess}
                    className="flex-1"
                    size="lg"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Iniciar Processamento em Background
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job History */}
        {completedJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedJobs.map(job => (
                  <div 
                    key={job.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(job.status)}
                        <span className="text-sm font-mono">
                          {job.updated_leads.toLocaleString('pt-BR')} / {job.total_leads.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {job.completed_at 
                          ? formatDistanceToNow(new Date(job.completed_at), { locale: ptBR, addSuffix: true })
                          : formatDistanceToNow(new Date(job.created_at), { locale: ptBR, addSuffix: true })
                        }
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-500">
                        {job.updated_leads.toLocaleString('pt-BR')} atualizados
                      </div>
                      {job.only_missing_fields && (
                        <div className="text-xs text-muted-foreground">
                          Apenas campos faltando
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPageLayout>
  );
}
