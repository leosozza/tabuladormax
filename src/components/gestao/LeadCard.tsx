import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Calendar, Phone } from "lucide-react";
import { useTinderCardConfig } from "@/hooks/useTinderCardConfig";
import { ALL_LEAD_FIELDS } from "@/config/leadFields";

interface LeadCardProps {
  lead: Record<string, unknown>; // Dynamic lead object
}

export default function LeadCard({ lead }: LeadCardProps) {
  const { config } = useTinderCardConfig();

  const getFieldLabel = (key: string) => {
    const field = ALL_LEAD_FIELDS.find(f => f.key === key);
    return field?.label || key;
  };

  const getFieldValue = (key: string) => {
    const value = lead[key];
    const field = ALL_LEAD_FIELDS.find(f => f.key === key);
    
    if (!value) return null;
    
    // Use the formatter from the field config if available
    if (field?.formatter) {
      return field.formatter(value, lead);
    }
    
    return value;
  };

  const getFieldIcon = (key: string) => {
    if (key.includes('local') || key.includes('address') || key.includes('localizacao')) {
      return <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
    if (key.includes('telefone') || key.includes('celular')) {
      return <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
    if (key.includes('data') || key.includes('criado')) {
      return <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
    return null;
  };

  const photoUrl = String(lead[config.photoField] || '');
  const mainValues = config.mainFields.map(key => ({ key, value: String(getFieldValue(key) || '') }));
  const detailValues = config.detailFields.map(key => ({ key, value: String(getFieldValue(key) || ''), label: getFieldLabel(key) }));
  const badgeValues = config.badgeFields.map(key => ({ key, value: String(getFieldValue(key) || '') })).filter(v => v.value);

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-2 shadow-lg">
      {/* Foto do Lead */}
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={String(lead.name || "Lead")}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground opacity-20" />
          </div>
        )}
        
        {/* Badges de Status */}
        {badgeValues.length > 0 && (
          <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-2">
            {badgeValues.map((badge, idx) => (
              <Badge key={idx} variant="secondary" className="backdrop-blur-sm bg-background/80 text-xs md:text-sm">
                {badge.value}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Informações do Lead */}
      <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
        <div>
          <h3 className="text-xl md:text-2xl font-bold mb-1 truncate">
            {mainValues[0]?.value || "Sem nome"}
          </h3>
          {mainValues[1]?.value && (
            <p className="text-sm text-muted-foreground">{mainValues[1].value}</p>
          )}
        </div>

        <div className="space-y-2 md:space-y-3">
          {detailValues.map((detail, idx) => {
            if (!detail.value) return null;
            
            const icon = getFieldIcon(detail.key);
            
            return (
              <div key={idx} className="flex items-start gap-2 text-xs md:text-sm">
                {icon}
                <span className="font-medium whitespace-nowrap">{detail.label}:</span>
                <span className="text-muted-foreground flex-1 break-words">{detail.value}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
