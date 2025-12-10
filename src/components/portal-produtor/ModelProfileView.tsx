import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { User, Ruler, Instagram, Calendar, MapPin, Phone, Sparkles, Heart, Users, Facebook, Youtube, MessageCircle, ExternalLink, Scale, Footprints, Palette, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ========================================================================
// MAPEAMENTO DE CAMPOS DO BITRIX DEAL (igual ao /cadastro)
// ========================================================================
const BITRIX_DEAL_FIELD_MAPPING = {
  nomeModelo: 'UF_CRM_6748E09939008',
  nomeResponsavel: 'UF_CRM_690CA588BDFB7',
  cpf: 'UF_CRM_1762868654',
  dataNascimento: 'UF_CRM_1762533440587',
  estadoCivil: 'UF_CRM_690CA586298B8',
  sexo: 'UF_CRM_6748E0996FC57',
  cep: 'UF_CRM_1761762176',
  endereco: 'UF_CRM_1761762201',
  numero: 'UF_CRM_1762450966586',
  bairro: 'UF_CRM_1762450985051',
  cidade: 'UF_CRM_1762451032936',
  estado: 'UF_CRM_1762451508',
  altura: 'UF_CRM_6753068A7DEC9',
  peso: 'UF_CRM_6753068A86FE0',
  calcado: 'UF_CRM_6753068A765FD',
  manequim: 'UF_CRM_690CA586192FB',
  tipoCabelo: 'UF_CRM_6753068A64AB0',
  corCabelo: 'UF_CRM_DEAL_1750166749133',
  corOlhos: 'UF_CRM_6753068A5BE7C',
  corPele: 'UF_CRM_690CA5863827D',
  habilidades: 'UF_CRM_690CA585CADA1',
  cursos: 'UF_CRM_690CA585DA123',
  caracteristicasEspeciais: 'UF_CRM_690CA585EAFC3',
  tipoModelo: 'UF_CRM_690CA58606670',
  instagramLink: 'UF_CRM_1762866652',
  instagramSeguidores: 'UF_CRM_1762866813',
  facebookLink: 'UF_CRM_1762867010',
  facebookSeguidores: 'UF_CRM_1762867259',
  youtubeLink: 'UF_CRM_1762867875',
  youtubeSeguidores: 'UF_CRM_1762868205',
  tiktokLink: 'UF_CRM_1762868543',
  tiktokSeguidores: 'UF_CRM_1762872886'
} as const;
interface OptionItem {
  ID: string;
  VALUE: string;
}
const translateEnumValue = (value: string | number | null | undefined, items: OptionItem[] | null | undefined): string => {
  if (!value || !items) return '-';
  const strValue = String(value);
  const option = items.find(item => item.ID === strValue);
  return option?.VALUE || strValue;
};
const translateEnumArray = (values: unknown, items: OptionItem[] | null | undefined): string[] => {
  if (!values || !items) return [];
  const arr = Array.isArray(values) ? values : [values];
  return arr.map(val => {
    const strVal = String(val);
    const option = items.find(item => item.ID === strVal);
    return option?.VALUE || null;
  }).filter((v): v is string => v !== null && v !== '0' && v !== '');
};

// ========================================================================
// COMPONENTE PRINCIPAL
// ========================================================================
interface ModelProfileViewProps {
  leadId: number | null;
  bitrixDealId?: number | null;
}
export const ModelProfileView = ({
  leadId,
  bitrixDealId
}: ModelProfileViewProps) => {
  // Buscar dados do deal do Bitrix
  const {
    data: bitrixData,
    isLoading: loadingBitrix,
    error
  } = useQuery({
    queryKey: ['bitrix-deal-profile', bitrixDealId],
    queryFn: async () => {
      if (!bitrixDealId) return null;
      const {
        data,
        error
      } = await supabase.functions.invoke('bitrix-entity-get', {
        body: {
          entityType: 'deal',
          entityId: String(bitrixDealId)
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar dados do deal');
      return data;
    },
    enabled: !!bitrixDealId,
    staleTime: 5 * 60 * 1000
  });

  // Buscar dados do lead para fonte e scouter
  const {
    data: leadData,
    isLoading: loadingLead
  } = useQuery({
    queryKey: ['lead-source', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const {
        data,
        error
      } = await supabase.from('leads').select('fonte_normalizada, scouter').eq('id', leadId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
    staleTime: 5 * 60 * 1000
  });
  const isLoading = loadingBitrix || loadingLead;
  if (!bitrixDealId && !leadId) {
    return <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Nenhum modelo associado</p>
      </div>;
  }
  if (isLoading) {
    return <MobileLoadingSkeleton />;
  }
  if (error || !bitrixData) {
    return <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive font-medium">Erro ao carregar perfil</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Tente novamente'}
        </p>
      </div>;
  }
  const dealData = bitrixData.dealData || {};
  const contactData = bitrixData.contactData || {};
  const dealFields = bitrixData.dealFields || {};
  const getValue = (fieldKey: keyof typeof BITRIX_DEAL_FIELD_MAPPING): string => {
    const bitrixField = BITRIX_DEAL_FIELD_MAPPING[fieldKey];
    const value = dealData[bitrixField];
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) return value[0] || '';
    return String(value);
  };
  const getPhone = (): string | null => {
    if (contactData?.PHONE && Array.isArray(contactData.PHONE) && contactData.PHONE.length > 0) {
      const phoneObj = contactData.PHONE[0] as {
        VALUE?: string;
      } | null;
      return phoneObj?.VALUE || null;
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
      if (monthDiff < 0 || monthDiff === 0 && today.getDate() < date.getDate()) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };
  const getBirthDate = (): string | null => {
    const birthDate = getValue('dataNascimento');
    if (!birthDate) return null;
    try {
      const date = new Date(birthDate);
      if (!isNaN(date.getTime())) {
        return format(date, "dd/MM/yyyy", {
          locale: ptBR
        });
      }
    } catch {
      return null;
    }
    return null;
  };

  // Extracted data
  const phone = getPhone();
  const nomeModelo = getValue('nomeModelo') || 'Nome não informado';
  const age = calculateAge();
  const birthDate = getBirthDate();
  const cpf = getValue('cpf');
  const sexo = translateEnumValue(getValue('sexo'), dealFields[BITRIX_DEAL_FIELD_MAPPING.sexo]?.items);
  const estadoCivil = translateEnumValue(getValue('estadoCivil'), dealFields[BITRIX_DEAL_FIELD_MAPPING.estadoCivil]?.items);
  const nomeResponsavel = getValue('nomeResponsavel');

  // Address
  const cep = getValue('cep');
  const endereco = getValue('endereco');
  const numero = getValue('numero');
  const bairro = getValue('bairro');
  const cidade = getValue('cidade');
  const estado = translateEnumValue(getValue('estado'), dealFields[BITRIX_DEAL_FIELD_MAPPING.estado]?.items);
  const enderecoCompleto = [endereco, numero, bairro, cidade, estado !== '-' ? estado : null].filter(Boolean).join(', ');

  // Physical data
  const altura = getValue('altura');
  const peso = getValue('peso');
  const calcado = getValue('calcado');
  const manequim = translateEnumArray(dealData[BITRIX_DEAL_FIELD_MAPPING.manequim], dealFields[BITRIX_DEAL_FIELD_MAPPING.manequim]?.items);
  const tipoCabelo = translateEnumValue(getValue('tipoCabelo'), dealFields[BITRIX_DEAL_FIELD_MAPPING.tipoCabelo]?.items);
  const corCabelo = translateEnumValue(getValue('corCabelo'), dealFields[BITRIX_DEAL_FIELD_MAPPING.corCabelo]?.items);
  const corOlhos = translateEnumValue(getValue('corOlhos'), dealFields[BITRIX_DEAL_FIELD_MAPPING.corOlhos]?.items);
  const corPele = translateEnumValue(getValue('corPele'), dealFields[BITRIX_DEAL_FIELD_MAPPING.corPele]?.items);

  // Skills
  const habilidades = translateEnumArray(dealData[BITRIX_DEAL_FIELD_MAPPING.habilidades], dealFields[BITRIX_DEAL_FIELD_MAPPING.habilidades]?.items);
  const cursos = translateEnumArray(dealData[BITRIX_DEAL_FIELD_MAPPING.cursos], dealFields[BITRIX_DEAL_FIELD_MAPPING.cursos]?.items);
  const caracteristicas = translateEnumArray(dealData[BITRIX_DEAL_FIELD_MAPPING.caracteristicasEspeciais], dealFields[BITRIX_DEAL_FIELD_MAPPING.caracteristicasEspeciais]?.items);
  const tipoModelo = translateEnumArray(dealData[BITRIX_DEAL_FIELD_MAPPING.tipoModelo], dealFields[BITRIX_DEAL_FIELD_MAPPING.tipoModelo]?.items);

  // Social
  const instagramLink = getValue('instagramLink');
  const instagramSeguidores = getValue('instagramSeguidores');
  const tiktokLink = getValue('tiktokLink');
  const tiktokSeguidores = getValue('tiktokSeguidores');
  const facebookLink = getValue('facebookLink');
  const facebookSeguidores = getValue('facebookSeguidores');
  const youtubeLink = getValue('youtubeLink');
  const youtubeSeguidores = getValue('youtubeSeguidores');

  // Flags
  const hasPhysicalData = Boolean(altura || peso || manequim.length || calcado || corPele !== '-' || corCabelo !== '-' || corOlhos !== '-' || tipoCabelo !== '-');
  const hasSkillsData = Boolean(habilidades.length || cursos.length || caracteristicas.length);
  const hasSocialMedia = Boolean(instagramLink || facebookLink || youtubeLink || tiktokLink);
  const hasAddress = Boolean(enderecoCompleto || cep);

  // Format phone for WhatsApp
  const formatPhoneForWhatsApp = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('55')) return cleaned;
    if (cleaned.length >= 10) return `55${cleaned}`;
    return cleaned;
  };
  const getInstagramUsername = (link: string): string => {
    let username = link;
    if (link.includes('/')) {
      const parts = link.split('/');
      username = parts[parts.length - 1] || parts[parts.length - 2] || link;
    }
    return username.replace('@', '');
  };

  // Fonte e Scouter do lead
  const fonte = leadData?.fonte_normalizada || null;
  const scouter = leadData?.scouter || null;
  const isScouter = fonte?.toLowerCase().includes('scouter');
  return <div className="space-y-4 pb-4">
      {/* ==================== HERO SECTION ==================== */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 p-5 border border-primary/20">
        {/* Source Badge - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          {fonte && <Badge className={`text-[10px] ${isScouter ? 'bg-orange-500/20 text-orange-600 border-orange-500/30' : 'bg-blue-500/20 text-blue-600 border-blue-500/30'}`}>
              {isScouter ? '📋 Scouter' : '📱 Meta'}
            </Badge>}
          {isScouter && scouter && <Badge variant="outline" className="text-[10px] bg-background/80">
              {scouter}
            </Badge>}
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-24 w-24 rounded-2xl border-2 border-primary/30 shadow-lg">
            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-2xl font-bold text-primary">
              {nomeModelo.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0 pr-16">
            <h1 className="text-xl font-bold text-foreground truncate">{nomeModelo}</h1>
            
            {/* Responsável */}
            {nomeResponsavel && <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {nomeResponsavel}
              </p>}
            
            {age && age > 0 && <p className="text-base text-muted-foreground">{age} anos</p>}
            
            {/* Type badges */}
            {tipoModelo.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
                {tipoModelo.slice(0, 2).map((tipo, i) => <Badge key={i} className="bg-primary/20 text-primary border-primary/30 text-xs">
                    {tipo}
                  </Badge>)}
                {tipoModelo.length > 2 && <Badge variant="secondary" className="text-xs">+{tipoModelo.length - 2}</Badge>}
              </div>}
          </div>
        </div>

        {/* Quick Actions */}
        
      </div>

      {/* ==================== QUICK STATS ==================== */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {altura && <QuickStatCard icon={<Ruler className="h-4 w-4" />} label="Altura" value={`${altura}cm`} />}
        {manequim.length > 0 && <QuickStatCard icon={<User className="h-4 w-4" />} label="Manequim" value={manequim[0]} />}
        {calcado && <QuickStatCard icon={<Footprints className="h-4 w-4" />} label="Calçado" value={calcado} />}
        {peso && <QuickStatCard icon={<Scale className="h-4 w-4" />} label="Peso" value={`${peso}kg`} />}
        {corPele !== '-' && <QuickStatCard icon={<Palette className="h-4 w-4" />} label="Pele" value={corPele} />}
        {corOlhos !== '-' && <QuickStatCard icon={<Eye className="h-4 w-4" />} label="Olhos" value={corOlhos} />}
      </div>

      {/* ==================== ACCORDION SECTIONS ==================== */}
      <Accordion type="multiple" defaultValue={['personal']} className="space-y-2">
        
        {/* Personal Data */}
        <AccordionItem value="personal" className="border rounded-xl px-4 bg-card">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Dados Pessoais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
              {birthDate && <DataItem label="Nascimento" value={birthDate} />}
              {sexo !== '-' && <DataItem label="Sexo" value={sexo} />}
              {cpf && <DataItem label="CPF" value={cpf} />}
              {phone && <DataItem label="Telefone" value={phone} />}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Guardian */}
        {(nomeResponsavel || estadoCivil !== '-') && <AccordionItem value="guardian" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-medium">Responsável</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
                {nomeResponsavel && <DataItem label="Nome" value={nomeResponsavel} />}
                {estadoCivil !== '-' && <DataItem label="Estado Civil" value={estadoCivil} />}
              </div>
            </AccordionContent>
          </AccordionItem>}

        {/* Address */}
        {hasAddress && <AccordionItem value="address" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-green-500" />
                </div>
                <span className="font-medium">Endereço</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-1 pb-2">
                {enderecoCompleto && <p className="text-sm text-foreground">{enderecoCompleto}</p>}
                {cep && <p className="text-xs text-muted-foreground">CEP: {cep}</p>}
                {enderecoCompleto && <Button variant="outline" size="sm" className="mt-2 h-9 gap-2" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(enderecoCompleto)}`, '_blank')}>
                    <ExternalLink className="h-3 w-3" />
                    Ver no Mapa
                  </Button>}
              </div>
            </AccordionContent>
          </AccordionItem>}

        {/* Physical Details */}
        {hasPhysicalData && <AccordionItem value="physical" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Ruler className="h-4 w-4 text-orange-500" />
                </div>
                <span className="font-medium">Dados Físicos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
                {altura && <DataItem label="Altura" value={`${altura} cm`} />}
                {peso && <DataItem label="Peso" value={`${peso} kg`} />}
                {manequim.length > 0 && <DataItem label="Manequim" value={manequim.join(', ')} />}
                {calcado && <DataItem label="Calçado" value={calcado} />}
                {corPele !== '-' && <DataItem label="Cor da Pele" value={corPele} />}
                {corCabelo !== '-' && <DataItem label="Cor Cabelo" value={corCabelo} />}
                {tipoCabelo !== '-' && <DataItem label="Tipo Cabelo" value={tipoCabelo} />}
                {corOlhos !== '-' && <DataItem label="Cor Olhos" value={corOlhos} />}
              </div>
            </AccordionContent>
          </AccordionItem>}

        {/* Skills */}
        {hasSkillsData && <AccordionItem value="skills" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </div>
                <span className="font-medium">Habilidades</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-1 pb-2">
                {habilidades.length > 0 && <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Habilidades</p>
                    <div className="flex flex-wrap gap-1.5">
                      {habilidades.map((h, i) => <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>)}
                    </div>
                  </div>}
                {cursos.length > 0 && <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Cursos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cursos.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}
                    </div>
                  </div>}
                {caracteristicas.length > 0 && <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Características</p>
                    <div className="flex flex-wrap gap-1.5">
                      {caracteristicas.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}
                    </div>
                  </div>}
              </div>
            </AccordionContent>
          </AccordionItem>}

        {/* Social Media */}
        {hasSocialMedia && <AccordionItem value="social" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Instagram className="h-4 w-4 text-pink-500" />
                </div>
                <span className="font-medium">Redes Sociais</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
                {instagramLink && <SocialItem icon={<Instagram className="h-4 w-4 text-pink-500" />} label="Instagram" link={instagramLink} followers={instagramSeguidores} baseUrl="https://instagram.com/" />}
                {tiktokLink && <SocialItem icon={<span className="text-xs font-bold">TT</span>} label="TikTok" link={tiktokLink} followers={tiktokSeguidores} baseUrl="https://tiktok.com/@" />}
                {facebookLink && <SocialItem icon={<Facebook className="h-4 w-4 text-blue-600" />} label="Facebook" link={facebookLink} followers={facebookSeguidores} baseUrl="https://facebook.com/" />}
                {youtubeLink && <SocialItem icon={<Youtube className="h-4 w-4 text-red-500" />} label="YouTube" link={youtubeLink} followers={youtubeSeguidores} baseUrl="https://youtube.com/@" />}
              </div>
            </AccordionContent>
          </AccordionItem>}
      </Accordion>
    </div>;
};

// ========================================================================
// AUXILIARY COMPONENTS
// ========================================================================
const QuickStatCard = ({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => <div className="flex-shrink-0 min-w-[100px] bg-card border rounded-xl p-3 text-center">
    <div className="flex justify-center text-primary mb-1">{icon}</div>
    <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
  </div>;
const DataItem = ({
  label,
  value
}: {
  label: string;
  value: string | null;
}) => {
  if (!value) return null;
  return <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>;
};
interface SocialItemProps {
  icon: React.ReactNode;
  label: string;
  link: string;
  followers?: string;
  baseUrl: string;
}
const SocialItem = ({
  icon,
  label,
  link,
  followers,
  baseUrl
}: SocialItemProps) => {
  let username = link;
  if (link.includes('/')) {
    const parts = link.split('/');
    username = parts[parts.length - 1] || parts[parts.length - 2] || link;
  }
  username = username.replace('@', '');
  const fullUrl = link.startsWith('http') ? link : `${baseUrl}${username}`;
  return <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      {icon}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">@{username}</p>
        {followers && <p className="text-[10px] text-muted-foreground">{followers} seguidores</p>}
      </div>
    </a>;
};
const MobileLoadingSkeleton = () => <div className="space-y-4">
    {/* Hero skeleton */}
    <div className="rounded-2xl border p-5 space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-24 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-1/4" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 flex-1 rounded-lg" />
      </div>
    </div>
    
    {/* Quick stats skeleton */}
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-24 rounded-xl flex-shrink-0" />)}
    </div>
    
    {/* Accordion skeletons */}
    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
  </div>;