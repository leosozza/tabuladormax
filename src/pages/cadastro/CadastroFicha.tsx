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
  manequim: string;
  calcado: string;
  corCabelo: string;
  corOlhos: string;
  
  // Redes Sociais
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  kwai: string;
  
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
  manequim: '',
  calcado: '',
  corCabelo: '',
  corOlhos: '',
  instagram: '',
  facebook: '',
  youtube: '',
  tiktok: '',
  kwai: '',
  tipoModelo: [],
  cursos: [],
  habilidades: [],
  caracteristicasEspeciais: []
};

const ESTADO_CIVIL_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' }
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

const TIPO_MODELO_SUGGESTIONS = [
  'Fotográfico',
  'Passarela',
  'Comercial',
  'Editorial',
  'Fitness',
  'Plus Size',
  'Infantil',
  'Teen'
];

const CURSOS_SUGGESTIONS = [
  'Passarela',
  'Fotografia',
  'Expressão Corporal',
  'Teatro',
  'Dança',
  'Etiqueta',
  'Maquiagem',
  'Idiomas'
];

const HABILIDADES_SUGGESTIONS = [
  'Dança',
  'Canto',
  'Teatro',
  'Esportes',
  'Música',
  'Artes Marciais',
  'Idiomas',
  'Fotografia'
];

export default function CadastroFicha() {
  const { entityType, entityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load existing data if editing
  useEffect(() => {
    if (entityType && entityId) {
      loadExistingData(entityType, entityId);
    }
  }, [entityType, entityId]);

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

  const handleFieldChange = (field: keyof FormData, value: any) => {
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
      // Prepare data for Bitrix integration
      const bitrixData = {
        ...formData,
        tipoModelo: formData.tipoModelo.join(', '),
        cursos: formData.cursos.join(', '),
        habilidades: formData.habilidades.join(', '),
        caracteristicasEspeciais: formData.caracteristicasEspeciais.join(', ')
      };
      
      // Call Bitrix integration edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }
      
      // For now, we'll save to a local table
      // In production, this should integrate with the bitrix-integration edge function
      const { error } = await supabase
        .from('fichas_cadastrais')
        .insert([{
          ...bitrixData,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
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
                id="manequim"
                label="Manequim"
                value={formData.manequim}
                onChange={(v) => handleFieldChange('manequim', v)}
                placeholder="P, M, G, etc."
              />
              <FormField
                id="calcado"
                label="Calçado"
                value={formData.calcado}
                onChange={(v) => handleFieldChange('calcado', v)}
                placeholder="35, 36, 37, etc."
              />
              <FormField
                id="corCabelo"
                label="Cor do Cabelo"
                value={formData.corCabelo}
                onChange={(v) => handleFieldChange('corCabelo', v)}
                placeholder="Castanho, Loiro, etc."
              />
              <FormField
                id="corOlhos"
                label="Cor dos Olhos"
                value={formData.corOlhos}
                onChange={(v) => handleFieldChange('corOlhos', v)}
                placeholder="Castanho, Azul, etc."
              />
            </div>
          </FormSection>

          {/* Redes Sociais */}
          <FormSection
            title="Redes Sociais"
            description="Perfis em redes sociais do modelo"
            icon={<Share2 className="w-5 h-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                id="instagram"
                label="Instagram"
                value={formData.instagram}
                onChange={(v) => handleFieldChange('instagram', v)}
                placeholder="@usuario"
              />
              <FormField
                id="facebook"
                label="Facebook"
                value={formData.facebook}
                onChange={(v) => handleFieldChange('facebook', v)}
                placeholder="facebook.com/usuario"
              />
              <FormField
                id="youtube"
                label="YouTube"
                value={formData.youtube}
                onChange={(v) => handleFieldChange('youtube', v)}
                placeholder="youtube.com/@usuario"
              />
              <FormField
                id="tiktok"
                label="TikTok"
                value={formData.tiktok}
                onChange={(v) => handleFieldChange('tiktok', v)}
                placeholder="@usuario"
              />
              <FormField
                id="kwai"
                label="Kwai"
                value={formData.kwai}
                onChange={(v) => handleFieldChange('kwai', v)}
                placeholder="@usuario"
              />
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
                suggestions={TIPO_MODELO_SUGGESTIONS}
                placeholder="Digite e pressione Enter para adicionar"
              />
              <MultiSelect
                id="cursos"
                label="Cursos Realizados"
                value={formData.cursos}
                onChange={(v) => handleFieldChange('cursos', v)}
                suggestions={CURSOS_SUGGESTIONS}
                placeholder="Digite e pressione Enter para adicionar"
              />
              <MultiSelect
                id="habilidades"
                label="Habilidades"
                value={formData.habilidades}
                onChange={(v) => handleFieldChange('habilidades', v)}
                suggestions={HABILIDADES_SUGGESTIONS}
                placeholder="Digite e pressione Enter para adicionar"
              />
              <MultiSelect
                id="caracteristicasEspeciais"
                label="Características Especiais"
                value={formData.caracteristicasEspeciais}
                onChange={(v) => handleFieldChange('caracteristicasEspeciais', v)}
                placeholder="Digite e pressione Enter para adicionar"
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
