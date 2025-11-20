import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LeadCard from './LeadCard';
import SwipeActions from './SwipeActions';
import { Badge } from '@/components/ui/badge';

interface LeadAnalysisModalProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onSuperApprove: () => void;
  onSkip: () => void;
  disabled?: boolean;
  currentIndex: number;
  totalLeads: number;
}

export function LeadAnalysisModal({
  lead,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onSuperApprove,
  onSkip,
  disabled,
  currentIndex,
  totalLeads,
}: LeadAnalysisModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-[90vw] max-h-[95vh] md:max-h-[90vh] overflow-y-auto p-3 md:p-6">
        <DialogHeader className="space-y-2 md:space-y-3 pb-2 md:pb-4">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl lg:text-2xl">Análise de Ficha</DialogTitle>
            <Badge variant="secondary" className="text-xs md:text-sm">
              {currentIndex + 1} de {totalLeads}
            </Badge>
          </div>
        </DialogHeader>
        <div className="space-y-3 md:space-y-4 lg:space-y-6">
          <LeadCard lead={lead} />
          <SwipeActions
            onApprove={onApprove}
            onReject={onReject}
            onSuperApprove={onSuperApprove}
            onSkip={onSkip}
            disabled={disabled}
          />
          
          {/* Legenda */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 lg:gap-4 pt-3 md:pt-4 border-t text-[10px] md:text-xs lg:text-sm text-muted-foreground">
            <div className="flex items-center gap-1 md:gap-1.5">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Aprovar</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Super Aprovar</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Rejeitar</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-muted flex-shrink-0" />
              <span className="whitespace-nowrap">Pular</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
