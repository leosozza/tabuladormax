import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Calendar, Phone, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: number;
  name: string | null;
  photo_url: string | null;
  scouter: string | null;
  local_abordagem: string | null;
  address: string | null;
  celular: string | null;
  data_criacao_ficha: string | null;
  valor_ficha: number | null;
  etapa: string | null;
}

interface LeadCardProps {
  lead: Lead;
}

export default function LeadCard({ lead }: LeadCardProps) {
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-2">
      {/* Foto do Lead */}
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {lead.photo_url ? (
          <img
            src={lead.photo_url}
            alt={lead.name || "Lead"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-24 h-24 text-muted-foreground opacity-20" />
          </div>
        )}
        
        {/* Badge de Status */}
        {lead.etapa && (
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
              {lead.etapa}
            </Badge>
          </div>
        )}
      </div>

      {/* Informações do Lead */}
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">{lead.name || "Sem nome"}</h3>
          {lead.scouter && (
            <p className="text-sm text-muted-foreground">Captado por: {lead.scouter}</p>
          )}
        </div>

        <div className="space-y-3">
          {lead.local_abordagem && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">Local:</span>
              <span className="text-muted-foreground">{lead.local_abordagem}</span>
            </div>
          )}

          {lead.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="font-medium">Endereço:</span>
              <span className="text-muted-foreground flex-1">{lead.address}</span>
            </div>
          )}

          {lead.celular && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">Celular:</span>
              <span className="text-muted-foreground">{lead.celular}</span>
            </div>
          )}

          {lead.data_criacao_ficha && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">Cadastro:</span>
              <span className="text-muted-foreground">
                {format(new Date(lead.data_criacao_ficha), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          )}

          {lead.valor_ficha && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">Valor:</span>
              <span className="text-muted-foreground">
                R$ {lead.valor_ficha.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
