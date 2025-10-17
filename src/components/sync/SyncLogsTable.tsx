import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function SyncLogsTable() {
  const [selectedError, setSelectedError] = useState<any>(null);
  const { data: logs, isLoading } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sync_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      return data;
    },
    refetchInterval: 10000
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas Sincronizações (100 registros)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Lead ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        {log.direction === 'bitrix_to_supabase' ? (
                          <>
                            <span className="text-blue-600">Bitrix</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-green-600">Supabase</span>
                          </>
                        ) : log.direction === 'supabase_to_bitrix' ? (
                          <>
                            <span className="text-green-600">Supabase</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-blue-600">Bitrix</span>
                          </>
                        ) : log.direction === 'supabase_to_gestao_scouter' ? (
                          <>
                            <span className="text-green-600">Supabase</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-purple-600">Gestão Scouter</span>
                          </>
                        ) : log.direction === 'gestao_scouter_to_supabase' ? (
                          <>
                            <span className="text-purple-600">Gestão Scouter</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-green-600">Supabase</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{log.direction}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{log.lead_id}</TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Erro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.sync_duration_ms ? `${log.sync_duration_ms}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      {log.error_message ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-red-600 hover:text-red-800 hover:bg-transparent"
                          onClick={() => setSelectedError(log)}
                        >
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">{log.error_message}</span>
                          </div>
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Nenhuma sincronização registrada
          </div>
        )}
      </CardContent>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedError} onOpenChange={(open) => !open && setSelectedError(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Detalhes do Erro de Sincronização
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre o erro que ocorreu durante a sincronização
            </DialogDescription>
          </DialogHeader>

          {selectedError && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Informações Básicas */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Data/Hora</p>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedError.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Evento</p>
                    <p className="text-sm font-medium">{selectedError.event_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Direção</p>
                    <div className="flex items-center gap-1 text-sm">
                      {selectedError.direction === 'bitrix_to_supabase' ? (
                        <>
                          <span className="text-blue-600">Bitrix</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-green-600">Supabase</span>
                        </>
                      ) : selectedError.direction === 'supabase_to_bitrix' ? (
                        <>
                          <span className="text-green-600">Supabase</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-blue-600">Bitrix</span>
                        </>
                      ) : selectedError.direction === 'supabase_to_gestao_scouter' ? (
                        <>
                          <span className="text-green-600">Supabase</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-purple-600">Gestão Scouter</span>
                        </>
                      ) : selectedError.direction === 'gestao_scouter_to_supabase' ? (
                        <>
                          <span className="text-purple-600">Gestão Scouter</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-green-600">Supabase</span>
                        </>
                      ) : (
                        <span>{selectedError.direction}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lead ID</p>
                    <p className="text-sm font-mono">{selectedError.lead_id || '-'}</p>
                  </div>
                  {selectedError.sync_duration_ms && (
                    <div>
                      <p className="text-xs text-muted-foreground">Duração</p>
                      <p className="text-sm font-medium">{selectedError.sync_duration_ms}ms</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Erro
                    </Badge>
                  </div>
                </div>

                {/* Mensagem de Erro */}
                <div>
                  <p className="text-sm font-semibold mb-2">Mensagem de Erro</p>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                    <pre className="text-xs text-red-900 dark:text-red-200 whitespace-pre-wrap break-words font-mono">
                      {selectedError.error_message}
                    </pre>
                  </div>
                </div>

                {/* Stack Trace ou Detalhes Adicionais */}
                {selectedError.details && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Detalhes Adicionais</p>
                    <div className="p-4 bg-muted rounded-lg">
                      <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                        {JSON.stringify(selectedError.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* ID do Registro */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>ID do registro: <span className="font-mono">{selectedError.id}</span></p>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
