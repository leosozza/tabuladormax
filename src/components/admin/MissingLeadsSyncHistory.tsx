import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, Clock, FileText, Download, RefreshCw, AlertTriangle, Ban, Trash2 } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { MissingLeadsSyncJob } from '@/hooks/useMissingLeadsSyncJobs';

interface MissingLeadsSyncHistoryProps {
  jobs: MissingLeadsSyncJob[];
  isLoading: boolean;
  onRefresh: () => void;
  onCancel?: (jobId: string) => void;
  onTerminate?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  isCancelling?: boolean;
  isTerminating?: boolean;
  isDeleting?: boolean;
}

// Formatar data sem problemas de timezone (YYYY-MM-DD -> DD/MM)
function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return '';
  // dateStr vem como "YYYY-MM-DD"
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export function MissingLeadsSyncHistory({ 
  jobs, 
  isLoading, 
  onRefresh,
  onCancel,
  onTerminate,
  onDelete,
  isCancelling,
  isTerminating,
  isDeleting
}: MissingLeadsSyncHistoryProps) {
  const [showErrorsSheet, setShowErrorsSheet] = useState(false);
  const [selectedJobErrors, setSelectedJobErrors] = useState<any[]>([]);

  // Detectar jobs que podem estar travados (running há mais de 5 minutos sem heartbeat recente)
  const isJobStalled = (job: MissingLeadsSyncJob) => {
    if (job.status !== 'running') return false;
    
    // Verificar último heartbeat
    const lastUpdate = job.last_heartbeat_at || job.started_at;
    const minutesSinceUpdate = differenceInMinutes(new Date(), new Date(lastUpdate));
    return minutesSinceUpdate > 3;
  };

  // Obter descrição de progresso para jobs running
  const getProgressInfo = (job: MissingLeadsSyncJob) => {
    if (job.status !== 'running') return null;
    
    const stage = job.stage || 'pending';
    
    // Etapa 1: Listando IDs do Bitrix
    if (stage === 'listing_bitrix' || (job.bitrix_total === 0 && stage !== 'completed')) {
      const scanned = job.scanned_count || 0;
      return { 
        label: scanned > 0 ? `Listando... ${scanned.toLocaleString()} IDs` : 'Buscando leads no Bitrix...', 
        percent: 10 
      };
    }
    
    // Etapa 2: Comparando IDs
    if (stage === 'comparing' || (job.bitrix_total > 0 && job.missing_count === 0 && job.synced_count === 0)) {
      return { label: `Comparando ${job.bitrix_total.toLocaleString()} IDs...`, percent: 30 };
    }
    
    // Etapa 3: Importando leads
    if (stage === 'importing' || job.missing_count > 0) {
      const progress = job.synced_count + job.error_count;
      const percent = job.missing_count > 0 
        ? Math.min(95, 30 + Math.round((progress / job.missing_count) * 65))
        : 50;
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
    const parts: string[] = [];
    
    if (job.scouter_name) {
      parts.push(job.scouter_name);
    }
    
    // Usar formatador que não sofre com timezone
    if (job.date_from && job.date_to) {
      parts.push(`${formatDateOnly(job.date_from)} - ${formatDateOnly(job.date_to)}`);
    } else if (job.date_from) {
      parts.push(`A partir de ${formatDateOnly(job.date_from)}`);
    } else if (job.date_to) {
      parts.push(`Até ${formatDateOnly(job.date_to)}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'TODOS';
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

  const canCancel = (job: MissingLeadsSyncJob) => job.status === 'running' && !isJobStalled(job);
  const canTerminate = (job: MissingLeadsSyncJob) => job.status === 'running' && isJobStalled(job);
  const canDelete = (job: MissingLeadsSyncJob) => ['completed', 'failed', 'cancelled'].includes(job.status);

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
                const stalled = isJobStalled(job);
                
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
                    <div>
                      {formatDistanceToNow(new Date(job.started_at), { addSuffix: true, locale: ptBR })}
                    </div>
                    {job.last_heartbeat_at && job.status === 'running' && (
                      <div className="text-xs text-muted-foreground">
                        Atualizado {formatDistanceToNow(new Date(job.last_heartbeat_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    )}
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
                    <div className="flex justify-end gap-1">
                      {/* Botão Cancelar - para jobs running normais */}
                      {canCancel(job) && onCancel && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onCancel(job.id)}
                          disabled={isCancelling}
                          title="Cancelar"
                        >
                          {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                        </Button>
                      )}
                      
                      {/* Botão Encerrar - para jobs travados */}
                      {canTerminate(job) && onTerminate && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onTerminate(job.id)}
                          disabled={isTerminating}
                          className="text-orange-600 hover:text-orange-700"
                          title="Encerrar (timeout)"
                        >
                          {isTerminating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        </Button>
                      )}
                      
                      {/* Botões de erro/download */}
                      {job.error_details && job.error_details.length > 0 && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { 
                              setSelectedJobErrors(job.error_details); 
                              setShowErrorsSheet(true); 
                            }}
                            title="Ver erros"
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => downloadErrorLog(job.error_details, job.id)}
                            title="Baixar log"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      
                      {/* Botão Excluir - para jobs finalizados */}
                      {canDelete(job) && onDelete && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onDelete(job.id)}
                          disabled={isDeleting}
                          className="text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
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
