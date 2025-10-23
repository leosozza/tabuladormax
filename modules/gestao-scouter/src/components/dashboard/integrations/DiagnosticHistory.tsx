import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase-helper';
import { DiagnosticModal } from './DiagnosticModal';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticHistory {
  id: string;
  created_at: string;
  endpoint: string;
  table_name: string;
  status: string;
  execution_time_ms: number;
  response_data: any;
  error_message?: string;
}

export function DiagnosticHistory() {
  const [history, setHistory] = useState<DiagnosticHistory[]>([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sync_logs_detailed')
        .select('*')
        .eq('table_name', 'diagnostic')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Erro ao carregar histórico:', error);
        toast({
          title: 'Erro ao carregar histórico',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error('Exceção ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDiagnostic = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sync_logs_detailed')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erro ao excluir',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Excluído',
          description: 'Diagnóstico removido do histórico',
        });
        loadHistory();
      }
    } catch (error) {
      console.error('Erro ao excluir diagnóstico:', error);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o histórico de diagnósticos?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sync_logs_detailed')
        .delete()
        .eq('table_name', 'diagnostic');

      if (error) {
        toast({
          title: 'Erro ao limpar histórico',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Histórico limpo',
          description: 'Todos os diagnósticos foram removidos',
        });
        loadHistory();
      }
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
    }
  };

  const viewDiagnostic = (diagnostic: DiagnosticHistory) => {
    if (diagnostic.response_data) {
      setSelectedDiagnostic(diagnostic.response_data);
      setModalOpen(true);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <CardTitle>Histórico de Diagnósticos</CardTitle>
              <CardDescription>
                Últimos 20 diagnósticos executados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
              >
                Atualizar
              </Button>
              {history.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearHistory}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Tudo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum diagnóstico registrado ainda</p>
              <p className="text-sm mt-2">
                Execute um diagnóstico para ver o histórico aqui
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Status Geral</TableHead>
                    <TableHead className="text-right">Tempo (ms)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const overallStatus = item.response_data?.overall_status || 'unknown';
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          <div>
                            {new Date(item.created_at).toLocaleString('pt-BR')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {getStatusBadge(item.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {overallStatus !== 'unknown' && (
                            <Badge
                              variant={
                                overallStatus === 'ok'
                                  ? 'default'
                                  : overallStatus === 'warning'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {overallStatus.toUpperCase()}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.execution_time_ms?.toLocaleString('pt-BR')}ms
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDiagnostic(item)}
                              disabled={!item.response_data}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDiagnostic(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DiagnosticModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        result={selectedDiagnostic}
      />
    </>
  );
}
