import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";
import { useSyscallCampaigns } from "@/hooks/useSyscallCampaigns";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  syscall_campaign_id: number;
  nome: string;
  status: string;
  leads_enviados: number;
  leads_discados: number;
  leads_atendidos: number;
}

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { changeCampaignStatus } = useSyscallCampaigns();

  const statusColors = {
    criada: "bg-gray-500",
    ativa: "bg-green-500",
    pausada: "bg-yellow-500",
    finalizada: "bg-red-500",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{campaign.nome}</CardTitle>
          <Badge className={statusColors[campaign.status as keyof typeof statusColors]}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Enviados</p>
            <p className="font-bold">{campaign.leads_enviados}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Discados</p>
            <p className="font-bold">{campaign.leads_discados}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Atendidos</p>
            <p className="font-bold">{campaign.leads_atendidos}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(campaign.status === "criada" || campaign.status === "pausada") && (
            <Button
              size="sm"
              onClick={() =>
                changeCampaignStatus({
                  syscall_campaign_id: campaign.syscall_campaign_id,
                  status: "play",
                })
              }
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar
            </Button>
          )}

          {campaign.status === "ativa" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                changeCampaignStatus({
                  syscall_campaign_id: campaign.syscall_campaign_id,
                  status: "pause",
                })
              }
            >
              <Pause className="h-4 w-4 mr-1" />
              Pausar
            </Button>
          )}

          {campaign.status !== "finalizada" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                changeCampaignStatus({
                  syscall_campaign_id: campaign.syscall_campaign_id,
                  status: "stop",
                })
              }
            >
              <Square className="h-4 w-4 mr-1" />
              Parar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
