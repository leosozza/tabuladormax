// Mock data baseado nos exemplos fornecidos
export interface Lead {
  ID: number;
  Projetos_Comerciais: string;
  Gestao_de_Scouter: string;
  Criado: string;
  Data_de_Criacao_da_Ficha: string;
  MaxScouterApp_Verificacao: string;
  Valor_por_Fichas: string;
}

export interface Projeto {
  Agencia_e_Seletiva: string;
  Meta_de_Fichas: number;
  Inicio_Captacao_Fichas: string;
  Termino_Captacao_Fichas: string;
}

export interface MetaScouter {
  scouter: string;
  meta: number;
  inicio: string;
  termino: string;
  projeto?: string;
  valor_por_ficha_override?: number;
}

// Dados simulados realistas
export const mockFichas: Lead[] = [
  // Carlos Antônio - SELETIVA SANTO ANDRÉ-ABC (alta performance)
  ...Array.from({ length: 180 }, (_, i) => ({
    ID: 465856 + i,
    Projetos_Comerciais: "SELETIVA SANTO ANDRÉ-ABC",
    Gestao_de_Scouter: "Carlos Antônio",
    Criado: new Date(2025, 7, Math.floor(i / 15) + 1).toISOString().split('T')[0],
    Data_de_Criacao_da_Ficha: new Date(2025, 7, Math.floor(i / 15) + 1, 9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60)).toISOString(),
    MaxScouterApp_Verificacao: `448599Carlos ${new Date().toISOString()}`,
    Valor_por_Fichas: "R$ 6,00"
  })),

  // Rafaela - SELETIVA SÃO CARLOS (performance média)
  ...Array.from({ length: 120 }, (_, i) => ({
    ID: 466000 + i,
    Projetos_Comerciais: "SELETIVA SÃO CARLOS",
    Gestao_de_Scouter: "Rafaela",
    Criado: new Date(2025, 7, Math.floor(i / 10) + 1).toISOString().split('T')[0],
    Data_de_Criacao_da_Ficha: new Date(2025, 7, Math.floor(i / 10) + 1, 8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60)).toISOString(),
    MaxScouterApp_Verificacao: `448600Rafaela ${new Date().toISOString()}`,
    Valor_por_Fichas: "R$ 5,50"
  })),

  // Ana Paula - AGÊNCIA DIGITAL SP (performance baixa)
  ...Array.from({ length: 80 }, (_, i) => ({
    ID: 466200 + i,
    Projetos_Comerciais: "AGÊNCIA DIGITAL SP",
    Gestao_de_Scouter: "Ana Paula",
    Criado: new Date(2025, 7, Math.floor(i / 8) + 1).toISOString().split('T')[0],
    Data_de_Criacao_da_Ficha: new Date(2025, 7, Math.floor(i / 8) + 1, 10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60)).toISOString(),
    MaxScouterApp_Verificacao: `448700Ana ${new Date().toISOString()}`,
    Valor_por_Fichas: "R$ 7,00"
  })),

  // João Silva - Multiple projects
  ...Array.from({ length: 95 }, (_, i) => ({
    ID: 466400 + i,
    Projetos_Comerciais: i < 50 ? "SELETIVA SANTO ANDRÉ-ABC" : "AGÊNCIA DIGITAL SP",
    Gestao_de_Scouter: "João Silva",
    Criado: new Date(2025, 7, Math.floor(i / 9) + 1).toISOString().split('T')[0],
    Data_de_Criacao_da_Ficha: new Date(2025, 7, Math.floor(i / 9) + 1, 9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60)).toISOString(),
    MaxScouterApp_Verificacao: `448800Joao ${new Date().toISOString()}`,
    Valor_por_Fichas: "R$ 6,50"
  })),

  // Maria Santos - SELETIVA SÃO CARLOS
  ...Array.from({ length: 110 }, (_, i) => ({
    ID: 466600 + i,
    Projetos_Comerciais: "SELETIVA SÃO CARLOS",
    Gestao_de_Scouter: "Maria Santos",
    Criado: new Date(2025, 7, Math.floor(i / 11) + 1).toISOString().split('T')[0],
    Data_de_Criacao_da_Ficha: new Date(2025, 7, Math.floor(i / 11) + 1, 8 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60)).toISOString(),
    MaxScouterApp_Verificacao: `448900Maria ${new Date().toISOString()}`,
    Valor_por_Fichas: "R$ 5,50"
  }))
];

export const mockProjetos: Projeto[] = [
  {
    Agencia_e_Seletiva: "SELETIVA SANTO ANDRÉ-ABC",
    Meta_de_Fichas: 2500,
    Inicio_Captacao_Fichas: "2025-08-01",
    Termino_Captacao_Fichas: "2025-08-31"
  },
  {
    Agencia_e_Seletiva: "SELETIVA SÃO CARLOS", 
    Meta_de_Fichas: 3000,
    Inicio_Captacao_Fichas: "2025-07-30",
    Termino_Captacao_Fichas: "2025-08-14"
  },
  {
    Agencia_e_Seletiva: "AGÊNCIA DIGITAL SP",
    Meta_de_Fichas: 1500,
    Inicio_Captacao_Fichas: "2025-08-05",
    Termino_Captacao_Fichas: "2025-08-25"
  }
];

export const mockMetasScouter: MetaScouter[] = [
  {
    scouter: "Carlos Antônio",
    meta: 600,
    inicio: "2025-08-01",
    termino: "2025-08-31",
    projeto: "SELETIVA SANTO ANDRÉ-ABC"
  },
  {
    scouter: "Rafaela",
    meta: 450,
    inicio: "2025-08-01", 
    termino: "2025-08-31"
  },
  {
    scouter: "João Silva",
    meta: 400,
    inicio: "2025-08-01",
    termino: "2025-08-31"
  }
];

// Função comentada - dados devem vir do Supabase
// Legado: import de serviços externos descontinuado

export const fetchSheetData = async (sheetType: 'fichas' | 'projetos' | 'metas'): Promise<any[]> => {
  console.warn('fetchSheetData deprecated - use Supabase hooks instead');
  return [];
};