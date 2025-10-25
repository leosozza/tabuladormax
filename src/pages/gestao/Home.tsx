import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, DollarSign, MapPin, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import StatsComparison from "@/components/gestao/dashboard/StatsComparison";
import LeadsChart from "@/components/gestao/dashboard/LeadsChart";
import ConversionFunnel from "@/components/gestao/dashboard/ConversionFunnel";
import ScouterPerformance from "@/components/gestao/dashboard/ScouterPerformance";
import StatusDistribution from "@/components/gestao/dashboard/StatusDistribution";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { useState } from "react";

export default function GestaoHome() {
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null
  });

  // Estatísticas principais
  const { data: stats } = useQuery({
    queryKey: ["gestao-home-stats", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .gte("criado", filters.dateFilter.startDate.toISOString())
        .lte("criado", filters.dateFilter.endDate.toISOString());

      if (filters.projectId) {
        query = query.eq("commercial_project_id", filters.projectId);
      }

      if (filters.scouterId) {
        query = query.eq("scouter", filters.scouterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data.length;
      const confirmados = data.filter(l => l.ficha_confirmada).length;
      const compareceram = data.filter(l => l.compareceu).length;
      const pendentes = data.filter(l => !l.qualidade_lead).length;

      return { total, confirmados, compareceram, pendentes };
    },
  });

  return (
    <GestaoPageLayout
      title="Dashboard"
      description="Visão geral do sistema de gestão"
    >
      <GestaoFiltersComponent filters={filters} onChange={setFilters} />

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 my-6 md:my-8">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fichas Confirmadas
            </CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <FileText className="w-4 h-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats?.confirmados || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comparecimentos
            </CardTitle>
            <div className="p-2 bg-accent/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats?.compareceram || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes Análise
            </CardTitle>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Activity className="w-4 h-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats?.pendentes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <StatsComparison />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <LeadsChart />
        <ConversionFunnel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ScouterPerformance />
        <StatusDistribution />
      </div>
    </GestaoPageLayout>
  );
}
