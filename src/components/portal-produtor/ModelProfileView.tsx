import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Ruler, Scale, Palette, Instagram, 
  Calendar, MapPin, Phone, Sparkles, ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getLeadPhotoUrl } from '@/lib/leadPhotoUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    try {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  // Extract data from raw field if available
  const rawData = lead.raw as Record<string, unknown> | null;

  return (
    <div className="space-y-4">
      {/* Foto principal e dados básicos */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Foto principal */}
            <div className="shrink-0">
              <Avatar className="h-32 w-32 rounded-lg border-2 border-primary/20">
                <AvatarImage src={photoUrl || undefined} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-muted">
                  <User className="h-12 w-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Dados básicos */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-bold">{lead.nome_modelo || lead.name || 'Nome não informado'}</h2>
                {lead.age && (
                  <p className="text-muted-foreground">{lead.age} anos</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {lead.celular && (
                  <Badge variant="outline" className="gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.celular}
                  </Badge>
                )}
                {(lead.address || (rawData?.ADDRESS_CITY as string)) && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {lead.address || `${rawData?.ADDRESS_CITY || ''}, ${rawData?.ADDRESS_PROVINCE || ''}`}
                  </Badge>
                )}
              </div>

              {/* Redes sociais */}
              {(rawData?.instagram_local || rawData?.tiktok_local) && (
                <div className="flex gap-2">
                  {rawData?.instagram_local && (
                    <a 
                      href={`https://instagram.com/${String(rawData.instagram_local).replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Instagram className="h-4 w-4" />
                      @{String(rawData.instagram_local).replace('@', '')}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Dados físicos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Dados Físicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <DataItem label="Altura" value={rawData?.UF_CRM_1733485575 as string} />
            <DataItem label="Peso" value={rawData?.UF_CRM_1733485977896 as string} suffix="kg" />
            <DataItem label="Manequim" value={rawData?.UF_CRM_1762283056 as string} />
            <DataItem label="Sapato" value={rawData?.UF_CRM_1733485454702 as string} />
            <DataItem label="Cor da Pele" value={rawData?.UF_CRM_1762283877 as string} />
            <DataItem label="Cor do Cabelo" value={rawData?.UF_CRM_1762283650 as string} />
            <DataItem label="Cor dos Olhos" value={rawData?.UF_CRM_1733485183850 as string} />
            <DataItem label="Tipo de Cabelo" value={rawData?.UF_CRM_1733485270151 as string} />
          </div>
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
          {rawData?.UF_CRM_1762282315 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Habilidades</p>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(rawData.UF_CRM_1762282315) 
                  ? rawData.UF_CRM_1762282315 
                  : [rawData.UF_CRM_1762282315]
                ).map((skill, i) => (
                  <Badge key={i} variant="secondary">{String(skill)}</Badge>
                ))}
              </div>
            </div>
          )}

          {rawData?.UF_CRM_1762282626 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Cursos</p>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(rawData.UF_CRM_1762282626) 
                  ? rawData.UF_CRM_1762282626 
                  : [rawData.UF_CRM_1762282626]
                ).map((course, i) => (
                  <Badge key={i} variant="outline">{String(course)}</Badge>
                ))}
              </div>
            </div>
          )}

          {rawData?.UF_CRM_1762282725 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Características</p>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(rawData.UF_CRM_1762282725) 
                  ? rawData.UF_CRM_1762282725 
                  : [rawData.UF_CRM_1762282725]
                ).map((char, i) => (
                  <Badge key={i} variant="secondary">{String(char)}</Badge>
                ))}
              </div>
            </div>
          )}

          {rawData?.UF_CRM_1762282818 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Tipo de Modelo</p>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(rawData.UF_CRM_1762282818) 
                  ? rawData.UF_CRM_1762282818 
                  : [rawData.UF_CRM_1762282818]
                ).map((type, i) => (
                  <Badge key={i}>{String(type)}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente auxiliar para exibir item de dados
const DataItem = ({ 
  label, 
  value, 
  suffix 
}: { 
  label: string; 
  value: string | number | null | undefined;
  suffix?: string;
}) => {
  const displayValue = value ? `${value}${suffix ? ` ${suffix}` : ''}` : '-';
  
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{displayValue}</p>
    </div>
  );
};
