import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Stats {
  total_leads: number;
  com_foto: number;
  confirmados: number;
  agendados: number;
  reagendar: number;
  compareceram: number;
  pendentes: number;
  duplicados: number;
}

interface Ranking {
  rank_position: number;
  scouter_fichas: number;
  total_scouters: number;
}

interface AnalysisResult {
  analysis: string;
  metrics: {
    confirmationRate: number;
    attendanceRate: number;
    photoRate: number;
  };
}

export function useScouterAIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const generateAnalysis = async (
    scouterName: string,
    periodLabel: string,
    stats: Stats | null,
    ranking: Ranking | null
  ): Promise<AnalysisResult | null> => {
    if (!stats) {
      toast.error('Sem dados para análise');
      return null;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-performance', {
        body: {
          scouterName,
          periodLabel,
          stats: {
            total_leads: stats.total_leads || 0,
            com_foto: stats.com_foto || 0,
            confirmados: stats.confirmados || 0,
            agendados: stats.agendados || 0,
            reagendar: stats.reagendar || 0,
            compareceram: stats.compareceram || 0,
            pendentes: stats.pendentes || 0,
            duplicados: stats.duplicados || 0,
          },
          ranking: ranking ? {
            rank_position: ranking.rank_position,
            scouter_fichas: ranking.scouter_fichas,
            total_scouters: ranking.total_scouters || 10,
          } : null,
        },
      });

      if (error) {
        console.error('Error generating analysis:', error);
        toast.error('Erro ao gerar análise de IA');
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      setAnalysisResult(data);
      return data;
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao conectar com serviço de IA');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
  };

  return {
    generateAnalysis,
    clearAnalysis,
    isAnalyzing,
    analysisResult,
  };
}
