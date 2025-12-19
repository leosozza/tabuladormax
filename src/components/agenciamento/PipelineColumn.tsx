import React from 'react';
import { DollarSign } from 'lucide-react';
import type { Negotiation, NegotiationStatus } from '@/types/agenciamento';
import { NEGOTIATION_STATUS_CONFIG } from '@/types/agenciamento';
import { PipelineCard } from './PipelineCard';
import { cn } from '@/lib/utils';

interface PipelineColumnProps {
  status: NegotiationStatus;
  negotiations: Negotiation[];
  onCardClick: (negotiation: Negotiation) => void;
  onChangeStatus?: (negotiation: Negotiation) => (newStatus: NegotiationStatus) => void;
  onDragStart: (e: React.DragEvent, negotiationId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: NegotiationStatus) => void;
  onDragLeave: (e: React.DragEvent) => void;
  draggedId: string | null;
  isDropTarget: boolean;
}

// Cores das colunas - Alinhado com Bitrix Categoria 1 (Pinheiros)
const COLUMN_COLORS: Record<NegotiationStatus, { bg: string; border: string }> = {
  recepcao_cadastro: { bg: 'bg-slate-50', border: 'border-slate-300' },
  ficha_preenchida: { bg: 'bg-blue-50', border: 'border-blue-300' },
  atendimento_produtor: { bg: 'bg-amber-50', border: 'border-amber-300' },
  negocios_fechados: { bg: 'bg-green-50', border: 'border-green-300' },
  contrato_nao_fechado: { bg: 'bg-orange-50', border: 'border-orange-300' },
  analisar: { bg: 'bg-purple-50', border: 'border-purple-300' },
};

export const PipelineColumn = React.memo(function PipelineColumn({ 
  status, 
  negotiations, 
  onCardClick, 
  onChangeStatus,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  draggedId,
  isDropTarget,
}: PipelineColumnProps) {
  const config = NEGOTIATION_STATUS_CONFIG[status];
  const colors = COLUMN_COLORS[status];

  const totalValue = negotiations.reduce((sum, n) => sum + n.total_value, 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, status);
  };

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-lg border transition-all duration-150',
        colors.bg,
        colors.border,
        isDropTarget && 'ring-2 ring-primary ring-offset-2 scale-[1.02]'
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={onDragLeave}
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
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[200px]">
        {negotiations.map((negotiation) => (
          <PipelineCard
            key={negotiation.id}
            negotiation={negotiation}
            onClick={() => onCardClick(negotiation)}
            onChangeStatus={onChangeStatus ? onChangeStatus(negotiation) : undefined}
            onDragStart={(e) => onDragStart(e, negotiation.id)}
            isDragging={draggedId === negotiation.id}
          />
        ))}

        {negotiations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma negociação
          </div>
        )}
      </div>
    </div>
  );
});
