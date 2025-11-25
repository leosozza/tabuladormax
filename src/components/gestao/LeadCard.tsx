import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, MapPin, Calendar, Phone, AlertCircle, Building2, UserCheck } from "lucide-react";
import { useTinderCardConfig } from "@/hooks/useTinderCardConfig";
import { ALL_LEAD_FIELDS } from "@/config/leadFields";
import { getLeadPhotoUrl } from "@/lib/leadPhotoUtils";
// SVG transparente para placeholder "Sem Imagem"
const NO_PHOTO_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='none'/%3E%3Ccircle cx='100' cy='80' r='50' fill='none' stroke='%23D1D5DB' stroke-width='3'/%3E%3Cpath d='M75 65 L125 95 M125 65 L75 95' stroke='%23D1D5DB' stroke-width='3' stroke-linecap='round'/%3E%3Ctext x='100' y='155' text-anchor='middle' font-size='14' fill='%23D1D5DB' font-family='sans-serif'%3ESem Imagem%3C/text%3E%3C/svg%3E`;

interface LeadCardProps {
  lead: Record<string, unknown>; // Dynamic lead object
}

export default function LeadCard({ lead }: LeadCardProps) {
  const { config } = useTinderCardConfig();
  const [hasPhotoError, setHasPhotoError] = useState(false);
  
  // DEBUG: Ver dados do lead
  console.log('[LeadCard] Config:', config);
  console.log('[LeadCard] Lead data:', lead);
  console.log('[LeadCard] mainFields:', config.mainFields);
  console.log('[LeadCard] detailFields:', config.detailFields);

  const getFieldLabel = (key: string) => {
    const field = ALL_LEAD_FIELDS.find(f => f.key === key);
    return field?.label || key;
  };

  const getFieldValue = (key: string) => {
    const value = lead[key];
    const field = ALL_LEAD_FIELDS.find(f => f.key === key);
    
    // Se tem formatter, usa ele (mesmo se o valor for null/undefined)
    if (field?.formatter) {
      return field.formatter(value, lead) || '-';
    }
    
    // Retornar valor ou placeholder
    return value || '-';
  };

  const getFieldIcon = (key: string) => {
    // Ícones de localização - cores mais escuras para contraste com fundo claro
    if (key.includes('local') || key.includes('address') || key.includes('localizacao')) {
      return <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />;
    }
    
    // Ícones de telefone
    if (key.includes('telefone') || key.includes('celular')) {
      return <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />;
    }
    
    // Ícones de data
    if (key.includes('data') || key.includes('criado') || key.includes('nascimento')) {
      return <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />;
    }
    
    // Sem ícone para outros campos
    return null;
  };

  const rawPhotoUrl = String(lead[config.photoField] || '');
  const photoSrc = hasPhotoError ? NO_PHOTO_SVG : getLeadPhotoUrl(rawPhotoUrl);
  
  const mainValues = config.mainFields.map(key => ({ key, value: String(getFieldValue(key) || '') }));
  const detailValues = config.detailFields.map(key => ({ key, value: String(getFieldValue(key) || ''), label: getFieldLabel(key) }));
  // ✅ Mostrar badges mesmo se vazios (com placeholder)
  const badgeValues = config.badgeFields.map(key => ({ 
    key, 
    value: String(getFieldValue(key) || 'Não informado') 
  }));
  
  // DEBUG: Ver valores dos badges
  console.log('[LeadCard] badgeFields config:', config.badgeFields);
  console.log('[LeadCard] badgeValues:', badgeValues);
  console.log('[LeadCard] lead.scouter:', lead.scouter);
  console.log('[LeadCard] lead.projeto_comercial:', lead.projeto_comercial);
  console.log('[LeadCard] lead.ficha_confirmada:', lead.ficha_confirmada);

  const cardSizeClasses = {
    small: "max-w-xs",
    medium: "max-w-md",
    large: "max-w-full"
  };

  return (
    <Card className={cn(
      "w-full h-full relative overflow-hidden border-2 shadow-lg",
      cardSizeClasses[config.photoSize]
    )}>
      {/* Foto do Lead - Fullscreen */}
      <div className="absolute inset-0 bg-muted overflow-hidden flex items-center justify-center">
        <img
          src={photoSrc}
          alt={String(lead.name || "Lead")}
          className={cn(
            hasPhotoError || !rawPhotoUrl || rawPhotoUrl === '' 
              ? "w-2/3 h-2/3 object-contain" 
              : "w-full h-full object-cover"
          )}
          onError={() => {
            if (!hasPhotoError) {
              setHasPhotoError(true);
            }
          }}
        />
      </div>
        
      {/* Badges de Status - Centralizado no Topo */}
      <div className="absolute top-2 inset-x-0 mx-auto flex flex-row flex-nowrap items-center justify-center gap-1 z-10 max-w-[95%] overflow-hidden">
          {/* FASE 4: Badge de erro de sincronização */}
          {lead.has_sync_errors && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive" className="backdrop-blur-sm bg-destructive/90 text-[10px] md:text-xs flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  Erro Sync
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-md" side="left">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Campos com erro de sincronização:</p>
                  {lead.sync_errors && typeof lead.sync_errors === 'object' && 'errors' in lead.sync_errors && Array.isArray(lead.sync_errors.errors) && lead.sync_errors.errors.map((err: any, i: number) => (
                    <div key={i} className="text-xs border-l-2 border-destructive pl-2 py-1">
                      <span className="font-mono text-destructive-foreground font-semibold">{err.field}</span>
                      <br />
                      <span className="text-muted-foreground">{err.error}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          
          {badgeValues.length > 0 && badgeValues.map((badge, idx) => {
            const isId = badge.key === 'id';
            const isProject = badge.key === 'projeto_comercial';
            const isScouter = badge.key === 'scouter';
            
            // ✅ Badge ID: verde se confirmada, cinza se não
            const isFichaConfirmada = lead.ficha_confirmada === true;
            
            return (
              <Badge 
                key={idx} 
                variant="default"
                className={cn(
                  "backdrop-blur-sm text-[9px] md:text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 whitespace-nowrap flex-shrink-0",
                  isId && isFichaConfirmada && "bg-green-500/90 text-white hover:bg-green-500/80",
                  isId && !isFichaConfirmada && "bg-gray-500/90 text-white hover:bg-gray-500/80",
                  isProject && "bg-yellow-500/90 text-white hover:bg-yellow-500/80", // ✅ Amarelo
                  isScouter && "bg-blue-500/90 text-white hover:bg-blue-500/80", // ✅ Azul
                )}
              >
                {isProject && <Building2 className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />}
                {isScouter && <UserCheck className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />}
                <span className="truncate max-w-[100px]">{badge.value}</span>
              </Badge>
            );
          })}
      </div>

      {/* Informações do Lead - Overlay com Gradiente Claro */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="bg-gradient-to-t from-white/95 via-white/85 to-transparent px-4 py-5 pb-4 space-y-2">
          <div>
            {/* Nome do Modelo - Grande e Negrito */}
            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-0.5 truncate leading-tight text-gray-900">
              {mainValues[0]?.value || "Sem nome do modelo"}
            </h3>
            
            {/* Nome - Menor, como referência */}
            {mainValues[1]?.value && mainValues[1].value !== '-' && (
              <p className="text-sm md:text-base text-gray-700 truncate font-medium">
                {mainValues[1].value}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            {detailValues.map((detail, idx) => {
              const icon = getFieldIcon(detail.key);
              
              return (
                <div key={idx} className="flex items-start gap-2 text-xs md:text-sm">
                  {icon}
                  <span className="font-medium whitespace-nowrap text-gray-900">{detail.label}:</span>
                  <span className="text-gray-700 flex-1 break-words leading-tight">
                    {detail.value || '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
