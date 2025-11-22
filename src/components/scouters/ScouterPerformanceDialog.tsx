import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, CheckCircle2, Users, DollarSign, Calendar } from "lucide-react";

interface Scouter {
  id: string;
  name: string;
  total_leads: number;
  leads_last_30_days: number;
}

interface PerformanceData {
  total_leads: number;
  confirmed_leads: number;
  attended_leads: number;
  total_value: number;
  conversion_rate: number;
  leads_by_month: Record<string, number>;
  top_projects: Array<{ project: string; count: number }>;
}

interface ScouterPerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scouter: Scouter | null;
}

export function ScouterPerformanceDialog({
  open,
  onOpenChange,
  scouter,
}: ScouterPerformanceDialogProps) {
  const { data: performance, isLoading } = useQuery<PerformanceData | null>({
    queryKey: ["scouter-performance", scouter?.id],
    queryFn: async () => {
      if (!scouter) return null;

      const { data, error } = await supabase.rpc("get_scouter_performance_detail", {
        p_scouter_id: scouter.id,
      });

      if (error) throw error;
      return data as unknown as PerformanceData;
    },
    enabled: !!scouter?.id && open,
  });

  if (!scouter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Performance de {scouter.name}</DialogTitle>
          <DialogDescription>
            Análise detalhada de performance e estatísticas
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total de Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{performance?.total_leads || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {performance?.confirmed_leads || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Taxa de Conversão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {performance?.conversion_rate || 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {(performance?.total_value || 0).toLocaleString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Leads by Month */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leads por Mês (últimos 6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performance?.leads_by_month &&
                Object.keys(performance.leads_by_month).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(performance.leads_by_month)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([month, count]) => {
                        const [year, monthNum] = month.split("-");
                        const monthName = new Date(
                          parseInt(year),
                          parseInt(monthNum) - 1
                        ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

                        return (
                          <div key={month} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-40 capitalize">
                              {monthName}
                            </span>
                            <div className="flex-1 bg-secondary rounded-full h-8 overflow-hidden">
                              <div
                                className="bg-primary h-full flex items-center justify-end px-3 text-xs font-semibold text-primary-foreground"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (Number(count) / (performance?.total_leads || 1)) * 100
                                  )}%`,
                                }}
                              >
                                {count}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum dado disponível
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Projetos</CardTitle>
              </CardHeader>
              <CardContent>
                {performance?.top_projects && performance.top_projects.length > 0 ? (
                  <div className="space-y-2">
                    {performance.top_projects.map((project: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                      >
                        <span className="font-medium">
                          {project.project || "Sem projeto"}
                        </span>
                        <Badge variant="secondary">{project.count} leads</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum projeto encontrado
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
