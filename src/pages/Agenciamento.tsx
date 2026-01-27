// Agenciamento (Negotiations) Main Page
// Complete negotiation management interface with Bitrix realtime sync
// Supports multiple pipelines with dynamic stage mapping

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Kanban,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Negotiation, NegotiationFormData, NegotiationStatus } from '@/types/agenciamento';
import { NEGOTIATION_STATUS_CONFIG } from '@/types/agenciamento';
import {
  listNegotiations,
  createNegotiation,
  updateNegotiation,
  deleteNegotiation,
  approveNegotiation,
  completeNegotiation,
  cancelNegotiation,
} from '@/services/agenciamentoService';
import { NegotiationForm } from '@/components/agenciamento/NegotiationForm';
import { NegotiationDetailsDialog } from '@/components/agenciamento/NegotiationDetailsDialog';
import { NegotiationList } from '@/components/agenciamento/NegotiationList';
import { NegotiationStats } from '@/components/agenciamento/NegotiationStats';
import { NegotiationPipeline } from '@/components/agenciamento/NegotiationPipeline';
import { ProducerQueueHeaderBar } from '@/components/agenciamento/ProducerQueueHeaderBar';
import { AgenciamentoDashboard } from '@/components/agenciamento/AgenciamentoDashboard';
import { PipelineSelector } from '@/components/agenciamento/PipelineSelector';
import { CommercialProjectSelector } from '@/components/CommercialProjectSelector';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { usePipelineConfig } from '@/hooks/usePipelines';

type ViewMode = 'pipeline' | 'grid' | 'list';

export default function Agenciamento() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNegotiation, setEditingNegotiation] = useState<Negotiation | null>(null);
  const [viewingNegotiation, setViewingNegotiation] = useState<Negotiation | null>(null);
  const [statusFilter, setStatusFilter] = useState<NegotiationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [commercialProjectId, setCommercialProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'dashboard'>('pipeline');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Pipeline selection - persisted in localStorage
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(() => {
    return localStorage.getItem('agenciamento-pipeline') || '1';
  });

  // Get pipeline config for dynamic stage mapping
  const { data: pipelineConfig } = usePipelineConfig(selectedPipelineId);

  const queryClient = useQueryClient();

  // Save pipeline selection to localStorage
  useEffect(() => {
    localStorage.setItem('agenciamento-pipeline', selectedPipelineId);
  }, [selectedPipelineId]);

  // Realtime listener para atualizações do Bitrix (negotiations e deals)
  useEffect(() => {
    console.log(`📡 Configurando listener realtime para pipeline ${selectedPipelineId}...`);
    
    const channel = supabase
      .channel(`agenciamento-realtime-${selectedPipelineId}`)
      // Listen to negotiations changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'negotiations'
        },
        (payload) => {
          const newData = payload.new as any;
          // Filter by pipeline_id if set
          if (newData?.pipeline_id && newData.pipeline_id !== selectedPipelineId) {
            console.log(`⏭️ Ignorando evento de outra pipeline: ${newData.pipeline_id}`);
            return;
          }
          
          console.log('📥 Evento realtime (negotiations):', payload.eventType);
          
          // Invalidar cache para recarregar dados
          queryClient.invalidateQueries({ queryKey: ['negotiations'] });
          
          // Mostrar toast de atualização
          if (payload.eventType === 'UPDATE') {
            toast.info(`Negociação "${newData?.title || 'atualizada'}" sincronizada do Bitrix`, {
              duration: 3000,
            });
          } else if (payload.eventType === 'INSERT') {
            toast.success(`Nova negociação "${newData?.title || ''}" recebida do Bitrix`, {
              duration: 3000,
            });
          } else if (payload.eventType === 'DELETE') {
            toast.warning('Negociação removida', {
              duration: 3000,
            });
          }
        }
      )
      // Listen to deals changes for the selected pipeline
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
          filter: `category_id=eq.${selectedPipelineId}`
        },
        (payload) => {
          console.log('📥 Evento realtime (deals):', payload.eventType);
          
          // Invalidar cache para recarregar dados
          queryClient.invalidateQueries({ queryKey: ['negotiations'] });
          queryClient.invalidateQueries({ queryKey: ['deals'] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal realtime:', status);
      });

    return () => {
      console.log('📡 Removendo listener realtime...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, selectedPipelineId]);

  // Sync from Bitrix mutation
  const syncFromBitrixMutation = useMutation({
    mutationFn: async (mode: 'recent' | 'full' | 'active_only') => {
      let body: Record<string, any> = {};
      
      if (mode === 'full') {
        body = { full_sync: true };
      } else if (mode === 'active_only') {
        body = { sync_active_only: true };
      } else {
        body = {
          stage_ids: ['C1:UC_MKIQ0S', 'C1:NEW', 'C1:UC_O2KDK6'],
          limit: 100,
        };
      }
      
      const response = await supabase.functions.invoke('sync-negotiations-from-bitrix', {
        body
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      
      if (data.mode === 'sync_active_only') {
        toast.success(`Status atualizado: ${data.updated} alterados, ${data.unchanged} sem mudança`);
      } else {
        toast.success(`Sincronização concluída: ${data.created} criadas, ${data.updated} atualizadas`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao sincronizar do Bitrix');
    },
  });

  const handleSyncFromBitrix = async (mode: 'recent' | 'full' | 'active_only') => {
    setIsSyncing(true);
    try {
      if (mode === 'full') {
        toast.info('Iniciando sincronização COMPLETA... Isso pode levar alguns minutos.', {
          duration: 5000,
        });
      } else if (mode === 'active_only') {
        toast.info('Verificando status das negociações ativas no Bitrix...', {
          duration: 3000,
        });
      }
      await syncFromBitrixMutation.mutateAsync(mode);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch negotiations filtered by pipeline
  const { data: negotiations = [], isLoading } = useQuery({
    queryKey: ['negotiations', statusFilter, selectedPipelineId],
    queryFn: () =>
      listNegotiations({
        status: statusFilter !== 'all' ? [statusFilter] : undefined,
        pipeline_id: selectedPipelineId,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createNegotiation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      setIsCreateDialogOpen(false);
      toast.success('Negociação criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar negociação');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NegotiationFormData> }) =>
      updateNegotiation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      setEditingNegotiation(null);
      toast.success('Negociação atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar negociação');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNegotiation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast.success('Negociação excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir negociação');
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveNegotiation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast.success('Negociação aprovada!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao aprovar negociação');
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: completeNegotiation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast.success('Negociação concluída!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao concluir negociação');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelNegotiation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast.success('Negociação cancelada!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cancelar negociação');
    },
  });

  const handleCreateSubmit = async (data: NegotiationFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdateSubmit = async (data: NegotiationFormData) => {
    if (!editingNegotiation) return;
    await updateMutation.mutateAsync({ id: editingNegotiation.id, data });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta negociação?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Filter negotiations by search term
  const filteredNegotiations = negotiations.filter((neg) =>
    searchTerm
      ? neg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        neg.client_name.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  return (
    <MainLayout
      title="Agenciamento"
      subtitle="Gerencie negociações comerciais"
      actions={
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                disabled={isSyncing || syncFromBitrixMutation.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar do Bitrix
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSyncFromBitrix('active_only')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar Status dos Ativos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSyncFromBitrix('recent')}>
                <Plus className="mr-2 h-4 w-4" />
                Importar Novos do Bitrix
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSyncFromBitrix('full')}>
                <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                Sincronização COMPLETA
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Negociação
          </Button>
        </div>
      }
    >
      {/* Producer Queue Header Bar - Collapsible */}
      <ProducerQueueHeaderBar />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pipeline' | 'dashboard')} className="space-y-6">
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-2">
            <Kanban className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                {/* Pipeline Selector */}
                <div className="w-[180px]">
                  <PipelineSelector
                    value={selectedPipelineId}
                    onChange={setSelectedPipelineId}
                  />
                </div>

                {/* Commercial Project Filter */}
                <div className="w-[200px]">
                  <CommercialProjectSelector
                    value={commercialProjectId}
                    onChange={setCommercialProjectId}
                  />
                </div>

                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título ou cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as NegotiationStatus | 'all')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(NEGOTIATION_STATUS_CONFIG).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('pipeline')}
                    className="h-8"
                  >
                    <Kanban className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8"
                  >
                    <ListIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Negotiations Display with Queue Sidebar */}
          <div className="flex gap-4">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Carregando negociações...</p>
                </div>
              ) : viewMode === 'pipeline' ? (
                <NegotiationPipeline
                  negotiations={filteredNegotiations}
                  onCardClick={(negotiation) => setViewingNegotiation(negotiation)}
                />
              ) : filteredNegotiations.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Nenhuma negociação encontrada com os filtros aplicados'
                        : 'Nenhuma negociação cadastrada ainda'}
                    </p>
                  </CardContent>
                </Card>
              ) : viewMode === 'list' ? (
                <NegotiationList
                  negotiations={filteredNegotiations}
                  onView={(negotiation) => setViewingNegotiation(negotiation)}
                  onEdit={(negotiation) => setEditingNegotiation(negotiation)}
                  onDelete={(id) => handleDelete(id)}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onComplete={(id) => completeMutation.mutate(id)}
                  onCancel={(id) => cancelMutation.mutate(id)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNegotiations.map((negotiation) => (
                    <NegotiationCard
                      key={negotiation.id}
                      negotiation={negotiation}
                      onView={() => setViewingNegotiation(negotiation)}
                      onEdit={() => setEditingNegotiation(negotiation)}
                      onDelete={() => handleDelete(negotiation.id)}
                      onApprove={() => approveMutation.mutate(negotiation.id)}
                      onComplete={() => completeMutation.mutate(negotiation.id)}
                      onCancel={() => cancelMutation.mutate(negotiation.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <AgenciamentoDashboard negotiations={filteredNegotiations} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Negociação</DialogTitle>
            <DialogDescription>
              Preencha os dados da negociação comercial
            </DialogDescription>
          </DialogHeader>
          <NegotiationForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingNegotiation && (
        <Dialog open={!!editingNegotiation} onOpenChange={() => setEditingNegotiation(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Negociação</DialogTitle>
              <DialogDescription>
                Atualize os dados da negociação
              </DialogDescription>
            </DialogHeader>
            <NegotiationForm
              initialData={editingNegotiation}
              onSubmit={handleUpdateSubmit}
              onCancel={() => setEditingNegotiation(null)}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* View Details Dialog */}
      {viewingNegotiation && (
        <NegotiationDetailsDialog
          negotiation={viewingNegotiation}
          open={!!viewingNegotiation}
          onClose={() => setViewingNegotiation(null)}
        />
      )}
    </MainLayout>
  );
}

// Negotiation Card Component
interface NegotiationCardProps {
  negotiation: Negotiation;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

function NegotiationCard({
  negotiation,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onComplete,
  onCancel,
}: NegotiationCardProps) {
  const statusConfig = NEGOTIATION_STATUS_CONFIG[negotiation.status];

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{negotiation.title}</CardTitle>
            <CardDescription className="mt-1">{negotiation.client_name}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {negotiation.status === 'atendimento_produtor' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(); }}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Marcar como Realizado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCancel(); }}>
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Marcar como Não Realizado
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Badge
          variant="outline"
          className="w-fit mt-2"
          style={{
            borderColor: statusConfig.color,
            color: statusConfig.color,
          }}
        >
          {statusConfig.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-primary">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(negotiation.total_value)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {new Date(negotiation.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
        {negotiation.installments_number > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {negotiation.installments_number}x de{' '}
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(negotiation.installment_value)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
