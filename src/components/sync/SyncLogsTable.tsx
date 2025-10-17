import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export function SyncLogsTable() {
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
                    <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                      {log.error_message || '-'}
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
    </Card>
  );
}
