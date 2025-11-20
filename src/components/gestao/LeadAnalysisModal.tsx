import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SwipeableCard from './SwipeableCard';
import SwipeActions from './SwipeActions';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AnalysisStats from './AnalysisStats';
import UndoButton from './UndoButton';

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
        <DialogHeader className="flex-shrink-0 border-b px-4 py-3 space-y-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Análise de Ficha</DialogTitle>
            <Badge variant="secondary" className="text-sm">
              {currentIndex + 1} de {totalLeads}
            </Badge>
          </div>
          
          {/* Barra de progresso */}
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% concluído
            </p>
          </div>

          {/* Estatísticas */}
          {stats && stats.total > 0 && (
            <AnalysisStats {...stats} />
          )}
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Área central do card com swipe */}
          <div className="flex-1 px-3 py-3 md:px-4 md:py-4">
            <div className="h-full flex flex-col overflow-hidden">
              <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto h-full">
                <SwipeableCard
                  lead={lead}
                  onSwipe={onSwipe}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          
          {/* Botão de Undo */}
          {canUndo && onUndo && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
              <UndoButton
                onUndo={onUndo}
                isVisible={canUndo}
                timeoutMs={5000}
              />
            </div>
          )}
          
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
          
          {/* Legenda fixa com indicadores de swipe */}
          <div className="flex-shrink-0 border-t px-4 py-2 bg-muted/50">
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <span className="whitespace-nowrap">→ Aprovar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                <span className="whitespace-nowrap">↑ Super</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <span className="whitespace-nowrap">← Reprovar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
                <span className="whitespace-nowrap">↓ Pular</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
