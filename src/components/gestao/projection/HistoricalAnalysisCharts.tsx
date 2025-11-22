import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, BarChart3 } from "lucide-react";
import type { HistoricalAnalysis } from "@/types/projection";
import { WeekdayPerformanceChart } from "./WeekdayPerformanceChart";

interface HistoricalAnalysisChartsProps {
  analysis: HistoricalAnalysis;
}

export function HistoricalAnalysisCharts({ analysis }: HistoricalAnalysisChartsProps) {
  const { trend, performanceByMonthPart } = analysis;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Análise Histórica</h2>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trend.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              em {trend.daysAnalyzed} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fichas Confirmadas
            </CardTitle>
            <Target className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trend.totalFichas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {trend.avgConversionRate.toFixed(1)}% conversão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
            <DollarSign className="w-4 h-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {trend.totalValue.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              R$ {trend.avgValuePerFicha.toFixed(2)} por ficha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Diária
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(trend.totalFichas / trend.daysAnalyzed).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              fichas por dia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Performance por Dia da Semana */}
      <WeekdayPerformanceChart analysis={analysis} />

      {/* Performance por Parte do Mês */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Período do Mês</CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparação entre início, meio e fim do mês
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Início do Mês (1-10)
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Leads/dia</div>
                  <div className="text-lg font-bold">{performanceByMonthPart.inicio.avgLeads.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Fichas/dia</div>
                  <div className="text-lg font-bold">{performanceByMonthPart.inicio.avgFichas.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Valor/dia</div>
                  <div className="text-lg font-bold">R$ {performanceByMonthPart.inicio.avgValue.toFixed(0)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Meio do Mês (11-20)
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Leads/dia</div>
                  <div className="text-lg font-bold">{performanceByMonthPart.meio.avgLeads.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Fichas/dia</div>
                  <div className="text-lg font-bold">{performanceByMonthPart.meio.avgFichas.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Valor/dia</div>
                  <div className="text-lg font-bold">R$ {performanceByMonthPart.meio.avgValue.toFixed(0)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Fim do Mês (21-31)
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Leads/dia</div>
                  <div className="text-lg font-bold">{performanceByMonthPart.fim.avgLeads.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Fichas/dia</div>
                  <div className="text-lg font-bold">{performanceByMonthPart.fim.avgFichas.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Valor/dia</div>
                  <div className="text-lg font-bold">R$ {performanceByMonthPart.fim.avgValue.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
