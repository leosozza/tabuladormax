import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, TrendingUp, Activity, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import StatsComparison from "@/components/gestao/dashboard/StatsComparison";
import LeadsChart from "@/components/gestao/dashboard/LeadsChart";
import ConversionFunnel from "@/components/gestao/dashboard/ConversionFunnel";
import ScouterPerformance from "@/components/gestao/dashboard/ScouterPerformance";
import StatusDistribution from "@/components/gestao/dashboard/StatusDistribution";
import SourceAnalysis from "@/components/gestao/dashboard/SourceAnalysis";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { useState } from "react";
import { LeadColumnConfigProvider } from '@/hooks/useLeadColumnConfig';

function GestaoHomeContent() {
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('all'),
    projectId: null,
    scouterId: null,
    fonte: null
  });

  // Estatísticas principais
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["gestao-home-stats", filters],
    queryFn: async () => {
      console.log('[GestaoHome] Buscando estatísticas com RPC otimizada:', {
        preset: filters.dateFilter.preset,
        startDate: filters.dateFilter.preset !== 'all' ? filters.dateFilter.startDate.toISOString() : null,
        endDate: filters.dateFilter.preset !== 'all' ? filters.dateFilter.endDate.toISOString() : null,
        projectId: filters.projectId,
        scouterId: filters.scouterId
      });

      // Usar RPC para contagem rápida no servidor
      const { data, error } = await supabase.rpc('get_leads_stats', {
        p_start_date: filters.dateFilter.preset === 'all' ? null : filters.dateFilter.startDate.toISOString(),
        p_end_date: filters.dateFilter.preset === 'all' ? null : filters.dateFilter.endDate.toISOString(),
        p_project_id: filters.projectId,
        p_scouter: filters.scouterId
      });

      if (error) {
        console.error('[GestaoHome] Erro ao buscar estatísticas:', error);
        throw error;
      }

      const stats = data?.[0] || { total: 0, confirmados: 0, compareceram: 0, pendentes: 0 };
      console.log('[GestaoHome] Estatísticas retornadas:', stats);

      return stats;
    },
    retry: 1,
    staleTime: 60000, // Cache de 1 minuto
    gcTime: 300000, // Manter em cache por 5 minutos
  });

  return (
    <GestaoPageLayout
      title="Dashboard"
      description="Visão geral do sistema de gestão"
    >
      <GestaoFiltersComponent filters={filters} onChange={setFilters} />

      {/* Alerta para todo período */}
      {filters.dateFilter.preset === 'all' && isLoading && (
        <Alert className="my-6">
          <AlertCircle className="h-4 w-4 animate-pulse" />
          <AlertTitle>Carregando todo o histórico</AlertTitle>
          <AlertDescription>
            Processando <strong>280.000+ leads</strong> cadastrados. 
            Com a otimização RPC, isso leva apenas alguns segundos...
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

      {/* Análise por Fonte */}
      <div className="mt-8">
        <SourceAnalysis filters={filters} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <LeadsChart filters={filters} />
        <ConversionFunnel filters={filters} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ScouterPerformance filters={filters} />
        <StatusDistribution filters={filters} />
      </div>
    </GestaoPageLayout>
  );
}

export default function GestaoHome() {
  return (
    <LeadColumnConfigProvider>
      <GestaoHomeContent />
    </LeadColumnConfigProvider>
  );
}
