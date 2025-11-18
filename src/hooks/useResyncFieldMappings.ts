import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResyncFieldMapping {
  id: string;
  mapping_name: string;
  bitrix_field: string;
  leads_column: string;
  transform_function?: string | null;
  skip_if_null: boolean;
  active: boolean;
  priority: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
}

export function useResyncFieldMappings() {
  const queryClient = useQueryClient();

  // Query: Buscar mapeamentos ativos
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['resync-field-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resync_field_mappings')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as ResyncFieldMapping[];
    }
  });

  // Query: Buscar nomes únicos de mapeamentos
  const { data: mappingNames } = useQuery({
    queryKey: ['resync-mapping-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resync_field_mappings')
        .select('mapping_name, id')
        .eq('active', true)
        .order('mapping_name');
      
      if (error) throw error;
      
      // Retornar apenas nomes únicos com seus IDs
      const uniqueMappings = data.reduce((acc: Array<{name: string, id: string}>, curr) => {
        if (!acc.find(m => m.name === curr.mapping_name)) {
          acc.push({ name: curr.mapping_name, id: curr.id });
        }
        return acc;
      }, []);
      
      return uniqueMappings;
    }
  });

  // Mutation: Criar ou atualizar mapeamento
  const saveMappings = useMutation({
    mutationFn: async ({ 
      mappingName, 
      mappings 
    }: { 
      mappingName: string; 
      mappings: Array<{
        bitrix_field: string;
        leads_column: string;
        transform_function?: string;
        priority: number;
        skip_if_null?: boolean;
      }> 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Desativar mapeamentos anteriores com mesmo nome
      await supabase
        .from('resync_field_mappings')
        .update({ active: false })
        .eq('mapping_name', mappingName);

      // Inserir novos mapeamentos
      const { data, error } = await supabase
        .from('resync_field_mappings')
        .insert(
          mappings.map(m => ({
            mapping_name: mappingName,
            bitrix_field: m.bitrix_field,
            leads_column: m.leads_column,
            transform_function: m.transform_function || null,
            priority: m.priority,
            skip_if_null: m.skip_if_null ?? true,
            active: true,
            created_by: user.user?.id
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resync-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['resync-mapping-names'] });
      toast.success('Mapeamento de resincronização salvo com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar mapeamento', {
        description: error.message
      });
    }
  });

  // Mutation: Deletar mapeamento
  const deleteMappings = useMutation({
    mutationFn: async (mappingName: string) => {
      const { error } = await supabase
        .from('resync_field_mappings')
        .delete()
        .eq('mapping_name', mappingName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resync-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['resync-mapping-names'] });
      toast.success('Mapeamento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir mapeamento', {
        description: error.message
      });
    }
  });

  return {
    mappings,
    mappingNames,
    isLoading,
    saveMappings,
    deleteMappings
  };
}
