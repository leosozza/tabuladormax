import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import LeadCard from "@/components/gestao/LeadCard";
import SwipeActions from "@/components/gestao/SwipeActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, SkipForward, Download, WifiOff, Settings2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { TinderCardConfigModal } from "@/components/gestao/TinderCardConfigModal";

export default function AnaliseLeads() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { canInstall, promptInstall, isInstalled } = useInstallPrompt();
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing, addToQueue, syncPendingEvaluations } = useOfflineQueue();
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null
  });

  // Buscar leads não analisados
  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads-pending-analysis", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .is("qualidade_lead", null)
        .order("criado", { ascending: false })
        .limit(50);

      // Filtro de data
      query = query
        .gte("criado", filters.dateFilter.startDate.toISOString())
        .lte("criado", filters.dateFilter.endDate.toISOString());

      // Filtro de projeto
      if (filters.projectId) {
        query = query.eq("commercial_project_id", filters.projectId);
      }

      // Filtro de scouter
      if (filters.scouterId) {
        query = query.eq("scouter", filters.scouterId);
      }
      
      const { data, error } = await query;
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

      // If offline, queue the evaluation
      if (!isOnline) {
        await addToQueue(leadId, quality, user.id);
        return;
      }

      // If online, save directly
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
      // Only invalidate if online (queued items don't affect the current view)
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ["leads-pending-analysis"] });
        queryClient.invalidateQueries({ queryKey: ["analysis-session-stats"] });
      }
      
      if (variables.quality === "aprovado") {
        toast({ title: isOnline ? "Lead aprovado!" : "Lead aprovado (offline)", variant: "default" });
      } else if (variables.quality === "rejeitado") {
        toast({ title: isOnline ? "Lead rejeitado" : "Lead rejeitado (offline)", variant: "destructive" });
      }
    },
    onError: (error) => {
      console.error('[AnaliseLeads] Error analyzing lead:', error);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
    
    if (cardRef.current) {
      const diff = e.touches[0].clientX - touchStart;
      cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.1}deg)`;
      
      if (diff > 100) {
        cardRef.current.style.borderColor = 'hsl(var(--success))';
      } else if (diff < -100) {
        cardRef.current.style.borderColor = 'hsl(var(--destructive))';
      } else {
        cardRef.current.style.borderColor = 'transparent';
      }
    }
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchStart - touchEnd;
    const minSwipeDistance = 100;

    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.borderColor = '';
    }

    if (swipeDistance > minSwipeDistance) {
      handleReject();
    } else if (swipeDistance < -minSwipeDistance) {
      handleApprove();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-warning text-warning-foreground py-2 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Modo Offline - As alterações serão sincronizadas quando reconectar
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}
      
      {isOnline && pendingCount > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white py-2 px-4 text-center flex items-center justify-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : `${pendingCount} avaliação(ões) aguardando sincronização`}
          {!isSyncing && (
            <Button
              size="sm"
              variant="secondary"
              onClick={syncPendingEvaluations}
              className="ml-2 h-6"
            >
              Sincronizar agora
            </Button>
          )}
        </div>
      )}
      
      <div className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Análise de Leads</h1>
            <p className="text-muted-foreground">Avalie a qualidade dos leads captados</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setConfigModalOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Settings2 className="w-4 h-4" />
              Configurar Cartão
            </Button>
            
            {canInstall && !isInstalled && (
              <Button
                onClick={promptInstall}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Instalar App
              </Button>
            )}
            
            {isInstalled && (
              <Badge variant="secondary" className="gap-2">
                ✅ App Instalado
              </Badge>
            )}
          </div>
        </div>

        <GestaoFiltersComponent filters={filters} onChange={setFilters} />

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
            <div 
              ref={cardRef}
              className="swipe-card touch-none transition-transform border-4 rounded-lg"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <LeadCard lead={currentLead} />
            </div>
            
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
      
      {/* Configuration Modal */}
      <TinderCardConfigModal 
        open={configModalOpen} 
        onOpenChange={setConfigModalOpen} 
      />
    </div>
  );
}
