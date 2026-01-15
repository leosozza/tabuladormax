import { Info, MessageCircle, Loader2, AlertCircle, Camera, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface StatusItem {
  label: string;
  icon: LucideIcon | null;
  colorClass: string;
  description: string;
}

const statusLegend: StatusItem[] = [
  {
    label: "WhatsApp Enviado",
    icon: MessageCircle,
    colorClass: "bg-emerald-500 text-white",
    description: "Template foi entregue ou lido pelo lead"
  },
  {
    label: "Aguardando",
    icon: Loader2,
    colorClass: "bg-amber-500 text-white",
    description: "Template enviado, aguardando confirmação de entrega"
  },
  {
    label: "Erro no envio",
    icon: AlertCircle,
    colorClass: "bg-destructive text-destructive-foreground",
    description: "Falha ao enviar (ex: número sem WhatsApp, saldo insuficiente)"
  },
  {
    label: "Foto",
    icon: Camera,
    colorClass: "bg-blue-500 text-white",
    description: "Lead possui foto cadastrada - clique para visualizar"
  },
  {
    label: "Confirmado",
    icon: CheckCircle2,
    colorClass: "bg-green-500 text-white",
    description: "Ficha do lead foi confirmada pelo telemarketing"
  },
  {
    label: "Duplicado",
    icon: null,
    colorClass: "bg-amber-500 text-white",
    description: "Existe outro registro com o mesmo telefone"
  },
  {
    label: "Duplicado Excluído",
    icon: null,
    colorClass: "bg-destructive text-destructive-foreground",
    description: "O registro duplicado foi excluído"
  }
];

export function StatusLegendPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5 p-0 hover:bg-muted"
          aria-label="Ver legenda de status"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-3" 
        align="start"
        side="bottom"
      >
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Legenda de Status</h4>
          <div className="space-y-2.5">
            {statusLegend.map((status) => {
              const IconComponent = status.icon;
              return (
                <div key={status.label} className="flex items-start gap-2">
                  <Badge className={`${status.colorClass} text-xs whitespace-nowrap shrink-0`}>
                    {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
                    {status.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {status.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
