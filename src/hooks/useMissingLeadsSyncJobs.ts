import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MissingLeadsSyncJob {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  scouter_name: string | null;
  date_from: string | null;
  date_to: string | null;
  bitrix_total: number;
  db_total: number;
  missing_count: number;
  synced_count: number;
  error_count: number;
  error_details: any[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncMissingLeadsParams {
  scouterName?: string;
  dateFrom?: string;
  dateTo?: string;
  batchSize?: number;
}

export function useMissingLeadsSyncJobs() {
  const queryClient = useQueryClient();

  // Buscar jobs
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['missing-leads-sync-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missing_leads_sync_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as MissingLeadsSyncJob[];
    },
    refetchInterval: (query) => {
      // Polling mais frequente se há job rodando
      const jobs = query.state.data as MissingLeadsSyncJob[] | undefined;
      const hasRunningJob = jobs?.some(j => j.status === 'running');
      return hasRunningJob ? 3000 : 30000;
    }
  });

  // Iniciar sincronização
  const syncMutation = useMutation({
    mutationFn: async (params: SyncMissingLeadsParams) => {
      const { data, error } = await supabase.functions.invoke('sync-missing-leads', {
        body: {
          scouterName: params.scouterName?.trim() || null,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          batchSize: params.batchSize || 10
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['missing-leads-sync-jobs'] });
      
      if (data.synced > 0) {
        toast.success(`${data.synced} leads sincronizados com sucesso!`);
      } else if (data.missing === 0) {
        toast.info('Todos os leads já estão sincronizados');
      } else {
        toast.warning(`Nenhum lead foi sincronizado (${data.errors} erros)`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar leads faltantes');
    }
  });

  // Job ativo (se houver)
  const activeJob = jobs.find(j => j.status === 'running');
  const completedJobs = jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status));

  return {
    jobs,
    activeJob,
    completedJobs,
    isLoading,
    refetch,
    syncMissingLeads: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data
  };
}
