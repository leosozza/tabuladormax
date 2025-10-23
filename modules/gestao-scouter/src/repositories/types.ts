export type DataSource = 'bitrix' | 'sheets';

export interface Project {
  nome?: string;
  'Agencia e Seletiva'?: string | number | boolean | Date;
  'agencia e seletiva'?: string;
  'Meta de Fichas'?: string | number | boolean | Date;
  valorAjudaCusto?: number | string;
  valorFolgaRemunerada?: number | string;
}

export interface LeadsFilters {
  scouter?: string;
  projeto?: string;       // ⚠️ usamos "projeto" no filtro e "projetos" no dado
  etapa?: string;
  dataInicio?: string;    // YYYY-MM-DD
  dataFim?: string;       // YYYY-MM-DD
}

export interface Lead {
  id?: string | number;
  nome?: string;
  projetos?: string;
  scouter?: string;
  criado?: string | Date;
  valor_ficha?: string | number;
  etapa?: string;
  modelo?: string;
  localizacao?: string;
  ficha_confirmada?: string | boolean;
  idade?: string;
  local_da_abordagem?: string;
  cadastro_existe_foto?: string | boolean;
  presenca_confirmada?: string | boolean;
  supervisor_do_scouter?: string;
  data_confirmacao_ficha?: string;
  foto?: string;
  compareceu?: string | number | boolean;
  confirmado?: string | number | boolean;
  tem_foto?: string | boolean;
  telefone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  aprovado?: boolean | null;
  data_criacao_ficha?: string;
  tabulacao?: string;
  agendado?: string;
  funilfichas?: string;
  funil_fichas?: string;
  gerenciamentofunil?: string;
  gerenciamento_funil?: string;
  etapafunil?: string;
  data_criacao_agendamento?: string;
  data_retorno_ligacao?: string;
}

export interface AppSettings {
  id?: string;
  valor_base_ficha: number;
  quality_threshold: number;
  peso_foto: number;
  peso_confirmada: number;
  peso_contato: number;
  peso_agendado: number;
  peso_compareceu: number;
  peso_interesse: number;
  peso_concl_pos: number;
  peso_concl_neg: number;
  peso_sem_interesse_def: number;
  peso_sem_contato: number;
  peso_sem_interesse_momento: number;
  ajuda_custo_tier: Record<string, number>;
  updated_at?: string;
}

export interface TabuladorMaxConfig {
  id?: string;
  project_id: string;
  url: string;
  publishable_key: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SyncLog {
  id?: string;
  endpoint: string;
  table_name: string;
  status: 'success' | 'error' | 'pending';
  request_params?: Record<string, unknown>;
  response_data?: unknown;
  error_message?: string;
  records_count?: number;
  execution_time_ms?: number;
  created_at?: string;
}
