import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Target, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";

export default function GestaoProjecao() {
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null
  });
  
  const { data: projectionData, isLoading } = useQuery({
    queryKey: ["gestao-projection", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .gte("criado", filters.dateFilter.startDate.toISOString())
        .lte("criado", filters.dateFilter.endDate.toISOString());

      // Filtro de projeto
      if (filters.projectId) {
        query = query.eq("commercial_project_id", filters.projectId);
      }

      // Filtro de scouter
      if (filters.scouterId) {
        query = query.eq("scouter", filters.scouterId);
      }
      
      const { data: leads, error } = await query;
      if (error) throw error;
      
      const confirmed = leads?.filter(l => l.ficha_confirmada).length || 0;
      const present = leads?.filter(l => l.compareceu).length || 0;
      const avgValue = leads?.filter(l => l.valor_ficha).reduce((sum, l) => sum + (Number(l.valor_ficha) || 0), 0) || 0;
      
      return {
        totalLeads: leads?.length || 0,
        confirmed,
        present,
        totalValue: avgValue,
        avgValue: leads?.length ? avgValue / leads.length : 0,
        conversionRate: leads?.length ? (present / leads.length * 100) : 0
      };
    },
  });

  return (
    <GestaoPageLayout
      title="Projeções"
      description="Análise de performance e metas"
    >
      <GestaoFiltersComponent filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="text-center py-12">Carregando projeções...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Leads
                  </CardTitle>
                  <Calendar className="w-5 h-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{projectionData?.totalLeads}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Conversão
                  </CardTitle>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {projectionData?.conversionRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Valor Total
                  </CardTitle>
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {projectionData?.totalValue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Valor Médio
                  </CardTitle>
                  <Target className="w-5 h-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {projectionData?.avgValue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-muted-foreground">Fichas Confirmadas</span>
                    <span className="text-xl font-bold">{projectionData?.confirmed}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-muted-foreground">Comparecimentos</span>
                    <span className="text-xl font-bold">{projectionData?.present}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Leads Pendentes</span>
                    <span className="text-xl font-bold">
                      {(projectionData?.totalLeads || 0) - (projectionData?.confirmed || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </GestaoPageLayout>
  );
}
