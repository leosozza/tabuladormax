import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Trash2, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getSyncLogs, clearSyncLogs } from '@/repositories/syncLogsRepo';
import type { SyncLog } from '@/repositories/types';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SyncLogsViewer() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await getSyncLogs(100);
      setLogs(data);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os logs?')) return;

    try {
      const success = await clearSyncLogs();
      if (success) {
        toast.success('Logs limpos com sucesso');
        setLogs([]);
      } else {
        toast.error('Erro ao limpar logs');
      }
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
      toast.error('Erro ao limpar logs');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success/20 text-success border-success/30">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">Logs Detalhados de Sincronização</CardTitle>
              <CardDescription>
                Histórico completo com endpoint, tabela, status e resultados
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum log encontrado</p>
              <p className="text-sm mt-2">
                Execute uma sincronização para ver os logs aqui
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id || log.created_at}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {log.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.table_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.records_count != null ? (
                        <span className="font-medium">
                          {log.records_count.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.execution_time_ms != null ? (
                        <span className="text-xs">
                          {log.execution_time_ms}ms
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.created_at ? (
                        <>
                          <div>{new Date(log.created_at).toLocaleString('pt-BR')}</div>
                          <div className="text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {(log.error_message || log.request_params || log.response_data) && (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-primary hover:underline">
                            Ver mais
                          </summary>
                          <div className="mt-2 space-y-2">
                            {log.error_message && (
                              <div className="bg-destructive/10 p-2 rounded text-xs">
                                <strong className="text-destructive">Erro:</strong>
                                <pre className="mt-1 whitespace-pre-wrap">
                                  {log.error_message}
                                </pre>
                              </div>
                            )}
                            {log.request_params && (
                              <div className="bg-muted p-2 rounded text-xs">
                                <strong>Parâmetros:</strong>
                                <pre className="mt-1 overflow-x-auto">
                                  {JSON.stringify(log.request_params, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.response_data && (
                              <div className="bg-muted p-2 rounded text-xs">
                                <strong>Resposta:</strong>
                                <pre className="mt-1 overflow-x-auto max-h-32">
                                  {JSON.stringify(log.response_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
