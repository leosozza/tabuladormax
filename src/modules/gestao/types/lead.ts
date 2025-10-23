// Tipo unificado para leads com suporte a coordenadas e aliases
export interface LeadDataPoint {
  id?: string | number;
  
  // Coordenadas (com aliases) - todos opcionais
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  
  // Campos principais
  projeto?: string;
  scouter?: string;
  nome?: string;
  telefone?: string;
  email?: string;
  idade?: string;
  
  // Datas
  criado?: string;
  data?: string;
  data_agendamento?: string;
  data_criacao_agendamento?: string;
  data_retorno_ligacao?: string;
  
  // Valores
  valor_ficha?: number;
  
  // Status e etapas
  etapa?: string;
  ficha_confirmada?: string | boolean;
  confirmado?: string | boolean;
  compareceu?: string | boolean;
  agendado?: string;
  tabulacao?: string;
  resultado_ligacao?: string;
  funilfichas?: string;
  funil_fichas?: string;
  gerenciamentofunil?: string;
  gerenciamento_funil?: string;
  etapafunil?: string;
  
  // Campos adicionais de cadastro
  cadastro_existe_foto?: string | boolean;
  // Fotos
  foto?: string;
  foto_1?: string;
  
  // Localização e supervisão
  supervisor?: string;
  localizacao?: string;
  local_da_abordagem?: string;
  
  // Bitrix
  bitrix_id?: string;
  bitrix_status?: string;
  bitrix_synced_at?: string;
  
  // Metadata
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  raw?: any;
  
  // IDs de usuários
  scouter_user_id?: string;
  telemarketing_user_id?: string;
}
