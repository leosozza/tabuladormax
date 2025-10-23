import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, DollarSign, MapPin, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
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
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de gestão de leads</p>
        </div>

        <GestaoFiltersComponent filters={filters} onChange={setFilters} />

        {/* Cards de métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fichas Confirmadas
              </CardTitle>
              <FileText className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.confirmados || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comparecimentos
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.compareceram || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes Análise
              </CardTitle>
              <Activity className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.pendentes || 0}</div>
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
      </div>
    </div>
  );
}
