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

// Pipeline status order (excluding rejected and cancelled)
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
    mutationFn: ({ id, status }: { id: string; status: NegotiationStatus }) =>
      updateNegotiation(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const negotiation = negotiations.find((n) => n.id === active.id);
    if (negotiation) {
      setActiveNegotiation(negotiation);
    }
  };

  // Mutation to assign producer to deal
  const assignProducerMutation = useMutation({
    mutationFn: async ({ dealId, producerId }: { dealId: string; producerId: string }) => {
      const { error } = await supabase
        .from('deals')
        .update({ producer_id: producerId })
        .eq('id', dealId);
      if (error) throw error;
    },
    onError: () => {
      toast.error('Erro ao atribuir produtor');
    },
  });

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

    // Intercept transition to "atendimento_produtor" - require producer selection
    if (newStatus === 'atendimento_produtor' && negotiation.deal_id) {
      setPendingTransition({
        negotiationId,
        dealId: negotiation.deal_id,
        newStatus,
      });
      setProducerSelectOpen(true);
      return;
    }

    updateStatusMutation.mutate({ id: negotiationId, status: newStatus });
  };

  const handleProducerSelect = async (producer: Producer) => {
    if (!pendingTransition) return;

    try {
      // First assign producer to deal
      if (pendingTransition.dealId) {
        await assignProducerMutation.mutateAsync({
          dealId: pendingTransition.dealId,
          producerId: producer.id,
        });
      }

      // Then update negotiation status
      await updateStatusMutation.mutateAsync({
        id: pendingTransition.negotiationId,
        status: pendingTransition.newStatus,
      });

      toast.success(`Negociação atribuída ao produtor ${producer.name}`);
    } catch (error) {
      // Errors are handled by mutations
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
