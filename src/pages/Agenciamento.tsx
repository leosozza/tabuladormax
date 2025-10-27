// Agenciamento (Negotiations) Main Page
// Complete negotiation management interface

import { useState } from 'react';
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
  User,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
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
  rejectNegotiation,
  completeNegotiation,
  cancelNegotiation,
} from '@/services/agenciamentoService';
import { NegotiationForm } from '@/components/agenciamento/NegotiationForm';
import { NegotiationDetailsDialog } from '@/components/agenciamento/NegotiationDetailsDialog';

export default function Agenciamento() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNegotiation, setEditingNegotiation] = useState<Negotiation | null>(null);
  const [viewingNegotiation, setViewingNegotiation] = useState<Negotiation | null>(null);
  const [statusFilter, setStatusFilter] = useState<NegotiationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  // Fetch negotiations
  const { data: negotiations = [], isLoading } = useQuery({
    queryKey: ['negotiations', statusFilter],
    queryFn: () =>
      listNegotiations(
        statusFilter !== 'all' ? { status: [statusFilter] } : undefined
      ),
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agenciamento</h1>
          <p className="text-muted-foreground">Gerencie negociações comerciais</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Negociação
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
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
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as NegotiationStatus | 'all')}
            >
              <SelectTrigger className="w-[200px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Negotiations List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando negociações...</p>
        </div>
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
    </div>
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
              {negotiation.status === 'pending_approval' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(); }}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Aprovar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCancel(); }}>
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Rejeitar
                  </DropdownMenuItem>
                </>
              )}
              {negotiation.status === 'approved' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(); }}>
                  <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                  Concluir
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-red-600"
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
            R$ {negotiation.total_value.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {new Date(negotiation.negotiation_date).toLocaleDateString('pt-BR')}
          </span>
        </div>
        {negotiation.installments_number > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {negotiation.installments_number}x de R${' '}
              {negotiation.installment_value.toFixed(2)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
