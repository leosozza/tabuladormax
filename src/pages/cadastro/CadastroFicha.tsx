import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function CadastroFicha() {
  const { entityType, entityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const loadExistingData = async (type: string, id: string) => {
    setIsLoadingData(true);
    try {
      // Try to fetch from Bitrix or local storage
      // For now, we'll implement basic loading from supabase
      toast({
        title: 'Carregando dados',
        description: 'Buscando informações do cadastro...'
      });
      
      // Implementation would fetch from bitrix-integration edge function
      // const response = await fetch(`/api/bitrix-integration?entityType=${type}&entityId=${id}`);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados do cadastro.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load existing data if editing
  useEffect(() => {
    if (entityType && entityId) {
      loadExistingData(entityType, entityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

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
   * Mapeia os dados do formulário para os campos do Bitrix24
   * Usa os nomes EXATOS dos campos personalizados do Bitrix (UF_CRM_*)
   * Envia IDs do Bitrix para campos enumeration ao invés de textos
   */
  const mapFormDataToBitrix = (formData: FormData) => {
    return {
      // Dados Cadastrais
      'UF_CRM_NOME_RESPONSAVEL': formData.nomeResponsavel,
      'UF_CRM_CPF': formData.cpf,
      'UF_CRM_1762283540': formData.estadoCivil, // Estado Civil (enumeration)
      'UF_CRM_TELEFONE_RESPONSAVEL': formData.telefoneResponsavel,
      
      // Endereço
      'UF_CRM_CEP': formData.cep,
      'UF_CRM_ENDERECO': formData.endereco,
      'UF_CRM_NUMERO': formData.numero,
      'UF_CRM_COMPLEMENTO': formData.complemento,
      'UF_CRM_BAIRRO': formData.bairro,
      'UF_CRM_CIDADE': formData.cidade,
      'UF_CRM_ESTADO': formData.estado,
      
      // Dados do Modelo
      'UF_CRM_NOME_MODELO': formData.nomeModelo,
      'UF_CRM_DATA_NASCIMENTO': formData.dataNascimento,
      'UF_CRM_SEXO': formData.sexo,
      'UF_CRM_ALTURA': formData.altura,
      'UF_CRM_PESO': formData.peso,
      'UF_CRM_1762283056': formData.manequim, // Manequim (enumeration multiple)
      'UF_CRM_CALCADO': formData.calcado,
      'UF_CRM_1762283650': formData.corCabelo, // Cor do Cabelo (enumeration)
      'UF_CRM_1733485183850': formData.corOlhos, // Cor dos Olhos (enumeration)
      'UF_CRM_1762283877': formData.corPele, // Cor da Pele (enumeration)
      'UF_CRM_1733485270151': formData.tipoCabelo, // Tipo de Cabelo (enumeration)
      
      // Redes Sociais - Links
      'UF_CRM_INSTAGRAM_LINK': formData.instagramLink,
      'UF_CRM_FACEBOOK_LINK': formData.facebookLink,
      'UF_CRM_YOUTUBE_LINK': formData.youtubeLink,
      'UF_CRM_TIKTOK_LINK': formData.tiktokLink,
      'UF_CRM_KWAI_LINK': formData.kwaiLink,
      
      // Redes Sociais - Seguidores
      'UF_CRM_INSTAGRAM_SEGUIDORES': formData.instagramSeguidores,
      'UF_CRM_FACEBOOK_SEGUIDORES': formData.facebookSeguidores,
      'UF_CRM_YOUTUBE_SEGUIDORES': formData.youtubeSeguidores,
      'UF_CRM_TIKTOK_SEGUIDORES': formData.tiktokSeguidores,
      'UF_CRM_KWAI_SEGUIDORES': formData.kwaiSeguidores,
      
      // Habilidades e Características (enumeration multiple - enviar arrays de IDs)
      'UF_CRM_1762282818': formData.tipoModelo, // Tipo de Modelo (enumeration multiple)
      'UF_CRM_1762282626': formData.cursos, // Cursos (enumeration multiple)
      'UF_CRM_1762282315': formData.habilidades, // Habilidades (enumeration multiple)
      'UF_CRM_1762282725': formData.caracteristicasEspeciais // Características (enumeration multiple)
    };
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
      
      // Call Bitrix integration edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }
      
      // TODO: Integrate with Bitrix edge function
      // This is a placeholder implementation
      // In production, this should call the bitrix-integration edge function
      // Example:
      // const response = await supabase.functions.invoke('bitrix-integration', {
      //   body: { action: 'create', entityType: 'deal', data: bitrixData }
      // });
      
      // For now, log the data and show success
      console.log('Form data mapped for Bitrix:', bitrixData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: entityId ? 'Cadastro atualizado' : 'Cadastro criado',
        description: 'Ficha cadastral salva com sucesso.'
      });
      
      // Reset form if creating new
      if (!entityId) {
        setFormData(INITIAL_FORM_DATA);
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o cadastro.',
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
          <Button
            variant="ghost"
            onClick={() => navigate('/home-choice')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {entityId ? 'Atualizar Cadastro' : 'Nova Ficha Cadastral'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Preencha os dados para {entityId ? 'atualizar o' : 'criar um novo'} cadastro de modelo
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
              <FormField
                id="cpf"
                label="CPF"
                value={formData.cpf}
                onChange={(v) => handleFieldChange('cpf', v)}
                placeholder="000.000.000-00"
                required
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
                required
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
                required
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
                required
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
