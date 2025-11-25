import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import { ScoutersKanban } from "@/components/scouters/ScoutersKanban";
import { ScoutersListView } from "@/components/scouters/ScoutersListView";
import { ScouterDialog } from "@/components/scouters/ScouterDialog";
import { ScouterPerformanceDialog } from "@/components/scouters/ScouterPerformanceDialog";
import { ScouterFilters } from "@/components/scouters/ScouterFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Award, Plus, Clock, LayoutGrid, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedScouter, setSelectedScouter] = useState<Scouter | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo' | 'standby' | 'blacklist'>('todos');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'total_leads' | 'leads_30d' | 'no_activity'>('recent');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sincronização automática em background (a cada 30 minutos)
  useEffect(() => {
    const syncPhotos = async (respectLastSync: boolean) => {
      const lastSync = localStorage.getItem('last-scouter-photo-sync');
      const now = Date.now();
      
      // Sincronizar se for a primeira carga OU se passou mais de 30 minutos (1800000 ms)
      if (!respectLastSync || !lastSync || now - parseInt(lastSync) > 1800000) {
        try {
          console.log('🔄 Sincronizando fotos dos scouters em background...');
          const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities');
          
          if (!error) {
            localStorage.setItem('last-scouter-photo-sync', now.toString());
            console.log('✅ Fotos dos scouters sincronizadas automaticamente');
            
            // Force immediate refetch of all data
            await queryClient.invalidateQueries({ 
              queryKey: ["scouters"],
              refetchType: 'all'
            });
            await queryClient.invalidateQueries({ 
              queryKey: ["scouters-all"],
              refetchType: 'all'
            });
          } else {
            console.error('❌ Erro na sincronização:', error);
          }
        } catch (error) {
          console.error('❌ Erro na sincronização automática de fotos:', error);
        }
      }
    };

    // Sempre sincroniza na primeira carga desta página (ignora lastSync)
    syncPhotos(false);
    
    // Repetir a cada 30 minutos, respeitando lastSync
    const interval = setInterval(() => syncPhotos(true), 1800000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Load saved filters from localStorage
  useEffect(() => {
    const savedStatusFilter = localStorage.getItem('scouter-status-filter');
    const savedSortBy = localStorage.getItem('scouter-sort-by');
    
    if (savedStatusFilter) setStatusFilter(savedStatusFilter as any);
    if (savedSortBy) setSortBy(savedSortBy as any);
  }, []);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('scouter-status-filter', statusFilter);
    localStorage.setItem('scouter-sort-by', sortBy);
  }, [statusFilter, sortBy]);

  // Main query with filters
  const { data: scouters = [], isLoading } = useQuery({
    queryKey: ["scouters", statusFilter, sortBy],
    staleTime: 0, // Always fetch fresh data after sync
    queryFn: async () => {
      let query = supabase.from("scouters").select("*");
      
      // Apply status filter
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'recent':
          query = query.order('last_activity_at', { 
            ascending: false,
            nullsFirst: false
          });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
        case 'total_leads':
          query = query.order('total_leads', { ascending: false, nullsFirst: false });
          break;
        case 'leads_30d':
          query = query.order('leads_last_30_days', { ascending: false, nullsFirst: false });
          break;
        case 'no_activity':
          query = query.order('last_activity_at', { 
            ascending: true, 
            nullsFirst: true 
          });
          break;
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Scouter[];
    },
  });

  // Stats for filter badges (based on ALL scouters)
  const { data: allScouters = [] } = useQuery({
    queryKey: ["scouters-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scouters")
        .select("id, status, total_leads, leads_last_30_days");
      if (error) throw error;
      return data;
    },
  });

  const filterStats = {
    total: allScouters.length,
    ativo: allScouters.filter(s => s.status === 'ativo').length,
    inativo: allScouters.filter(s => s.status === 'inativo').length,
    standby: allScouters.filter(s => s.status === 'standby').length,
    blacklist: allScouters.filter(s => s.status === 'blacklist').length,
  };

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
      queryClient.invalidateQueries({ queryKey: ["scouters"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["scouters-all"], refetchType: 'all' });
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
      queryClient.invalidateQueries({ queryKey: ["scouters"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["scouters-all"], refetchType: 'all' });
      setDialogOpen(false);
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

  // Stats (based on ALL scouters)
  const activeScouters = allScouters.filter((s) => s.status === "ativo").length;
  const totalLeads = allScouters.reduce((sum, s) => sum + (s.total_leads || 0), 0);
  const totalLeads30d = allScouters.reduce((sum, s) => sum + (s.leads_last_30_days || 0), 0);
  const avgLeadsPerScouter = activeScouters > 0 ? (totalLeads / activeScouters).toFixed(1) : "0";

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleEdit = (scouter: Scouter) => {
    setSelectedScouter(scouter);
    setDialogOpen(true);
  };

  const handleViewPerformance = (scouter: Scouter) => {
    setSelectedScouter(scouter);
    setPerformanceDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedScouter(null);
    setDialogOpen(true);
  };

  const handleSave = async (scouterData: any) => {
    await saveMutation.mutateAsync(scouterData);
  };

  const handleStatusFilterChange = (status: 'todos' | 'ativo' | 'inativo' | 'standby' | 'blacklist') => {
    setStatusFilter(status);
  };

  const handleSortByChange = (sort: 'recent' | 'name' | 'total_leads' | 'leads_30d' | 'no_activity') => {
    setSortBy(sort);
  };

  const handleClearFilters = () => {
    setStatusFilter('todos');
    setSortBy('recent');
    toast({
      title: "Filtros limpos",
      description: "Mostrando todos os scouters ordenados por atividade recente"
    });
  };

  const getSortLabel = (sort: string) => {
    const labels: Record<string, string> = {
      recent: 'Mais Recentes',
      name: 'Nome (A-Z)',
      total_leads: 'Mais Leads (Total)',
      leads_30d: 'Mais Leads (30d)',
      no_activity: 'Sem Atividade'
    };
    return labels[sort] || sort;
  };

  const titleText = (() => {
    let base = "Gestão de Scouters";
    if (statusFilter !== 'todos' || sortBy !== 'recent') {
      const parts: string[] = [];
      if (statusFilter !== 'todos') parts.push(`Status: ${statusFilter}`);
      if (sortBy !== 'recent') parts.push(`Ordem: ${getSortLabel(sortBy)}`);
      base += ` (${parts.join(' • ')})`;
    }
    return base;
  })();

  return (
    <GestaoPageLayout
      title={titleText}
      description="Gerencie e acompanhe o desempenho dos scouters"
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
              de {allScouters.length} total
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

      {/* Filters */}
      <ScouterFilters
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        onClearFilters={handleClearFilters}
        stats={filterStats}
      />

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">Quadro de Scouters</h2>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'kanban' 
                ? "Arraste os cards para mudar o status" 
                : "Clique em ações para gerenciar scouters"}
            </p>
          </div>
          <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/50">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Scouter
        </Button>
      </div>

      {/* Empty State */}
      {scouters.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-2">
            Nenhum scouter encontrado com os filtros aplicados
          </p>
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
        </Card>
      )}

      {/* Board/List View */}
      {scouters.length > 0 && (
        <div className="transition-all duration-300">
          {viewMode === "kanban" ? (
            <ScoutersKanban
              scouters={scouters}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onViewPerformance={handleViewPerformance}
              statusFilter={statusFilter}
            />
          ) : (
            <ScoutersListView
              scouters={scouters}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onViewPerformance={handleViewPerformance}
            />
          )}
        </div>
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
