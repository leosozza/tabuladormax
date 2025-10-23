import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import LeadCard from "@/components/gestao/LeadCard";
import SwipeActions from "@/components/gestao/SwipeActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, SkipForward } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AnaliseLeads() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Buscar leads não analisados
  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads-pending-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .is("qualidade_lead", null)
        .order("criado", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Estatísticas da sessão
  const { data: sessionStats } = useQuery({
    queryKey: ["analysis-session-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { approved: 0, rejected: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("leads")
        .select("qualidade_lead")
        .eq("analisado_por", user.id)
        .gte("data_analise", today.toISOString());

      if (error) throw error;

      return {
        approved: data?.filter(l => l.qualidade_lead === "aprovado").length || 0,
        rejected: data?.filter(l => l.qualidade_lead === "rejeitado").length || 0,
      };
    },
  });

  // Mutation para analisar lead
  const analyzeMutation = useMutation({
    mutationFn: async ({ leadId, quality }: { leadId: number; quality: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("leads")
        .update({
          qualidade_lead: quality,
          analisado_por: user.id,
          data_analise: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads-pending-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["analysis-session-stats"] });
      
      if (variables.quality === "aprovado") {
        toast({ title: "Lead aprovado!", variant: "default" });
      } else if (variables.quality === "rejeitado") {
        toast({ title: "Lead rejeitado", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Erro ao analisar lead", variant: "destructive" });
    },
  });

  const currentLead = leads?.[currentIndex];
  const totalLeads = leads?.length || 0;
  const progress = totalLeads > 0 ? ((currentIndex + 1) / totalLeads) * 100 : 0;

  const handleApprove = () => {
    if (!currentLead) return;
    analyzeMutation.mutate({ leadId: currentLead.id, quality: "aprovado" });
    goToNext();
  };

  const handleReject = () => {
    if (!currentLead) return;
    analyzeMutation.mutate({ leadId: currentLead.id, quality: "rejeitado" });
    goToNext();
  };

  const handleSkip = () => {
    goToNext();
  };

  const goToNext = () => {
    if (currentIndex < totalLeads - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
      toast({ title: "Todos os leads foram analisados!", variant: "default" });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Análise de Leads</h1>
          <p className="text-muted-foreground">Avalie a qualidade dos leads captados</p>
        </div>

        {/* Estatísticas da Sessão */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Aprovados Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {sessionStats?.approved || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Rejeitados Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {sessionStats?.rejected || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <SkipForward className="w-4 h-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalLeads - currentIndex}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progresso */}
        {totalLeads > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Lead {currentIndex + 1} de {totalLeads}
              </span>
              <span className="text-sm text-muted-foreground">
                {progress.toFixed(0)}% completo
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Card do Lead Atual */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando leads...</p>
            </div>
          </div>
        ) : !currentLead ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Todos os leads foram analisados!</h3>
              <p className="text-muted-foreground mb-4">
                Não há mais leads pendentes de análise no momento.
              </p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["leads-pending-analysis"] })}>
                Verificar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto">
            <LeadCard lead={currentLead} />
            
            {/* Ações de Swipe */}
            <SwipeActions
              onApprove={handleApprove}
              onReject={handleReject}
              onSkip={handleSkip}
              disabled={analyzeMutation.isPending}
            />

            {/* Legenda */}
            <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Aprovar (Lead de qualidade)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Rejeitar (Lead sem potencial)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span>Pular (Avaliar depois)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
