import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, TrendingUp, Activity, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllLeads } from "@/lib/supabaseUtils";
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
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["gestao-home-stats", filters],
    queryFn: async () => {
      console.log('[GestaoHome] Buscando leads com filtros:', {
        preset: filters.dateFilter.preset,
        startDate: filters.dateFilter.startDate.toISOString(),
        endDate: filters.dateFilter.endDate.toISOString(),
        projectId: filters.projectId,
        scouterId: filters.scouterId
      });

      // Para "todo período" sem filtros específicos, usar COUNT para melhor performance
      if (filters.dateFilter.preset === 'all' && !filters.projectId && !filters.scouterId) {
        console.log('[GestaoHome] Usando COUNT otimizado para todo período');

        const { count: total } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });

        const { count: confirmados } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('ficha_confirmada', true);

        const { count: compareceram } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('compareceu', true);

        const { count: pendentes } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .is('qualidade_lead', null);

        console.log('[GestaoHome] Estatísticas retornadas:', { total, confirmados, compareceram, pendentes });

        return { 
          total: total || 0, 
          confirmados: confirmados || 0, 
          compareceram: compareceram || 0, 
          pendentes: pendentes || 0 
        };
      }

      // Para outros filtros, usar a busca normal com paginação
      const data = await fetchAllLeads(
        supabase,
        "*",
        (query) => {
          // Só aplica filtro de data se não for "todo período"
          if (filters.dateFilter.preset !== 'all') {
            query = query
              .gte("criado", filters.dateFilter.startDate.toISOString())
              .lte("criado", filters.dateFilter.endDate.toISOString());
          }

          if (filters.projectId) {
            query = query.eq("commercial_project_id", filters.projectId);
          }

          if (filters.scouterId) {
            query = query.eq("scouter", filters.scouterId);
          }

          return query;
        }
      );

      console.log(`[GestaoHome] Total de leads retornados: ${data.length}`);

      const total = data.length;
      const confirmados = data.filter(l => l.ficha_confirmada).length;
      const compareceram = data.filter(l => l.compareceu).length;
      const pendentes = data.filter(l => !l.qualidade_lead).length;

      return { total, confirmados, compareceram, pendentes };
    },
    retry: 1,
    staleTime: 30000, // Cache de 30 segundos
  });

  return (
    <GestaoPageLayout
      title="Dashboard"
      description="Visão geral do sistema de gestão"
    >
      <GestaoFiltersComponent filters={filters} onChange={setFilters} />

      {/* Alerta para todo período */}
      {filters.dateFilter.preset === 'all' && !isLoading && !error && (
        <Alert className="my-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Buscando todo o histórico</AlertTitle>
          <AlertDescription>
            Carregando estatísticas de todos os leads cadastrados. Isso pode levar alguns segundos...
          </AlertDescription>
        </Alert>
      )}

      {/* Erro ao carregar */}
      {error && (
        <Alert variant="destructive" className="my-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar estatísticas</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocorreu um erro ao buscar os dados. Tente novamente.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Skeleton durante carregamento */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 my-6 md:my-8">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cards de métricas principais */}
      {!isLoading && !error && (
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
      )}

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
