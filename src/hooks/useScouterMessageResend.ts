import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DateFilter {
  dateFrom: Date | null;
  dateTo: Date | null;
}

interface ResendCounts {
  total_com_erro: number;
  podem_reenviar: number;
  limite_atingido: number;
}

interface FailedLead {
  lead_id: number;
  lead_name: string;
  phone_normalized: string;
  scouter: string;
  criado: string;
  projeto_comercial: string | null;
  total_envios: number;
  ultimo_erro: string;
  ultimo_erro_at: string;
  pode_reenviar: boolean;
}

interface BulkResendResult {
  success: boolean;
  summary: {
    total: number;
    processed: number;
    skipped: number;
    errors: number;
  };
  results: Array<{
    leadId: number;
    success: boolean;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
  }>;
}

export function useScouterMessageResend() {
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    dateFrom: null,
    dateTo: null
  });
  const queryClient = useQueryClient();

  // Query para contagens
  const { 
    data: counts, 
    isLoading: isLoadingCounts,
    refetch: refetchCounts
  } = useQuery({
    queryKey: ['scouter-resend-counts', dateFilter.dateFrom?.toISOString(), dateFilter.dateTo?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_failed_scouter_messages_count', {
        p_date_from: dateFilter.dateFrom?.toISOString() || null,
        p_date_to: dateFilter.dateTo?.toISOString() || null
      });

      if (error) throw error;
      return (data as ResendCounts[])?.[0] || { total_com_erro: 0, podem_reenviar: 0, limite_atingido: 0 };
    }
  });

  // Query para lista de leads
  const { 
    data: leads, 
    isLoading: isLoadingLeads,
    refetch: refetchLeads
  } = useQuery({
    queryKey: ['scouter-resend-leads', dateFilter.dateFrom?.toISOString(), dateFilter.dateTo?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_failed_scouter_messages', {
        p_date_from: dateFilter.dateFrom?.toISOString() || null,
        p_date_to: dateFilter.dateTo?.toISOString() || null,
        p_limit: 500,
        p_offset: 0
      });

      if (error) throw error;
      return (data as FailedLead[]) || [];
    }
  });

  // Mutation para reenvio em massa
  const resendMutation = useMutation({
    mutationFn: async (leadIds: number[]): Promise<BulkResendResult> => {
      const { data, error } = await supabase.functions.invoke('scouter-bulk-resend', {
        body: { leadIds }
      });

      if (error) throw error;
      return data as BulkResendResult;
    },
    onSuccess: (data) => {
      const { summary } = data;
      
      if (summary.errors === 0) {
        toast.success(`✅ ${summary.processed} leads reenviados com sucesso!`);
      } else if (summary.processed > 0) {
        toast.warning(
          `⚠️ ${summary.processed} reenviados, ${summary.errors} erros, ${summary.skipped} pulados`
        );
      } else {
        toast.error(`❌ Falha no reenvio: ${summary.errors} erros`);
      }

      // Invalidar queries para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['scouter-resend-counts'] });
      queryClient.invalidateQueries({ queryKey: ['scouter-resend-leads'] });
    },
    onError: (error) => {
      console.error('Erro no reenvio em massa:', error);
      toast.error('Erro ao processar reenvio em massa');
    }
  });

  const resendAll = async () => {
    // Admin pode reenviar para TODOS, sem restrição de limite
    const allLeads = leads || [];
    
    if (allLeads.length === 0) {
      toast.info('Nenhum lead para reenvio');
      return;
    }

    const leadIds = allLeads.map(l => l.lead_id);
    return resendMutation.mutateAsync(leadIds);
  };

  const refetch = () => {
    refetchCounts();
    refetchLeads();
  };

  return {
    // State
    dateFilter,
    setDateFilter,
    
    // Data
    counts: counts || { total_com_erro: 0, podem_reenviar: 0, limite_atingido: 0 },
    leads: leads || [],
    eligibleLeads: leads?.filter(l => l.pode_reenviar) || [],
    
    // Loading states
    isLoading: isLoadingCounts || isLoadingLeads,
    isResending: resendMutation.isPending,
    
    // Actions
    resendAll,
    refetch
  };
}
