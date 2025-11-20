import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUndoAction } from './useUndoAction';

interface UseLeadAnalysisOptions {
  leads: any[];
  onComplete?: () => void;
}

interface AnalysisStats {
  total: number;
  approved: number;
  rejected: number;
  superApproved: number;
  skipped: number;
  startTime: Date;
}

export function useLeadAnalysis({ leads, onComplete }: UseLeadAnalysisOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<AnalysisStats>({
    total: 0,
    approved: 0,
    rejected: 0,
    superApproved: 0,
    skipped: 0,
    startTime: new Date()
  });
  
  const { recordAction, isUndoAvailable, lastAction, clearUndo } = useUndoAction({ timeoutMs: 5000 });
  const queryClient = useQueryClient();

  const updateStats = useCallback((type: 'approved' | 'rejected' | 'superApproved' | 'skipped') => {
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      [type]: prev[type] + 1
    }));
  }, []);

  const saveAnalysis = async (leadId: number, quality: string, type: 'approved' | 'rejected' | 'superApproved') => {
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('leads')
        .update({
          qualidade_lead: quality,
          data_analise: new Date().toISOString(),
          analisado_por: user.id
        })
        .eq('id', leadId);

      if (error) throw error;

      // Registrar para permitir undo
      recordAction(leadId, quality);
      updateStats(type);

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['gestao-leads'] });

      // Mover para próximo
      if (currentIndex < leads.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete?.();
      }

      const labels = {
        approved: 'Lead aprovado',
        rejected: 'Lead reprovado',
        superApproved: 'Lead super aprovado'
      };

      toast.success(labels[type], {
        description: `${stats.total + 1} de ${leads.length} analisados`,
      });

    } catch (error) {
      console.error('Erro ao salvar análise:', error);
      toast.error('Erro ao salvar análise', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = useCallback(() => {
    if (isProcessing || !leads[currentIndex]) return;
    saveAnalysis(leads[currentIndex].id, 'aprovado', 'approved');
  }, [currentIndex, leads, isProcessing]);

  const handleReject = useCallback(() => {
    if (isProcessing || !leads[currentIndex]) return;
    saveAnalysis(leads[currentIndex].id, 'reprovado', 'rejected');
  }, [currentIndex, leads, isProcessing]);

  const handleSuperApprove = useCallback(() => {
    if (isProcessing || !leads[currentIndex]) return;
    saveAnalysis(leads[currentIndex].id, 'super_aprovado', 'superApproved');
  }, [currentIndex, leads, isProcessing]);

  const handleSkip = useCallback(() => {
    if (isProcessing) return;
    
    updateStats('skipped');
    
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete?.();
    }

    toast.info('Lead pulado', {
      description: `${stats.total + 1} de ${leads.length} analisados`
    });
  }, [currentIndex, leads, isProcessing, stats.total, onComplete]);

  const handleUndo = useCallback(async () => {
    if (!lastAction || !isUndoAvailable) return;

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          qualidade_lead: null,
          data_analise: null,
          analisado_por: null
        })
        .eq('id', lastAction.leadId);

      if (error) throw error;

      // Voltar para o lead anterior
      setCurrentIndex(prev => Math.max(0, prev - 1));
      
      // Atualizar estatísticas (reverter)
      const typeMap: Record<string, keyof AnalysisStats> = {
        'aprovado': 'approved',
        'reprovado': 'rejected',
        'super_aprovado': 'superApproved'
      };
      
      const statType = typeMap[lastAction.quality];
      if (statType && typeof statType === 'string' && statType in stats) {
        setStats(prev => {
          const currentValue = prev[statType as keyof AnalysisStats];
          if (typeof currentValue === 'number') {
            return {
              ...prev,
              total: Math.max(0, prev.total - 1),
              [statType]: Math.max(0, currentValue - 1)
            };
          }
          return prev;
        });
      }

      clearUndo();
      queryClient.invalidateQueries({ queryKey: ['gestao-leads'] });

      toast.success('Análise desfeita');
    } catch (error) {
      console.error('Erro ao desfazer:', error);
      toast.error('Erro ao desfazer análise');
    } finally {
      setIsProcessing(false);
    }
  }, [lastAction, isUndoAvailable, clearUndo, queryClient]);

  const resetStats = useCallback(() => {
    setStats({
      total: 0,
      approved: 0,
      rejected: 0,
      superApproved: 0,
      skipped: 0,
      startTime: new Date()
    });
  }, []);

  return {
    currentLead: leads[currentIndex],
    currentIndex,
    totalLeads: leads.length,
    handleApprove,
    handleReject,
    handleSuperApprove,
    handleSkip,
    isProcessing,
    canUndo: isUndoAvailable,
    handleUndo,
    stats,
    resetStats
  };
}
