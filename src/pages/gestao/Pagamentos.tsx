import { useState } from "react";
import { LeadColumnConfigProvider } from "@/hooks/useLeadColumnConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectScouterSelector } from "@/components/gestao/payments/ProjectScouterSelector";
import { PaymentDetailModal } from "@/components/gestao/payments/PaymentDetailModal";
import { RetroactivePaymentUpdate } from "@/components/gestao/payments/RetroactivePaymentUpdate";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { createDateFilter } from "@/lib/dateUtils";
import type { GestaoFilters } from "@/types/filters";
import { CreditCard, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function GestaoPagamentosContent() {
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null,
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedScouters, setSelectedScouters] = useState<string[]>([]);
  const [currentScouterIndex, setCurrentScouterIndex] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const { toast } = useToast();

  const handleScoutersSelected = async (projectId: string, scouterNames: string[]) => {
    setSelectedProjectId(projectId);
    setSelectedScouters(scouterNames);
    setCurrentScouterIndex(0);

    // Buscar nome do projeto
    const { data: project } = await supabase
      .from('commercial_projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (project) {
      setProjectName(project.name);
    }

    // Abrir modal do primeiro scouter
    if (scouterNames.length > 0) {
      setDetailModalOpen(true);
    }
  };

  const handleNextScouter = () => {
    if (currentScouterIndex < selectedScouters.length - 1) {
      setCurrentScouterIndex(currentScouterIndex + 1);
      setDetailModalOpen(true);
    }
  };

  const handleModalClose = (open: boolean) => {
    setDetailModalOpen(open);
    if (!open && currentScouterIndex < selectedScouters.length - 1) {
      // Perguntar se quer processar o próximo
      handleNextScouter();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos de Scouters</h1>
          <p className="text-muted-foreground">
            Gestão completa de pagamentos por projeto e scouter
          </p>
        </div>
      </div>

      <Tabs defaultValue="new-payments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="new-payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Novos Pagamentos
          </TabsTrigger>
          <TabsTrigger value="retroactive" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Atualização Retroativa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-payments" className="space-y-6">
          {/* Filtros */}
          <GestaoFiltersComponent
            filters={filters}
            onChange={setFilters}
          />

          {/* Seleção de Projeto e Scouters */}
          <ProjectScouterSelector
            startDate={filters.dateFilter.startDate}
            endDate={filters.dateFilter.endDate}
            selectedProjectId={filters.projectId}
            onScoutersSelected={handleScoutersSelected}
          />
        </TabsContent>

        <TabsContent value="retroactive">
          <RetroactivePaymentUpdate />
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhamento */}
      {selectedProjectId && selectedScouters.length > 0 && (
        <PaymentDetailModal
          open={detailModalOpen}
          onOpenChange={handleModalClose}
          projectId={selectedProjectId}
          projectName={projectName}
          scouter={selectedScouters[currentScouterIndex]}
          startDate={filters.dateFilter.startDate}
          endDate={filters.dateFilter.endDate}
        />
      )}
    </div>
  );
}

export default function GestaoPagamentos() {
  return (
    <LeadColumnConfigProvider>
      <GestaoPagamentosContent />
    </LeadColumnConfigProvider>
  );
}
