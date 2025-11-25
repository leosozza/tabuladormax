import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSyscallCampaigns } from "@/hooks/useSyscallCampaigns";
import { Send } from "lucide-react";

export function LeadBatchSelector() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const { campaigns, uploadLeads, isUploading } = useSyscallCampaigns();

  const { data: leads } = useQuery({
    queryKey: ["leads-for-dialer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, celular, projeto_comercial")
        .not("celular", "is", null)
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const handleToggleLead = (leadId: number) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSend = () => {
    if (!selectedCampaignId || selectedLeads.length === 0) return;

    const campaign = campaigns?.find((c) => c.id === selectedCampaignId);
    if (!campaign) return;

    const leadsToSend = leads
      ?.filter((l) => selectedLeads.includes(l.id))
      .map((l) => ({
        lead_id: l.id,
        telefone: l.celular,
        nome: l.name || "",
      })) || [];

    uploadLeads({
      campaign_id: campaign.id,
      syscall_campaign_id: campaign.syscall_campaign_id,
      leads: leadsToSend,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns?.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Selecionar Leads ({selectedLeads.length} selecionados)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {leads?.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
              >
                <Checkbox
                  checked={selectedLeads.includes(lead.id)}
                  onCheckedChange={() => handleToggleLead(lead.id)}
                />
                <div className="flex-1">
                  <p className="font-medium">{lead.name || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{lead.celular}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={!selectedCampaignId || selectedLeads.length === 0 || isUploading}
        >
          <Send className="mr-2 h-4 w-4" />
          Enviar {selectedLeads.length} Leads
        </Button>
      </div>
    </div>
  );
}
