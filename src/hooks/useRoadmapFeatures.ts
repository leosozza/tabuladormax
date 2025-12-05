import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RoadmapFeature {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'beta' | 'in-progress' | 'planned' | 'archived';
  module: 'telemarketing' | 'gestao-scouter' | 'admin' | 'agenciamento' | 'discador' | 'integracoes' | 'geral';
  icon: string;
  progress: number;
  launch_date: string | null;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type RoadmapFeatureInsert = Omit<RoadmapFeature, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type RoadmapFeatureUpdate = Partial<RoadmapFeatureInsert>;

export function useRoadmapFeatures() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['roadmap-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_features')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as RoadmapFeature[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (feature: RoadmapFeatureInsert) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('roadmap_features')
        .insert({
          ...feature,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      toast({ title: 'Funcionalidade criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar funcionalidade', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & RoadmapFeatureUpdate) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('roadmap_features')
        .update({
          ...updates,
          updated_by: user.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      toast({ title: 'Funcionalidade atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar funcionalidade', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('roadmap_features')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      toast({ title: 'Funcionalidade removida com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover funcionalidade', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, progress }: { id: string; status: RoadmapFeature['status']; progress?: number }) => {
      const { data: user } = await supabase.auth.getUser();
      const updateData: Record<string, unknown> = {
        status,
        updated_by: user.user?.id,
      };
      
      if (progress !== undefined) {
        updateData.progress = progress;
      } else if (status === 'active') {
        updateData.progress = 100;
      } else if (status === 'planned') {
        updateData.progress = 0;
      }

      const { data, error } = await supabase
        .from('roadmap_features')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      toast({ title: 'Status atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    },
  });

  return {
    features: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createFeature: createMutation.mutateAsync,
    updateFeature: updateMutation.mutateAsync,
    deleteFeature: deleteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
