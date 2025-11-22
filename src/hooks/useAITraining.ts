import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AITrainingInstruction {
  id: string;
  title: string;
  type: 'text' | 'pdf' | 'document';
  content: string;
  file_path?: string;
  priority: number;
  is_active: boolean;
  category: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  usage_count: number;
  last_used_at?: string;
}

export function useAITrainingInstructions() {
  return useQuery({
    queryKey: ['ai-training-instructions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_training_instructions')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AITrainingInstruction[];
    },
  });
}

export function useCreateInstruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instruction: Omit<AITrainingInstruction, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>) => {
      const { data, error } = await supabase
        .from('ai_training_instructions')
        .insert(instruction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-instructions'] });
      toast.success("Instrução criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instrução: ${error.message}`);
    },
  });
}

export function useUpdateInstruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AITrainingInstruction> & { id: string }) => {
      const { data, error } = await supabase
        .from('ai_training_instructions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-instructions'] });
      toast.success("Instrução atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar instrução: ${error.message}`);
    },
  });
}

export function useDeleteInstruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_training_instructions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-instructions'] });
      toast.success("Instrução excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir instrução: ${error.message}`);
    },
  });
}

export function useToggleInstructionActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_training_instructions')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-instructions'] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });
}
