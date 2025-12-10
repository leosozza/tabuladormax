import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Negotiation, NegotiationStatus } from '@/types/agenciamento';
import { updateNegotiation } from '@/services/agenciamentoService';
import { PipelineColumn } from './PipelineColumn';
import { PipelineCard } from './PipelineCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ProducerSelectDialog } from './ProducerSelectDialog';
import { Producer } from '@/hooks/useProducers';
import { supabase } from '@/integrations/supabase/client';

interface NegotiationPipelineProps {
  negotiations: Negotiation[];
  onCardClick: (negotiation: Negotiation) => void;
}

// Pipeline status order
const PIPELINE_STATUSES: NegotiationStatus[] = [
  'inicial',
  'ficha_preenchida',
  'atendimento_produtor',
  'realizado',
  'nao_realizado',
];

export function NegotiationPipeline({ negotiations, onCardClick }: NegotiationPipelineProps) {
  const [activeNegotiation, setActiveNegotiation] = useState<Negotiation | null>(null);
  const [producerSelectOpen, setProducerSelectOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    negotiationId: string;
    dealId: string | null;
    newStatus: NegotiationStatus;
  } | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group negotiations by status
  const negotiationsByStatus = useMemo(() => {
    const grouped: Record<NegotiationStatus, Negotiation[]> = {
      inicial: [],
      ficha_preenchida: [],
      atendimento_produtor: [],
      realizado: [],
      nao_realizado: [],
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
      // Update negotiation status
      const result = await updateNegotiation(id, { status });
      
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
      
      return result;
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const negotiation = negotiations.find((n) => n.id === active.id);
    if (negotiation) {
      setActiveNegotiation(negotiation);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNegotiation(null);

    if (!over) return;

    const negotiationId = active.id as string;
    const newStatus = over.id as NegotiationStatus;

    const negotiation = negotiations.find((n) => n.id === negotiationId);
    if (!negotiation || negotiation.status === newStatus) return;

    // Validate status transition
    if (!PIPELINE_STATUSES.includes(newStatus)) return;

    handleStatusChange(negotiation, newStatus);
  };

  // Centralized status change handler - used by both drag-and-drop and menu
  const handleStatusChange = (negotiation: Negotiation, newStatus: NegotiationStatus) => {
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
  };

  // Handler for PipelineCard menu status change
  const handleCardStatusChange = (negotiation: Negotiation) => (newStatus: NegotiationStatus) => {
    if (negotiation.status === newStatus) return;
    handleStatusChange(negotiation, newStatus);
  };

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

      // Then update negotiation status and sync to Bitrix
      await updateStatusMutation.mutateAsync({
        id: pendingTransition.negotiationId,
        status: pendingTransition.newStatus,
      });

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {PIPELINE_STATUSES.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              negotiations={negotiationsByStatus[status]}
              onCardClick={onCardClick}
              onChangeStatus={handleCardStatusChange}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeNegotiation && (
          <div className="rotate-3 scale-105">
            <PipelineCard
              negotiation={activeNegotiation}
              onClick={() => {}}
            />
          </div>
        )}
      </DragOverlay>

      <ProducerSelectDialog
        open={producerSelectOpen}
        onClose={handleProducerSelectClose}
        onSelect={handleProducerSelect}
        title="Selecionar Produtor para Atendimento"
      />
    </DndContext>
  );
}
