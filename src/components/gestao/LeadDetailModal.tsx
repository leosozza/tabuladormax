import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Calendar, Phone, DollarSign, Mail, Home as HomeIcon } from "lucide-react";
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
  telefone_casa: string | null;
  telefone_trabalho: string | null;
  data_criacao_ficha: string | null;
  data_agendamento: string | null;
  valor_ficha: number | null;
  etapa: string | null;
  ficha_confirmada: boolean | null;
  compareceu: boolean | null;
  qualidade_lead: string | null;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Foto e Nome */}
          <div className="flex items-start gap-4">
            {lead.photo_url ? (
              <img
                src={lead.photo_url}
                alt={lead.name || "Lead"}
                className="w-24 h-24 rounded-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-2xl font-bold">{lead.name || "Sem nome"}</h3>
              {lead.scouter && (
                <p className="text-sm text-muted-foreground">Captado por: {lead.scouter}</p>
              )}
              <div className="flex gap-2 mt-2">
                {lead.etapa && <Badge>{lead.etapa}</Badge>}
                {lead.ficha_confirmada && <Badge variant="secondary">Confirmado</Badge>}
                {lead.compareceu && <Badge variant="outline">Compareceu</Badge>}
                {lead.qualidade_lead && (
                  <Badge variant={lead.qualidade_lead === "aprovado" ? "default" : "destructive"}>
                    {lead.qualidade_lead}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contatos */}
          <div>
            <h4 className="font-semibold mb-3">Informações de Contato</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lead.celular && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Celular:</span>
                  <span>{lead.celular}</span>
                </div>
              )}
              {lead.telefone_casa && (
                <div className="flex items-center gap-2 text-sm">
                  <HomeIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Tel. Casa:</span>
                  <span>{lead.telefone_casa}</span>
                </div>
              )}
              {lead.telefone_trabalho && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Tel. Trabalho:</span>
                  <span>{lead.telefone_trabalho}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Localização */}
          <div>
            <h4 className="font-semibold mb-3">Localização</h4>
            <div className="space-y-2">
              {lead.local_abordagem && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Local de Abordagem:</span>
                    <p className="text-muted-foreground">{lead.local_abordagem}</p>
                  </div>
                </div>
              )}
              {lead.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Endereço:</span>
                    <p className="text-muted-foreground">{lead.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Datas e Valores */}
          <div>
            <h4 className="font-semibold mb-3">Informações Adicionais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lead.data_criacao_ficha && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Data Cadastro:</span>
                  <span>{format(new Date(lead.data_criacao_ficha), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {lead.data_agendamento && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Agendamento:</span>
                  <span>{format(new Date(lead.data_agendamento), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {lead.valor_ficha && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Valor da Ficha:</span>
                  <span className="font-bold text-primary">R$ {lead.valor_ficha.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
