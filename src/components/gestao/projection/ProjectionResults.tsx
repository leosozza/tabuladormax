import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Projection } from "@/types/projection";

interface ProjectionResultsProps {
  projection: Projection;
}

export function ProjectionResults({ projection }: ProjectionResultsProps) {
  const { estimatedLeads, estimatedFichas, estimatedValue, confidenceLevel } = projection;

  const getConfidenceColor = (level: number) => {
    if (level >= 75) return "text-green-600";
    if (level >= 50) return "text-yellow-600";
    return "text-orange-600";
  };

  const getConfidenceText = (level: number) => {
    if (level >= 75) return "Alta";
    if (level >= 50) return "Média";
    return "Baixa";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Projeção Futura</h2>
      </div>

      {/* Alerta de Confiança */}
      {confidenceLevel < 75 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nível de confiança {getConfidenceText(confidenceLevel).toLowerCase()} ({confidenceLevel}%). 
            {confidenceLevel < 50 && " Considere usar um período histórico maior para melhorar a precisão da projeção."}
          </AlertDescription>
        </Alert>
      )}

      {/* Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Leads Confirmados Estimados
          </CardTitle>
            <Target className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{estimatedFichas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-chart-2/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investimento Estimado
            </CardTitle>
            <DollarSign className="w-5 h-5 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-2">
              R$ {estimatedValue.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              valor total projetado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Estimados
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{estimatedLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              conversão esperada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confiança
            </CardTitle>
            <AlertCircle className={`w-5 h-5 ${getConfidenceColor(confidenceLevel)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getConfidenceColor(confidenceLevel)}`}>
              {confidenceLevel}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getConfidenceText(confidenceLevel)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento da Projeção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Valor Médio por Lead Confirmado</div>
              <div className="text-2xl font-bold">
                R$ {estimatedFichas > 0 ? (estimatedValue / estimatedFichas).toFixed(2) : '0.00'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Taxa de Conversão Esperada</div>
              <div className="text-2xl font-bold">
                {estimatedLeads > 0 ? ((estimatedFichas / estimatedLeads) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Leads Confirmados por Dia</div>
              <div className="text-2xl font-bold">
                {(() => {
                  const days = Math.ceil((projection.period.end.getTime() - projection.period.start.getTime()) / (1000 * 60 * 60 * 24));
                  return (estimatedFichas / days).toFixed(1);
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
