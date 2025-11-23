import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Award, Plus, Clock } from "lucide-react";
import { ScoutersKanban } from "@/components/scouters/ScoutersKanban";
import { ScouterDialog } from "@/components/scouters/ScouterDialog";
import { ScouterPerformanceDialog } from "@/components/scouters/ScouterPerformanceDialog";
import { useToast } from "@/hooks/use-toast";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";

interface Scouter {
  id: string;
  name: string;
  photo_url?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  responsible_user_id?: string;
  last_activity_at?: string;
  total_leads: number;
  leads_last_30_days: number;
  status: 'ativo' | 'inativo' | 'standby' | 'blacklist';
  notes?: string;
}

export default function GestaoScouters() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedScouter, setSelectedScouter] = useState<Scouter | null>(null);

  // Fetch scouters
  const { data: scouters = [], isLoading } = useQuery({
    queryKey: ["scouters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scouters")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Scouter[];
    },
  });

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("scouters")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["scouters"] });
      toast({
        title: "Status atualizado",
        description: `Scouter movido para ${variables.status}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para criar/editar scouter
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedScouter) {
        const { error } = await supabase
          .from("scouters")
          .update(data)
          .eq("id", selectedScouter.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scouters").insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scouters"] });
      toast({
        title: selectedScouter ? "Scouter atualizado" : "Scouter cadastrado",
        description: selectedScouter
          ? "Informações atualizadas com sucesso"
          : "Novo scouter cadastrado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stats
  const activeScouters = scouters.filter((s) => s.status === "ativo").length;
  const totalLeads = scouters.reduce((sum, s) => sum + s.total_leads, 0);
  const totalLeads30d = scouters.reduce((sum, s) => sum + s.leads_last_30_days, 0);
  const avgLeadsPerScouter =
    activeScouters > 0 ? (totalLeads / activeScouters).toFixed(1) : "0";

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleEdit = (scouter: Scouter) => {
    setSelectedScouter(scouter);
    setDialogOpen(true);
  };

  const handleViewPerformance = (scouter: Scouter) => {
    console.log("🔍 [DEBUG] Abrindo performance de:", scouter.name, scouter);
    console.log("🔍 [DEBUG] Estado atual performanceDialogOpen:", performanceDialogOpen);
    setSelectedScouter(scouter);
    setPerformanceDialogOpen(true);
    console.log("✅ [DEBUG] Dialog state definido para true");
  };

  const handleCreate = () => {
    setSelectedScouter(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: any) => {
    await saveMutation.mutateAsync(data);
  };

  return (
    <GestaoPageLayout
      title="Gestão de Scouters"
      description="Gerencie o status e performance da equipe de scouters"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scouters Ativos
            </CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{activeScouters}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {scouters.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads (30 dias)
            </CardTitle>
            <Clock className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{totalLeads30d}</div>
            <p className="text-xs text-muted-foreground mt-1">Último mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média por Scouter
            </CardTitle>
            <Award className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {avgLeadsPerScouter}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leads por scouter ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Quadro de Scouters</h2>
          <p className="text-sm text-muted-foreground">
            Arraste os cards para mudar o status
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Scouter
        </Button>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando scouters...</p>
        </div>
      ) : (
        <ScoutersKanban
          scouters={scouters}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onViewPerformance={handleViewPerformance}
        />
      )}

      {/* Dialogs */}
      <ScouterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scouter={selectedScouter}
        onSave={handleSave}
      />

      <ScouterPerformanceDialog
        open={performanceDialogOpen}
        onOpenChange={setPerformanceDialogOpen}
        scouter={selectedScouter}
      />
    </GestaoPageLayout>
  );
}
