import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CsvFieldMapping {
  id: string;
  mapping_name: string;
  csv_column: string;
  leads_column: string;
  transform_function?: string | null;
  active: boolean;
  priority: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
}

export function useCsvFieldMappings() {
  const queryClient = useQueryClient();

  // Query: Buscar mapeamentos ativos
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['csv-field-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csv_field_mappings')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as CsvFieldMapping[];
    }
  });

  // Query: Buscar nomes únicos de mapeamentos
  const { data: mappingNames } = useQuery({
    queryKey: ['csv-mapping-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csv_field_mappings')
        .select('mapping_name, id')
        .eq('active', true)
        .order('mapping_name');
      
      if (error) throw error;
      
      // Retornar apenas nomes únicos
      const uniqueNames = [...new Set(data.map(m => m.mapping_name))];
      return uniqueNames;
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
        csv_column: string;
        leads_column: string;
        transform_function?: string;
        priority: number;
      }> 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Desativar mapeamentos anteriores com mesmo nome
      await supabase
        .from('csv_field_mappings')
        .update({ active: false })
        .eq('mapping_name', mappingName);

      // Inserir novos mapeamentos
      const { data, error } = await supabase
        .from('csv_field_mappings')
        .insert(
          mappings.map(m => ({
            mapping_name: mappingName,
            csv_column: m.csv_column,
            leads_column: m.leads_column,
            transform_function: m.transform_function || null,
            priority: m.priority,
            active: true,
            created_by: user.user?.id
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['csv-mapping-names'] });
      toast.success('Mapeamento salvo com sucesso!');
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
        .from('csv_field_mappings')
        .delete()
        .eq('mapping_name', mappingName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['csv-mapping-names'] });
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
