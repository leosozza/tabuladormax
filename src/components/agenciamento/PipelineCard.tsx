import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, GripVertical } from 'lucide-react';
import type { Negotiation, NegotiationStatus } from '@/types/agenciamento';
import { cn } from '@/lib/utils';

interface PipelineCardProps {
  negotiation: Negotiation;
  onClick: () => void;
}

const STATUS_COLORS: Record<NegotiationStatus, string> = {
  draft: 'border-l-muted-foreground',
  in_progress: 'border-l-primary',
  pending_approval: 'border-l-warning',
  approved: 'border-l-success',
  rejected: 'border-l-destructive',
  completed: 'border-l-primary',
  cancelled: 'border-l-muted-foreground',
};

export function PipelineCard({ negotiation, onClick }: PipelineCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: negotiation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const initials = negotiation.client_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4',
        STATUS_COLORS[negotiation.status],
        isDragging && 'opacity-50 shadow-lg rotate-2'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{negotiation.client_name}</p>
              <p className="text-xs text-muted-foreground truncate">{negotiation.title}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
              <DollarSign className="h-3 w-3" />
              <span>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(negotiation.total_value)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(negotiation.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
