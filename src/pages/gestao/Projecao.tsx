import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { LeadColumnConfigProvider } from "@/hooks/useLeadColumnConfig";
import { PeriodSelector } from "@/components/gestao/projection/PeriodSelector";
import { HistoricalAnalysisCharts } from "@/components/gestao/projection/HistoricalAnalysisCharts";
import { ProjectionResults } from "@/components/gestao/projection/ProjectionResults";
import { ProjectionBreakdown } from "@/components/gestao/projection/ProjectionBreakdown";
import { convertAggregatedData } from "@/services/projectionAggregator";
import type { AggregatedData } from "@/services/projectionAggregator";
import { calculateProjection } from "@/services/projectionCalculator";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { HistoricalAnalysis, Projection } from "@/types/projection";

function GestaoProjecaoContent() {
  // Filtros básicos
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null
  });

  // Datas para período histórico (últimos 3 meses por padrão)
  const [historicalStart, setHistoricalStart] = useState<Date | undefined>(
    startOfMonth(subMonths(new Date(), 3))
  );
  const [historicalEnd, setHistoricalEnd] = useState<Date | undefined>(
    endOfMonth(subMonths(new Date(), 1))
  );

  // Datas para período de projeção (mês atual por padrão)
  const [projectionStart, setProjectionStart] = useState<Date | undefined>(
    startOfMonth(new Date())
  );
  const [projectionEnd, setProjectionEnd] = useState<Date | undefined>(
    endOfMonth(new Date())
  );

  // Estados para análise e projeção
  const [analysis, setAnalysis] = useState<HistoricalAnalysis | null>(null);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Buscar dados agregados do servidor (1 única requisição otimizada)
  const { data: projectionData, isLoading: isLoadingHistorical } = useQuery<AggregatedData | null>({
    queryKey: ["projection-data", historicalStart, historicalEnd, filters.projectId, filters.scouterId],
    queryFn: async () => {
      if (!historicalStart || !historicalEnd) return null;

      const { data, error } = await supabase.rpc('get_projection_data', {
        p_start_date: historicalStart.toISOString(),
        p_end_date: historicalEnd.toISOString(),
        p_project_id: filters.projectId || null,
        p_scouter: filters.scouterId || null
      });

      if (error) throw error;
      return data as unknown as AggregatedData;
    },
    enabled: !!historicalStart && !!historicalEnd,
  });

  // Função para calcular projeção
  const handleCalculateProjection = () => {
    if (!projectionData || !projectionStart || !projectionEnd) return;

    setIsCalculating(true);

    try {
      // Converter dados agregados para formato de análise
      const analysisResult = convertAggregatedData(projectionData);
      setAnalysis(analysisResult);

      // Calcular projeção
      const projectionResult = calculateProjection(
        analysisResult,
        projectionStart,
        projectionEnd
      );
      setProjection(projectionResult);
    } catch (error) {
      console.error("Erro ao calcular projeção:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const hasInsufficientData = projectionData && projectionData.totals.totalLeads < 10;

  return (
    <GestaoPageLayout
      title="Projeções Inteligentes"
      description="Análise histórica e projeção de leads futuros"
    >
      <div className="space-y-6">
        {/* Filtros Básicos */}
        <GestaoFiltersComponent 
          filters={filters} 
          onChange={setFilters}
          showDateFilter={false}
        />

        {/* Info sobre o sistema */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Este sistema analisa seus dados históricos considerando dias da semana, período do mês, 
            feriados e tendências para projetar quantos leads confirmados você pode fazer em um período futuro.
          </AlertDescription>
        </Alert>

        {/* Seleção de Períodos */}
        <PeriodSelector
          historicalStart={historicalStart}
          historicalEnd={historicalEnd}
          projectionStart={projectionStart}
          projectionEnd={projectionEnd}
          onHistoricalStartChange={setHistoricalStart}
          onHistoricalEndChange={setHistoricalEnd}
          onProjectionStartChange={setProjectionStart}
          onProjectionEndChange={setProjectionEnd}
          onCalculate={handleCalculateProjection}
          isLoading={isCalculating || isLoadingHistorical}
        />

        {/* Alerta de dados insuficientes */}
        {hasInsufficientData && (
          <Alert variant="destructive">
            <AlertDescription>
              Dados históricos insuficientes para gerar uma projeção confiável. 
              Recomendamos pelo menos 10 leads no período histórico selecionado.
            </AlertDescription>
          </Alert>
        )}

        {/* Análise Histórica */}
        {analysis && !hasInsufficientData && (
          <HistoricalAnalysisCharts analysis={analysis} />
        )}

        {/* Resultados da Projeção */}
        {projection && !hasInsufficientData && (
          <>
            <ProjectionResults projection={projection} />
            <ProjectionBreakdown projection={projection} />
          </>
        )}

        {/* Estado vazio */}
        {!analysis && !isLoadingHistorical && !isCalculating && (
          <div className="text-center py-12 text-muted-foreground">
            Selecione os períodos e clique em "Calcular Projeção" para começar
          </div>
        )}

        {/* Loading */}
        {(isLoadingHistorical || isCalculating) && !analysis && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {isLoadingHistorical ? "Carregando dados históricos..." : "Calculando projeção..."}
            </p>
          </div>
        )}
      </div>
    </GestaoPageLayout>
  );
}

export default function GestaoProjecao() {
  return (
    <LeadColumnConfigProvider>
      <GestaoProjecaoContent />
    </LeadColumnConfigProvider>
  );
}
