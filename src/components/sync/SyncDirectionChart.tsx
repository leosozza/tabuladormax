import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { subHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DIRECTION_CONFIG = {
  'bitrix_to_supabase': {
    label: "Bitrix → TabuladorMax",
    color: "#3b82f6",
  },
  'supabase_to_bitrix': {
    label: "TabuladorMax → Bitrix",
    color: "#10b981",
  },
  'supabase_to_gestao_scouter': {
    label: "TabuladorMax → Gestão Scouter",
    color: "#8b5cf6",
  },
  'gestao_scouter_to_supabase': {
    label: "Gestão Scouter → TabuladorMax",
    color: "#f59e0b",
  },
  'csv_import': {
    label: "CSV → TabuladorMax",
    color: "#6366f1",
  },
};

export function SyncDirectionChart() {
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);

  const { data: directionData, isLoading } = useQuery({
    queryKey: ['sync-direction'],
    queryFn: async () => {
      const last24h = subHours(new Date(), 24);
      
      const { data } = await supabase
        .from('sync_events')
        .select('direction')
        .gte('created_at', last24h.toISOString());
      
      if (!data || data.length === 0) return [];

      const grouped = new Map<string, number>();
      data.forEach((event) => {
        grouped.set(event.direction, (grouped.get(event.direction) || 0) + 1);
      });

      return Object.entries(DIRECTION_CONFIG).map(([key, config]) => ({
        direction: key,
        label: config.label,
        color: config.color,
        count: grouped.get(key) || 0,
      }));
    },
    refetchInterval: 30000
  });

  const { data: logsData } = useQuery({
    queryKey: ['sync-logs-filtered', selectedDirection],
    queryFn: async () => {
      if (!selectedDirection) return [];
      
      const last24h = subHours(new Date(), 24);
      
      const { data } = await supabase
        .from('sync_events')
        .select('*')
        .eq('direction', selectedDirection)
        .gte('created_at', last24h.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      return data || [];
    },
    enabled: !!selectedDirection
  });

  const selectedConfig = selectedDirection ? DIRECTION_CONFIG[selectedDirection as keyof typeof DIRECTION_CONFIG] : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Direções de Sincronização (24h)</CardTitle>
          <CardDescription>
            Clique em um card para ver os logs detalhados desta direção
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : directionData && directionData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {directionData.map((dir) => (
                <Card
                  key={dir.direction}
                  className="cursor-pointer hover:shadow-lg transition-all border-2"
                  onClick={() => setSelectedDirection(dir.direction)}
                  style={{ borderColor: dir.color }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-4 h-4" style={{ color: dir.color }} />
                      <span className="text-xs leading-tight">{dir.label}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold" style={{ color: dir.color }}>
                      {dir.count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">eventos</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma sincronização registrada nas últimas 24h</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDirection} onOpenChange={() => setSelectedDirection(null)}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConfig && (
                <>
                  <ArrowRight className="w-5 h-5" style={{ color: selectedConfig.color }} />
                  <span>Sincronizações: {selectedConfig.label}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Últimas 100 sincronizações desta direção nas últimas 24h
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Lead ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData && logsData.length > 0 ? (
                  logsData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.event_type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{log.lead_id || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.sync_duration_ms ? `${log.sync_duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
