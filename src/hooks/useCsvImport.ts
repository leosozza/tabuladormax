import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Função para formatar duração em ms para string legível
export const formatDuration = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Função para calcular estatísticas de processamento
export const calculateJobStats = (job: any) => {
  if (!job.started_at || !job.processed_rows) return null;
  
  const startTime = new Date(job.started_at).getTime();
  const now = Date.now();
  const elapsedMs = now - startTime;
  const elapsedSec = elapsedMs / 1000;
  
  const rate = job.processed_rows / elapsedSec; // linhas/seg
  
  if (job.total_rows && job.total_rows > 0) {
    const remainingRows = job.total_rows - job.processed_rows;
    const estimatedSecondsLeft = remainingRows / rate;
    
    return {
      rate: rate.toFixed(1),
      elapsedTime: formatDuration(elapsedMs),
      elapsedMs,
      eta: formatDuration(estimatedSecondsLeft * 1000),
      progress: (job.processed_rows / job.total_rows * 100).toFixed(1)
    };
  }
  
  return {
    rate: rate.toFixed(1),
    elapsedTime: formatDuration(elapsedMs),
    elapsedMs,
    eta: 'Calculando...',
    progress: null
  };
};

export function useCsvImport() {
  const queryClient = useQueryClient();

  // Query: Listar jobs de importação
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['csv-import-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csv_import_jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Refetch a cada 3 segundos para atualizar status
  });

  // Mutation: Upload e criar job
  const uploadCsv = useMutation({
    mutationFn: async ({ 
      file, 
      syncWithBitrix 
    }: { 
      file: File; 
      syncWithBitrix: boolean 
    }) => {
      // 1. Upload para storage
      const filePath = `csv-imports/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('imports')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error('Falha ao fazer upload do arquivo');
      }

      // 2. Criar job
      const { data: user } = await supabase.auth.getUser();
      
      const { data: job, error: jobError } = await supabase
        .from('csv_import_jobs')
        .insert({
          file_path: filePath,
          status: 'pending',
          created_by: user.user?.id
        })
        .select()
        .single();
      
      if (jobError) {
        console.error('Erro ao criar job:', jobError);
        throw new Error('Falha ao criar job de importação');
      }

      // 3. Chamar edge function para processar
      const { data, error } = await supabase.functions.invoke(
        'process-large-csv-import',
        {
          body: { 
            jobId: job.id, 
            filePath,
            syncWithBitrix 
          }
        }
      );
      
      if (error) {
        console.error('Erro ao processar:', error);
        throw new Error('Falha ao iniciar processamento');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-import-jobs'] });
      toast.success('Importação iniciada com sucesso!', {
        description: 'O processamento foi iniciado em segundo plano'
      });
    },
    onError: (error: Error) => {
      console.error('Erro na importação:', error);
      toast.error('Erro ao iniciar importação', {
        description: error.message
      });
    }
  });

  // Mutation: Deletar job
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('csv_import_jobs')
        .delete()
        .eq('id', jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-import-jobs'] });
      toast.success('Importação removida do histórico');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover importação', {
        description: error.message
      });
    }
  });

  return { 
    jobs, 
    isLoading,
    uploadCsv, 
    isUploading: uploadCsv.isPending,
    deleteJob: deleteJobMutation.mutate,
    isDeletingJob: deleteJobMutation.isPending
  };
}
