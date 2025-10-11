import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCcw, Play, Link2 } from "lucide-react";
import type { Flow } from "@/types/flow";

interface FlowListProps {
  flows: Flow[];
  loading?: boolean;
  onRefresh?: () => void;
  onAssociate?: (flow: Flow) => void;
  onExecute?: (flow: Flow) => void;
}

export function FlowList({ flows, loading, onRefresh, onAssociate, onExecute }: FlowListProps) {
  const sortedFlows = useMemo(() => {
    return [...flows].sort((a, b) => a.name.localeCompare(b.name));
  }, [flows]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Flows disponíveis</h3>
          <p className="text-sm text-muted-foreground">
            Crie fluxos no builder ao lado e associe-os aos botões avançados.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <ScrollArea className="h-72">
        <div className="space-y-3 pr-2">
          {sortedFlows.length === 0 && !loading ? (
            <div className="text-sm text-muted-foreground">Nenhum fluxo cadastrado ainda.</div>
          ) : null}

          {sortedFlows.map((flow) => (
            <div
              key={flow.id}
              className="rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium leading-tight">{flow.name}</p>
                  <Badge variant="outline" className="mt-1 capitalize text-xs">
                    {flow.visibility}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {onAssociate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAssociate(flow)}
                      className="gap-1"
                    >
                      <Link2 className="w-4 h-4" />
                      Associar
                    </Button>
                  )}
                  {onExecute && (
                    <Button variant="secondary" size="sm" onClick={() => onExecute(flow)} className="gap-1">
                      <Play className="w-4 h-4" />
                      Executar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {flow.definition?.nodes?.length ?? 0} nós definidos
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

export default FlowList;
