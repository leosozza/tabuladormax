import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSyscallCampaigns } from "@/hooks/useSyscallCampaigns";
import { CampaignCard } from "@/components/discador/CampaignCard";
import { CreateCampaignDialog } from "@/components/discador/CreateCampaignDialog";
import { MainLayout } from "@/components/layouts/MainLayout";

export default function DiscadorCampanhas() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { campaigns, isLoading } = useSyscallCampaigns();

  return (
    <MainLayout
      title="Campanhas"
      subtitle="Gerencie suas campanhas de discagem"
      actions={
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      }
    >
      <div className="space-y-6">

      {isLoading ? (
        <div>Carregando campanhas...</div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhuma campanha criada ainda</p>
          <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
            Criar Primeira Campanha
          </Button>
        </div>
      )}

      <CreateCampaignDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      </div>
    </MainLayout>
  );
}
