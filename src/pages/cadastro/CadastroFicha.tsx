import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FormSection } from '@/components/cadastro/FormSection';
import { FormField } from '@/components/cadastro/FormField';
import { MultiSelect } from '@/components/cadastro/MultiSelect';
import { 
  User, 
  MapPin, 
  Phone, 
  Share2, 
  Sparkles,
  Save,
  Loader2,
  ArrowLeft,
  FileText
} from 'lucide-react';

interface FormData {
  // Dados Cadastrais
  nomeResponsavel: string;
  cpf: string;
  estadoCivil: string;
  telefoneResponsavel: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  
  // Dados do Modelo
  nomeModelo: string;
  dataNascimento: string;
  sexo: string;
  altura: string;
  peso: string;
  manequim: string[];
  calcado: string;
  corCabelo: string;
  corOlhos: string;
  corPele: string;
  tipoCabelo: string;
  
  // Redes Sociais - Links
  instagramLink: string;
  facebookLink: string;
  youtubeLink: string;
  tiktokLink: string;
  kwaiLink: string;
  
  // Redes Sociais - Seguidores
  instagramSeguidores: string;
  facebookSeguidores: string;
  youtubeSeguidores: string;
  tiktokSeguidores: string;
  kwaiSeguidores: string;
  
  // Habilidades
  tipoModelo: string[];
  cursos: string[];
  habilidades: string[];
  caracteristicasEspeciais: string[];
}

const INITIAL_FORM_DATA: FormData = {
  nomeResponsavel: '',
  cpf: '',
  estadoCivil: '',
  telefoneResponsavel: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  nomeModelo: '',
  dataNascimento: '',
  sexo: '',
  altura: '',
  peso: '',
  manequim: [],
  calcado: '',
  corCabelo: '',
  corOlhos: '',
  corPele: '',
  tipoCabelo: '',
  instagramLink: '',
  facebookLink: '',
  youtubeLink: '',
  tiktokLink: '',
  kwaiLink: '',
  instagramSeguidores: '',
  facebookSeguidores: '',
  youtubeSeguidores: '',
  tiktokSeguidores: '',
  kwaiSeguidores: '',
  tipoModelo: [],
  cursos: [],
  habilidades: [],
  caracteristicasEspeciais: []
};

// Bitrix24 Estado Civil Options (UF_CRM_1762283540)
const ESTADO_CIVIL_OPTIONS = [
  { value: '9422', label: 'Solteiro(a)' },
  { value: '9418', label: 'Casado(a)' },
  { value: '9420', label: 'Divorciado(a)' },
  { value: '9424', label: 'Viúvo(a)' }
];

// Bitrix24 Cor da Pele Options (UF_CRM_1762283877)
const COR_PELE_OPTIONS = [
  { value: '9446', label: 'Branca' },
  { value: '9448', label: 'Negra' },
  { value: '9450', label: 'Oriental' },
  { value: '9452', label: 'Parda' }
];

// Bitrix24 Tipo de Cabelo Options (UF_CRM_1733485270151)
const TIPO_CABELO_OPTIONS = [
  { value: '444', label: 'Liso' },
  { value: '446', label: 'Ondulado' },
  { value: '448', label: 'Cacheado' },
  { value: '450', label: 'Crespo' },
  { value: '2258', label: 'Natural' },
  { value: '2260', label: 'Outros' }
];

// Bitrix24 Cor dos Olhos Options (UF_CRM_1733485183850)
const COR_OLHOS_OPTIONS = [
  { value: '434', label: 'Azul' },
  { value: '438', label: 'Castanho' },
  { value: '440', label: 'Cinza' },
  { value: '442', label: 'Preto' },
  { value: '436', label: 'Verde' }
];

// Bitrix24 Cor do Cabelo Options (UF_CRM_1762283650)
const COR_CABELO_OPTIONS = [
  { value: '9434', label: 'Branco' },
  { value: '9436', label: 'Castanho' },
  { value: '9438', label: 'Grisalho' },
  { value: '9440', label: 'Loiro' },
  { value: '9442', label: 'Preto' },
  { value: '9444', label: 'Ruivo' }
];

// Bitrix24 Manequim Options (UF_CRM_1762283056)
const MANEQUIM_OPTIONS = [
  { value: '9364', label: '1' },
  { value: '9366', label: '2' },
  { value: '9368', label: '3' },
  { value: '9370', label: '4' },
  { value: '9372', label: '5' },
  { value: '9374', label: '6' },
  { value: '9376', label: '7' },
  { value: '9378', label: '8' },
  { value: '9380', label: '9' },
  { value: '9382', label: '10' },
  { value: '9384', label: '11' },
  { value: '9386', label: '12' },
  { value: '9388', label: '13' },
  { value: '9390', label: '14' },
  { value: '9392', label: '15' },
  { value: '9394', label: '16' },
  { value: '9396', label: '34' },
  { value: '9398', label: '36' },
  { value: '9400', label: '38' },
  { value: '9402', label: '40' },
  { value: '9404', label: '42' },
  { value: '9406', label: '44' },
  { value: '9408', label: '46' },
  { value: '9410', label: '48' },
  { value: '9412', label: '50' },
  { value: '9414', label: '52' },
  { value: '9416', label: '54' }
];

const SEXO_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' }
];

const ESTADO_OPTIONS = [
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
  { value: 'TO', label: 'Tocantins' }
];

// Bitrix24 Tipo de Modelo Options (UF_CRM_1762282818)
const TIPO_MODELO_OPTIONS = [
  { value: '9300', label: 'Gemeos' },
  { value: '9302', label: 'Fashion' },
  { value: '9304', label: 'Publicidade' },
  { value: '9306', label: 'Elenco' },
  { value: '9308', label: 'Figuração' },
  { value: '9310', label: 'Feira & Eventos' },
  { value: '9312', label: 'Celebridade' },
  { value: '9314', label: 'Platéia' },
  { value: '9316', label: 'Atores com DRT' },
  { value: '9318', label: 'Plus Size' },
  { value: '9320', label: 'Em desenvolvimento' },
  { value: '9322', label: 'New Face Kids' },
  { value: '9324', label: 'Kids Mercado Exclusivo' },
  { value: '9326', label: 'Kids Mercado' },
  { value: '9328', label: 'Teens New Faces' },
  { value: '9330', label: 'Max Fashion Day' },
  { value: '9332', label: 'Exclusivo' },
  { value: '9334', label: 'Atletas' },
  { value: '9336', label: 'Musícos' },
  { value: '9338', label: 'Modernos' },
  { value: '9340', label: 'Necessidades especiais' },
  { value: '9342', label: 'Com experiência' },
  { value: '9344', label: 'YModel' },
  { value: '9346', label: 'Oriental' },
  { value: '9348', label: 'Modelos com documentos para alvará' },
  { value: '9350', label: 'Central do Casting' },
  { value: '9352', label: 'CC Eventos' },
  { value: '9354', label: 'CC Fotos' },
  { value: '9356', label: 'CC Showroom' },
  { value: '9358', label: 'CC Desfile' },
  { value: '9360', label: 'CC Video' },
  { value: '9362', label: 'Vitiligo / Albino' }
];

// Bitrix24 Cursos Options (UF_CRM_1762282626)
const CURSOS_OPTIONS = [
  { value: '9262', label: 'Canto' },
  { value: '9264', label: 'Dança' },
  { value: '9266', label: 'Espanhol' },
  { value: '9268', label: 'Exclusivo' },
  { value: '9270', label: 'Formatura CWB' },
  { value: '9272', label: 'Ginastica Artistica' },
  { value: '9274', label: 'Ingles' },
  { value: '9276', label: 'Outros, colocar em informaçoes' },
  { value: '9278', label: 'Passarela' },
  { value: '9280', label: 'Teatro' },
  { value: '9282', label: 'Toca Instrumento Musical' },
  { value: '9284', label: 'Workshop Gui' }
];

// Bitrix24 Habilidades Options (UF_CRM_1762282315)
const HABILIDADES_OPTIONS = [
  { value: '9228', label: 'Atua' },
  { value: '9230', label: 'Bilingue' },
  { value: '9232', label: 'Canta' },
  { value: '9234', label: 'Dança' },
  { value: '9236', label: 'Desfila' },
  { value: '9238', label: 'DRT' },
  { value: '9240', label: 'Figurantes' },
  { value: '9242', label: 'Joga Futebol' },
  { value: '9244', label: 'Outros,colocar em informaçoes' },
  { value: '9246', label: 'Segura texto' }
];

// Bitrix24 Características Options (UF_CRM_1762282725)
const CARACTERISTICAS_OPTIONS = [
  { value: '9286', label: 'Comunicativo' },
  { value: '9288', label: 'Desinibida' },
  { value: '9290', label: 'Dinâmica' },
  { value: '9292', label: 'Esperto' },
  { value: '9294', label: 'Espontaneo' },
  { value: '9296', label: 'Interativa' },
  { value: '9298', label: 'Risonho' }
];

// Mapeamento completo de campos do formulário para campos do Bitrix
const BITRIX_FIELD_MAPPING = {
  // Dados Pessoais
  nomeResponsavel: 'NAME',
  cpf: 'UF_CRM_CPF',
  estadoCivil: 'UF_CRM_1762283540',
  telefoneResponsavel: 'UF_CRM_TELEFONE_RESPONSAVEL',
  
  // Endereço
  cep: 'UF_CRM_1761762176',
  endereco: 'UF_CRM_1761762201',
  numero: 'UF_CRM_1762450966586',
  complemento: 'UF_CRM_COMPLEMENTO',
  bairro: 'UF_CRM_1762450985051',
  cidade: 'UF_CRM_1762451032936',
  estado: 'UF_CRM_1762451508',
  
  // Dados do Modelo
  nomeModelo: 'UF_CRM_690CA588BDFB7',
  dataNascimento: 'UF_CRM_1762533440587',
  sexo: 'UF_CRM_SEXO',
  altura: 'UF_CRM_6753068A64AB0',
  peso: 'UF_CRM_6753068A7DEC9',
  manequim: 'UF_CRM_6748E0996FC57',
  calcado: 'UF_CRM_6753068A86FE0',
  
  // Características Físicas
  corCabelo: 'UF_CRM_6753068A765FD',
  corOlhos: 'UF_CRM_6753068A5BE7C',
  corPele: 'UF_CRM_1762283877',
  tipoCabelo: 'UF_CRM_1733485270151',
  
  // Habilidades (multi-select)
  tipoModelo: 'UF_CRM_1762282818',
  cursos: 'UF_CRM_1762282626',
  habilidades: 'UF_CRM_1762282315',
  caracteristicasEspeciais: 'UF_CRM_1762282725',
  
  // Redes Sociais
  instagramLink: 'UF_CRM_INSTAGRAM',
  instagramSeguidores: 'UF_CRM_N_DE_SEGUIDORES_INSTAGRAM',
  facebookLink: 'UF_CRM_FACE',
  facebookSeguidores: 'UF_CRM_FACEBOOK_N_DE_SEGUIDORES',
  youtubeLink: 'UF_CRM_YOUTUBE',
  youtubeSeguidores: 'UF_CRM_YOUTUBE_N_DE_SEGUIDORES',
  tiktokLink: 'UF_CRM_TIKTOK',
  tiktokSeguidores: 'UF_CRM_TIKTOK_N_DE_SEGUIDORES',
  kwaiLink: 'UF_CRM_KWAI',
  kwaiSeguidores: 'UF_CRM_KWAI_N_DE_SEGUIDORES'
} as const;

export default function CadastroFicha() {
  const { entityType, entityId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [bitrixEntityType, setBitrixEntityType] = useState<'lead' | 'deal' | null>(null);
  const [bitrixEntityId, setBitrixEntityId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  /**
   * Converts Bitrix enumeration IDs to readable values
   */
  const convertEnumerationIdsToValues = (
    fieldId: string,
    valueIds: string | string[],
    fieldsStructure?: Record<string, any>
  ): string | string[] => {
    if (!fieldsStructure || !fieldsStructure[fieldId]) {
      return valueIds;
    }

    const field = fieldsStructure[fieldId];
    if (!field.items || field.type !== 'enumeration') {
      return valueIds;
    }

    const convert = (id: string): string => {
      const item = field.items.find((i: any) => i.ID === id);
      return item ? item.VALUE : id;
    };

    if (Array.isArray(valueIds)) {
      return valueIds.map(convert);
    }
    return convert(String(valueIds));
  };

  /**
   * Mapeia dados do Bitrix para o formato do formulário
   */
  const mapBitrixDataToForm = (
    bitrixData: Record<string, unknown>,
    fieldsStructure?: Record<string, any>
  ): Partial<FormData> => {
    console.log('🔄 Iniciando mapeamento Bitrix -> Form');
    console.log('📦 Dados brutos do Bitrix:', bitrixData);
    console.log('📋 Estrutura de campos disponível:', fieldsStructure ? 'SIM' : 'NÃO');
    
    const mapped: Partial<FormData> = {};
    const conversions: Record<string, any> = {};
    const fieldsFound: string[] = [];
    const fieldsMissing: string[] = [];
    
    // Helper para obter valor simples
    const getValue = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value[0] || '';
      return String(value);
    };
    
    // Helper para converter valores de enumeração
    const convertAndTrack = (fieldId: string, value: unknown): string | string[] => {
      const originalValue = value;
      // Convert value to string | string[] before passing
      const valueToConvert = Array.isArray(value) 
        ? value.map(String) 
        : value !== null && value !== undefined 
          ? String(value) 
          : '';
      const convertedValue = convertEnumerationIdsToValues(fieldId, valueToConvert, fieldsStructure);
      
      conversions[fieldId] = {
        original: originalValue,
        converted: convertedValue,
        field: fieldsStructure?.[fieldId]?.title || fieldId
      };
      
      return convertedValue;
    };
    
    // Validar campos encontrados vs ausentes
    Object.entries(BITRIX_FIELD_MAPPING).forEach(([formField, bitrixField]) => {
      if (bitrixData[bitrixField] !== undefined && bitrixData[bitrixField] !== null && bitrixData[bitrixField] !== '') {
        fieldsFound.push(`${formField} <- ${bitrixField}`);
      } else {
        fieldsMissing.push(`${formField} <- ${bitrixField}`);
      }
    });
    
    // ============= DADOS PESSOAIS =============
    if (bitrixData.NAME) {
      mapped.nomeResponsavel = getValue(bitrixData.NAME);
    }
    
    if (bitrixData.UF_CRM_CPF) {
      mapped.cpf = getValue(bitrixData.UF_CRM_CPF);
    }
    
    // Estado Civil (enumeration)
    if (bitrixData.UF_CRM_1762283540) {
      const converted = convertAndTrack('UF_CRM_1762283540', bitrixData.UF_CRM_1762283540);
      mapped.estadoCivil = Array.isArray(converted) ? converted[0] : converted;
    }
    
    if (bitrixData.UF_CRM_TELEFONE_RESPONSAVEL) {
      mapped.telefoneResponsavel = getValue(bitrixData.UF_CRM_TELEFONE_RESPONSAVEL);
    }
    
    // ============= ENDEREÇO =============
    if (bitrixData.UF_CRM_1761762176) {
      mapped.cep = getValue(bitrixData.UF_CRM_1761762176);
    }
    
    if (bitrixData.UF_CRM_1761762201) {
      mapped.endereco = getValue(bitrixData.UF_CRM_1761762201);
    }
    
    if (bitrixData.UF_CRM_1762450966586) {
      mapped.numero = getValue(bitrixData.UF_CRM_1762450966586);
    }
    
    if (bitrixData.UF_CRM_COMPLEMENTO) {
      mapped.complemento = getValue(bitrixData.UF_CRM_COMPLEMENTO);
    }
    
    if (bitrixData.UF_CRM_1762450985051) {
      mapped.bairro = getValue(bitrixData.UF_CRM_1762450985051);
    }
    
    if (bitrixData.UF_CRM_1762451032936) {
      mapped.cidade = getValue(bitrixData.UF_CRM_1762451032936);
    }
    
    if (bitrixData.UF_CRM_1762451508) {
      const converted = convertAndTrack('UF_CRM_1762451508', bitrixData.UF_CRM_1762451508);
      mapped.estado = Array.isArray(converted) ? converted[0] : converted;
    }
    
    // ============= DADOS DO MODELO =============
    // ⚠️ CORRIGIDO: Nome do Modelo vem de UF_CRM_690CA588BDFB7, não de TITLE
    if (bitrixData.UF_CRM_690CA588BDFB7) {
      mapped.nomeModelo = getValue(bitrixData.UF_CRM_690CA588BDFB7);
    }
    
    if (bitrixData.UF_CRM_1762533440587) {
      mapped.dataNascimento = getValue(bitrixData.UF_CRM_1762533440587);
    }
    
    if (bitrixData.UF_CRM_SEXO) {
      mapped.sexo = getValue(bitrixData.UF_CRM_SEXO);
    }
    
    // ⚠️ CORRIGIDO: Altura vem de UF_CRM_6753068A64AB0
    if (bitrixData.UF_CRM_6753068A64AB0) {
      mapped.altura = getValue(bitrixData.UF_CRM_6753068A64AB0);
    }
    
    // ⚠️ CORRIGIDO: Peso vem de UF_CRM_6753068A7DEC9
    if (bitrixData.UF_CRM_6753068A7DEC9) {
      mapped.peso = getValue(bitrixData.UF_CRM_6753068A7DEC9);
    }
    
    // ⚠️ CORRIGIDO: Calçado vem de UF_CRM_6753068A86FE0
    if (bitrixData.UF_CRM_6753068A86FE0) {
      mapped.calcado = getValue(bitrixData.UF_CRM_6753068A86FE0);
    }
    
    // ⚠️ CORRIGIDO: Manequim vem de UF_CRM_6748E0996FC57 (enumeration)
    if (bitrixData.UF_CRM_6748E0996FC57) {
      const converted = convertAndTrack('UF_CRM_6748E0996FC57', bitrixData.UF_CRM_6748E0996FC57);
      mapped.manequim = Array.isArray(converted) ? converted : [converted];
    }
    
    // ============= CARACTERÍSTICAS FÍSICAS =============
    // ⚠️ CORRIGIDO: Cor Cabelo vem de UF_CRM_6753068A765FD
    if (bitrixData.UF_CRM_6753068A765FD) {
      const converted = convertAndTrack('UF_CRM_6753068A765FD', bitrixData.UF_CRM_6753068A765FD);
      mapped.corCabelo = Array.isArray(converted) ? converted[0] : converted;
    }
    
    // ⚠️ CORRIGIDO: Cor Olhos vem de UF_CRM_6753068A5BE7C
    if (bitrixData.UF_CRM_6753068A5BE7C) {
      const converted = convertAndTrack('UF_CRM_6753068A5BE7C', bitrixData.UF_CRM_6753068A5BE7C);
      mapped.corOlhos = Array.isArray(converted) ? converted[0] : converted;
    }
    
    if (bitrixData.UF_CRM_1762283877) {
      const converted = convertAndTrack('UF_CRM_1762283877', bitrixData.UF_CRM_1762283877);
      mapped.corPele = Array.isArray(converted) ? converted[0] : converted;
    }
    
    if (bitrixData.UF_CRM_1733485270151) {
      const converted = convertAndTrack('UF_CRM_1733485270151', bitrixData.UF_CRM_1733485270151);
      mapped.tipoCabelo = Array.isArray(converted) ? converted[0] : converted;
    }
    
    // ============= HABILIDADES E EXPERIÊNCIA =============
    if (bitrixData.UF_CRM_1762282818) {
      const converted = convertAndTrack('UF_CRM_1762282818', bitrixData.UF_CRM_1762282818);
      mapped.tipoModelo = Array.isArray(converted) ? converted : [converted];
    }
    
    if (bitrixData.UF_CRM_1762282626) {
      const converted = convertAndTrack('UF_CRM_1762282626', bitrixData.UF_CRM_1762282626);
      mapped.cursos = Array.isArray(converted) ? converted : [converted];
    }
    
    if (bitrixData.UF_CRM_1762282315) {
      const converted = convertAndTrack('UF_CRM_1762282315', bitrixData.UF_CRM_1762282315);
      mapped.habilidades = Array.isArray(converted) ? converted : [converted];
    }
    
    if (bitrixData.UF_CRM_1762282725) {
      const converted = convertAndTrack('UF_CRM_1762282725', bitrixData.UF_CRM_1762282725);
      mapped.caracteristicasEspeciais = Array.isArray(converted) ? converted : [converted];
    }
    
    // ============= REDES SOCIAIS =============
    if (bitrixData.UF_CRM_INSTAGRAM) {
      mapped.instagramLink = getValue(bitrixData.UF_CRM_INSTAGRAM);
    }
    
    if (bitrixData.UF_CRM_N_DE_SEGUIDORES_INSTAGRAM) {
      mapped.instagramSeguidores = getValue(bitrixData.UF_CRM_N_DE_SEGUIDORES_INSTAGRAM);
    }
    
    if (bitrixData.UF_CRM_FACE) {
      mapped.facebookLink = getValue(bitrixData.UF_CRM_FACE);
    }
    
    if (bitrixData.UF_CRM_FACEBOOK_N_DE_SEGUIDORES) {
      mapped.facebookSeguidores = getValue(bitrixData.UF_CRM_FACEBOOK_N_DE_SEGUIDORES);
    }
    
    if (bitrixData.UF_CRM_YOUTUBE) {
      mapped.youtubeLink = getValue(bitrixData.UF_CRM_YOUTUBE);
    }
    
    if (bitrixData.UF_CRM_YOUTUBE_N_DE_SEGUIDORES) {
      mapped.youtubeSeguidores = getValue(bitrixData.UF_CRM_YOUTUBE_N_DE_SEGUIDORES);
    }
    
    if (bitrixData.UF_CRM_TIKTOK) {
      mapped.tiktokLink = getValue(bitrixData.UF_CRM_TIKTOK);
    }
    
    if (bitrixData.UF_CRM_TIKTOK_N_DE_SEGUIDORES) {
      mapped.tiktokSeguidores = getValue(bitrixData.UF_CRM_TIKTOK_N_DE_SEGUIDORES);
    }
    
    if (bitrixData.UF_CRM_KWAI) {
      mapped.kwaiLink = getValue(bitrixData.UF_CRM_KWAI);
    }
    
    if (bitrixData.UF_CRM_KWAI_N_DE_SEGUIDORES) {
      mapped.kwaiSeguidores = getValue(bitrixData.UF_CRM_KWAI_N_DE_SEGUIDORES);
    }
    
    console.log('✅ Campos encontrados (' + fieldsFound.length + '):', fieldsFound);
    console.log('⚠️ Campos ausentes (' + fieldsMissing.length + '):', fieldsMissing);
    console.log('✅ Dados mapeados:', mapped);
    console.log('🔄 Conversões aplicadas:', conversions);
    
    return mapped;
  };

  const loadExistingData = async (type: 'lead' | 'deal', id: string) => {
    setIsLoadingData(true);
    try {
      console.log(`📡 Iniciando carregamento de ${type} ID ${id}...`);
      
      toast({
        title: 'Carregando dados',
        description: `Buscando ${type === 'lead' ? 'lead' : 'negócio'} do Bitrix...`
      });

      // Call Bitrix edge function to get entity data
      const { data, error } = await supabase.functions.invoke('bitrix-entity-get', {
        body: { entityType: type, entityId: id }
      });

      console.log('📥 Resposta da edge function bitrix-entity-get:', { data, error });

      if (error) {
        console.error('❌ Erro ao invocar edge function:', error);
        throw new Error(`Erro na edge function: ${JSON.stringify(error)}`);
      }

      if (!data?.success) {
        console.error('❌ Edge function retornou falha:', data);
        throw new Error(data?.error || 'Erro desconhecido ao buscar dados do Bitrix');
      }

      console.log('✅ Dados recebidos do Bitrix:', data.data);
      console.log('📋 Estrutura de campos recebida:', data.fields ? Object.keys(data.fields).length + ' campos' : 'Não disponível');

      // Map Bitrix data to form fields with field structure for ID conversion
      const mappedData = mapBitrixDataToForm(data.data, data.fields);
      
      setFormData(prev => ({ ...prev, ...mappedData }));

      setBitrixEntityType(type);
      setBitrixEntityId(id);

      toast({
        title: 'Dados carregados',
        description: `${type === 'lead' ? 'Lead' : 'Negócio'} carregado com sucesso. Você pode atualizar os campos.`
      });
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      
      // Identificar tipo de erro
      const errorMessage = error instanceof Error ? error.message : String(error);
      let userMessage = 'Não foi possível carregar os dados do Bitrix.';
      
      if (errorMessage.includes('FunctionsHttpError') || errorMessage.includes('fetch')) {
        userMessage = 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
      } else if (errorMessage.includes('Bitrix')) {
        userMessage = `Erro ao comunicar com o Bitrix24: ${errorMessage}`;
      }
      
      toast({
        title: 'Erro ao carregar',
        description: userMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Load existing data from URL query parameters or route params
  useEffect(() => {
    // Check URL query parameters first (?lead=123 or ?deal=456)
    const leadId = searchParams.get('lead');
    const dealId = searchParams.get('deal');

    if (leadId) {
      loadExistingData('lead', leadId);
    } else if (dealId) {
      loadExistingData('deal', dealId);
    } else if (entityType && entityId) {
      // Fallback to route parameters
      if (entityType === 'lead' || entityType === 'deal') {
        loadExistingData(entityType as 'lead' | 'deal', entityId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, entityType, entityId]);

  const handleFieldChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateCPF = (cpf: string): boolean => {
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cleanCPF)) return false;
    
    // Validate first digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(9))) return false;
    
    // Validate second digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
  };

  const validateName = (name: string): boolean => {
    // Only letters and spaces
    return /^[A-Za-zÀ-ÿ\s]+$/.test(name);
  };

  const fetchCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      toast({
        title: 'CEP inválido',
        description: 'O CEP deve conter 8 dígitos.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }
      
      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      }));
      
      toast({
        title: 'CEP encontrado',
        description: 'Endereço preenchido automaticamente.'
      });
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível encontrar o endereço.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepBlur = () => {
    if (formData.cep) {
      fetchCEP(formData.cep);
    }
  };

  /**
   * Mapeia dados do formulário para o formato do Bitrix
   */
  const mapFormDataToBitrix = (data: FormData): Record<string, any> => {
    const bitrixPayload: Record<string, any> = {};
    
    // ============= DADOS PESSOAIS =============
    if (data.nomeResponsavel) bitrixPayload.NAME = data.nomeResponsavel;
    if (data.cpf) bitrixPayload.UF_CRM_CPF = data.cpf;
    if (data.telefoneResponsavel) bitrixPayload.UF_CRM_TELEFONE_RESPONSAVEL = data.telefoneResponsavel;
    
    // Estado Civil - converter de volta para ID (se necessário)
    if (data.estadoCivil) {
      bitrixPayload.UF_CRM_1762283540 = data.estadoCivil;
    }
    
    // ============= ENDEREÇO =============
    if (data.cep) bitrixPayload.UF_CRM_1761762176 = data.cep;
    if (data.endereco) bitrixPayload.UF_CRM_1761762201 = data.endereco;
    if (data.numero) bitrixPayload.UF_CRM_1762450966586 = data.numero;
    if (data.complemento) bitrixPayload.UF_CRM_COMPLEMENTO = data.complemento;
    if (data.bairro) bitrixPayload.UF_CRM_1762450985051 = data.bairro;
    if (data.cidade) bitrixPayload.UF_CRM_1762451032936 = data.cidade;
    if (data.estado) bitrixPayload.UF_CRM_1762451508 = data.estado;
    
    // ============= DADOS DO MODELO =============
    if (data.nomeModelo) bitrixPayload.UF_CRM_690CA588BDFB7 = data.nomeModelo;
    if (data.dataNascimento) bitrixPayload.UF_CRM_1762533440587 = data.dataNascimento;
    if (data.sexo) bitrixPayload.UF_CRM_SEXO = data.sexo;
    if (data.altura) bitrixPayload.UF_CRM_6753068A64AB0 = data.altura;
    if (data.peso) bitrixPayload.UF_CRM_6753068A7DEC9 = data.peso;
    if (data.calcado) bitrixPayload.UF_CRM_6753068A86FE0 = data.calcado;
    
    // Manequim - converter para array
    if (data.manequim && data.manequim.length > 0) {
      bitrixPayload.UF_CRM_6748E0996FC57 = data.manequim;
    }
    
    // ============= CARACTERÍSTICAS FÍSICAS =============
    if (data.corCabelo) {
      bitrixPayload.UF_CRM_6753068A765FD = data.corCabelo;
    }
    
    if (data.corOlhos) {
      bitrixPayload.UF_CRM_6753068A5BE7C = data.corOlhos;
    }
    
    if (data.corPele) {
      bitrixPayload.UF_CRM_1762283877 = data.corPele;
    }
    
    if (data.tipoCabelo) {
      bitrixPayload.UF_CRM_1733485270151 = data.tipoCabelo;
    }
    
    // ============= HABILIDADES E EXPERIÊNCIA =============
    if (data.tipoModelo && data.tipoModelo.length > 0) {
      bitrixPayload.UF_CRM_1762282818 = data.tipoModelo;
    }
    
    if (data.cursos && data.cursos.length > 0) {
      bitrixPayload.UF_CRM_1762282626 = data.cursos;
    }
    
    if (data.habilidades && data.habilidades.length > 0) {
      bitrixPayload.UF_CRM_1762282315 = data.habilidades;
    }
    
    if (data.caracteristicasEspeciais && data.caracteristicasEspeciais.length > 0) {
      bitrixPayload.UF_CRM_1762282725 = data.caracteristicasEspeciais;
    }
    
    // ============= REDES SOCIAIS =============
    if (data.instagramLink) bitrixPayload.UF_CRM_INSTAGRAM = data.instagramLink;
    if (data.instagramSeguidores) bitrixPayload.UF_CRM_N_DE_SEGUIDORES_INSTAGRAM = data.instagramSeguidores;
    if (data.facebookLink) bitrixPayload.UF_CRM_FACE = data.facebookLink;
    if (data.facebookSeguidores) bitrixPayload.UF_CRM_FACEBOOK_N_DE_SEGUIDORES = data.facebookSeguidores;
    if (data.youtubeLink) bitrixPayload.UF_CRM_YOUTUBE = data.youtubeLink;
    if (data.youtubeSeguidores) bitrixPayload.UF_CRM_YOUTUBE_N_DE_SEGUIDORES = data.youtubeSeguidores;
    if (data.tiktokLink) bitrixPayload.UF_CRM_TIKTOK = data.tiktokLink;
    if (data.tiktokSeguidores) bitrixPayload.UF_CRM_TIKTOK_N_DE_SEGUIDORES = data.tiktokSeguidores;
    if (data.kwaiLink) bitrixPayload.UF_CRM_KWAI = data.kwaiLink;
    if (data.kwaiSeguidores) bitrixPayload.UF_CRM_KWAI_N_DE_SEGUIDORES = data.kwaiSeguidores;
    
    return bitrixPayload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!validateName(formData.nomeResponsavel)) {
      toast({
        title: 'Nome inválido',
        description: 'O nome do responsável deve conter apenas letras.',
        variant: 'destructive'
      });
      return;
    }
    
    if (formData.cpf && !validateCPF(formData.cpf)) {
      toast({
        title: 'CPF inválido',
        description: 'Por favor, verifique o CPF informado.',
        variant: 'destructive'
      });
      return;
    }
    
    if (formData.nomeModelo && !validateName(formData.nomeModelo)) {
      toast({
        title: 'Nome inválido',
        description: 'O nome do modelo deve conter apenas letras.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for Bitrix integration using the mapping function
      const bitrixData = mapFormDataToBitrix(formData);
      
      console.log('📋 Dados preparados para envio:', {
        entityType: bitrixEntityType,
        entityId: bitrixEntityId,
        fieldsCount: Object.keys(bitrixData).length,
        sampleFields: {
          NAME: bitrixData.NAME,
          TITLE: bitrixData.TITLE,
          nomeResponsavel: bitrixData.UF_CRM_NOME_RESPONSAVEL,
          nomeModelo: bitrixData.UF_CRM_NOME_MODELO
        }
      });
      
      // Check if we're updating an existing Bitrix entity
      if (bitrixEntityType && bitrixEntityId) {
        // UPDATE MODE - Update existing lead or deal in Bitrix (PUBLIC ACCESS)
        console.log(`📤 Atualizando ${bitrixEntityType} ID ${bitrixEntityId} no Bitrix...`);
        
        const { data, error } = await supabase.functions.invoke('bitrix-entity-update', {
          body: {
            entityType: bitrixEntityType,
            entityId: bitrixEntityId,
            fields: bitrixData
          }
        });

        console.log('📥 Resposta da edge function bitrix-entity-update:', { data, error });

        if (error) {
          console.error('❌ Erro ao invocar edge function:', error);
          throw new Error(`Erro na edge function: ${JSON.stringify(error)}`);
        }

        if (!data?.success) {
          console.error('❌ Edge function retornou falha:', data);
          throw new Error(data?.error || 'Erro desconhecido ao atualizar no Bitrix');
        }

        console.log('✅ Atualizado com sucesso no Bitrix:', data);

        toast({
          title: 'Cadastro atualizado',
          description: `${bitrixEntityType === 'lead' ? 'Lead' : 'Negócio'} atualizado com sucesso no Bitrix24.`
        });

      } else {
        // CREATE MODE - Create new entry (public access allowed)
        console.log('📤 Criando novo cadastro no Bitrix...', bitrixData);
        
        // TODO: Implement creation logic with bitrix-entity-create edge function
        // For now, just log the data
        toast({
          title: 'Dados preparados',
          description: 'Criação de novos cadastros será implementada em breve.',
          variant: 'default'
        });

        // Reset form after successful creation
        setFormData(INITIAL_FORM_DATA);
      }
      
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      
      // Identificar tipo de erro e fornecer mensagem específica
      const errorMessage = error instanceof Error ? error.message : String(error);
      let userMessage = 'Não foi possível salvar o cadastro.';
      let errorDetails = '';
      
      if (errorMessage.includes('FunctionsHttpError') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        userMessage = 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
        errorDetails = 'Edge function offline ou problema de rede';
      } else if (errorMessage.includes('autenticado') || errorMessage.includes('não autenticado')) {
        userMessage = 'Você precisa fazer login para atualizar cadastros.';
        errorDetails = 'Autenticação necessária';
      } else if (errorMessage.includes('Bitrix')) {
        userMessage = `Erro ao comunicar com o Bitrix24: ${errorMessage}`;
        errorDetails = 'Erro na API do Bitrix24';
      } else if (errorMessage.includes('uuid')) {
        userMessage = 'Erro de formato de dados. Entre em contato com o suporte.';
        errorDetails = 'Problema com formato UUID';
      } else {
        errorDetails = errorMessage;
      }
      
      console.error('📋 Detalhes do erro:', {
        mensagem: userMessage,
        detalhes: errorDetails,
        tipo: typeof error,
        erro: error
      });
      
      toast({
        title: 'Erro ao salvar',
        description: userMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando cadastro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          {isAuthenticated && (
            <Button
              variant="ghost"
              onClick={() => navigate('/home-choice')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {bitrixEntityId ? `Atualizar ${bitrixEntityType === 'lead' ? 'Lead' : 'Negócio'}` : 'Nova Ficha Cadastral'}
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="text-xs"
            >
              {debugMode ? '🐛 Debug ON' : '🐛 Debug OFF'}
            </Button>
          </div>
          <p className="text-muted-foreground">
            {bitrixEntityId 
              ? `Atualize os campos do ${bitrixEntityType === 'lead' ? 'lead' : 'negócio'} #${bitrixEntityId} no Bitrix24` 
              : 'Preencha os dados para criar um novo cadastro de modelo'}
          </p>
        </div>

        {/* Debug Panel */}
        {debugMode && (
          <div className="bg-muted/50 border-2 border-primary/20 rounded-lg p-6 mb-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🐛</span>
              <h3 className="font-bold text-lg">Modo Debug Ativado</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">Estado da Aplicação</h4>
                <div className="bg-background rounded p-3 space-y-1 text-xs font-mono">
                  <div><span className="text-muted-foreground">Autenticado:</span> {isAuthenticated ? '✅ Sim' : '❌ Não'}</div>
                  <div><span className="text-muted-foreground">Tipo Entidade:</span> {bitrixEntityType || 'N/A'}</div>
                  <div><span className="text-muted-foreground">ID Entidade:</span> {bitrixEntityId || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Carregando:</span> {isLoadingData ? 'Sim' : 'Não'}</div>
                  <div><span className="text-muted-foreground">Enviando:</span> {isSubmitting ? 'Sim' : 'Não'}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">Amostra de Dados</h4>
                <div className="bg-background rounded p-3 space-y-1 text-xs font-mono">
                  <div><span className="text-muted-foreground">Responsável:</span> {formData.nomeResponsavel || '(vazio)'}</div>
                  <div><span className="text-muted-foreground">Modelo:</span> {formData.nomeModelo || '(vazio)'}</div>
                  <div><span className="text-muted-foreground">CPF:</span> {formData.cpf || '(vazio)'}</div>
                  <div><span className="text-muted-foreground">Telefone:</span> {formData.telefoneResponsavel || '(vazio)'}</div>
                  <div><span className="text-muted-foreground">CEP:</span> {formData.cep || '(vazio)'}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-background rounded p-3 text-xs">
              <div className="font-semibold text-sm text-primary mb-2">📋 Informações Importantes</div>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Verifique o console do navegador (F12) para logs detalhados</li>
                <li>Edge functions: bitrix-entity-get (buscar) e bitrix-entity-update (atualizar)</li>
                <li>⚠️ Página pública: qualquer pessoa com o link pode atualizar o cadastro</li>
                <li>Campos obrigatórios: Nome do Responsável e Telefone</li>
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Cadastrais */}
          <FormSection
            title="Dados Cadastrais"
            description="Informações do responsável pelo modelo"
            icon={<User className="w-5 h-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                id="nomeResponsavel"
                label="Nome do Responsável"
                value={formData.nomeResponsavel}
                onChange={(v) => handleFieldChange('nomeResponsavel', v)}
                placeholder="Nome completo"
                required
              />
              <FormField
                id="cpf"
                label="CPF"
                value={formData.cpf}
                onChange={(v) => handleFieldChange('cpf', v)}
                placeholder="000.000.000-00"
              />
              <FormField
                id="estadoCivil"
                label="Estado Civil"
                type="select"
                value={formData.estadoCivil}
                onChange={(v) => handleFieldChange('estadoCivil', v)}
                options={ESTADO_CIVIL_OPTIONS}
              />
              <FormField
                id="telefoneResponsavel"
                label="Telefone"
                type="tel"
                value={formData.telefoneResponsavel}
                onChange={(v) => handleFieldChange('telefoneResponsavel', v)}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </FormSection>

          {/* Endereço */}
          <FormSection
            title="Endereço"
            description="Endereço completo do responsável"
            icon={<MapPin className="w-5 h-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <FormField
                  id="cep"
                  label="CEP"
                  value={formData.cep}
                  onChange={(v) => handleFieldChange('cep', v)}
                  placeholder="00000-000"
                  disabled={isLoadingCep}
                />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleCepBlur}
                  disabled={isLoadingCep || !formData.cep}
                  className="mt-1 px-0"
                >
                  {isLoadingCep ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    'Buscar CEP'
                  )}
                </Button>
              </div>
              <FormField
                id="endereco"
                label="Endereço"
                value={formData.endereco}
                onChange={(v) => handleFieldChange('endereco', v)}
                placeholder="Rua, Avenida, etc."
              />
              <FormField
                id="numero"
                label="Número"
                value={formData.numero}
                onChange={(v) => handleFieldChange('numero', v)}
                placeholder="123"
              />
              <FormField
                id="complemento"
                label="Complemento"
                value={formData.complemento}
                onChange={(v) => handleFieldChange('complemento', v)}
                placeholder="Apto, Bloco, etc."
              />
              <FormField
                id="bairro"
                label="Bairro"
                value={formData.bairro}
                onChange={(v) => handleFieldChange('bairro', v)}
                placeholder="Nome do bairro"
              />
              <FormField
                id="cidade"
                label="Cidade"
                value={formData.cidade}
                onChange={(v) => handleFieldChange('cidade', v)}
                placeholder="Nome da cidade"
              />
              <FormField
                id="estado"
                label="Estado"
                type="select"
                value={formData.estado}
                onChange={(v) => handleFieldChange('estado', v)}
                options={ESTADO_OPTIONS}
              />
            </div>
          </FormSection>

          {/* Dados do Modelo */}
          <FormSection
            title="Dados do Modelo"
            description="Informações pessoais e características físicas"
            icon={<User className="w-5 h-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2 lg:col-span-3">
                <FormField
                  id="nomeModelo"
                  label="Nome do Modelo"
                  value={formData.nomeModelo}
                  onChange={(v) => handleFieldChange('nomeModelo', v)}
                  placeholder="Nome completo do modelo"
                  required
                />
              </div>
              <FormField
                id="dataNascimento"
                label="Data de Nascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={(v) => handleFieldChange('dataNascimento', v)}
              />
              <FormField
                id="sexo"
                label="Sexo"
                type="select"
                value={formData.sexo}
                onChange={(v) => handleFieldChange('sexo', v)}
                options={SEXO_OPTIONS}
                required
              />
              <FormField
                id="altura"
                label="Altura (cm)"
                type="number"
                value={formData.altura}
                onChange={(v) => handleFieldChange('altura', v)}
                placeholder="170"
              />
              <FormField
                id="peso"
                label="Peso (kg)"
                type="number"
                value={formData.peso}
                onChange={(v) => handleFieldChange('peso', v)}
                placeholder="65"
              />
              <FormField
                id="calcado"
                label="Calçado"
                value={formData.calcado}
                onChange={(v) => handleFieldChange('calcado', v)}
                placeholder="35, 36, 37, etc."
              />
              <FormField
                id="corPele"
                label="Cor da Pele"
                type="select"
                value={formData.corPele}
                onChange={(v) => handleFieldChange('corPele', v)}
                options={COR_PELE_OPTIONS}
              />
              <FormField
                id="corCabelo"
                label="Cor do Cabelo"
                type="select"
                value={formData.corCabelo}
                onChange={(v) => handleFieldChange('corCabelo', v)}
                options={COR_CABELO_OPTIONS}
              />
              <FormField
                id="tipoCabelo"
                label="Tipo de Cabelo"
                type="select"
                value={formData.tipoCabelo}
                onChange={(v) => handleFieldChange('tipoCabelo', v)}
                options={TIPO_CABELO_OPTIONS}
              />
              <FormField
                id="corOlhos"
                label="Cor dos Olhos"
                type="select"
                value={formData.corOlhos}
                onChange={(v) => handleFieldChange('corOlhos', v)}
                options={COR_OLHOS_OPTIONS}
              />
            </div>
            
            {/* Manequim as MultiSelect */}
            <div className="mt-4">
              <MultiSelect
                id="manequim"
                label="Manequim"
                value={formData.manequim}
                onChange={(v) => handleFieldChange('manequim', v)}
                options={MANEQUIM_OPTIONS}
                placeholder="Selecione os tamanhos"
              />
            </div>
          </FormSection>

          {/* Redes Sociais */}
          <FormSection
            title="Redes Sociais"
            description="Perfis em redes sociais do modelo"
            icon={<Share2 className="w-5 h-5" />}
          >
            <div className="space-y-4">
              {/* Instagram */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="instagramLink"
                  label="Instagram - Link/Username"
                  value={formData.instagramLink}
                  onChange={(v) => handleFieldChange('instagramLink', v)}
                  placeholder="@usuario ou link completo"
                />
                <FormField
                  id="instagramSeguidores"
                  label="Instagram - Seguidores"
                  type="number"
                  value={formData.instagramSeguidores}
                  onChange={(v) => handleFieldChange('instagramSeguidores', v)}
                  placeholder="Ex: 5000"
                />
              </div>

              {/* Facebook */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="facebookLink"
                  label="Facebook - Link/Username"
                  value={formData.facebookLink}
                  onChange={(v) => handleFieldChange('facebookLink', v)}
                  placeholder="facebook.com/usuario"
                />
                <FormField
                  id="facebookSeguidores"
                  label="Facebook - Seguidores"
                  type="number"
                  value={formData.facebookSeguidores}
                  onChange={(v) => handleFieldChange('facebookSeguidores', v)}
                  placeholder="Ex: 3000"
                />
              </div>

              {/* YouTube */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="youtubeLink"
                  label="YouTube - Link/Username"
                  value={formData.youtubeLink}
                  onChange={(v) => handleFieldChange('youtubeLink', v)}
                  placeholder="youtube.com/@usuario"
                />
                <FormField
                  id="youtubeSeguidores"
                  label="YouTube - Seguidores"
                  type="number"
                  value={formData.youtubeSeguidores}
                  onChange={(v) => handleFieldChange('youtubeSeguidores', v)}
                  placeholder="Ex: 10000"
                />
              </div>

              {/* TikTok */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="tiktokLink"
                  label="TikTok - Link/Username"
                  value={formData.tiktokLink}
                  onChange={(v) => handleFieldChange('tiktokLink', v)}
                  placeholder="@usuario"
                />
                <FormField
                  id="tiktokSeguidores"
                  label="TikTok - Seguidores"
                  type="number"
                  value={formData.tiktokSeguidores}
                  onChange={(v) => handleFieldChange('tiktokSeguidores', v)}
                  placeholder="Ex: 15000"
                />
              </div>

              {/* Kwai */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="kwaiLink"
                  label="Kwai - Link/Username"
                  value={formData.kwaiLink}
                  onChange={(v) => handleFieldChange('kwaiLink', v)}
                  placeholder="@usuario"
                />
                <FormField
                  id="kwaiSeguidores"
                  label="Kwai - Seguidores"
                  type="number"
                  value={formData.kwaiSeguidores}
                  onChange={(v) => handleFieldChange('kwaiSeguidores', v)}
                  placeholder="Ex: 8000"
                />
              </div>
            </div>
          </FormSection>

          {/* Habilidades */}
          <FormSection
            title="Habilidades e Experiência"
            description="Tipo de trabalho, cursos e habilidades do modelo"
            icon={<Sparkles className="w-5 h-5" />}
          >
            <div className="space-y-4">
              <MultiSelect
                id="tipoModelo"
                label="Tipo de Modelo"
                value={formData.tipoModelo}
                onChange={(v) => handleFieldChange('tipoModelo', v)}
                options={TIPO_MODELO_OPTIONS}
                placeholder="Selecione os tipos"
              />
              <MultiSelect
                id="cursos"
                label="Cursos Realizados"
                value={formData.cursos}
                onChange={(v) => handleFieldChange('cursos', v)}
                options={CURSOS_OPTIONS}
                placeholder="Selecione os cursos"
              />
              <MultiSelect
                id="habilidades"
                label="Habilidades"
                value={formData.habilidades}
                onChange={(v) => handleFieldChange('habilidades', v)}
                options={HABILIDADES_OPTIONS}
                placeholder="Selecione as habilidades"
              />
              <MultiSelect
                id="caracteristicasEspeciais"
                label="Características Especiais"
                value={formData.caracteristicasEspeciais}
                onChange={(v) => handleFieldChange('caracteristicasEspeciais', v)}
                options={CARACTERISTICAS_OPTIONS}
                placeholder="Selecione as características"
              />
            </div>
          </FormSection>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData(INITIAL_FORM_DATA)}
              disabled={isSubmitting}
            >
              Limpar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Cadastro
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
