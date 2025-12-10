import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Ruler, Palette, Instagram, 
  Calendar, MapPin, Phone, Sparkles, ImageIcon, Heart, Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ========================================================================
// MAPEAMENTO DE CAMPOS DO BITRIX LEAD (igual ao PreCadastro)
// ========================================================================
const BITRIX_LEAD_FIELD_MAPPING = {
  nomeModelo: 'UF_CRM_LEAD_1732627097745',
  dataNascimento: 'BIRTHDATE',
  estadoCivil: 'UF_CRM_1762283540',
  cidade: 'ADDRESS_CITY',
  estado: 'ADDRESS_PROVINCE',
  altura: 'UF_CRM_1733485575',
  peso: 'UF_CRM_1733485977896',
  manequim: 'UF_CRM_1762283056',
  tamanhoSapato: 'UF_CRM_1733485454702',
  corPele: 'UF_CRM_1762283877',
  corCabelo: 'UF_CRM_1762283650',
  corOlhos: 'UF_CRM_1733485183850',
  tipoCabelo: 'UF_CRM_1733485270151',
  habilidades: 'UF_CRM_1762282315',
  cursos: 'UF_CRM_1762282626',
  caracteristicas: 'UF_CRM_1762282725',
  tipoModelo: 'UF_CRM_1762282818',
  sexo: 'sexo_local',
  instagram: 'instagram_local',
  tiktok: 'tiktok_local',
  nomeResponsavel: 'UF_CRM_1744900570916'
} as const;

// ========================================================================
// OPÇÕES COM IDs DO BITRIX (igual ao PreCadastro)
// ========================================================================
const ESTADO_CIVIL_OPTIONS = [
  { value: '9418', label: 'Casado(a)' },
  { value: '9420', label: 'Divorciado(a)' },
  { value: '9422', label: 'Solteiro(a)' },
  { value: '9424', label: 'Viúvo(a)' }
];

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' }
];

const COR_PELE_OPTIONS = [
  { value: '9446', label: 'Branca' },
  { value: '9448', label: 'Negra' },
  { value: '9450', label: 'Oriental' },
  { value: '9452', label: 'Parda' }
];

const COR_CABELO_OPTIONS = [
  { value: '9440', label: 'Loiro' },
  { value: '10298', label: 'Castanho Claro' },
  { value: '10300', label: 'Castanho Médio' },
  { value: '10302', label: 'Castanho Escuro' },
  { value: '9442', label: 'Preto' },
  { value: '10304', label: 'Ruivo' }
];

const COR_OLHOS_OPTIONS = [
  { value: '434', label: 'Azul' },
  { value: '438', label: 'Castanho' },
  { value: '440', label: 'Cinza' },
  { value: '442', label: 'Preto' },
  { value: '436', label: 'Verde' }
];

const TIPO_CABELO_OPTIONS = [
  { value: '444', label: 'Liso' },
  { value: '446', label: 'Ondulado' },
  { value: '448', label: 'Cacheado' },
  { value: '450', label: 'Crespo' },
  { value: '2258', label: 'Natural' },
  { value: '2260', label: 'Outros' }
];

const MANEQUIM_OPTIONS = [
  { value: '9374', label: '6' },
  { value: '9376', label: '8' },
  { value: '9378', label: '10' },
  { value: '9380', label: '12' },
  { value: '9382', label: '14' },
  { value: '9384', label: '16' },
  { value: '9386', label: '18' },
  { value: '9388', label: '20' },
  { value: '9390', label: '22' },
  { value: '9392', label: '24' },
  { value: '9394', label: '26' },
  { value: '9396', label: '28' },
  { value: '9398', label: '30' },
  { value: '9400', label: '32' },
  { value: '9402', label: '34' },
  { value: '9404', label: '36' },
  { value: '452', label: '38' },
  { value: '454', label: '40' },
  { value: '3946', label: '42' },
  { value: '9406', label: '44' },
  { value: '9408', label: '46' },
  { value: '9410', label: '48' },
  { value: '9412', label: '50' },
  { value: '9414', label: '52' },
  { value: '9416', label: '54' }
];

const HABILIDADES_OPTIONS = [
  { value: '9228', label: 'Atua' },
  { value: '9230', label: 'Bilingue' },
  { value: '9232', label: 'Canta' },
  { value: '9234', label: 'Dança' },
  { value: '9236', label: 'Desfila' },
  { value: '9238', label: 'DRT' },
  { value: '9240', label: 'Figurantes' },
  { value: '9242', label: 'Joga Futebol' },
  { value: '9244', label: 'Outros' },
  { value: '9246', label: 'Segura texto' }
];

const CURSOS_OPTIONS = [
  { value: '9262', label: 'Canto' },
  { value: '9264', label: 'Dança' },
  { value: '9266', label: 'Espanhol' },
  { value: '9268', label: 'Exclusivo' },
  { value: '9270', label: 'Formatura CWB' },
  { value: '9272', label: 'Ginástica Artística' },
  { value: '9274', label: 'Inglês' },
  { value: '9276', label: 'Outros' },
  { value: '9278', label: 'Passarela' },
  { value: '9280', label: 'Teatro' },
  { value: '9282', label: 'Toca Instrumento Musical' },
  { value: '9284', label: 'Workshop Gui' }
];

const CARACTERISTICAS_OPTIONS = [
  { value: '9286', label: 'Comunicativo' },
  { value: '9288', label: 'Desinibida' },
  { value: '9290', label: 'Dinâmica' },
  { value: '9292', label: 'Esperto' },
  { value: '9294', label: 'Espontâneo' },
  { value: '9296', label: 'Interativa' },
  { value: '9298', label: 'Risonho' }
];

const TIPO_MODELO_OPTIONS = [
  { value: '9242', label: 'Moda' },
  { value: '9244', label: 'Publicidade' },
  { value: '9246', label: 'Catálogo' },
  { value: '9248', label: 'Editorial' },
  { value: '9250', label: 'Fitness' },
  { value: '9252', label: 'Plus Size' },
  { value: '9254', label: 'Lingerie' },
  { value: '9256', label: 'Partes (Mãos, Pés, etc)' },
  { value: '9258', label: 'Criança' },
  { value: '9260', label: 'Maduro/Senior' }
];

// ========================================================================
// FUNÇÕES DE TRADUÇÃO
// ========================================================================
const translateBitrixValue = (
  value: string | number | null | undefined,
  options: { value: string; label: string }[]
): string => {
  if (!value) return '-';
  const strValue = String(value);
  const option = options.find(opt => opt.value === strValue);
  return option?.label || strValue;
};

const translateBitrixArray = (
  values: unknown,
  options: { value: string; label: string }[]
): string[] => {
  if (!values) return [];
  const arr = Array.isArray(values) ? values : [values];
  return arr.map(val => {
    const strVal = String(val);
    const option = options.find(opt => opt.value === strVal);
    return option?.label || strVal;
  });
};

// ========================================================================
// COMPONENTE PRINCIPAL
// ========================================================================
interface ModelProfileViewProps {
  leadId: number | null;
}

export const ModelProfileView = ({ leadId }: ModelProfileViewProps) => {
  // Buscar dados do lead
  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead-profile', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!leadId
  });

  if (!leadId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum modelo associado a este deal</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-6">
              <Skeleton className="h-32 w-32 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Erro ao carregar perfil do modelo</p>
        </CardContent>
      </Card>
    );
  }

  const photoUrl = lead.photo_url || null;
  const additionalPhotos = (lead.additional_photos as unknown as string[] | null) || [];
  const rawData = lead.raw as Record<string, unknown> | null;

  // ========================================================================
  // EXTRAÇÃO DE DADOS DO RAW
  // ========================================================================
  
  // Telefone
  const getPhone = (): string | null => {
    if (lead.celular) return lead.celular;
    if (rawData?.PHONE && Array.isArray(rawData.PHONE) && rawData.PHONE.length > 0) {
      const phoneObj = rawData.PHONE[0] as { VALUE?: string } | null;
      return phoneObj?.VALUE || null;
    }
    return null;
  };
  const phone = getPhone();

  // Data de nascimento
  const getBirthDate = (): string | null => {
    const birthDate = rawData?.[BITRIX_LEAD_FIELD_MAPPING.dataNascimento];
    if (!birthDate) return null;
    
    if (typeof birthDate === 'string') {
      // Tentar parsear data ISO
      try {
        const date = new Date(birthDate);
        if (!isNaN(date.getTime())) {
          return format(date, "dd/MM/yyyy", { locale: ptBR });
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  const calculateAge = (): number | null => {
    const birthDate = rawData?.[BITRIX_LEAD_FIELD_MAPPING.dataNascimento];
    if (!birthDate) return lead.age || null;
    
    try {
      const date = new Date(String(birthDate));
      if (isNaN(date.getTime())) return lead.age || null;
      
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      return age;
    } catch {
      return lead.age || null;
    }
  };

  // Dados básicos
  const nomeModelo = lead.nome_modelo || (rawData?.[BITRIX_LEAD_FIELD_MAPPING.nomeModelo] as string) || lead.name || 'Nome não informado';
  const nomeResponsavel = lead.nome_responsavel_legal || (rawData?.[BITRIX_LEAD_FIELD_MAPPING.nomeResponsavel] as string) || null;
  const cidade = (rawData?.[BITRIX_LEAD_FIELD_MAPPING.cidade] as string) || null;
  const estado = (rawData?.[BITRIX_LEAD_FIELD_MAPPING.estado] as string) || null;
  const sexo = translateBitrixValue(rawData?.[BITRIX_LEAD_FIELD_MAPPING.sexo] as string, SEXO_OPTIONS);
  const estadoCivil = translateBitrixValue(rawData?.[BITRIX_LEAD_FIELD_MAPPING.estadoCivil] as string, ESTADO_CIVIL_OPTIONS);
  const birthDate = getBirthDate();
  const age = calculateAge();

  // Redes sociais
  const instagram = (rawData?.[BITRIX_LEAD_FIELD_MAPPING.instagram] as string) || null;
  const tiktok = (rawData?.[BITRIX_LEAD_FIELD_MAPPING.tiktok] as string) || null;

  // Dados físicos
  const altura = rawData?.[BITRIX_LEAD_FIELD_MAPPING.altura] as string | number | null;
  const peso = rawData?.[BITRIX_LEAD_FIELD_MAPPING.peso] as string | number | null;
  const manequim = translateBitrixValue(rawData?.[BITRIX_LEAD_FIELD_MAPPING.manequim] as string, MANEQUIM_OPTIONS);
  const tamanhoSapato = rawData?.[BITRIX_LEAD_FIELD_MAPPING.tamanhoSapato] as string | number | null;
  const corPele = translateBitrixValue(rawData?.[BITRIX_LEAD_FIELD_MAPPING.corPele] as string, COR_PELE_OPTIONS);
  const corCabelo = translateBitrixValue(rawData?.[BITRIX_LEAD_FIELD_MAPPING.corCabelo] as string, COR_CABELO_OPTIONS);
  const corOlhos = translateBitrixValue(rawData?.[BITRIX_LEAD_FIELD_MAPPING.corOlhos] as string, COR_OLHOS_OPTIONS);
  const tipoCabelo = translateBitrixValue(rawData?.[BITRIX_LEAD_FIELD_MAPPING.tipoCabelo] as string, TIPO_CABELO_OPTIONS);

  // Habilidades e características
  const habilidades = translateBitrixArray(rawData?.[BITRIX_LEAD_FIELD_MAPPING.habilidades], HABILIDADES_OPTIONS);
  const cursos = translateBitrixArray(rawData?.[BITRIX_LEAD_FIELD_MAPPING.cursos], CURSOS_OPTIONS);
  const caracteristicas = translateBitrixArray(rawData?.[BITRIX_LEAD_FIELD_MAPPING.caracteristicas], CARACTERISTICAS_OPTIONS);
  const tipoModelo = translateBitrixArray(rawData?.[BITRIX_LEAD_FIELD_MAPPING.tipoModelo], TIPO_MODELO_OPTIONS);

  // Verificar se há dados preenchidos
  const hasPhysicalData = Boolean(altura || peso || manequim !== '-' || tamanhoSapato);
  const hasSkillsData = Boolean(habilidades.length || cursos.length || caracteristicas.length || tipoModelo.length);

  return (
    <div className="space-y-4">
      {/* Foto principal e dados básicos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados do Modelo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Foto principal */}
            <div className="shrink-0 flex justify-center sm:justify-start">
              <Avatar className="h-32 w-32 rounded-lg border-2 border-primary/20">
                <AvatarImage src={photoUrl || undefined} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-muted">
                  <User className="h-12 w-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Dados básicos */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-bold">{nomeModelo}</h2>
                {age && (
                  <p className="text-muted-foreground">{age} anos</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {birthDate && (
                  <DataItem 
                    icon={<Calendar className="h-3 w-3" />}
                    label="Data de Nascimento" 
                    value={birthDate} 
                  />
                )}
                {sexo !== '-' && (
                  <DataItem label="Sexo" value={sexo} />
                )}
                {phone && (
                  <DataItem 
                    icon={<Phone className="h-3 w-3" />}
                    label="Telefone" 
                    value={phone} 
                  />
                )}
                {(cidade || estado) && (
                  <DataItem 
                    icon={<MapPin className="h-3 w-3" />}
                    label="Localização" 
                    value={[cidade, estado].filter(Boolean).join(', ')} 
                  />
                )}
              </div>

              {/* Redes sociais */}
              {(instagram || tiktok) && (
                <div className="flex gap-3 pt-2">
                  {instagram && (
                    <a 
                      href={`https://instagram.com/${String(instagram).replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Instagram className="h-4 w-4" />
                      @{String(instagram).replace('@', '')}
                    </a>
                  )}
                  {tiktok && (
                    <a 
                      href={`https://tiktok.com/@${String(tiktok).replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="text-xs font-bold">TikTok</span>
                      @{String(tiktok).replace('@', '')}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Responsável */}
      {(nomeResponsavel || estadoCivil !== '-') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dados do Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {nomeResponsavel && (
                <DataItem label="Nome do Responsável" value={nomeResponsavel} />
              )}
              {estadoCivil !== '-' && (
                <DataItem 
                  icon={<Heart className="h-3 w-3" />}
                  label="Estado Civil" 
                  value={estadoCivil} 
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Galeria de fotos adicionais */}
      {additionalPhotos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Fotos Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {additionalPhotos.map((photo, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={photo} 
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(photo, '_blank')}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tipo de Modelo (destaque) */}
      {tipoModelo.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Tipo de Modelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tipoModelo.map((tipo, i) => (
                <Badge key={i} className="text-sm">{tipo}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados físicos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Dados Físicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPhysicalData ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <DataItem label="Altura" value={altura ? `${altura} cm` : null} />
              <DataItem label="Peso" value={peso ? `${peso} kg` : null} />
              <DataItem label="Manequim" value={manequim !== '-' ? manequim : null} />
              <DataItem label="Sapato" value={tamanhoSapato} />
              <DataItem 
                icon={<Palette className="h-3 w-3" />}
                label="Cor da Pele" 
                value={corPele !== '-' ? corPele : null} 
              />
              <DataItem label="Cor do Cabelo" value={corCabelo !== '-' ? corCabelo : null} />
              <DataItem label="Cor dos Olhos" value={corOlhos !== '-' ? corOlhos : null} />
              <DataItem label="Tipo de Cabelo" value={tipoCabelo !== '-' ? tipoCabelo : null} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Dados físicos ainda não preenchidos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Habilidades e características */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Habilidades e Características
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasSkillsData ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Habilidades ainda não preenchidas
            </p>
          ) : (
            <>
              {habilidades.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Habilidades</p>
                  <div className="flex flex-wrap gap-1">
                    {habilidades.map((skill, i) => (
                      <Badge key={i} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {cursos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Cursos</p>
                  <div className="flex flex-wrap gap-1">
                    {cursos.map((course, i) => (
                      <Badge key={i} variant="outline">{course}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {caracteristicas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Características</p>
                  <div className="flex flex-wrap gap-1">
                    {caracteristicas.map((char, i) => (
                      <Badge key={i} variant="secondary">{char}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ========================================================================
// COMPONENTE AUXILIAR
// ========================================================================
const DataItem = ({ 
  label, 
  value,
  icon
}: { 
  label: string; 
  value: string | number | null | undefined;
  icon?: React.ReactNode;
}) => {
  if (!value) return null;
  
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
};
