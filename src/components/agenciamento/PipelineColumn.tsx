import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DollarSign } from 'lucide-react';
import type { Negotiation, NegotiationStatus } from '@/types/agenciamento';
import { NEGOTIATION_STATUS_CONFIG } from '@/types/agenciamento';
import { PipelineCard } from './PipelineCard';
import { cn } from '@/lib/utils';

interface PipelineColumnProps {
  status: NegotiationStatus;
  negotiations: Negotiation[];
  onCardClick: (negotiation: Negotiation) => void;
}

const COLUMN_COLORS: Record<NegotiationStatus, { bg: string; border: string }> = {
  draft: { bg: 'bg-muted/50', border: 'border-muted-foreground/30' },
  in_progress: { bg: 'bg-primary/5', border: 'border-primary/30' },
  pending_approval: { bg: 'bg-warning/5', border: 'border-warning/30' },
  approved: { bg: 'bg-success/5', border: 'border-success/30' },
  rejected: { bg: 'bg-destructive/5', border: 'border-destructive/30' },
  completed: { bg: 'bg-primary/10', border: 'border-primary/50' },
  cancelled: { bg: 'bg-muted/30', border: 'border-muted-foreground/20' },
};

export function PipelineColumn({ status, negotiations, onCardClick }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = NEGOTIATION_STATUS_CONFIG[status];
  const colors = COLUMN_COLORS[status];

  const totalValue = negotiations.reduce((sum, n) => sum + n.total_value, 0);

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-lg border',
        colors.bg,
        colors.border,
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{config.label}</h3>
          <span className="text-xs bg-background px-2 py-0.5 rounded-full font-medium">
            {negotiations.length}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
            }).format(totalValue)}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[200px]"
      >
        <SortableContext
          items={negotiations.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          {negotiations.map((negotiation) => (
            <PipelineCard
              key={negotiation.id}
              negotiation={negotiation}
              onClick={() => onCardClick(negotiation)}
            />
          ))}
        </SortableContext>

        {negotiations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma negociação
          </div>
        )}
      </div>
    </div>
  );
}
