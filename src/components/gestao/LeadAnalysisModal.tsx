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
      <DialogContent 
        className="w-screen h-screen max-w-none p-0 gap-0 flex flex-col bg-background animate-in slide-in-from-bottom duration-300"
        data-tinder-modal="true"
      >
        <DialogHeader className="flex-shrink-0 border-b px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Análise de Ficha</DialogTitle>
            <Badge variant="secondary" className="text-sm">
              {currentIndex + 1} de {totalLeads}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Área central do card - ocupa altura e centraliza o conteúdo */}
          <div className="flex-1 px-3 py-3 md:px-4 md:py-4">
            <div className="h-full max-h-[70vh] flex items-center justify-center overflow-y-auto">
              <div className="w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl">
                <LeadCard lead={lead} />
              </div>
            </div>
          </div>
          
          {/* SwipeActions fixo */}
          <div className="flex-shrink-0 border-t bg-background">
            <SwipeActions
              onApprove={onApprove}
              onReject={onReject}
              onSuperApprove={onSuperApprove}
              onSkip={onSkip}
              disabled={disabled}
            />
          </div>
          
          {/* Legenda fixa */}
          <div className="flex-shrink-0 border-t px-4 py-2 bg-muted/50">
            <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Aprovar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Super Aprovar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Rejeitar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
                <span className="whitespace-nowrap">Pular</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
