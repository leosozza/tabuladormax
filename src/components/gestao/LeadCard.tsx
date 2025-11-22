import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, MapPin, Calendar, Phone, AlertCircle } from "lucide-react";
import { useTinderCardConfig } from "@/hooks/useTinderCardConfig";
import { ALL_LEAD_FIELDS } from "@/config/leadFields";
import { getLeadPhotoUrl } from "@/lib/leadPhotoUtils";
import noPhotoPlaceholder from "@/assets/no-photo-placeholder.png";

interface LeadCardProps {
  lead: Record<string, unknown>; // Dynamic lead object
}

export default function LeadCard({ lead }: LeadCardProps) {
  const { config } = useTinderCardConfig();
  
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
    // Ícones de localização
    if (key.includes('local') || key.includes('address') || key.includes('localizacao')) {
      return <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    }
    
    // Ícones de telefone
    if (key.includes('telefone') || key.includes('celular')) {
      return <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />;
    }
    
    // Ícones de data
    if (key.includes('data') || key.includes('criado') || key.includes('nascimento')) {
      return <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />;
    }
    
    // Sem ícone para outros campos
    return null;
  };

  const photoUrl = String(lead[config.photoField] || '');
  const mainValues = config.mainFields.map(key => ({ key, value: String(getFieldValue(key) || '') }));
  const detailValues = config.detailFields.map(key => ({ key, value: String(getFieldValue(key) || ''), label: getFieldLabel(key) }));
  const badgeValues = config.badgeFields.map(key => ({ key, value: String(getFieldValue(key) || '') })).filter(v => v.value);

  const photoContainerClasses = {
    circle: "aspect-square rounded-full min-h-[280px] max-h-[380px] sm:max-h-[420px] md:max-h-[460px] w-full",
    rounded: "aspect-[3/4] rounded-lg min-h-[320px] max-h-[450px] sm:max-h-[500px] md:max-h-[550px] w-full",
    fullscreen: "w-full rounded-none min-h-[350px] max-h-[480px] sm:max-h-[540px] md:max-h-[600px]"
  };

  const isPlaceholder = photoUrl === noPhotoPlaceholder || !photoUrl || photoUrl === getLeadPhotoUrl(null);

  const cardSizeClasses = {
    small: "max-w-xs",
    medium: "max-w-md",
    large: "max-w-full"
  };

  return (
    <Card className={cn(
      "w-full h-full flex flex-col overflow-hidden border-2 shadow-lg",
      cardSizeClasses[config.photoSize]
    )}>
      {/* Foto do Lead */}
      <div className={cn(
        "relative bg-muted overflow-hidden flex-shrink-0",
        photoContainerClasses[config.photoStyle],
        isPlaceholder && "border-2 border-dashed border-border"
      )}>
        <img
          src={getLeadPhotoUrl(photoUrl)}
          alt={String(lead.name || "Lead")}
          className="w-full h-full object-cover"
        />
        
        {/* Indicador visual para "sem foto" */}
        {isPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
            <div className="text-center">
              <User className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Sem Foto</p>
            </div>
          </div>
        )}
        
        {/* Badges de Status */}
        <div className="absolute top-2 right-2 md:top-3 md:right-3 lg:top-4 lg:right-4 flex flex-col gap-1.5 md:gap-2">
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
          
          {badgeValues.length > 0 && badgeValues.map((badge, idx) => (
            <Badge key={idx} variant="secondary" className="backdrop-blur-sm bg-background/80 text-[10px] md:text-xs">
              {badge.value}
            </Badge>
          ))}
        </div>
      </div>

      {/* Informações do Lead */}
      <CardContent className="flex-1 min-h-0 overflow-y-auto p-2.5 md:p-3 space-y-1.5 md:space-y-2">
        <div>
          {/* Nome do Modelo - Grande e Negrito */}
          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-0.5 truncate leading-tight">
            {mainValues[0]?.value || "Sem nome do modelo"}
          </h3>
          
          {/* Nome - Menor, como referência */}
          {mainValues[1]?.value && mainValues[1].value !== '-' && (
            <p className="text-sm md:text-base text-muted-foreground truncate font-medium">
              {mainValues[1].value}
            </p>
          )}
        </div>

        <div className="space-y-1 md:space-y-1.5">
          {detailValues.map((detail, idx) => {
            const icon = getFieldIcon(detail.key);
            
            return (
              <div key={idx} className="flex items-start gap-1.5 md:gap-2 text-[11px] md:text-xs lg:text-sm">
                {icon}
                <span className="font-medium whitespace-nowrap">{detail.label}:</span>
                <span className="text-muted-foreground flex-1 break-words leading-tight">
                  {detail.value || '-'}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
