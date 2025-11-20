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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Análise de Ficha</DialogTitle>
            <Badge variant="secondary">
              {currentIndex + 1} de {totalLeads}
            </Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <LeadCard lead={lead} />
          <SwipeActions
            onApprove={onApprove}
            onReject={onReject}
            onSuperApprove={onSuperApprove}
            onSkip={onSkip}
            disabled={disabled}
          />
          
          {/* Legenda */}
          <div className="flex flex-wrap justify-center gap-4 pt-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Aprovar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Super Aprovar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Rejeitar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span>Pular</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
