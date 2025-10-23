export interface FieldMapping {
  supabaseField: string;
  legacyAliases: string[];
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'coordinates';
  transformFunction?: string;
  isRequired: boolean;
  description?: string;
}

export const DEFAULT_FICHAS_MAPPINGS: FieldMapping[] = [
  // Campos principais
  {
    supabaseField: 'nome',
    legacyAliases: ['Nome', 'nome', 'Nome Completo', 'Nome do Candidato', 'TITLE', 'NAME'],
    dataType: 'text',
    isRequired: true,
    description: 'Nome do candidato'
  },
  {
    supabaseField: 'telefone',
    legacyAliases: ['Telefone', 'telefone', 'Tel', 'Celular', 'Whatsapp', 'PHONE'],
    dataType: 'text',
    isRequired: false,
    description: 'Telefone de contato'
  },
  {
    supabaseField: 'email',
    legacyAliases: ['Email', 'email', 'E-mail', 'EMAIL'],
    dataType: 'text',
    isRequired: false,
    description: 'E-mail do candidato'
  },
  
  // Gestão
  {
    supabaseField: 'projeto',
    legacyAliases: [
      'Projetos Comerciais',
      'Projetos Cormeciais',
      'Projetos',
      'Projeto',
      'projetos',
      'projeto'
    ],
    dataType: 'text',
    isRequired: false,
    description: 'Nome do projeto comercial associado'
  },
  {
    supabaseField: 'scouter',
    legacyAliases: [
      'Gestão do Scouter',
      'Gestão de Scouter',
      'Scouter',
      'scouter',
      'Nome Scouter',
      'ASSIGNED_BY_ID'
    ],
    dataType: 'text',
    isRequired: false,
    description: 'Nome do scouter responsável'
  },
  {
    supabaseField: 'supervisor',
    legacyAliases: ['Supervisor', 'supervisor', 'Gestor'],
    dataType: 'text',
    isRequired: false,
    description: 'Supervisor responsável'
  },
  
  // Valores e financeiro
  {
    supabaseField: 'valor_ficha',
    legacyAliases: [
      'Valor por Fichas',
      'Valor Ficha',
      'Valor_ficha',
      'R$/Ficha',
      'Valor da Ficha',
      'Valor por Ficha',
      'valor'
    ],
    dataType: 'number',
    transformFunction: 'parseBRL',
    isRequired: false,
    description: 'Valor monetário da ficha'
  },
  
  // Datas
  {
    supabaseField: 'criado',
    legacyAliases: [
      'Data_criacao_Ficha',
      'Data',
      'Criado',
      'criado',
      'Data de Criação',
      'Data Criação',
      'DATE_CREATE'
    ],
    dataType: 'date',
    isRequired: false,
    description: 'Data de criação da ficha'
  },
  {
    supabaseField: 'data_criacao_ficha',
    legacyAliases: ['Data Criação Ficha', 'Data_criacao_Ficha'],
    dataType: 'date',
    isRequired: false,
    description: 'Data de criação específica da ficha'
  },
  {
    supabaseField: 'data_confirmacao_ficha',
    legacyAliases: ['Data Confirmação', 'Data Confirmação Ficha'],
    dataType: 'date',
    isRequired: false,
    description: 'Data de confirmação da ficha'
  },
  {
    supabaseField: 'data_criacao_agendamento',
    legacyAliases: ['Data Agendamento', 'Data de Agendamento'],
    dataType: 'date',
    isRequired: false,
    description: 'Data de criação do agendamento'
  },
  {
    supabaseField: 'data_retorno_ligacao',
    legacyAliases: ['Data Retorno', 'Data Retorno Ligação'],
    dataType: 'date',
    isRequired: false,
    description: 'Data de retorno da ligação'
  },
  {
    supabaseField: 'modificado',
    legacyAliases: ['Modificado', 'Data Modificação', 'DATE_MODIFY'],
    dataType: 'date',
    isRequired: false,
    description: 'Data de modificação'
  },
  
  // Geolocalização
  {
    supabaseField: 'latitude',
    legacyAliases: ['lat', 'Latitude', 'latitude', 'LAT'],
    dataType: 'number',
    isRequired: false,
    description: 'Coordenada de latitude'
  },
  {
    supabaseField: 'longitude',
    legacyAliases: ['lng', 'lon', 'Longitude', 'longitude', 'LNG', 'LON'],
    dataType: 'number',
    isRequired: false,
    description: 'Coordenada de longitude'
  },
  {
    supabaseField: 'local_abordagem',
    legacyAliases: ['Local Abordagem', 'Local de Abordagem', 'Localização'],
    dataType: 'text',
    isRequired: false,
    description: 'Local onde ocorreu a abordagem'
  },
  {
    supabaseField: 'local_da_abordagem',
    legacyAliases: ['Local da Abordagem'],
    dataType: 'text',
    isRequired: false,
    description: 'Local da abordagem'
  },
  {
    supabaseField: 'localizacao',
    legacyAliases: ['Localização', 'localizacao'],
    dataType: 'text',
    isRequired: false,
    description: 'Localização geral'
  },
  
  // Status e etapas
  {
    supabaseField: 'etapa',
    legacyAliases: ['Etapa', 'etapa', 'STAGE_ID'],
    dataType: 'text',
    isRequired: false,
    description: 'Etapa atual do lead'
  },
  {
    supabaseField: 'etapa_funil',
    legacyAliases: ['Etapa Funil', 'Etapa do Funil'],
    dataType: 'text',
    isRequired: false,
    description: 'Etapa no funil de vendas'
  },
  {
    supabaseField: 'etapa_fluxo',
    legacyAliases: ['Etapa Fluxo', 'Etapa do Fluxo'],
    dataType: 'text',
    isRequired: false,
    description: 'Etapa no fluxo de trabalho'
  },
  {
    supabaseField: 'status_tabulacao',
    legacyAliases: ['Status Tabulação', 'Status da Tabulação'],
    dataType: 'text',
    isRequired: false,
    description: 'Status da tabulação'
  },
  {
    supabaseField: 'status_fluxo',
    legacyAliases: ['Status Fluxo', 'Status do Fluxo'],
    dataType: 'text',
    isRequired: false,
    description: 'Status no fluxo'
  },
  {
    supabaseField: 'funil_fichas',
    legacyAliases: ['Funil Fichas', 'Funil de Fichas'],
    dataType: 'text',
    isRequired: false,
    description: 'Funil de fichas'
  },
  {
    supabaseField: 'gerenciamento_funil',
    legacyAliases: ['Gerenciamento Funil', 'Gerenciamento do Funil'],
    dataType: 'text',
    isRequired: false,
    description: 'Gerenciamento do funil'
  },
  
  // Confirmações e validações
  {
    supabaseField: 'ficha_confirmada',
    legacyAliases: ['Ficha Confirmada', 'Confirmada'],
    dataType: 'text',
    isRequired: false,
    description: 'Status de confirmação da ficha'
  },
  {
    supabaseField: 'aprovado',
    legacyAliases: ['Aprovado', 'aprovado'],
    dataType: 'boolean',
    isRequired: false,
    description: 'Se o lead foi aprovado'
  },
  {
    supabaseField: 'compareceu',
    legacyAliases: ['Compareceu', 'compareceu'],
    dataType: 'boolean',
    isRequired: false,
    description: 'Se o lead compareceu'
  },
  {
    supabaseField: 'presenca_confirmada',
    legacyAliases: ['Presença Confirmada', 'Presenca Confirmada'],
    dataType: 'boolean',
    isRequired: false,
    description: 'Se a presença foi confirmada'
  },
  {
    supabaseField: 'cadastro_existe_foto',
    legacyAliases: ['Existe Foto', 'Cadastro Existe Foto'],
    dataType: 'boolean',
    isRequired: false,
    description: 'Se existe foto no cadastro'
  },
  
  // Contatos adicionais
  {
    supabaseField: 'celular',
    legacyAliases: ['Celular', 'celular', 'Telefone Celular'],
    dataType: 'text',
    isRequired: false,
    description: 'Número de celular'
  },
  {
    supabaseField: 'telefone_trabalho',
    legacyAliases: ['Telefone Trabalho', 'Tel Trabalho'],
    dataType: 'text',
    isRequired: false,
    description: 'Telefone do trabalho'
  },
  {
    supabaseField: 'telefone_casa',
    legacyAliases: ['Telefone Casa', 'Tel Casa'],
    dataType: 'text',
    isRequired: false,
    description: 'Telefone residencial'
  },
  
  // Informações complementares
  {
    supabaseField: 'age',
    legacyAliases: ['Idade', 'age', 'Age'],
    dataType: 'number',
    isRequired: false,
    description: 'Idade do candidato'
  },
  {
    supabaseField: 'foto',
    legacyAliases: ['Foto', 'foto', 'Foto URL'],
    dataType: 'text',
    isRequired: false,
    description: 'URL da foto'
  },
  {
    supabaseField: 'fonte',
    legacyAliases: ['Fonte', 'fonte', 'SOURCE_ID'],
    dataType: 'text',
    isRequired: false,
    description: 'Fonte do lead'
  },
  {
    supabaseField: 'origem_sincronizacao',
    legacyAliases: ['Origem', 'origem', 'Origem Sincronização'],
    dataType: 'text',
    isRequired: false,
    description: 'Origem da sincronização'
  },
  {
    supabaseField: 'responsible',
    legacyAliases: ['Responsável', 'Responsible', 'ASSIGNED_BY_ID'],
    dataType: 'text',
    isRequired: false,
    description: 'Responsável pelo lead'
  },
  {
    supabaseField: 'horario_agendamento',
    legacyAliases: ['Horário Agendamento', 'Horario'],
    dataType: 'text',
    isRequired: false,
    description: 'Horário do agendamento'
  },
  {
    supabaseField: 'op_telemarketing',
    legacyAliases: ['OP Telemarketing', 'Operador Telemarketing'],
    dataType: 'text',
    isRequired: false,
    description: 'Operador de telemarketing'
  },
  {
    supabaseField: 'nome_modelo',
    legacyAliases: ['Nome Modelo', 'Modelo'],
    dataType: 'text',
    isRequired: false,
    description: 'Nome do modelo'
  },
  
  // IDs externos
  {
    supabaseField: 'id',
    legacyAliases: ['ID', 'id', 'ID Bitrix', 'Bitrix ID', 'Lead ID', 'eu ia', 'eu_id'],
    dataType: 'number',
    isRequired: false,
    description: 'ID único do lead (Bitrix)'
  },
  {
    supabaseField: 'maxsystem_id_ficha',
    legacyAliases: ['MaxSystem ID', 'ID MaxSystem'],
    dataType: 'text',
    isRequired: false,
    description: 'ID no MaxSystem'
  },
  {
    supabaseField: 'commercial_project_id',
    legacyAliases: ['Commercial Project ID', 'ID Projeto'],
    dataType: 'text',
    isRequired: false,
    description: 'ID do projeto comercial'
  }
];

// Lista completa de campos da tabela leads para o drag-and-drop
export const ALL_LEADS_FIELDS = [
  { name: 'id', description: 'ID único do lead (Bitrix)' },
  { name: 'nome', description: 'Nome do candidato (obrigatório)' },
  { name: 'telefone', description: 'Telefone de contato' },
  { name: 'email', description: 'E-mail do candidato' },
  { name: 'celular', description: 'Número de celular' },
  { name: 'telefone_trabalho', description: 'Telefone do trabalho' },
  { name: 'telefone_casa', description: 'Telefone residencial' },
  { name: 'projeto', description: 'Nome do projeto comercial' },
  { name: 'scouter', description: 'Nome do scouter responsável' },
  { name: 'supervisor', description: 'Supervisor responsável' },
  { name: 'responsible', description: 'Responsável pelo lead' },
  { name: 'valor_ficha', description: 'Valor monetário da ficha' },
  { name: 'criado', description: 'Data de criação' },
  { name: 'data_criacao_ficha', description: 'Data de criação da ficha' },
  { name: 'data_confirmacao_ficha', description: 'Data de confirmação' },
  { name: 'data_criacao_agendamento', description: 'Data do agendamento' },
  { name: 'data_retorno_ligacao', description: 'Data de retorno' },
  { name: 'modificado', description: 'Data de modificação' },
  { name: 'latitude', description: 'Coordenada latitude' },
  { name: 'longitude', description: 'Coordenada longitude' },
  { name: 'local_abordagem', description: 'Local de abordagem' },
  { name: 'local_da_abordagem', description: 'Local da abordagem (alt)' },
  { name: 'localizacao', description: 'Localização geral' },
  { name: 'etapa', description: 'Etapa atual do lead' },
  { name: 'etapa_funil', description: 'Etapa no funil' },
  { name: 'etapa_fluxo', description: 'Etapa no fluxo' },
  { name: 'status_tabulacao', description: 'Status da tabulação' },
  { name: 'status_fluxo', description: 'Status no fluxo' },
  { name: 'funil_fichas', description: 'Funil de fichas' },
  { name: 'gerenciamento_funil', description: 'Gerenciamento do funil' },
  { name: 'ficha_confirmada', description: 'Status de confirmação' },
  { name: 'aprovado', description: 'Lead aprovado (sim/não)' },
  { name: 'compareceu', description: 'Compareceu (sim/não)' },
  { name: 'presenca_confirmada', description: 'Presença confirmada (sim/não)' },
  { name: 'cadastro_existe_foto', description: 'Existe foto (sim/não)' },
  { name: 'age', description: 'Idade do candidato' },
  { name: 'foto', description: 'URL da foto' },
  { name: 'fonte', description: 'Fonte do lead' },
  { name: 'origem_sincronizacao', description: 'Origem da sincronização' },
  { name: 'horario_agendamento', description: 'Horário do agendamento' },
  { name: 'op_telemarketing', description: 'Operador de telemarketing' },
  { name: 'nome_modelo', description: 'Nome do modelo' },
  { name: 'maxsystem_id_ficha', description: 'ID no MaxSystem' },
  { name: 'commercial_project_id', description: 'ID do projeto comercial' },
  { name: 'scouter_id', description: 'ID numérico do scouter' },
  { name: 'bitrix_projeto_id', description: 'ID do projeto no Bitrix' },
  { name: 'bitrix_scouter_id', description: 'ID do scouter no Bitrix' }
];