import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SwipeableCard from './SwipeableCard';
import SwipeActions from './SwipeActions';
import { Badge } from '@/components/ui/badge';
import AnalysisStats from './AnalysisStats';

interface LeadAnalysisModalProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onApprove: () => void;
  onReject: () => void;
  onSuperApprove: () => void;
  onSkip: () => void;
  disabled?: boolean;
  currentIndex: number;
  totalLeads: number;
  canUndo?: boolean;
  onUndo?: () => void;
  stats?: {
    total: number;
    approved: number;
    rejected: number;
    superApproved: number;
    skipped: number;
    startTime: Date;
  };
}

export function LeadAnalysisModal({
  lead,
  open,
  onOpenChange,
  onSwipe,
  onApprove,
  onReject,
  onSuperApprove,
  onSkip,
  disabled,
  currentIndex,
  totalLeads,
  canUndo,
  onUndo,
  stats
}: LeadAnalysisModalProps) {
  const progress = totalLeads > 0 ? ((currentIndex + 1) / totalLeads) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none p-0 gap-0 flex flex-col bg-background animate-in slide-in-from-bottom duration-300"
        data-tinder-modal="true"
      >
        <DialogHeader className="flex-shrink-0 border-b px-3 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-center gap-2">
            <DialogTitle className="text-base sm:text-lg font-semibold text-center">
              Análise de Ficha
            </DialogTitle>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {currentIndex + 1} de {totalLeads}
            </Badge>
          </div>

          {/* Estatísticas */}
          {stats && stats.total > 0 && (
            <AnalysisStats {...stats} />
          )}
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Área central do card com swipe */}
          <div className="flex-1 px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4">
            <div className="h-full flex flex-col overflow-hidden">
              <div className="w-full max-w-full sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto h-full">
                <SwipeableCard
                  lead={lead}
                  onSwipe={onSwipe}
                  disabled={disabled}
                />
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
              onUndo={onUndo || (() => {})}
              canUndo={canUndo || false}
              disabled={disabled}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
