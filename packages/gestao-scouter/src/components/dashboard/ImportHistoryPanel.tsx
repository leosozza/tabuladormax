import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Clock, FileText, Trash2, XCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImportJob {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  target_table: string;
  total_rows: number | null;
  processed_rows: number;
  inserted_rows: number;
  failed_rows: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  errors: any;
}

export function ImportHistoryPanel() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast.error('Erro ao carregar histórico de importações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Atualizar a cada 3 segundos se houver jobs em andamento
    const interval = setInterval(() => {
      const hasActiveJobs = jobs.some(j => 
        j.status === 'pending' || j.status === 'processing' || j.status === 'paused'
      );
      if (hasActiveJobs) {
        fetchJobs();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  const deleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('import_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job excluído com sucesso');
      fetchJobs();
    } catch (error) {
      console.error('Erro ao excluir job:', error);
      toast.error('Erro ao excluir job');
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('import_jobs')
        .update({ 
          status: 'failed',
          error_message: 'Cancelado pelo usuário',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job cancelado');
      fetchJobs();
    } catch (error) {
      console.error('Erro ao cancelar job:', error);
      toast.error('Erro ao cancelar job');
    }
  };

  const pauseJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('import_jobs')
        .update({ 
          status: 'paused'
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job pausado');
      fetchJobs();
    } catch (error) {
      console.error('Erro ao pausar job:', error);
      toast.error('Erro ao pausar job');
    }
  };

  const restartJob = async (jobId: string) => {
    try {
      // Reiniciar job falhado ou pausado
      const { error: updateError } = await supabase
        .from('import_jobs')
        .update({ 
          status: 'pending',
          error_message: null,
          started_at: null,
          completed_at: null,
          processed_rows: 0,
          inserted_rows: 0,
          failed_rows: 0,
          errors: []
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      // Chamar edge function para processar novamente
      const { error: processError } = await supabase.functions.invoke('process-csv-import', {
        body: { job_id: jobId }
      });

      if (processError) throw processError;

      toast.success('Job reiniciado');
      fetchJobs();
    } catch (error) {
      console.error('Erro ao reiniciar job:', error);
      toast.error('Erro ao reiniciar job');
    }
  };

  const resetJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('import_jobs')
        .update({ 
          status: 'pending',
          error_message: null,
          started_at: null,
          completed_at: null,
          processed_rows: 0,
          inserted_rows: 0,
          failed_rows: 0,
          errors: [],
          total_rows: null
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Job resetado. Clique em reiniciar para processar novamente.');
      fetchJobs();
    } catch (error) {
      console.error('Erro ao resetar job:', error);
      toast.error('Erro ao resetar job');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Processando</Badge>;
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'paused':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pausado</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getProgressPercentage = (job: ImportJob) => {
    if (!job.total_rows || job.total_rows === 0) return 0;
    return Math.round((job.processed_rows / job.total_rows) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importações</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Importações
          </CardTitle>
          <CardDescription>
            Acompanhe o status de todas as suas importações de CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma importação realizada ainda</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium truncate">
                            {job.file_name}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {format(new Date(job.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            {' • '}
                            {formatBytes(job.file_size)}
                            {' • '}
                            Destino: {job.target_table}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status)}
                          
                          {/* Processing: Pausar e Cancelar */}
                          {job.status === 'processing' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => pauseJob(job.id)}
                              >
                                Pausar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelJob(job.id)}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}

                          {/* Paused: Reiniciar e Cancelar */}
                          {job.status === 'paused' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => restartJob(job.id)}
                              >
                                Continuar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelJob(job.id)}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}

                          {/* Pending: Cancelar */}
                          {job.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelJob(job.id)}
                            >
                              Cancelar
                            </Button>
                          )}

                          {/* Failed: Reiniciar, Reset e Deletar */}
                          {job.status === 'failed' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => restartJob(job.id)}
                              >
                                Reiniciar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resetJob(job.id)}
                              >
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteJob(job.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {/* Completed: Deletar */}
                          {job.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteJob(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Progress Bar */}
                      {job.status === 'processing' && job.total_rows && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{job.processed_rows} / {job.total_rows} registros</span>
                            <span>{getProgressPercentage(job)}%</span>
                          </div>
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${getProgressPercentage(job)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Statistics */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {job.total_rows !== null && (
                          <div>
                            <p className="text-muted-foreground text-xs">Total</p>
                            <p className="font-medium">{job.total_rows}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground text-xs">Inseridos</p>
                          <p className="font-medium text-green-600">{job.inserted_rows}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Falharam</p>
                          <p className="font-medium text-red-600">{job.failed_rows}</p>
                        </div>
                      </div>

                      {/* Error Message */}
                      {job.error_message && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-destructive">Erro</p>
                              <p className="text-xs text-destructive/80 mt-1">{job.error_message}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error Details Button */}
                      {job.errors && Array.isArray(job.errors) && job.errors.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowErrorDialog(true);
                          }}
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Ver {job.errors.length} erro(s) detalhado(s)
                        </Button>
                      )}

                      {/* Timestamps */}
                      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                        {job.started_at && (
                          <p>Iniciado: {format(new Date(job.started_at), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
                        )}
                        {job.completed_at && (
                          <p>Concluído: {format(new Date(job.completed_at), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Detalhes dos Erros</AlertDialogTitle>
            <AlertDialogDescription>
              Arquivo: {selectedJob?.file_name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-96 pr-4">
            <div className="space-y-2">
              {selectedJob?.errors && Array.isArray(selectedJob.errors) && selectedJob.errors.map((error: string, index: number) => (
                <div key={index} className="bg-muted p-3 rounded-lg text-sm">
                  <code className="text-xs break-all">{error}</code>
                </div>
              ))}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogAction>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
