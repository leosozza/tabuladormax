import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { TinderCardConfig } from "@/hooks/useTinderCardConfig";
import { ALL_LEAD_FIELDS } from "@/config/leadFields";
import { cn } from "@/lib/utils";

interface TinderCardPreviewProps {
  config: TinderCardConfig;
}

export function TinderCardPreview({ config }: TinderCardPreviewProps) {
  const mockLead: Record<string, any> = {
    id: "739952",
    name: "Rayssa Silva",
    nome_modelo: "Bernardo Costa",
    scouter: "CINTIA BARRETO PINHEIROS",
    projeto_comercial: "SELETIVA SÃO PAULO - PINHEIROS",
    criado: "20/11/2025",
    local_abordagem: "Shopping Paulista",
    etapa: "AGENDADO",
    ficha_confirmada: "SIM",
    presenca_confirmada: true,
    photo_url: ""
  };

  const getFieldLabel = (key: string) => 
    ALL_LEAD_FIELDS.find(f => f.key === key)?.label || key;

  const getFieldValue = (key: string) => {
    const value = mockLead[key];
    const field = ALL_LEAD_FIELDS.find(f => f.key === key);
    
    if (field?.formatter) {
      return field.formatter(value, mockLead) || '-';
    }
    
    return value?.toString() || '-';
  };

  const photoClasses = {
    circle: "rounded-full aspect-square",
    rounded: "rounded-lg aspect-[3/4]",
    fullscreen: "rounded-none aspect-[3/4] h-[500px]"
  };

  const sizeClasses = {
    small: "max-w-xs",
    medium: "max-w-md",
    large: "max-w-lg"
  };

  return (
    <div className="flex justify-center items-start p-4">
      <Card className={cn(
        "w-full overflow-hidden border-2 shadow-lg",
        sizeClasses[config.photoSize]
      )}>
        {/* Photo */}
        <div className={cn(
          "relative bg-muted overflow-hidden",
          photoClasses[config.photoStyle]
        )}>
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-16 h-16 text-muted-foreground opacity-20" />
          </div>
          
          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            {config.badgeFields.map((fieldKey, idx) => (
              <Badge key={idx} variant="secondary" className="backdrop-blur-sm bg-background/80 text-xs">
                {getFieldValue(fieldKey)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 space-y-3">
          {/* Main Fields - Hierarquia Visual */}
          <div>
            {/* Nome do Modelo - Grande e Negrito */}
            <h3 className="text-xl md:text-2xl font-bold truncate leading-tight">
              {config.mainFields.length > 0 ? getFieldValue(config.mainFields[0]) : "Sem nome do modelo"}
            </h3>
            
            {/* Nome - Menor, como referência */}
            {config.mainFields[1] && (
              <p className="text-sm text-muted-foreground truncate font-medium mt-1">
                {getFieldValue(config.mainFields[1])}
              </p>
            )}
          </div>

          {/* Detail Fields */}
          {config.detailFields.length > 0 && (
            <div className="space-y-2">
              {config.detailFields.map((fieldKey, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="font-medium whitespace-nowrap">{getFieldLabel(fieldKey)}:</span>
                  <span className="text-muted-foreground flex-1 break-words">
                    {getFieldValue(fieldKey)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
