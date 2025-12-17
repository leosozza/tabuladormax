import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TrainingSuggestion {
  id: string;
  commercial_project_id?: string;
  suggested_title: string;
  suggested_content: string;
  suggested_category: string;
  confidence_score: number;
  source_type: string;
  source_data: Record<string, unknown>;
  sample_questions: string[];
  frequency_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  reviewed_by?: string;
  reviewed_at?: string;
  created_instruction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisJob {
  id: string;
  commercial_project_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  conversations_analyzed: number;
  suggestions_generated: number;
  date_range_start?: string;
  date_range_end?: string;
  analysis_results: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
}

export function useTrainingSuggestions(projectId?: string) {
  return useQuery({
    queryKey: ['training-suggestions', projectId],
    queryFn: async () => {
      let query = supabase
        .from('ai_training_suggestions')
        .select('*')
        .order('confidence_score', { ascending: false })
        .order('frequency_count', { ascending: false });

      if (projectId) {
        query = query.eq('commercial_project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingSuggestion[];
    },
  });
}

export function useAnalysisJobs(projectId?: string) {
  return useQuery({
    queryKey: ['analysis-jobs', projectId],
    queryFn: async () => {
      let query = supabase
        .from('conversation_analysis_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (projectId) {
        query = query.eq('commercial_project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AnalysisJob[];
    },
  });
}

export function useStartAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      dateRangeStart, 
      dateRangeEnd 
    }: { 
      projectId?: string; 
      dateRangeStart?: string; 
      dateRangeEnd?: string;
    }) => {
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('conversation_analysis_jobs')
        .insert({
          commercial_project_id: projectId || null,
          date_range_start: dateRangeStart || null,
          date_range_end: dateRangeEnd || null,
          status: 'pending'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Start analysis
      const { data, error } = await supabase.functions.invoke('analyze-conversations', {
        body: { 
          projectId, 
          dateRangeStart, 
          dateRangeEnd,
          jobId: job.id
        }
      });

      if (error) throw error;
      return { job, result: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['analysis-jobs'] });
      toast.success("Análise concluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro na análise: ${error.message}`);
    },
  });
}

export function useApproveSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      // Get the suggestion
      const { data: suggestion, error: fetchError } = await supabase
        .from('ai_training_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (fetchError) throw fetchError;

      // Create training instruction
      const { data: instruction, error: createError } = await supabase
        .from('ai_training_instructions')
        .insert({
          title: suggestion.suggested_title,
          content: suggestion.suggested_content,
          category: suggestion.suggested_category,
          type: 'text',
          is_active: true,
          priority: Math.round(suggestion.confidence_score * 10),
          commercial_project_id: suggestion.commercial_project_id
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update suggestion status
      const { error: updateError } = await supabase
        .from('ai_training_suggestions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          created_instruction_id: instruction.id
        })
        .eq('id', suggestionId);

      if (updateError) throw updateError;

      return instruction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-training-instructions'] });
      toast.success("Sugestão aprovada e instrução criada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });
}

export function useRejectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from('ai_training_suggestions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-suggestions'] });
      toast.success("Sugestão rejeitada");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    },
  });
}

export function useDeleteSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from('ai_training_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-suggestions'] });
      toast.success("Sugestão removida");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });
}
