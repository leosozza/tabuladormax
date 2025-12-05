import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProcessDiagram, BpmnCategory } from '@/types/bpmn';
import { Json } from '@/integrations/supabase/types';

interface ProcessDiagramInsert {
  name: string;
  description?: string;
  category: BpmnCategory;
  module?: string;
  diagram_data?: Json;
  is_published?: boolean;
}

interface ProcessDiagramUpdate {
  name?: string;
  description?: string;
  category?: BpmnCategory;
  module?: string;
  diagram_data?: Json;
  is_published?: boolean;
  version?: number;
}

// Helper to safely convert DB response to ProcessDiagram
function toProcessDiagram(row: {
  id: string;
  name: string;
  description: string | null;
  category: string;
  module: string | null;
  diagram_data: Json;
  version: number;
  is_published: boolean;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}): ProcessDiagram {
  const diagramData = row.diagram_data as { nodes?: unknown[]; edges?: unknown[] } | null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    category: row.category as BpmnCategory,
    module: row.module || undefined,
    diagram_data: {
      nodes: (diagramData?.nodes || []) as ProcessDiagram['diagram_data']['nodes'],
      edges: (diagramData?.edges || []) as ProcessDiagram['diagram_data']['edges'],
    },
    version: row.version,
    is_published: row.is_published,
    thumbnail: row.thumbnail || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by || undefined,
    updated_by: row.updated_by || undefined,
  };
}

export function useProcessDiagrams() {
  const queryClient = useQueryClient();

  const { data: diagrams, isLoading, error } = useQuery({
    queryKey: ['process-diagrams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_diagrams')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(toProcessDiagram);
    },
  });

  const createDiagram = useMutation({
    mutationFn: async (diagram: ProcessDiagramInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('process_diagrams')
        .insert({
          name: diagram.name,
          description: diagram.description,
          category: diagram.category,
          module: diagram.module,
          diagram_data: diagram.diagram_data || { nodes: [], edges: [] },
          is_published: diagram.is_published,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return toProcessDiagram(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-diagrams'] });
      toast.success('Diagrama criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar diagrama: ' + error.message);
    },
  });

  const updateDiagram = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ProcessDiagramUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('process_diagrams')
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return toProcessDiagram(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-diagrams'] });
      toast.success('Diagrama atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteDiagram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('process_diagrams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-diagrams'] });
      toast.success('Diagrama excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  return {
    diagrams,
    isLoading,
    error,
    createDiagram,
    updateDiagram,
    deleteDiagram,
  };
}
