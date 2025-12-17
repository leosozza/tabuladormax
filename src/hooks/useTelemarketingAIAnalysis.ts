import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIAnalysisResult {
  executiveSummary: {
    overallRating: 1 | 2 | 3 | 4 | 5;
    ratingLabel: string;
    mainInsight: string;
    comparisonWithAverage: string;
  };
  professionalAnalysis: {
    highlights: { name: string; metric: string; insight: string }[];
    needsAttention: { name: string; issue: string; recommendation: string }[];
    teamTrend: 'improving' | 'stable' | 'declining';
  };
  leadQuality: {
    confirmationRate: number;
    attendanceRate: number;
    insights: string[];
  };
  conversationAnalysis?: {
    botEfficiency: string;
    transferPatterns: string;
    satisfactionAnalysis: string;
    improvements: string[];
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
  }[];
  trends: {
    comparedToPrevious: string;
    patterns: string[];
  };
}

interface OperatorMetrics {
  name: string;
  leads: number;
  agendamentos: number;
  confirmadas: number;
  leadsScouter: number;
  leadsMeta: number;
}

interface ScouterMetrics {
  name: string;
  total: number;
  agendados: number;
  confirmados: number;
}

interface TelemarketingMetrics {
  totalLeads: number;
  agendamentos: number;
  comparecimentos: number;
  taxaConversao: number;
  operatorPerformance: OperatorMetrics[];
  scouterPerformance: ScouterMetrics[];
  tabulacaoDistribution: { label: string; count: number }[];
}

interface ConversationMetrics {
  totalConversations: number;
  resolvedByBot: number;
  transferred: number;
  avgSatisfaction: number;
  transferReasons: { reason: string; count: number }[];
  avgResponseTime: number;
}

export function useTelemarketingAIAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConversationMetrics = async (startDate: Date, endDate: Date): Promise<ConversationMetrics | null> => {
    try {
      const { data: conversations, error: convError } = await supabase
        .from('whatsapp_bot_conversations')
        .select('*')
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString());

      if (convError || !conversations || conversations.length === 0) {
        return null;
      }

      const totalConversations = conversations.length;
      const resolvedByBot = conversations.filter(c => c.resolved_by_bot).length;
      const transferred = conversations.filter(c => c.transferred_at).length;
      
      const satisfactionScores = conversations
        .filter(c => c.satisfaction_score !== null)
        .map(c => c.satisfaction_score as number);
      const avgSatisfaction = satisfactionScores.length > 0
        ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
        : 0;

      // Get transfer reasons
      const reasonCounts: Record<string, number> = {};
      conversations
        .filter(c => c.transferred_reason)
        .forEach(c => {
          const reason = c.transferred_reason || 'Não especificado';
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      
      const transferReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get response times from messages
      const { data: messages } = await supabase
        .from('whatsapp_bot_messages')
        .select('response_time_ms')
        .not('response_time_ms', 'is', null)
        .limit(1000);

      const avgResponseTime = messages && messages.length > 0
        ? messages.reduce((sum, m) => sum + (m.response_time_ms || 0), 0) / messages.length
        : 0;

      return {
        totalConversations,
        resolvedByBot,
        transferred,
        avgSatisfaction,
        transferReasons,
        avgResponseTime,
      };
    } catch (err) {
      console.error('Error fetching conversation metrics:', err);
      return null;
    }
  };

  const generateAnalysis = async (
    period: string,
    periodLabel: string,
    metrics: TelemarketingMetrics,
    startDate: Date,
    endDate: Date
  ) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Fetch conversation metrics from Maxconnect
      const conversations = await fetchConversationMetrics(startDate, endDate);

      const response = await supabase.functions.invoke('analyze-telemarketing', {
        body: {
          period,
          periodLabel,
          metrics: {
            totalLeads: metrics.totalLeads,
            agendamentos: metrics.agendamentos,
            comparecimentos: metrics.comparecimentos,
            taxaConversao: metrics.taxaConversao,
            operatorPerformance: metrics.operatorPerformance,
            scouterPerformance: metrics.scouterPerformance,
            tabulacaoDistribution: metrics.tabulacaoDistribution,
          },
          conversations,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar análise');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao processar análise');
      }

      setAnalysis(response.data.analysis);
      toast.success('Análise gerada com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error(`Erro: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    setError(null);
  };

  return {
    isLoading,
    analysis,
    error,
    generateAnalysis,
    clearAnalysis,
  };
}
