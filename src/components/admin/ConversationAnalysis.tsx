import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Play, 
  Check, 
  X, 
  Trash2, 
  Loader2, 
  MessageSquare,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar
} from "lucide-react";
import {
  useTrainingSuggestions,
  useAnalysisJobs,
  useStartAnalysis,
  useApproveSuggestion,
  useRejectSuggestion,
  useDeleteSuggestion,
  type TrainingSuggestion
} from "@/hooks/useConversationAnalysis";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  faq: { label: "FAQ", color: "bg-blue-500" },
  product_knowledge: { label: "Produtos", color: "bg-green-500" },
  procedures: { label: "Procedimentos", color: "bg-purple-500" },
  policies: { label: "Políticas", color: "bg-orange-500" },
  troubleshooting: { label: "Suporte", color: "bg-red-500" },
  general: { label: "Geral", color: "bg-gray-500" },
};

interface ConversationAnalysisProps {
  projectId?: string;
}

export function ConversationAnalysis({ projectId }: ConversationAnalysisProps) {
  const [dateRange, setDateRange] = useState("7");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  const { data: suggestions, isLoading: loadingSuggestions } = useTrainingSuggestions(projectId);
  const { data: jobs, isLoading: loadingJobs } = useAnalysisJobs(projectId);
  const startAnalysis = useStartAnalysis();
  const approveSuggestion = useApproveSuggestion();
  const rejectSuggestion = useRejectSuggestion();
  const deleteSuggestion = useDeleteSuggestion();

  const handleStartAnalysis = () => {
    const days = parseInt(dateRange);
    const dateRangeStart = subDays(new Date(), days).toISOString();
    const dateRangeEnd = new Date().toISOString();

    startAnalysis.mutate({ projectId, dateRangeStart, dateRangeEnd });
  };

  const filteredSuggestions = suggestions?.filter(s => 
    statusFilter === "all" ? true : s.status === statusFilter
  ) || [];

  const pendingCount = suggestions?.filter(s => s.status === 'pending').length || 0;
  const approvedCount = suggestions?.filter(s => s.status === 'approved').length || 0;
  const latestJob = jobs?.[0];

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-500";
    if (score >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Sugestões Pendentes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conversas Analisadas</p>
                <p className="text-2xl font-bold">{latestJob?.conversations_analyzed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Última Análise</p>
                <p className="text-sm font-medium">
                  {latestJob?.completed_at 
                    ? format(new Date(latestJob.completed_at), "dd/MM HH:mm", { locale: ptBR })
                    : "Nunca"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Análise de Conversas
          </CardTitle>
          <CardDescription>
            Analise conversas recentes para identificar padrões e gerar sugestões de treinamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último dia</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleStartAnalysis}
              disabled={startAnalysis.isPending}
              className="gap-2"
            >
              {startAnalysis.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {startAnalysis.isPending ? "Analisando..." : "Iniciar Análise"}
            </Button>
          </div>

          {latestJob?.status === 'processing' && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Análise em andamento...
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sugestões de Treinamento</CardTitle>
              <CardDescription>
                Revise e aprove sugestões geradas automaticamente
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sugestão encontrada</p>
              <p className="text-sm">Execute uma análise para gerar sugestões</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {filteredSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    expanded={expandedSuggestion === suggestion.id}
                    onToggle={() => setExpandedSuggestion(
                      expandedSuggestion === suggestion.id ? null : suggestion.id
                    )}
                    onApprove={() => approveSuggestion.mutate(suggestion.id)}
                    onReject={() => rejectSuggestion.mutate(suggestion.id)}
                    onDelete={() => deleteSuggestion.mutate(suggestion.id)}
                    isApproving={approveSuggestion.isPending}
                    isRejecting={rejectSuggestion.isPending}
                    getConfidenceColor={getConfidenceColor}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: TrainingSuggestion;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  getConfidenceColor: (score: number) => string;
}

function SuggestionCard({
  suggestion,
  expanded,
  onToggle,
  onApprove,
  onReject,
  onDelete,
  isApproving,
  isRejecting,
  getConfidenceColor,
}: SuggestionCardProps) {
  const categoryInfo = CATEGORY_LABELS[suggestion.suggested_category] || CATEGORY_LABELS.general;

  return (
    <Card className="border">
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={`${categoryInfo.color} text-white`}>
                  {categoryInfo.label}
                </Badge>
                <Badge variant="outline" className={getConfidenceColor(suggestion.confidence_score)}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {Math.round(suggestion.confidence_score * 100)}% confiança
                </Badge>
                <Badge variant="secondary">
                  {suggestion.frequency_count}x frequência
                </Badge>
                {suggestion.status !== 'pending' && (
                  <Badge variant={suggestion.status === 'approved' ? 'default' : 'destructive'}>
                    {suggestion.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium truncate">{suggestion.suggested_title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {suggestion.suggested_content}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {suggestion.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onApprove}
                    disabled={isApproving}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReject}
                    disabled={isRejecting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {isRejecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost">
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium mb-2">Conteúdo Sugerido:</h5>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {suggestion.suggested_content}
                </p>
              </div>

              {suggestion.sample_questions && suggestion.sample_questions.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Perguntas Exemplo:</h5>
                  <ul className="space-y-1">
                    {suggestion.sample_questions.map((q, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(suggestion.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
