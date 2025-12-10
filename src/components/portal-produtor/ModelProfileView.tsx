import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Ruler, Palette, Instagram, 
  Calendar, MapPin, Phone, Sparkles, ImageIcon, Heart, Users, Facebook, Youtube
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ========================================================================
// MAPEAMENTO DE CAMPOS DO BITRIX DEAL (igual ao /cadastro)
// ========================================================================
const BITRIX_DEAL_FIELD_MAPPING = {
  // Identificação
  nomeModelo: 'UF_CRM_6748E09939008',
  nomeResponsavel: 'UF_CRM_690CA588BDFB7',
  cpf: 'UF_CRM_1762868654',
  dataNascimento: 'UF_CRM_1762533440587',
  estadoCivil: 'UF_CRM_690CA586298B8',
  sexo: 'UF_CRM_6748E0996FC57',
  
  // Endereço
  cep: 'UF_CRM_1761762176',
  endereco: 'UF_CRM_1761762201',
  numero: 'UF_CRM_1762450966586',
  bairro: 'UF_CRM_1762450985051',
  cidade: 'UF_CRM_1762451032936',
  estado: 'UF_CRM_1762451508',
  
  // Características Físicas
  altura: 'UF_CRM_6753068A7DEC9',
  peso: 'UF_CRM_6753068A86FE0',
  calcado: 'UF_CRM_6753068A765FD',
  manequim: 'UF_CRM_690CA586192FB',
  tipoCabelo: 'UF_CRM_6753068A64AB0',
  corCabelo: 'UF_CRM_DEAL_1750166749133',
  corOlhos: 'UF_CRM_6753068A5BE7C',
  corPele: 'UF_CRM_690CA5863827D',
  
  // Habilidades (multi-select)
  habilidades: 'UF_CRM_690CA585CADA1',
  cursos: 'UF_CRM_690CA585DA123',
  caracteristicasEspeciais: 'UF_CRM_690CA585EAFC3',
  tipoModelo: 'UF_CRM_690CA58606670',
  
  // Redes Sociais
  instagramLink: 'UF_CRM_1762866652',
  instagramSeguidores: 'UF_CRM_1762866813',
  facebookLink: 'UF_CRM_1762867010',
  facebookSeguidores: 'UF_CRM_1762867259',
  youtubeLink: 'UF_CRM_1762867875',
  youtubeSeguidores: 'UF_CRM_1762868205',
  tiktokLink: 'UF_CRM_1762868543',
  tiktokSeguidores: 'UF_CRM_1762872886'
} as const;

// ========================================================================
// FUNÇÕES DE TRADUÇÃO
// ========================================================================
interface OptionItem {
  ID: string;
  VALUE: string;
}

const translateEnumValue = (
  value: string | number | null | undefined,
  items: OptionItem[] | null | undefined
): string => {
  if (!value || !items) return '-';
  const strValue = String(value);
  const option = items.find(item => item.ID === strValue);
  return option?.VALUE || strValue;
};

const translateEnumArray = (
  values: unknown,
  items: OptionItem[] | null | undefined
): string[] => {
  if (!values || !items) return [];
  const arr = Array.isArray(values) ? values : [values];
  return arr
    .map(val => {
      const strVal = String(val);
      const option = items.find(item => item.ID === strVal);
      return option?.VALUE || null;
    })
    .filter((v): v is string => v !== null && v !== '0' && v !== '');
};

// ========================================================================
// COMPONENTE PRINCIPAL
// ========================================================================
interface ModelProfileViewProps {
  leadId: number | null;
  bitrixDealId?: number | null;
}

export const ModelProfileView = ({ leadId, bitrixDealId }: ModelProfileViewProps) => {
  // Buscar dados do Bitrix Deal via edge function
  const { data: bitrixData, isLoading, error } = useQuery({
    queryKey: ['bitrix-deal-profile', bitrixDealId],
    queryFn: async () => {
      if (!bitrixDealId) return null;
      
      const { data, error } = await supabase.functions.invoke('bitrix-entity-get', {
        body: { entityType: 'deal', entityId: String(bitrixDealId) }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar dados do deal');
      
      return data;
    },
    enabled: !!bitrixDealId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  if (!bitrixDealId && !leadId) {
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
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bitrixData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Erro ao carregar perfil do modelo</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Tente novamente mais tarde'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const dealData = bitrixData.dealData || {};
  const contactData = bitrixData.contactData || {};
  const dealFields = bitrixData.dealFields || {};

  // ========================================================================
  // EXTRAÇÃO DE DADOS DO DEAL
  // ========================================================================
  
  // Helper para obter valor
  const getValue = (fieldKey: keyof typeof BITRIX_DEAL_FIELD_MAPPING): string => {
    const bitrixField = BITRIX_DEAL_FIELD_MAPPING[fieldKey];
    const value = dealData[bitrixField];
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) return value[0] || '';
    return String(value);
  };

  // Telefone do contato
  const getPhone = (): string | null => {
    if (contactData?.PHONE && Array.isArray(contactData.PHONE) && contactData.PHONE.length > 0) {
      const phoneObj = contactData.PHONE[0] as { VALUE?: string } | null;
      return phoneObj?.VALUE || null;
    }
    return null;
  };
  const phone = getPhone();

  // Data de nascimento
  const getBirthDate = (): string | null => {
    const birthDate = getValue('dataNascimento');
    if (!birthDate) return null;
    
    try {
      const date = new Date(birthDate);
      if (!isNaN(date.getTime())) {
        return format(date, "dd/MM/yyyy", { locale: ptBR });
      }
    } catch {
      return null;
    }
    return null;
  };

  const calculateAge = (): number | null => {
    const birthDate = getValue('dataNascimento');
    if (!birthDate) return null;
    
    try {
      const date = new Date(birthDate);
      if (isNaN(date.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  // Dados básicos
  const nomeModelo = getValue('nomeModelo') || 'Nome não informado';
  const nomeResponsavel = getValue('nomeResponsavel');
  const cpf = getValue('cpf');
  const cidade = getValue('cidade');
  const estado = translateEnumValue(
    getValue('estado'),
    dealFields[BITRIX_DEAL_FIELD_MAPPING.estado]?.items
  );
  const sexo = translateEnumValue(
    getValue('sexo'),
    dealFields[BITRIX_DEAL_FIELD_MAPPING.sexo]?.items
  );
  const estadoCivil = translateEnumValue(
    getValue('estadoCivil'),
    dealFields[BITRIX_DEAL_FIELD_MAPPING.estadoCivil]?.items
  );
  const birthDate = getBirthDate();
  const age = calculateAge();

  // Endereço completo
  const cep = getValue('cep');
  const endereco = getValue('endereco');
  const numero = getValue('numero');
  const bairro = getValue('bairro');
  const enderecoCompleto = [endereco, numero, bairro, cidade, estado !== '-' ? estado : null]
    .filter(Boolean)
    .join(', ');

  // Dados físicos
  const altura = getValue('altura');
  const peso = getValue('peso');
  const calcado = getValue('calcado');
  const manequimValues = dealData[BITRIX_DEAL_FIELD_MAPPING.manequim];
  const manequim = translateEnumArray(
    manequimValues,
    dealFields[BITRIX_DEAL_FIELD_MAPPING.manequim]?.items
  );
  const tipoCabelo = translateEnumValue(
    getValue('tipoCabelo'),
    dealFields[BITRIX_DEAL_FIELD_MAPPING.tipoCabelo]?.items
  );
  const corCabelo = translateEnumValue(
    getValue('corCabelo'),
    dealFields[BITRIX_DEAL_FIELD_MAPPING.corCabelo]?.items
  );
  const corOlhos = translateEnumValue(
    getValue('corOlhos'),
    dealFields[BITRIX_DEAL_FIELD_MAPPING.corOlhos]?.items
  );
  const corPele = translateEnumValue(
    getValue('corPele'),
    dealFields[BITRIX_DEAL_FIELD_MAPPING.corPele]?.items
  );

  // Habilidades e características
  const habilidades = translateEnumArray(
    dealData[BITRIX_DEAL_FIELD_MAPPING.habilidades],
    dealFields[BITRIX_DEAL_FIELD_MAPPING.habilidades]?.items
  );
  const cursos = translateEnumArray(
    dealData[BITRIX_DEAL_FIELD_MAPPING.cursos],
    dealFields[BITRIX_DEAL_FIELD_MAPPING.cursos]?.items
  );
  const caracteristicas = translateEnumArray(
    dealData[BITRIX_DEAL_FIELD_MAPPING.caracteristicasEspeciais],
    dealFields[BITRIX_DEAL_FIELD_MAPPING.caracteristicasEspeciais]?.items
  );
  const tipoModelo = translateEnumArray(
    dealData[BITRIX_DEAL_FIELD_MAPPING.tipoModelo],
    dealFields[BITRIX_DEAL_FIELD_MAPPING.tipoModelo]?.items
  );

  // Redes sociais
  const instagramLink = getValue('instagramLink');
  const instagramSeguidores = getValue('instagramSeguidores');
  const facebookLink = getValue('facebookLink');
  const facebookSeguidores = getValue('facebookSeguidores');
  const youtubeLink = getValue('youtubeLink');
  const youtubeSeguidores = getValue('youtubeSeguidores');
  const tiktokLink = getValue('tiktokLink');
  const tiktokSeguidores = getValue('tiktokSeguidores');

  // Verificar se há dados preenchidos
  const hasPhysicalData = Boolean(altura || peso || manequim.length || calcado || corPele !== '-' || corCabelo !== '-' || corOlhos !== '-' || tipoCabelo !== '-');
  const hasSkillsData = Boolean(habilidades.length || cursos.length || caracteristicas.length || tipoModelo.length);
  const hasSocialMedia = Boolean(instagramLink || facebookLink || youtubeLink || tiktokLink);
  const hasAddress = Boolean(enderecoCompleto || cep);

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
            {/* Avatar placeholder - deal não tem foto */}
            <div className="shrink-0 flex justify-center sm:justify-start">
              <Avatar className="h-32 w-32 rounded-lg border-2 border-primary/20">
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
                {cpf && (
                  <DataItem label="CPF" value={cpf} />
                )}
              </div>
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

      {/* Endereço */}
      {hasAddress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enderecoCompleto && (
                <p className="text-sm">{enderecoCompleto}</p>
              )}
              {cep && (
                <p className="text-sm text-muted-foreground">CEP: {cep}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados Físicos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Dados Físicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPhysicalData ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {altura && (
                <DataItem label="Altura" value={`${altura} cm`} />
              )}
              {peso && (
                <DataItem label="Peso" value={`${peso} kg`} />
              )}
              {manequim.length > 0 && (
                <DataItem label="Manequim" value={manequim.join(', ')} />
              )}
              {calcado && (
                <DataItem label="Calçado" value={calcado} />
              )}
              {corPele !== '-' && (
                <DataItem label="Cor da Pele" value={corPele} />
              )}
              {corCabelo !== '-' && (
                <DataItem label="Cor do Cabelo" value={corCabelo} />
              )}
              {tipoCabelo !== '-' && (
                <DataItem label="Tipo de Cabelo" value={tipoCabelo} />
              )}
              {corOlhos !== '-' && (
                <DataItem label="Cor dos Olhos" value={corOlhos} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Dados físicos ainda não preenchidos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tipo de Modelo (destaque) */}
      {tipoModelo.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Tipo de Modelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tipoModelo.map((tipo, index) => (
                <Badge key={index} variant="default" className="text-sm">
                  {tipo}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Habilidades e Características */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Habilidades e Características
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasSkillsData ? (
            <div className="space-y-4">
              {habilidades.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Habilidades</p>
                  <div className="flex flex-wrap gap-2">
                    {habilidades.map((hab, index) => (
                      <Badge key={index} variant="secondary">{hab}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {cursos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Cursos</p>
                  <div className="flex flex-wrap gap-2">
                    {cursos.map((curso, index) => (
                      <Badge key={index} variant="outline">{curso}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {caracteristicas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Características</p>
                  <div className="flex flex-wrap gap-2">
                    {caracteristicas.map((carac, index) => (
                      <Badge key={index} variant="outline">{carac}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Habilidades ainda não preenchidas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Redes Sociais */}
      {hasSocialMedia && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              Redes Sociais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {instagramLink && (
                <SocialMediaItem 
                  icon={<Instagram className="h-4 w-4" />}
                  label="Instagram"
                  link={instagramLink}
                  followers={instagramSeguidores}
                  baseUrl="https://instagram.com/"
                />
              )}
              {tiktokLink && (
                <SocialMediaItem 
                  icon={<span className="text-xs font-bold">TT</span>}
                  label="TikTok"
                  link={tiktokLink}
                  followers={tiktokSeguidores}
                  baseUrl="https://tiktok.com/@"
                />
              )}
              {facebookLink && (
                <SocialMediaItem 
                  icon={<Facebook className="h-4 w-4" />}
                  label="Facebook"
                  link={facebookLink}
                  followers={facebookSeguidores}
                  baseUrl="https://facebook.com/"
                />
              )}
              {youtubeLink && (
                <SocialMediaItem 
                  icon={<Youtube className="h-4 w-4" />}
                  label="YouTube"
                  link={youtubeLink}
                  followers={youtubeSeguidores}
                  baseUrl="https://youtube.com/@"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ========================================================================
// COMPONENTES AUXILIARES
// ========================================================================
interface DataItemProps {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
}

const DataItem = ({ label, value, icon }: DataItemProps) => {
  if (!value) return null;
  
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
};

interface SocialMediaItemProps {
  icon: React.ReactNode;
  label: string;
  link: string;
  followers?: string;
  baseUrl: string;
}

const SocialMediaItem = ({ icon, label, link, followers, baseUrl }: SocialMediaItemProps) => {
  // Limpar o link para obter apenas o username
  let username = link;
  if (link.includes('/')) {
    const parts = link.split('/');
    username = parts[parts.length - 1] || parts[parts.length - 2] || link;
  }
  username = username.replace('@', '');

  const fullUrl = link.startsWith('http') ? link : `${baseUrl}${username}`;

  return (
    <div className="space-y-1">
      <a 
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline flex items-center gap-2"
      >
        {icon}
        <span>@{username}</span>
      </a>
      {followers && (
        <p className="text-xs text-muted-foreground">{followers} seguidores</p>
      )}
    </div>
  );
};
