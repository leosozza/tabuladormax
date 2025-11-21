import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  FileText,
  Search
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
  
  // Redes Sociais - Seguidores
  instagramSeguidores: string;
  facebookSeguidores: string;
  youtubeSeguidores: string;
  tiktokSeguidores: string;
  
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
  instagramSeguidores: '',
  facebookSeguidores: '',
  youtubeSeguidores: '',
  tiktokSeguidores: '',
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

// ========================================================================
// MAPEAMENTO CORRETO DE CAMPOS DO BITRIX (Baseado no arquivo 55222.txt)
// ========================================================================

// Campos do DEAL (negócio)
const BITRIX_DEAL_FIELD_MAPPING = {
  // Identificação
  nomeModelo: 'UF_CRM_6748E09939008',          // Nome do Modelo (string multi)
  nomeResponsavel: 'UF_CRM_690CA588BDFB7',     // Nome do Responsável (string)
  cpf: 'UF_CRM_1762868654',                    // CPF (string)
  dataNascimento: 'UF_CRM_1762533440587',      // Data de nascimento (date)
  estadoCivil: 'UF_CRM_690CA586298B8',         // Status civil (enum)
  sexo: 'UF_CRM_6748E0996FC57',                // Sexo (enum)
  
  // Endereço
  cep: 'UF_CRM_1761762176',                    // CEP (string)
  endereco: 'UF_CRM_1761762201',               // Logradouro (string)
  numero: 'UF_CRM_1762450966586',              // N° (string)
  complemento: 'UF_CRM_COMPLEMENTO',           // Complemento (string)
  bairro: 'UF_CRM_1762450985051',              // Bairro (string)
  cidade: 'UF_CRM_1762451032936',              // Município (string)
  estado: 'UF_CRM_1762451508',                 // UF (enum)
  
  // Características Físicas
  altura: 'UF_CRM_6753068A7DEC9',              // Altura (em cm) (integer)
  peso: 'UF_CRM_6753068A86FE0',                // Peso (em kg) (double)
  calcado: 'UF_CRM_6753068A765FD',             // Tamanho do Sapato (double)
  manequim: 'UF_CRM_690CA586192FB',            // Manequim (multi-enum)
  tipoCabelo: 'UF_CRM_6753068A64AB0',          // Tipo de Cabelo (enum)
  corCabelo: 'UF_CRM_DEAL_1750166749133',      // Cor do Cabelo (enum)
  corOlhos: 'UF_CRM_6753068A5BE7C',            // Cor dos Olhos (enum)
  corPele: 'UF_CRM_690CA5863827D',             // Cor da pele (enum)
  
  // Habilidades (multi-select)
  habilidades: 'UF_CRM_690CA585CADA1',         // Habilidades (multi-enum)
  cursos: 'UF_CRM_690CA585DA123',              // Cursos (multi-enum)
  caracteristicasEspeciais: 'UF_CRM_690CA585EAFC3', // Características (multi-enum)
  tipoModelo: 'UF_CRM_690CA58606670',          // Tipo de modelo (multi-enum)
  
  // Redes Sociais (se existirem no deal)
  instagramLink: 'UF_CRM_1762866652',
  instagramSeguidores: 'UF_CRM_1762866813',
  facebookLink: 'UF_CRM_1762867010',
  facebookSeguidores: 'UF_CRM_1762867259',
  youtubeLink: 'UF_CRM_1762867875',
  youtubeSeguidores: 'UF_CRM_1762868205',
  tiktokLink: 'UF_CRM_1762868543',
  tiktokSeguidores: 'UF_CRM_1762872886'
} as const;

// Campos do CONTATO (contact)
const BITRIX_CONTACT_FIELD_MAPPING = {
  telefoneResponsavel: 'PHONE'                 // Telefone (array de objetos com VALUE)
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
  const [bitrixDealFields, setBitrixDealFields] = useState<Record<string, any> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
  // Estados para busca rápida
  const [searchType, setSearchType] = useState<'lead' | 'deal'>('deal');
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Array<{type: 'lead' | 'deal', id: string}>>([]);
  
  // Estados para validação de campos
  const [fieldErrors, setFieldErrors] = useState<{
    cpf?: string;
  }>({});
  
  // Estado para opções dinâmicas dos selects baseadas nos dealFields do Bitrix
  const [dynamicOptions, setDynamicOptions] = useState<{
    corPele: Array<{ value: string; label: string }>;
    corCabelo: Array<{ value: string; label: string }>;
    tipoCabelo: Array<{ value: string; label: string }>;
    corOlhos: Array<{ value: string; label: string }>;
    manequim: Array<{ value: string; label: string }>;
    estadoCivil: Array<{ value: string; label: string }>;
    estado: Array<{ value: string; label: string }>;
    sexo: Array<{ value: string; label: string }>;
    habilidades: Array<{ value: string; label: string }>;
    cursos: Array<{ value: string; label: string }>;
    caracteristicasEspeciais: Array<{ value: string; label: string }>;
    tipoModelo: Array<{ value: string; label: string }>;
  }>({
    corPele: [],
    corCabelo: [],
    tipoCabelo: [],
    corOlhos: [],
    manequim: [],
    estadoCivil: [],
    estado: [],
    sexo: [],
    habilidades: [],
    cursos: [],
    caracteristicasEspeciais: [],
    tipoModelo: []
  });

  /**
   * Valida CPF usando algoritmo brasileiro oficial
   */
  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
  };

  /**
   * Formata CPF com máscara XXX.XXX.XXX-XX
   */
  const formatCPF = (value: string): string => {
    const cleaned = value.replace(/[^\d]/g, '');
    const limited = cleaned.substring(0, 11);
    
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };


  /**
    * ✅ CORREÇÃO: Mantém IDs do Bitrix ao carregar (não converte para VALUE)
    * Os selects vão exibir o label correto baseado no ID usando dynamicOptions
    */
   const normalizeEnumerationValue = (value: unknown): string | string[] => {
    // Apenas normaliza para string/array de strings, mantendo os IDs originais
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    return String(value || '');
  };

  /**
   * Mapeia dados do Bitrix (Deal + Contact) para o formato do formulário
   */
  const mapBitrixDataToForm = (
    dealData: Record<string, unknown>,
    contactData: Record<string, unknown> | null,
    dealFields?: Record<string, any>,
    contactFields?: Record<string, any>
  ): Partial<FormData> => {
    const mapped: Partial<FormData> = {};
    const conversions: Record<string, any> = {};
    
    // Helper para obter valor simples
    const getValue = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value[0] || '';
      return String(value);
    };
    
    // ============= MAPEAR CAMPOS DO DEAL =============
    Object.entries(BITRIX_DEAL_FIELD_MAPPING).forEach(([formField, bitrixField]) => {
      const value = dealData[bitrixField];
      if (value === undefined || value === null || value === '') return;
      
      // ✅ Mantém o ID original do Bitrix (não converte para VALUE)
      const normalized = normalizeEnumerationValue(value);
      
      // Debug para campos específicos
      if (['estadoCivil', 'sexo', 'habilidades', 'cursos', 'tipoModelo', 'corCabelo', 'tipoCabelo', 'corOlhos'].includes(formField)) {
        console.log(`🔍 ${formField}:`, {
          bitrixField,
          bitrixValue: value,
          normalized: normalized,
          isArray: Array.isArray(normalized)
        });
      }
      
      // Para arrays de 1 elemento, pegar só o primeiro (exceto multi-selects)
      if (Array.isArray(normalized)) {
        if (['habilidades', 'cursos', 'caracteristicasEspeciais', 'tipoModelo', 'manequim'].includes(formField)) {
          mapped[formField as keyof FormData] = normalized as any;
        } else {
          mapped[formField as keyof FormData] = normalized[0] as any;
        }
      } else {
        mapped[formField as keyof FormData] = normalized as any;
      }
      
      conversions[formField] = {
        bitrixField,
        originalValue: value,
        normalizedValue: normalized
      };
    });
    
    // ============= MAPEAR CAMPOS DO CONTATO =============
    if (contactData) {
      // Telefone - extrair do array PHONE
      if (contactData.PHONE) {
        const phone = Array.isArray(contactData.PHONE) 
          ? contactData.PHONE[0]?.VALUE 
          : contactData.PHONE;
        mapped.telefoneResponsavel = String(phone || '');
        conversions.telefoneResponsavel = { source: 'contact', value: phone };
      }
    }
    
    // ============= FORMATAR CPF AO CARREGAR =============
    if (mapped.cpf) {
      mapped.cpf = formatCPF(getValue(mapped.cpf));
      console.log('✅ CPF carregado do deal:', {
        formatted: mapped.cpf
      });
    }
    
    // ============= FORMATAR LINKS SOCIAIS AO CARREGAR =============
    if (typeof mapped.tiktokLink === 'string' && mapped.tiktokLink.includes('tiktok.com/')) {
      const match = mapped.tiktokLink.match(/tiktok\.com\/@?([^/?]+)/);
      mapped.tiktokLink = match ? match[1] : mapped.tiktokLink;
    }

    if (typeof mapped.instagramLink === 'string' && mapped.instagramLink.includes('instagram.com/')) {
      const match = mapped.instagramLink.match(/instagram\.com\/([^/?]+)/);
      mapped.instagramLink = match ? match[1] : mapped.instagramLink;
    }

    if (typeof mapped.facebookLink === 'string' && mapped.facebookLink.includes('facebook.com/')) {
      const match = mapped.facebookLink.match(/facebook\.com\/([^/?]+)/);
      mapped.facebookLink = match ? match[1] : mapped.facebookLink;
    }

    if (typeof mapped.youtubeLink === 'string' && mapped.youtubeLink.includes('youtube.com/')) {
      const match = mapped.youtubeLink.match(/youtube\.com\/@?([^/?]+)/);
      mapped.youtubeLink = match ? match[1] : mapped.youtubeLink;
    }
    
    return mapped;
  };

  const loadExistingData = async (type: 'lead' | 'deal', id: string) => {
    setIsLoadingData(true);
    setHasLoadedInitialData(true); // Marcar que já tentou carregar
    
    try {
      toast({
        title: 'Carregando dados',
        description: `Buscando ${type === 'lead' ? 'lead' : 'negócio'} #${id} do Bitrix...`
      });

      // Call Bitrix edge function to get entity data
      const { data, error } = await supabase.functions.invoke('bitrix-entity-get', {
        body: { entityType: type, entityId: id }
      });

      if (error) {
        // Diferenciar erro de rede vs erro da API
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          throw new Error('Erro de conexão com o servidor. Verifique sua internet.');
        }
        throw new Error(`Erro ao buscar dados: ${error.message || JSON.stringify(error)}`);
      }

      if (!data?.success) {
        // Mostrar mensagem específica do Bitrix
        const errorMsg = data?.error || 'Erro desconhecido';
        
        if (errorMsg.includes('Not found') || errorMsg.includes('404')) {
          throw new Error(`${type === 'lead' ? 'Lead' : 'Deal'} #${id} não encontrado no Bitrix. Verifique se o ID está correto.`);
        }
        
        if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          throw new Error(`Sem permissão para acessar ${type === 'lead' ? 'lead' : 'deal'} #${id}`);
        }
        
        throw new Error(errorMsg);
      }

      console.log('📦 Dados recebidos do Bitrix:', {
        dealDataKeys: Object.keys(data.dealData || {}),
        contactDataKeys: Object.keys(data.contactData || {}),
        dealFieldsKeys: Object.keys(data.dealFields || {}),
        
        // ✅ Verificar campos específicos RAW do Bitrix
        cpfFromDeal: data.dealData?.UF_CRM_1762868654,
        estadoCivilRaw: data.dealData?.UF_CRM_690CA586298B8,
        estadoRaw: data.dealData?.UF_CRM_1762451508,
        sexoRaw: data.dealData?.UF_CRM_6748E0996FC57,
        corCabeloRaw: data.dealData?.UF_CRM_DEAL_1750166749133,
        tipoCabeloRaw: data.dealData?.UF_CRM_6753068A64AB0,
        corOlhosRaw: data.dealData?.UF_CRM_6753068A5BE7C,
        
        // ✅ Verificar opções de enumeração disponíveis
        estadoCivilOptions: data.dealFields?.['UF_CRM_690CA586298B8']?.items?.length || 0,
        estadoOptions: data.dealFields?.['UF_CRM_1762451508']?.items?.length || 0,
        corCabeloOptions: data.dealFields?.['UF_CRM_DEAL_1750166749133']?.items?.length || 0,
        
        // ✅ Ver exemplo de item de estadoCivil
        estadoCivilFirstOption: data.dealFields?.['UF_CRM_690CA586298B8']?.items?.[0]
      });

      // Map Bitrix data to form fields
      const mappedData = mapBitrixDataToForm(
        data.dealData,
        data.contactData,
        data.dealFields,
        data.contactFields
      );
      
      console.log('📝 Dados mapeados para o formulário:', {
        cpf: mappedData.cpf,
        estadoCivil: mappedData.estadoCivil,
        estado: mappedData.estado,
        sexo: mappedData.sexo,
        corCabelo: mappedData.corCabelo,
        tipoCabelo: mappedData.tipoCabelo,
        corOlhos: mappedData.corOlhos,
        totalFieldsMapped: Object.keys(mappedData).length
      });
      
      setFormData(prev => ({ ...prev, ...mappedData }));

      setBitrixEntityType(type);
      setBitrixEntityId(id);
      setBitrixDealFields(data.dealFields); // Armazenar dealFields para conversão no envio
      
      // Extrair opções dinâmicas dos campos de enumeração
      if (data.dealFields) {
        const newOptions = {
          corPele: data.dealFields['UF_CRM_690CA5863827D']?.items?.map((item: any) => ({
            value: item.ID, // ID do Bitrix
            label: item.VALUE // Texto legível
          })) || [],
          corCabelo: data.dealFields['UF_CRM_DEAL_1750166749133']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          tipoCabelo: data.dealFields['UF_CRM_6753068A64AB0']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          corOlhos: data.dealFields['UF_CRM_6753068A5BE7C']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          manequim: data.dealFields['UF_CRM_690CA586192FB']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          estadoCivil: data.dealFields['UF_CRM_690CA586298B8']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          estado: data.dealFields['UF_CRM_1762451508']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          sexo: data.dealFields['UF_CRM_6748E0996FC57']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          habilidades: data.dealFields['UF_CRM_690CA585CADA1']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          cursos: data.dealFields['UF_CRM_690CA585DA123']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          caracteristicasEspeciais: data.dealFields['UF_CRM_690CA585EAFC3']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || [],
          tipoModelo: data.dealFields['UF_CRM_690CA58606670']?.items?.map((item: any) => ({
            value: item.ID,
            label: item.VALUE
          })) || []
        };

        console.log('🎨 Opções dinâmicas extraídas:', newOptions);
        setDynamicOptions(newOptions);
      }

      toast({
        title: 'Dados carregados',
        description: `${type === 'lead' ? 'Lead' : 'Negócio'} carregado com sucesso. Você pode atualizar os campos.`
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados existentes:', error);
      
      // Toast mais descritivo
      toast({
        title: `Erro ao carregar ${type === 'lead' ? 'lead' : 'deal'} #${id}`,
        description: error instanceof Error ? error.message : 'Erro desconhecido ao buscar dados',
        variant: 'destructive',
        duration: 6000 // Aumentar duração para o usuário ler
      });
      
      // Colapsar campo de busca após erro
      setIsSearchExpanded(false);
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

  // Load existing data from route parameters OR query params
  useEffect(() => {
    // Evitar re-carregar se já carregou
    if (hasLoadedInitialData) return;
    
    // Prioridade 1: Route params (/cadastro/atualizar/:entityType/:entityId)
    if (entityType && entityId) {
      if (entityType === 'lead' || entityType === 'deal') {
        console.log('📍 Carregando via route params:', { entityType, entityId });
        loadExistingData(entityType as 'lead' | 'deal', entityId);
      }
      return;
    }
    
    // Prioridade 2: Query params (/cadastro?deal=ID ou /cadastro?lead=ID)
    const dealIdFromQuery = searchParams.get('deal');
    const leadIdFromQuery = searchParams.get('lead');
    
    if (dealIdFromQuery && /^\d+$/.test(dealIdFromQuery)) {
      console.log('📍 Carregando via query param deal:', dealIdFromQuery);
      loadExistingData('deal', dealIdFromQuery);
    } else if (leadIdFromQuery && /^\d+$/.test(leadIdFromQuery)) {
      console.log('📍 Carregando via query param lead:', leadIdFromQuery);
      loadExistingData('lead', leadIdFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, searchParams]);

  // Funções de busca rápida
  const handleQuickSearch = async () => {
    if (!searchId.trim()) {
      toast({
        title: 'ID necessário',
        description: 'Digite o ID do deal ou lead para buscar',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);
    
    try {
      await loadExistingData(searchType, searchId);
      
      // Adicionar ao histórico de buscas
      setRecentSearches(prev => {
        const filtered = prev.filter(s => !(s.type === searchType && s.id === searchId));
        return [{ type: searchType, id: searchId }, ...filtered].slice(0, 5);
      });
      
      // Limpar campo de busca após sucesso
      setSearchId('');
      
    } catch (error) {
      console.error('Erro na busca rápida:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickSearch();
    }
  };

  const handleSearchIdChange = (value: string) => {
    // Permitir apenas números
    const numericValue = value.replace(/\D/g, '');
    setSearchId(numericValue);
  };

  const handleFieldChange = (field: keyof FormData, value: string | string[]) => {
    if (field === 'cpf' && typeof value === 'string') {
      const formatted = formatCPF(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
      
      // Validar CPF quando completo (11 dígitos)
      const cleaned = formatted.replace(/[^\d]/g, '');
      
      if (cleaned.length === 11) {
        if (validateCPF(cleaned)) {
          setFieldErrors(prev => ({ ...prev, cpf: undefined }));
        } else {
          setFieldErrors(prev => ({ ...prev, cpf: 'CPF inválido' }));
        }
      } else {
        setFieldErrors(prev => ({ ...prev, cpf: undefined }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
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
   * Converte valores legíveis de volta para IDs do Bitrix (para envio)
   */
  const convertValueToId = (
    fieldId: string,
    value: unknown,
    fields: Record<string, any>
  ): unknown => {
    if (!fields || !fields[fieldId]) return value;
    
    const field = fields[fieldId];
    if (field.type !== 'enumeration' || !field.items) return value;
    
    // Multi-select
    if (Array.isArray(value)) {
      return value.map(val => {
        const item = field.items.find((i: any) => i.VALUE === val);
        return item ? item.ID : val;
      });
    }
    
    // Single-select
    const item = field.items.find((i: any) => i.VALUE === value);
    return item ? item.ID : value;
  };

  /**
    * Formata links de redes sociais
    */
   const formatSocialMediaLink = (platform: string, value: string): string => {
    if (!value) return '';
    
    // Se já é um link completo, retornar como está
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    
    // Remover @ se existir
    const username = value.replace('@', '').trim();
    
    // Formatar conforme plataforma
    const platforms: Record<string, string> = {
      instagram: `instagram.com/${username}`,
      facebook: `facebook.com/${username}`,
      youtube: `youtube.com/@${username}`,
      tiktok: `tiktok.com/@${username}`
    };
    
    return platforms[platform] || value;
  };

  /**
    * Mapeia dados do formulário para o formato do Bitrix
    * Nota: Idealmente deveria receber dealFields para converter VALUES -> IDs
    * Por enquanto, envia os valores diretos
    */
   const mapFormDataToBitrix = (data: FormData, dealFields?: Record<string, any>): Record<string, any> => {
    const bitrixPayload: Record<string, any> = {};
    
    // Mapear campos do DEAL usando BITRIX_DEAL_FIELD_MAPPING
    Object.entries(BITRIX_DEAL_FIELD_MAPPING).forEach(([formField, bitrixField]) => {
      let value = data[formField as keyof FormData];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return;
      
      // ✅ Formatar links de redes sociais
      if (formField === 'instagramLink') value = formatSocialMediaLink('instagram', String(value));
      if (formField === 'facebookLink') value = formatSocialMediaLink('facebook', String(value));
      if (formField === 'youtubeLink') value = formatSocialMediaLink('youtube', String(value));
      if (formField === 'tiktokLink') value = formatSocialMediaLink('tiktok', String(value));
      
      // Converter valores de enumeração de volta para IDs (se dealFields disponível)
      if (dealFields) {
        bitrixPayload[bitrixField] = convertValueToId(bitrixField, value, dealFields);
      } else {
        bitrixPayload[bitrixField] = value;
      }
    });
    
    // Nota: Campos de contato (telefone) não podem ser atualizados via deal
    // Eles devem ser atualizados diretamente no contato via crm.contact.update
    // CPF agora é salvo como campo do deal (UF_CRM_1762868654)
    
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
      // Verificar se estamos em modo de atualização sem dealFields
      if (bitrixEntityType && bitrixEntityId && !bitrixDealFields) {
        toast({
          title: 'Dados não carregados',
          description: 'Os dados do negócio ainda não foram carregados completamente. Aguarde alguns segundos e tente novamente.',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Prepare data for Bitrix integration using the mapping function
      const bitrixData = mapFormDataToBitrix(formData, bitrixDealFields || undefined);
      
      // Check if we're updating an existing Bitrix entity
      if (bitrixEntityType && bitrixEntityId) {
        // UPDATE MODE - Update existing lead or deal in Bitrix (PUBLIC ACCESS)
        
        console.log('🔍 Buscando categoria atual do deal...');
        
        // Buscar deal atual do Bitrix para descobrir a categoria
        const { data: entityData, error: entityError } = await supabase.functions.invoke('bitrix-entity-get', {
          body: {
            entityType: bitrixEntityType,
            entityId: bitrixEntityId
          }
        });
        
        if (entityError) {
          console.error('⚠️ Erro ao buscar entidade do Bitrix:', entityError);
        }
        
        // Construir STAGE_ID dinamicamente baseado na categoria do deal
        let targetStageId = 'C1:UC_O2KDK6'; // Default para categoria C1
        
        if (entityData?.entityData?.CATEGORY_ID) {
          const dealCategory = entityData.entityData.CATEGORY_ID;
          targetStageId = `${dealCategory}:UC_O2KDK6`;
          
          console.log('📁 Deal está na categoria:', dealCategory);
          console.log('📁 STAGE_ID atual:', entityData.entityData.STAGE_ID);
          console.log('🎯 STAGE_ID a ser usado:', targetStageId);
        } else {
          console.warn('⚠️ Categoria do deal não encontrada, usando padrão C1:UC_O2KDK6');
        }
        
        const { data, error } = await supabase.functions.invoke('bitrix-entity-update', {
          body: {
            entityType: bitrixEntityType,
            entityId: bitrixEntityId,
            fields: {
              ...bitrixData,
              STAGE_ID: targetStageId  // 🎯 Nova etapa construída dinamicamente
            },
            contactFields: {  // ✅ Adicionar campos de contato (apenas telefone)
              telefone: formData.telefoneResponsavel
            }
          }
        });

        if (error) {
          throw new Error(`Erro na edge function: ${JSON.stringify(error)}`);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Erro desconhecido ao atualizar no Bitrix');
        }

        navigate('/cadastro/sucesso');

      } else {
        // CREATE MODE - Create new entry (public access allowed)
        
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
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-4 md:py-8 px-3 md:px-4 pb-24">
        {/* Header */}
        <div className="mb-8">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-start justify-between mb-2 gap-4">
            {/* Lado Esquerdo - Título */}
            <div className="flex items-center gap-3 flex-1">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {bitrixEntityId ? 'Atualizar ficha do modelo' : 'Nova Ficha Cadastral'}
                </h1>
                {bitrixEntityId && bitrixEntityType && (
                  <Badge variant="secondary" className="text-sm mt-1">
                    {bitrixEntityType === 'deal' ? 'Negócio' : 'Lead'} #{bitrixEntityId}
                  </Badge>
                )}
              </div>
            </div>

            {/* Lado Direito - Busca Rápida Retrátil */}
            {isAuthenticated && (
              <div className={`transition-all duration-300 ease-in-out ${isSearchExpanded ? 'min-w-[420px]' : 'w-auto'}`}>
                {!isSearchExpanded ? (
                  /* Botão Retraído - Apenas Lupa */
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSearchExpanded(true)}
                    className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Search className="w-5 h-5 text-primary" />
                  </Button>
                ) : (
                  /* Campo Expandido */
                  <Card className="p-3 border-2 border-primary/20 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSearchExpanded(false)}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <Search className="w-5 h-5 text-muted-foreground" />
                      </Button>
                      
                      {/* Seletor de Tipo */}
                      <Select value={searchType} onValueChange={(v) => setSearchType(v as 'lead' | 'deal')}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deal">Deal</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Input do ID */}
                      <Input
                        type="text"
                        placeholder="Digite o ID..."
                        value={searchId}
                        onChange={(e) => handleSearchIdChange(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="flex-1"
                        disabled={isSearching}
                        autoFocus
                      />

                      {/* Botão de Buscar */}
                      <Button
                        type="button"
                        onClick={handleQuickSearch}
                        disabled={isSearching || !searchId.trim()}
                        size="sm"
                        className="gap-2 flex-shrink-0"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Buscando...
                          </>
                        ) : (
                          'Buscar'
                        )}
                      </Button>
                    </div>
                    
                    {/* Histórico de Buscas Recentes */}
                    {recentSearches.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1 flex-wrap">
                        <span>Recentes:</span>
                        {recentSearches.map((search, idx) => (
                          <Button
                            key={idx}
                            variant="link"
                            size="sm"
                            className="h-auto p-1 text-xs"
                            onClick={() => {
                              setSearchType(search.type);
                              setSearchId(search.id);
                            }}
                          >
                            {search.type} #{search.id}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Mobile Layout */}
          <div className="flex md:hidden flex-col gap-4 mb-2">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {bitrixEntityId ? 'Atualizar Cadastro' : 'Novo Cadastro'}
                </h1>
                {bitrixEntityId && bitrixEntityType && (
                  <Badge variant="secondary" className="text-sm mt-1">
                    {bitrixEntityType === 'deal' ? 'Negócio' : 'Lead'} #{bitrixEntityId}
                  </Badge>
                )}
              </div>
            </div>
            
            {isAuthenticated && (
              <div className="w-full">
                {!isSearchExpanded ? (
                  /* Botão Retraído Mobile - Apenas Lupa */
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSearchExpanded(true)}
                    className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 mx-auto block"
                  >
                    <Search className="w-5 h-5 text-primary" />
                  </Button>
                ) : (
                  /* Campo Expandido Mobile */
                  <Card className="p-2 border-2 border-primary/20 animate-in fade-in duration-300">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsSearchExpanded(false)}
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <Search className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Select value={searchType} onValueChange={(v) => setSearchType(v as 'lead' | 'deal')}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deal">Deal</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="text"
                          placeholder="ID..."
                          value={searchId}
                          onChange={(e) => handleSearchIdChange(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          className="flex-1"
                          disabled={isSearching}
                          autoFocus
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleQuickSearch}
                        disabled={isSearching || !searchId.trim()}
                        size="sm"
                        className="w-full gap-2"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Buscando...
                          </>
                        ) : (
                          'Buscar'
                        )}
                      </Button>
                    </div>
                    
                    {recentSearches.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1 flex-wrap">
                        <span>Recentes:</span>
                        {recentSearches.map((search, idx) => (
                          <Button
                            key={idx}
                            variant="link"
                            size="sm"
                            className="h-auto p-1 text-xs"
                            onClick={() => {
                              setSearchType(search.type);
                              setSearchId(search.id);
                            }}
                          >
                            {search.type} #{search.id}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Descrição */}
          <p className="text-muted-foreground">
            {bitrixEntityId 
              ? 'Atualize os dados do cadastro abaixo'
              : 'Preencha os dados para criar um novo cadastro de modelo'}
          </p>
        </div>


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
              <div className="space-y-1">
                <FormField
                  id="cpf"
                  label="CPF"
                  value={formData.cpf}
                  onChange={(v) => handleFieldChange('cpf', v)}
                  placeholder="000.000.000-00"
                />
                {fieldErrors.cpf && (
                  <p className="text-sm text-destructive">{fieldErrors.cpf}</p>
                )}
              </div>
              <FormField
                id="estadoCivil"
                label="Status Civil"
                type="select"
                value={formData.estadoCivil}
                onChange={(v) => handleFieldChange('estadoCivil', v)}
                options={dynamicOptions.estadoCivil.length > 0 ? dynamicOptions.estadoCivil : ESTADO_CIVIL_OPTIONS}
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
                options={dynamicOptions.estado.length > 0 ? dynamicOptions.estado : ESTADO_OPTIONS}
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
                options={dynamicOptions.sexo.length > 0 ? dynamicOptions.sexo : SEXO_OPTIONS}
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
                options={dynamicOptions.corPele.length > 0 ? dynamicOptions.corPele : COR_PELE_OPTIONS}
              />
              <FormField
                id="corCabelo"
                label="Cor do Cabelo"
                type="select"
                value={formData.corCabelo}
                onChange={(v) => handleFieldChange('corCabelo', v)}
                options={dynamicOptions.corCabelo.length > 0 ? dynamicOptions.corCabelo : COR_CABELO_OPTIONS}
              />
              <FormField
                id="tipoCabelo"
                label="Tipo de Cabelo"
                type="select"
                value={formData.tipoCabelo}
                onChange={(v) => handleFieldChange('tipoCabelo', v)}
                options={dynamicOptions.tipoCabelo.length > 0 ? dynamicOptions.tipoCabelo : TIPO_CABELO_OPTIONS}
              />
              <FormField
                id="corOlhos"
                label="Cor dos Olhos"
                type="select"
                value={formData.corOlhos}
                onChange={(v) => handleFieldChange('corOlhos', v)}
                options={dynamicOptions.corOlhos.length > 0 ? dynamicOptions.corOlhos : COR_OLHOS_OPTIONS}
              />
            </div>
            
            {/* Manequim as MultiSelect */}
            <div className="mt-4">
              <MultiSelect
                id="manequim"
                label="Manequim"
                value={formData.manequim}
                onChange={(v) => handleFieldChange('manequim', v)}
                options={dynamicOptions.manequim.length > 0 ? dynamicOptions.manequim : MANEQUIM_OPTIONS}
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
                options={dynamicOptions.tipoModelo.length > 0 ? dynamicOptions.tipoModelo : TIPO_MODELO_OPTIONS}
                placeholder="Selecione os tipos"
              />
              <MultiSelect
                id="cursos"
                label="Cursos Realizados"
                value={formData.cursos}
                onChange={(v) => handleFieldChange('cursos', v)}
                options={dynamicOptions.cursos.length > 0 ? dynamicOptions.cursos : CURSOS_OPTIONS}
                placeholder="Selecione os cursos"
              />
              <MultiSelect
                id="habilidades"
                label="Habilidades"
                value={formData.habilidades}
                onChange={(v) => handleFieldChange('habilidades', v)}
                options={dynamicOptions.habilidades.length > 0 ? dynamicOptions.habilidades : HABILIDADES_OPTIONS}
                placeholder="Selecione as habilidades"
              />
              <MultiSelect
                id="caracteristicasEspeciais"
                label="Características Especiais"
                value={formData.caracteristicasEspeciais}
                onChange={(v) => handleFieldChange('caracteristicasEspeciais', v)}
                options={dynamicOptions.caracteristicasEspeciais.length > 0 ? dynamicOptions.caracteristicasEspeciais : CARACTERISTICAS_OPTIONS}
                placeholder="Selecione as características"
              />
            </div>
          </FormSection>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 -mx-4 px-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData(INITIAL_FORM_DATA)}
              disabled={isSubmitting}
              className="h-12 text-base w-full sm:w-auto"
            >
              Limpar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="h-12 text-base w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
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
