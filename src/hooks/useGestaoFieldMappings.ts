import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ColumnConfig } from '@/config/leadFields';
import { stripTagFromName } from '@/utils/formatters';

// Campos sensíveis que devem ser ocultados para Scouters
const SENSITIVE_FIELDS = [
  'celular',
  'telefone',
  'telefone_casa', 
  'telefone_trabalho',
  'email'
];

/**
 * Hook para Gestão Scouter - usa a tabela unificada field_mappings
 * Mantém compatibilidade com código existente
 */
export const useGestaoFieldMappings = () => {
  return useQuery({
    queryKey: ['gestao-field-mappings-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_mappings')
        .select('*')
        .eq('active', true)
        .eq('default_visible', true)
        .order('priority');
      
      if (error) throw error;
      
      // Transformar em ColumnConfig, filtrando campos sensíveis
      const fields: ColumnConfig[] = data
        .filter(mapping => !SENSITIVE_FIELDS.includes(mapping.supabase_field))
        .map(mapping => ({
        key: mapping.supabase_field,
        label: mapping.display_name,
        type: mapping.field_type as any,
        sortable: mapping.sortable,
        defaultVisible: mapping.default_visible,
        category: mapping.category as any,
        formatter: getFormatterFunction(mapping.formatter_function)
      }));
      
      return fields;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
};

function getFormatterFunction(name: string | null) {
  if (!name) return undefined;
  
  // Mapear nomes de funções para implementações
  const formatters: Record<string, any> = {
    formatDateBR: (value: string) => {
      if (!value) return '-';
      const date = new Date(value);
      return date.toLocaleDateString('pt-BR');
    },
    formatCurrency: (value: number) => {
      if (!value) return '-';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    },
    formatBoolean: (value: boolean) => value ? 'Sim' : 'Não',
    stripTag: (value: string) => stripTagFromName(value),
    formatCommercialProject: (value: any, lead: any) => {
      // Acessar o campo aninhado do JOIN
      return lead?.commercial_projects?.name || '-';
    },
  };
  
  return formatters[name];
}
