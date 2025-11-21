import { supabase } from "@/integrations/supabase/client";

/**
 * Mapear campos JOIN para campos reais da tabela leads
 */
export const JOIN_FIELD_MAPPINGS: Record<string, string> = {
  'commercial_projects.name': 'commercial_project_id',
  'commercial_projects.code': 'commercial_project_id',
};

/**
 * Lista de campos válidos na tabela leads
 * Esta lista é usada para validação rápida
 */
export const VALID_LEAD_FIELDS = [
  'id', 'name', 'age', 'address', 'scouter', 'etapa', 
  'projeto_comercial', 'commercial_project_id', 'responsible',
  'responsible_user_id', 'celular', 'telefone_trabalho', 
  'telefone_casa', 'criado', 'compareceu', 'ficha_confirmada', 
  'valor_ficha', 'data_agendamento', 'data_analise', 'analisado_por',
  'qualidade_lead', 'status_fluxo', 'etapa_funil', 'etapa_fluxo',
  'funil_fichas', 'status_tabulacao', 'gestao_scouter', 'op_telemarketing',
  'fonte', 'local_abordagem', 'horario_agendamento', 'gerenciamento_funil',
  'maxsystem_id_ficha', 'nome_modelo', 'photo_url', 'latitude', 'longitude',
  'bitrix_telemarketing_id', 'cadastro_existe_foto', 'presenca_confirmada',
  'data_confirmacao_ficha', 'data_criacao_ficha', 'data_criacao_agendamento',
  'data_retorno_ligacao', 'date_modify', 'geocoded_at', 'updated_at',
  'last_sync_at', 'sync_status', 'sync_source', 'sync_errors', 'has_sync_errors',
  'raw'
];

/**
 * Verificar se um campo pode ser filtrado e retornar o campo real da tabela
 */
export function getFilterableField(field: string): string | null {
  // Se é um campo JOIN, retornar o campo real
  if (JOIN_FIELD_MAPPINGS[field]) {
    return JOIN_FIELD_MAPPINGS[field];
  }
  
  // Se é um campo válido, retornar ele mesmo
  if (VALID_LEAD_FIELDS.includes(field)) {
    return field;
  }
  
  // Campo inválido
  return null;
}

/**
 * Buscar colunas reais da tabela leads dinamicamente
 */
export async function getValidLeadFields(): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_leads_table_columns');
    if (error) throw error;
    return data?.map((col: any) => col.column_name) || VALID_LEAD_FIELDS;
  } catch (error) {
    console.warn('Erro ao buscar colunas da tabela leads, usando lista padrão', error);
    return VALID_LEAD_FIELDS;
  }
}

/**
 * Resolver valor de campo JOIN (ex: commercial_projects.name → UUID)
 */
export async function resolveJoinFieldValue(
  field: string, 
  value: string
): Promise<string | null> {
  // Resolver commercial_projects.name → commercial_project_id
  if (field === 'commercial_projects.name') {
    const { data } = await supabase
      .from('commercial_projects')
      .select('id')
      .ilike('name', `%${value}%`)
      .maybeSingle();
    
    return data?.id || null;
  }
  
  if (field === 'commercial_projects.code') {
    const { data } = await supabase
      .from('commercial_projects')
      .select('id')
      .eq('code', value)
      .maybeSingle();
    
    return data?.id || null;
  }
  
  return null;
}
