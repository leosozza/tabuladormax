import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NegotiationStatus } from '@/types/agenciamento';
import { NEGOTIATION_STATUS_CONFIG } from '@/types/agenciamento';

interface ChangeStatusDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (status: NegotiationStatus) => void;
  currentStatus: NegotiationStatus;
}

const STATUS_ORDER: NegotiationStatus[] = [
  'ficha_preenchida',
  'contrato_nao_fechado',
  'analisar',
  'atendimento_produtor',
  'realizado',
  'nao_realizado',
];

const STATUS_COLORS: Record<NegotiationStatus, string> = {
  ficha_preenchida: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700',
  contrato_nao_fechado: 'bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-700',
  analisar: 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-700',
  atendimento_produtor: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700',
  realizado: 'bg-green-100 hover:bg-green-200 border-green-300 text-green-700',
  nao_realizado: 'bg-red-100 hover:bg-red-200 border-red-300 text-red-700',
};

export function ChangeStatusDialog({
  open,
  onClose,
  onSelect,
  currentStatus,
}: ChangeStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mudar Etapa</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-4">
          {STATUS_ORDER.map((status) => (
            <Button
              key={status}
              variant="outline"
              disabled={status === currentStatus}
              onClick={() => onSelect(status)}
              className={cn(
                'justify-start h-12 border-2',
                status === currentStatus && 'opacity-50 cursor-not-allowed',
                STATUS_COLORS[status]
              )}
            >
              {NEGOTIATION_STATUS_CONFIG[status].label}
              {status === currentStatus && (
                <span className="ml-auto text-xs opacity-70">(atual)</span>
              )}
            </Button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
