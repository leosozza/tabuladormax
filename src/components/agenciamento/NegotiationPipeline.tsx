import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Negotiation, NegotiationStatus } from '@/types/agenciamento';
import { PipelineColumn } from './PipelineColumn';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ProducerSelectDialog } from './ProducerSelectDialog';
import { Producer } from '@/hooks/useProducers';
import { useProducerQueueView } from '@/hooks/useProducerQueueView';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface NegotiationPipelineProps {
  negotiations: Negotiation[];
  onCardClick: (negotiation: Negotiation) => void;
}

// Pipeline status order - EXATAMENTE como Bitrix Categoria 1 (Pinheiros)
const PIPELINE_STATUSES: NegotiationStatus[] = [
  'recepcao_cadastro',      // C1:NEW
  'ficha_preenchida',       // C1:UC_O2KDK6
  'atendimento_produtor',   // C1:EXECUTING
  'negocios_fechados',      // C1:WON - CONVERTED
  'contrato_nao_fechado',   // C1:LOSE
  'analisar',               // C1:UC_MKIQ0S
];

// Statuses that are considered "converted" (final/won stages)
const CONVERTED_STATUSES: NegotiationStatus[] = ['negocios_fechados'];

// Statuses that are considered "not closed" (lost/analysis stages)
const NOT_CLOSED_STATUSES: NegotiationStatus[] = ['contrato_nao_fechado', 'analisar'];

export function NegotiationPipeline({ negotiations, onCardClick }: NegotiationPipelineProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<NegotiationStatus | null>(null);
  const [showConvertedStages, setShowConvertedStages] = useState(false);
  const [showNotClosedStages, setShowNotClosedStages] = useState(false);
  const [producerSelectOpen, setProducerSelectOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    negotiationId: string;
    dealId: string | null;
    newStatus: NegotiationStatus;
  } | null>(null);
  const queryClient = useQueryClient();
  
  // Hook da Fila da Vez para obter o próximo produtor
  const { nextProducer, refetch: refetchQueue } = useProducerQueueView();

  // Filter visible statuses based on toggles
  const visibleStatuses = useMemo(() => {
    return PIPELINE_STATUSES.filter(status => {
      // Hide converted unless toggle is on
      if (CONVERTED_STATUSES.includes(status) && !showConvertedStages) return false;
      // Hide not closed unless toggle is on
      if (NOT_CLOSED_STATUSES.includes(status) && !showNotClosedStages) return false;
      return true;
    });
  }, [showConvertedStages, showNotClosedStages]);

  // Group negotiations by status
  const negotiationsByStatus = useMemo(() => {
    const grouped: Record<NegotiationStatus, Negotiation[]> = {
      recepcao_cadastro: [],
      ficha_preenchida: [],
      atendimento_produtor: [],
      negocios_fechados: [],
      contrato_nao_fechado: [],
      analisar: [],
    };

    negotiations.forEach((neg) => {
      if (grouped[neg.status]) {
        grouped[neg.status].push(neg);
      }
    });

    return grouped;
  }, [negotiations]);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: NegotiationStatus }) => {
      const { error } = await supabase
        .from('negotiations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      // Sync to Bitrix
      const negotiation = negotiations.find(n => n.id === id);
      if (negotiation?.deal_id) {
        try {
          await supabase.functions.invoke('sync-deal-to-bitrix', {
            body: {
              negotiation_id: id,
              deal_id: negotiation.deal_id,
              status: status,
            },
          });
        } catch (err) {
          console.error('Erro ao sincronizar com Bitrix:', err);
        }
      }
      
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // Mutation to assign producer to deal
  const assignProducerMutation = useMutation({
    mutationFn: async ({ dealId, producerId }: { dealId: string; producerId: string }) => {
      const { error } = await supabase
        .from('deals')
        .update({ producer_id: producerId })
        .eq('id', dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: () => {
      toast.error('Erro ao atribuir produtor');
    },
  });

  // Native Drag & Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, negotiationId: string) => {
    // Use setTimeout to avoid React state update during drag start
    setTimeout(() => setDraggedId(negotiationId), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Get the column status from the event target
    const columnElement = (e.currentTarget as HTMLElement);
    const statusAttr = columnElement.dataset.status as NegotiationStatus;
    if (statusAttr && statusAttr !== dropTargetStatus) {
      setDropTargetStatus(statusAttr);
    }
  }, [dropTargetStatus]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetStatus(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: NegotiationStatus) => {
    e.preventDefault();
    
    if (!draggedId) return;
    
    const negotiation = negotiations.find((n) => n.id === draggedId);
    if (!negotiation || negotiation.status === newStatus) {
      resetDragState();
      return;
    }

    // Validate status transition
    if (!PIPELINE_STATUSES.includes(newStatus)) {
      resetDragState();
      return;
    }

    handleStatusChange(negotiation, newStatus);
    resetDragState();
  }, [draggedId, negotiations]);

  const resetDragState = useCallback(() => {
    setDraggedId(null);
    setDropTargetStatus(null);
  }, []);

  // Centralized status change handler - used by both drag-and-drop and menu
  const handleStatusChange = useCallback((negotiation: Negotiation, newStatus: NegotiationStatus) => {
    // Intercept transition to "atendimento_produtor" - require producer selection
    if (newStatus === 'atendimento_produtor') {
      setPendingTransition({
        negotiationId: negotiation.id,
        dealId: negotiation.deal_id || null,
        newStatus,
      });
      setProducerSelectOpen(true);
      return;
    }

    updateStatusMutation.mutate({ id: negotiation.id, status: newStatus });
  }, [updateStatusMutation]);

  // Handler for PipelineCard menu status change
  const handleCardStatusChange = useCallback((negotiation: Negotiation) => (newStatus: NegotiationStatus) => {
    if (negotiation.status === newStatus) return;
    handleStatusChange(negotiation, newStatus);
  }, [handleStatusChange]);

  const handleProducerSelect = async (producer: Producer) => {
    if (!pendingTransition) return;

    try {
      // First assign producer to deal if deal exists
      if (pendingTransition.dealId) {
        await assignProducerMutation.mutateAsync({
          dealId: pendingTransition.dealId,
          producerId: producer.id,
        });
      }

      // Update producer status in queue to EM_ATENDIMENTO
      await supabase
        .from('producer_attendance_status')
        .update({ status: 'EM_ATENDIMENTO', updated_at: new Date().toISOString() })
        .eq('producer_id', producer.id);

      // Then update negotiation status and sync to Bitrix
      await updateStatusMutation.mutateAsync({
        id: pendingTransition.negotiationId,
        status: pendingTransition.newStatus,
      });

      // Refetch queue to update positions
      refetchQueue();

      toast.success(`Negociação atribuída ao produtor ${producer.name}`);
    } catch (error) {
      console.error('Erro ao processar transição:', error);
    } finally {
      setProducerSelectOpen(false);
      setPendingTransition(null);
    }
  };

  const handleProducerSelectClose = () => {
    setProducerSelectOpen(false);
    setPendingTransition(null);
  };

  // Global drag end handler (in case drop happens outside)
  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  // Count converted negotiations
  const convertedCount = useMemo(() => {
    return CONVERTED_STATUSES.reduce((acc, status) => 
      acc + (negotiationsByStatus[status]?.length || 0), 0
    );
  }, [negotiationsByStatus]);

  // Count not closed negotiations
  const notClosedCount = useMemo(() => {
    return NOT_CLOSED_STATUSES.reduce((acc, status) => 
      acc + (negotiationsByStatus[status]?.length || 0), 0
    );
  }, [negotiationsByStatus]);

  return (
    <div onDragEnd={handleDragEnd}>
      {/* Toggles para mostrar/ocultar etapas */}
      <div className="flex items-center justify-end gap-6 mb-4">
        <div className="flex items-center gap-2">
          <Switch
            id="show-not-closed"
            checked={showNotClosedStages}
            onCheckedChange={setShowNotClosedStages}
          />
          <Label htmlFor="show-not-closed" className="text-sm text-muted-foreground cursor-pointer">
            Mostrar não convertidos {notClosedCount > 0 && `(${notClosedCount})`}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-converted"
            checked={showConvertedStages}
            onCheckedChange={setShowConvertedStages}
          />
          <Label htmlFor="show-converted" className="text-sm text-muted-foreground cursor-pointer">
            Mostrar convertidos {convertedCount > 0 && `(${convertedCount})`}
          </Label>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {visibleStatuses.map((status) => (
            <div key={status} data-status={status}>
              <PipelineColumn
                status={status}
                negotiations={negotiationsByStatus[status]}
                onCardClick={onCardClick}
                onChangeStatus={handleCardStatusChange}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
                draggedId={draggedId}
                isDropTarget={dropTargetStatus === status}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <ProducerSelectDialog
        open={producerSelectOpen}
        onClose={handleProducerSelectClose}
        onSelect={handleProducerSelect}
        title="Atribuir Atendimento"
        suggestedProducer={nextProducer}
      />
    </div>
  );
}
