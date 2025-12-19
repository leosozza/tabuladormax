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

// Ordem dos status - EXATAMENTE como Bitrix Categoria 1 (Pinheiros)
const STATUS_ORDER: NegotiationStatus[] = [
  'recepcao_cadastro',
  'ficha_preenchida',
  'atendimento_produtor',
  'negocios_fechados',
  'contrato_nao_fechado',
  'analisar',
];

// Cores dos status para o dialog
const STATUS_COLORS: Record<NegotiationStatus, string> = {
  recepcao_cadastro: 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700',
  ficha_preenchida: 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700',
  atendimento_produtor: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700',
  negocios_fechados: 'bg-green-100 hover:bg-green-200 border-green-300 text-green-700',
  contrato_nao_fechado: 'bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-700',
  analisar: 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-700',
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
