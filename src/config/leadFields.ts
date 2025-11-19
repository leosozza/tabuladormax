import { ReactNode } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'currency';
  formatter?: (value: any, row?: any) => ReactNode;
  sortable: boolean;
  defaultVisible: boolean;
  category: 'basic' | 'contact' | 'status' | 'location' | 'dates' | 'sync' | 'other';
}

const formatDateBR = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const ALL_LEAD_FIELDS: ColumnConfig[] = [
  // Dados Básicos
  { 
    key: 'name', 
    label: 'Nome', 
    type: 'text', 
    sortable: true, 
    defaultVisible: true,
    category: 'basic',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'age', 
    label: 'Idade', 
    type: 'number', 
    sortable: true, 
    defaultVisible: false,
    category: 'basic',
    formatter: (value: number) => value || '-'
  },
  { 
    key: 'email', 
    label: 'E-mail', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'contact',
    formatter: (value: string) => value || '-'
  },
  
  // Contato
  { 
    key: 'telefone', 
    label: 'Telefone', 
    type: 'text', 
    sortable: true, 
    defaultVisible: true,
    category: 'contact',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'celular', 
    label: 'Celular', 
    type: 'text', 
    sortable: true, 
    defaultVisible: true,
    category: 'contact',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'telefone_casa', 
    label: 'Tel. Casa', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'contact',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'telefone_trabalho', 
    label: 'Tel. Trabalho', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'contact',
    formatter: (value: string) => value || '-'
  },
  
  // Scouting
  { 
    key: 'scouter', 
    label: 'Scouter', 
    type: 'text', 
    sortable: true, 
    defaultVisible: true,
    category: 'basic',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'commercial_projects.name', 
    label: 'Projeto Comercial', 
    type: 'text', 
    sortable: false, 
    defaultVisible: true,
    category: 'basic',
    formatter: (value: any, row?: any) => row?.commercial_projects?.name || '-'
  },
  { 
    key: 'supervisor', 
    label: 'Supervisor', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'basic',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'projetos', 
    label: 'Projeto', 
    type: 'text', 
    sortable: true, 
    defaultVisible: true,
    category: 'basic',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'valor_ficha', 
    label: 'Valor Ficha', 
    type: 'currency', 
    sortable: true, 
    defaultVisible: false,
    category: 'basic',
    formatter: (value: number) => value ? `R$ ${value.toFixed(2)}` : '-'
  },
  
  // Status
  { 
    key: 'aprovado', 
    label: 'Aprovado', 
    type: 'boolean', 
    sortable: true, 
    defaultVisible: false,
    category: 'status',
    formatter: (value: boolean | null) => {
      if (value === true) return 'Sim';
      if (value === false) return 'Não';
      return 'Pendente';
    }
  },
  { 
    key: 'etapa', 
    label: 'Etapa', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'status',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'status_tabulacao', 
    label: 'Status Tabulação', 
    type: 'text', 
    sortable: true, 
    defaultVisible: true,
    category: 'status',
    formatter: (value: string) => value || '-'
  },
  
  // Confirmações
  { 
    key: 'cadastro_existe_foto', 
    label: 'Tem Foto', 
    type: 'boolean', 
    sortable: true, 
    defaultVisible: false,
    category: 'status',
    formatter: (value: boolean | string) => {
      const hasFoto = value === true || value === 'SIM';
      return hasFoto ? 'Sim' : 'Não';
    }
  },
  { 
    key: 'ficha_confirmada', 
    label: 'Ficha Confirmada', 
    type: 'text', 
    sortable: true, 
    defaultVisible: true,
    category: 'status',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'presenca_confirmada', 
    label: 'Presença Confirmada', 
    type: 'boolean', 
    sortable: true, 
    defaultVisible: false,
    category: 'status',
    formatter: (value: boolean) => value ? 'Sim' : 'Não'
  },
  { 
    key: 'compareceu', 
    label: 'Compareceu', 
    type: 'boolean', 
    sortable: true, 
    defaultVisible: false,
    category: 'status',
    formatter: (value: boolean) => value ? 'Sim' : 'Não'
  },
  
  // Localização
  { 
    key: 'local_abordagem', 
    label: 'Local Abordagem', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'location',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'local_da_abordagem', 
    label: 'Local da Abordagem', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'location',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'localizacao', 
    label: 'Localização', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'location',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'address', 
    label: 'Endereço', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'location',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'latitude', 
    label: 'Latitude', 
    type: 'number', 
    sortable: true, 
    defaultVisible: false,
    category: 'location',
    formatter: (value: number) => value || '-'
  },
  { 
    key: 'longitude', 
    label: 'Longitude', 
    type: 'number', 
    sortable: true, 
    defaultVisible: false,
    category: 'location',
    formatter: (value: number) => value || '-'
  },
  
  // Datas
  { 
    key: 'criado', 
    label: 'Data Criação', 
    type: 'date', 
    sortable: true, 
    defaultVisible: true,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'data_criacao_ficha', 
    label: 'Data Criação Ficha', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'data_confirmacao_ficha', 
    label: 'Data Confirmação Ficha', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'data_criacao_agendamento', 
    label: 'Data Criação Agendamento', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'data_retorno_ligacao', 
    label: 'Data Retorno Ligação', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'updated_at', 
    label: 'Última Atualização', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'modificado', 
    label: 'Modificado', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'analisado_em', 
    label: 'Analisado Em', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  { 
    key: 'data_analise', 
    label: 'Data Análise', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
  
  // Outros
  { 
    key: 'photo_url', 
    label: 'URL Foto', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'other',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'horario_agendamento', 
    label: 'Horário Agendamento', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'dates',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'fonte', 
    label: 'Fonte', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'other',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'nome_modelo', 
    label: 'Nome Modelo', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'other',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'op_telemarketing', 
    label: 'OP Telemarketing', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'other',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'maxsystem_id_ficha', 
    label: 'MaxSystem ID', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'other',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'responsible', 
    label: 'Responsável', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'other',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'qualidade_lead', 
    label: 'Qualidade Lead', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'status',
    formatter: (value: string) => value || '-'
  },
  
  // Sync
  { 
    key: 'sync_source', 
    label: 'Origem Sync', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'sync',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'sync_status', 
    label: 'Status Sync', 
    type: 'text', 
    sortable: true, 
    defaultVisible: false,
    category: 'sync',
    formatter: (value: string) => value || '-'
  },
  { 
    key: 'last_sync_at', 
    label: 'Último Sync', 
    type: 'date', 
    sortable: true, 
    defaultVisible: false,
    category: 'sync',
    formatter: (value: string) => value ? formatDateBR(value) : '-'
  },
];

export const CATEGORY_LABELS = {
  basic: '📝 Dados Básicos',
  contact: '📞 Contato',
  status: '✅ Status',
  location: '📍 Localização',
  dates: '📅 Datas',
  sync: '🔄 Sincronização',
  other: '📋 Outros'
};
