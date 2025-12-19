import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { DollarSign, Calendar, GripVertical, MoreVertical } from 'lucide-react';
import type { Negotiation, NegotiationStatus } from '@/types/agenciamento';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface PipelineCardProps {
  negotiation: Negotiation;
  onClick: () => void;
  onChangeStatus?: (status: NegotiationStatus) => void;
}

// Cores dos status - Alinhado com Bitrix Categoria 1 (Pinheiros)
const STATUS_COLORS: Record<NegotiationStatus, string> = {
  recepcao_cadastro: 'border-l-slate-500',
  ficha_preenchida: 'border-l-blue-500',
  atendimento_produtor: 'border-l-amber-500',
  negocios_fechados: 'border-l-green-500',
  contrato_nao_fechado: 'border-l-orange-500',
  analisar: 'border-l-purple-500',
};

export function PipelineCard({ negotiation, onClick, onChangeStatus }: PipelineCardProps) {
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
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{negotiation.client_name}</p>
              {negotiation.bitrix_deal_id && (
                <p className="text-xs text-muted-foreground">ID: {negotiation.bitrix_deal_id}</p>
              )}
            </div>
          </div>

          {(negotiation.model_name || negotiation.responsible_name) && (
            <div className="mb-2 space-y-0.5">
              {negotiation.model_name && (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-medium">Modelo:</span> {negotiation.model_name}
                </p>
              )}
              {negotiation.responsible_name && (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-medium">Resp:</span> {negotiation.responsible_name}
                </p>
              )}
            </div>
          )}

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

        {onChangeStatus && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus('recepcao_cadastro');
                }}
                disabled={negotiation.status === 'recepcao_cadastro'}
              >
                Recepção - Cadastro atendimento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus('ficha_preenchida');
                }}
                disabled={negotiation.status === 'ficha_preenchida'}
              >
                Ficha Preenchida
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus('atendimento_produtor');
                }}
                disabled={negotiation.status === 'atendimento_produtor'}
              >
                Atendimento Produtor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus('negocios_fechados');
                }}
                disabled={negotiation.status === 'negocios_fechados'}
              >
                Negócios Fechados
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus('contrato_nao_fechado');
                }}
                disabled={negotiation.status === 'contrato_nao_fechado'}
              >
                Contrato não fechado
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus('analisar');
                }}
                disabled={negotiation.status === 'analisar'}
              >
                Analisar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
