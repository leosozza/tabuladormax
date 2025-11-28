export const estadosBrasileiros = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export const estadoCivil = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao-estavel', label: 'União Estável' },
];

export const sexoOptions = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
];

export const corPele = [
  { value: 'branca', label: 'Branca' },
  { value: 'parda', label: 'Parda' },
  { value: 'negra', label: 'Negra' },
  { value: 'amarela', label: 'Amarela' },
  { value: 'indigena', label: 'Indígena' },
];

export const corCabelo = [
  { value: 'preto', label: 'Preto' },
  { value: 'castanho-escuro', label: 'Castanho Escuro' },
  { value: 'castanho-claro', label: 'Castanho Claro' },
  { value: 'loiro', label: 'Loiro' },
  { value: 'ruivo', label: 'Ruivo' },
  { value: 'grisalho', label: 'Grisalho' },
  { value: 'colorido', label: 'Colorido' },
];

export const corOlhos = [
  { value: 'castanhos', label: 'Castanhos' },
  { value: 'verdes', label: 'Verdes' },
  { value: 'azuis', label: 'Azuis' },
  { value: 'pretos', label: 'Pretos' },
  { value: 'mel', label: 'Mel' },
];

export const tipoCabelo = [
  { value: 'liso', label: 'Liso' },
  { value: 'ondulado', label: 'Ondulado' },
  { value: 'cacheado', label: 'Cacheado' },
  { value: 'crespo', label: 'Crespo' },
  { value: 'careca', label: 'Careca' },
];

export const tamanhoCamisa = [
  { value: 'pp', label: 'PP' },
  { value: 'p', label: 'P' },
  { value: 'm', label: 'M' },
  { value: 'g', label: 'G' },
  { value: 'gg', label: 'GG' },
  { value: 'xgg', label: 'XGG' },
];

export const tamanhoCalca = Array.from({ length: 30 }, (_, i) => {
  const size = 36 + i * 2;
  return { value: String(size), label: String(size) };
});

export const tamanhoSapato = Array.from({ length: 20 }, (_, i) => {
  const size = 33 + i;
  return { value: String(size), label: String(size) };
});

export const tipoModelo = [
  { value: 'moda', label: 'Moda' },
  { value: 'publicidade', label: 'Publicidade' },
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'plus-size', label: 'Plus Size' },
  { value: 'lingerie', label: 'Lingerie' },
  { value: 'partes', label: 'Partes (Mãos, Pés, etc)' },
  { value: 'crianca', label: 'Criança' },
  { value: 'maduro', label: 'Maduro/Senior' },
];

export const cursosOptions = [
  { value: 'passarela', label: 'Passarela' },
  { value: 'fotografia', label: 'Fotografia' },
  { value: 'atuacao', label: 'Atuação' },
  { value: 'danca', label: 'Dança' },
  { value: 'teatro', label: 'Teatro' },
  { value: 'maquiagem', label: 'Maquiagem' },
  { value: 'etiqueta', label: 'Etiqueta Social' },
];

export const habilidadesOptions = [
  { value: 'ingles', label: 'Inglês' },
  { value: 'espanhol', label: 'Espanhol' },
  { value: 'frances', label: 'Francês' },
  { value: 'danca', label: 'Dança' },
  { value: 'canto', label: 'Canto' },
  { value: 'violao', label: 'Violão' },
  { value: 'piano', label: 'Piano' },
  { value: 'skateboarding', label: 'Skateboarding' },
  { value: 'surf', label: 'Surf' },
  { value: 'natacao', label: 'Natação' },
  { value: 'equitacao', label: 'Equitação' },
  { value: 'artes-marciais', label: 'Artes Marciais' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'corrida', label: 'Corrida' },
];

export const caracteristicasEspeciais = [
  { value: 'tatuagens', label: 'Tatuagens' },
  { value: 'piercings', label: 'Piercings' },
  { value: 'cicatrizes', label: 'Cicatrizes' },
  { value: 'sardas', label: 'Sardas' },
  { value: 'pecas', label: 'Pecas' },
  { value: 'oculos', label: 'Usa Óculos' },
  { value: 'barba', label: 'Barba' },
  { value: 'bigode', label: 'Bigode' },
];

// Máscaras de formatação
export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};
