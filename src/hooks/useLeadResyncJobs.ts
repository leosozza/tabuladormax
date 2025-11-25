import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadResyncJob {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  total_leads: number;
  processed_leads: number;
  updated_leads: number;
  skipped_leads: number;
  error_leads: number;
  filter_criteria: any;
  batch_size: number;
  priority_fields: string[];
  last_processed_lead_id: number | null;
  current_batch: number;
  estimated_completion: string | null;
  error_details: any[];
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobFilters {
  addressNull?: boolean;
  phoneNull?: boolean;
  valorNull?: boolean;
  responsibleNull?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export function useLeadResyncJobs() {
  const queryClient = useQueryClient();

  // Query: Listar jobs
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['lead-resync-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_resync_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeadResyncJob[];
    },
    refetchInterval: 3000 // Atualizar a cada 3s
  });

  // Mutation: Processar job iterativamente
  const processJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      let needsMore = true;
      let iterations = 0;
      const MAX_ITERATIONS = 100; // Limite de segurança
      
      toast.info('Iniciando processamento iterativo...');
      
      while (needsMore && iterations < MAX_ITERATIONS) {
        iterations++;
        
        const { data, error } = await supabase.functions.invoke('bitrix-resync-leads', {
          body: { action: 'process', jobId }
        });
        
        if (error) throw error;
        
        needsMore = data?.needs_more_calls || false;
        
        if (needsMore) {
          // Aguardar um pouco entre chamadas
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      return { success: true, iterations };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-resync-jobs'] });
      toast.success(`Processamento completo! (${data.iterations} iterações)`);
    },
    onError: (error: any) => {
      toast.error('Erro ao processar job: ' + error.message);
      queryClient.invalidateQueries({ queryKey: ['lead-resync-jobs'] });
    }
  });

  // Mutation: Criar job
  const createJobMutation = useMutation({
    mutationFn: async (config: { 
      filters: JobFilters; 
      batchSize: number;
      mappingId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('bitrix-resync-leads', {
        body: { 
          action: 'create', 
          filters: config.filters, 
          batchSize: config.batchSize,
          mappingId: config.mappingId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-resync-jobs'] });
      toast.success('Job criado! Iniciando processamento...');
      
      // Auto-iniciar processamento iterativo
      if (data?.job?.id) {
        processJobMutation.mutate(data.job.id);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao criar job: ' + error.message);
    }
  });

  // Mutation: Pausar
  const pauseJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.functions.invoke('bitrix-resync-leads', {
        body: { action: 'pause', jobId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-resync-jobs'] });
      toast.success('Job pausado');
    },
    onError: (error: any) => {
      toast.error('Erro ao pausar: ' + error.message);
    }
  });

  // Mutation: Retomar
  const resumeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.functions.invoke('bitrix-resync-leads', {
        body: { action: 'resume', jobId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-resync-jobs'] });
      toast.success('Job retomado');
    },
    onError: (error: any) => {
      toast.error('Erro ao retomar: ' + error.message);
    }
  });

  // Mutation: Cancelar
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.functions.invoke('bitrix-resync-leads', {
        body: { action: 'cancel', jobId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-resync-jobs'] });
      toast.success('Resincronização cancelada');
    },
    onError: (error: any) => {
      toast.error('Erro ao cancelar: ' + error.message);
    }
  });

  // Mutation: Excluir
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.functions.invoke('bitrix-resync-leads', {
        body: { action: 'delete', jobId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-resync-jobs'] });
      toast.success('Job excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  return {
    jobs: jobs || [],
    isLoading,
    createJob: createJobMutation.mutate,
    processJob: processJobMutation.mutate,
    pauseJob: pauseJobMutation.mutate,
    resumeJob: resumeJobMutation.mutate,
    cancelJob: cancelJobMutation.mutate,
    deleteJob: deleteJobMutation.mutate,
    isCreating: createJobMutation.isPending,
    isProcessing: processJobMutation.isPending,
    isPausing: pauseJobMutation.isPending,
    isResuming: resumeJobMutation.isPending,
    isCancelling: cancelJobMutation.isPending,
    isDeleting: deleteJobMutation.isPending
  };
}
