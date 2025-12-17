import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, TrendingUp, TrendingDown, Minus, Users, Target, MessageSquare, Lightbulb, X } from 'lucide-react';
import { AIAnalysisResult } from '@/hooks/useTelemarketingAIAnalysis';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TelemarketingAIAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  analysis: AIAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  periodLabel: string;
}

export function TelemarketingAIAnalysisModal({
  open,
  onClose,
  analysis,
  isLoading,
  error,
  periodLabel,
}: TelemarketingAIAnalysisModalProps) {
  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
      />
    ));
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'Em melhoria';
      case 'declining':
        return 'Em queda';
      default:
        return 'Estável';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-green-500/10 text-green-600 border-green-500/20';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      default:
        return 'Baixa';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="text-2xl">🤖</span>
              Análise de IA - Visão Estratégica
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Período: {periodLabel}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 pt-2 space-y-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Analisando dados com IA...</p>
                <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive font-medium">Erro ao gerar análise</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            )}

            {analysis && (
              <>
                {/* Executive Summary */}
                <section className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/20">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      📊 Resumo Executivo
                    </h3>
                    <div className="flex items-center gap-1">
                      {getRatingStars(analysis.executiveSummary.overallRating)}
                    </div>
                  </div>
                  <Badge variant="outline" className="mb-3">
                    {analysis.executiveSummary.ratingLabel}
                  </Badge>
                  <p className="text-foreground mb-2">{analysis.executiveSummary.mainInsight}</p>
                  <p className="text-sm text-muted-foreground">{analysis.executiveSummary.comparisonWithAverage}</p>
                </section>

                {/* Professional Analysis */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Análise dos Operadores
                  </h3>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Tendência da equipe:</span>
                    {getTrendIcon(analysis.professionalAnalysis.teamTrend)}
                    <span>{getTrendLabel(analysis.professionalAnalysis.teamTrend)}</span>
                  </div>

                  {/* Highlights */}
                  {analysis.professionalAnalysis.highlights.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                        🏆 Destaques
                      </h4>
                      <div className="space-y-3">
                        {analysis.professionalAnalysis.highlights.map((highlight, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="font-medium">{highlight.name}</span>
                            <span className="text-sm text-muted-foreground">{highlight.metric}</span>
                            <span className="text-sm text-green-600 dark:text-green-400">{highlight.insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Needs Attention */}
                  {analysis.professionalAnalysis.needsAttention.length > 0 && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-3 flex items-center gap-2">
                        ⚠️ Precisam de Atenção
                      </h4>
                      <div className="space-y-3">
                        {analysis.professionalAnalysis.needsAttention.map((item, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-sm text-muted-foreground">{item.issue}</span>
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">💡 {item.recommendation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Lead Quality */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Qualidade dos Leads
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {analysis.leadQuality.confirmationRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Taxa de Confirmação</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-500">
                        {analysis.leadQuality.attendanceRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Taxa de Comparecimento</p>
                    </div>
                  </div>

                  {analysis.leadQuality.insights.length > 0 && (
                    <ul className="space-y-2">
                      {analysis.leadQuality.insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Conversation Analysis (if available) */}
                {analysis.conversationAnalysis && (
                  <section className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-teal-500" />
                      Análise de Conversas (Maxconnect)
                    </h3>

                    <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="font-medium">Eficiência do Bot:</span>
                        <p className="text-sm text-muted-foreground">{analysis.conversationAnalysis.botEfficiency}</p>
                      </div>
                      <div>
                        <span className="font-medium">Padrões de Transferência:</span>
                        <p className="text-sm text-muted-foreground">{analysis.conversationAnalysis.transferPatterns}</p>
                      </div>
                      <div>
                        <span className="font-medium">Satisfação:</span>
                        <p className="text-sm text-muted-foreground">{analysis.conversationAnalysis.satisfactionAnalysis}</p>
                      </div>

                      {analysis.conversationAnalysis.improvements.length > 0 && (
                        <div>
                          <span className="font-medium">Melhorias Sugeridas:</span>
                          <ul className="mt-1 space-y-1">
                            {analysis.conversationAnalysis.improvements.map((imp, i) => (
                              <li key={i} className="text-sm text-teal-600 dark:text-teal-400 flex items-start gap-2">
                                <span>→</span>
                                <span>{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Recommendations */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Recomendações Estratégicas
                  </h3>

                  <div className="space-y-3">
                    {analysis.recommendations.map((rec, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{rec.title}</span>
                          <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                            Prioridade {getPriorityLabel(rec.priority)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                        <p className="text-sm text-primary">
                          <strong>Impacto esperado:</strong> {rec.expectedImpact}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Trends */}
                {analysis.trends && (
                  <section className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                      Tendências
                    </h3>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm mb-3">{analysis.trends.comparedToPrevious}</p>
                      {analysis.trends.patterns.length > 0 && (
                        <ul className="space-y-1">
                          {analysis.trends.patterns.map((pattern, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-indigo-500">📌</span>
                              <span>{pattern}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
