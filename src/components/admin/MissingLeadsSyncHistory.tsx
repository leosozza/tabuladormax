import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, Clock, FileText, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { MissingLeadsSyncJob } from '@/hooks/useMissingLeadsSyncJobs';

interface MissingLeadsSyncHistoryProps {
  jobs: MissingLeadsSyncJob[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function MissingLeadsSyncHistory({ jobs, isLoading, onRefresh }: MissingLeadsSyncHistoryProps) {
  const [showErrorsSheet, setShowErrorsSheet] = useState(false);
  const [selectedJobErrors, setSelectedJobErrors] = useState<any[]>([]);

  // Detectar jobs que podem estar travados (running há mais de 5 minutos)
  const isJobStalled = (job: MissingLeadsSyncJob) => {
    if (job.status !== 'running') return false;
    const started = new Date(job.started_at);
    const minutesRunning = differenceInMinutes(new Date(), started);
    return minutesRunning > 5;
  };

  // Obter descrição de progresso para jobs running
  const getProgressInfo = (job: MissingLeadsSyncJob) => {
    if (job.status !== 'running') return null;
    
    // Etapa 1: Coletando IDs do Bitrix
    if (job.bitrix_total === 0) {
      return { label: 'Buscando leads no Bitrix...', percent: 10 };
    }
    
    // Etapa 2: Comparando IDs
    if (job.bitrix_total > 0 && job.missing_count === 0 && job.synced_count === 0) {
      return { label: `Comparando ${job.bitrix_total.toLocaleString()} IDs...`, percent: 30 };
    }
    
    // Etapa 3: Importando leads
    if (job.missing_count > 0) {
      const progress = job.synced_count + job.error_count;
      const percent = Math.min(95, 30 + Math.round((progress / job.missing_count) * 65));
      return { 
        label: `Importando... ${progress}/${job.missing_count}`, 
        percent 
      };
    }
    
    return { label: 'Processando...', percent: 50 };
  };

  const getStatusBadge = (job: MissingLeadsSyncJob) => {
    const status = job.status;
    const stalled = isJobStalled(job);
    
    if (status === 'running' && stalled) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
          <AlertTriangle className="w-3 h-3" />
          Possível timeout
        </Badge>
      );
    }
    
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      running: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Rodando' },
      completed: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completo' },
      failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, label: 'Falhou' },
      cancelled: { variant: 'outline', icon: <Clock className="w-3 h-3" />, label: 'Cancelado' }
    };
    const config = variants[status] || variants.completed;
    return <Badge variant={config.variant} className="flex items-center gap-1">{config.icon}{config.label}</Badge>;
  };

  const getFilterLabel = (job: MissingLeadsSyncJob) => {
    if (job.scouter_name) return job.scouter_name;
    if (job.date_from && job.date_to) {
      return `${format(new Date(job.date_from), 'dd/MM', { locale: ptBR })} - ${format(new Date(job.date_to), 'dd/MM', { locale: ptBR })}`;
    }
    if (job.date_from) return `A partir de ${format(new Date(job.date_from), 'dd/MM', { locale: ptBR })}`;
    return 'TODOS';
  };

  const downloadErrorLog = (errorDetails: any[], jobId: string) => {
    const blob = new Blob([JSON.stringify(errorDetails, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-sync-errors-${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Histórico de Sincronizações de Leads Faltantes</CardTitle>
              <CardDescription>Registros de sincronizações anteriores</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum histórico disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Histórico de Sincronizações de Leads Faltantes</CardTitle>
              <CardDescription>Registros de sincronizações anteriores</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Filtro</TableHead>
                <TableHead className="text-right">Bitrix</TableHead>
                <TableHead className="text-right">Faltantes</TableHead>
                <TableHead className="text-right">Sincronizados</TableHead>
                <TableHead className="text-right">Erros</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const progressInfo = getProgressInfo(job);
                
                return (
                <TableRow key={job.id} className={job.status === 'running' ? 'bg-muted/30' : ''}>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(job)}
                      {progressInfo && (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{progressInfo.label}</div>
                          <Progress value={progressInfo.percent} className="h-1 w-24" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDistanceToNow(new Date(job.started_at), { addSuffix: true, locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{getFilterLabel(job)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {job.bitrix_total > 0 ? job.bitrix_total.toLocaleString() : (
                      job.status === 'running' ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '0'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={job.missing_count > 0 ? 'text-orange-500 font-medium' : ''}>
                      {job.missing_count.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={job.synced_count > 0 ? 'text-green-600 font-medium' : ''}>
                      {job.synced_count.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={job.error_count > 0 ? 'text-destructive font-medium' : ''}>
                      {job.error_count.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {job.error_details && job.error_details.length > 0 && (
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { 
                            setSelectedJobErrors(job.error_details); 
                            setShowErrorsSheet(true); 
                          }}
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadErrorLog(job.error_details, job.id)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={showErrorsSheet} onOpenChange={setShowErrorsSheet}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Detalhes dos Erros</SheetTitle>
            <SheetDescription>Erros encontrados durante a sincronização</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-150px)] mt-4">
            {selectedJobErrors.length > 0 ? (
              <div className="space-y-2">
                {selectedJobErrors.map((error: any, index: number) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    {error.leadId && (
                      <div className="text-sm font-medium">Lead ID: {error.leadId}</div>
                    )}
                    <div className="text-sm text-destructive">{error.error || JSON.stringify(error)}</div>
                    {error.timestamp && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum erro registrado
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
