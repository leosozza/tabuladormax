import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Timer
} from 'lucide-react';
import { useProducerQueue } from '@/hooks/useProducerQueue';
import { cn } from '@/lib/utils';

interface ProducerAttendanceTimerProps {
  producerId: string;
  dealId?: string;
  dealTitle?: string;
  clientName?: string;
  onFinished?: () => void;
}

export function ProducerAttendanceTimer({ 
  producerId, 
  dealId,
  dealTitle,
  clientName,
  onFinished 
}: ProducerAttendanceTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState<'FECHADO' | 'PERDIDO' | null>(null);
  
  const { 
    myStatus,
    isInAttendance, 
    hasPenalty,
    finishAttendance,
    isFinishingAttendance 
  } = useProducerQueue(producerId);

  // Timer
  useEffect(() => {
    if (!isInAttendance) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isInAttendance]);

  // Formatar tempo
  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Cor do timer baseado no tempo
  const timerColor = useMemo(() => {
    if (elapsedSeconds < 600) return 'text-green-600'; // < 10 min
    if (elapsedSeconds < 1800) return 'text-amber-600'; // < 30 min
    return 'text-destructive'; // >= 30 min
  }, [elapsedSeconds]);

  const handleFinish = (result: 'FECHADO' | 'PERDIDO') => {
    setShowConfirmDialog(result);
  };

  const confirmFinish = () => {
    if (showConfirmDialog) {
      finishAttendance(showConfirmDialog);
      setShowConfirmDialog(null);
      onFinished?.();
    }
  };

  if (!isInAttendance) {
    return null;
  }

  // Calcular se vai aplicar penalidade
  const willApplyPenalty = showConfirmDialog === 'PERDIDO' && myStatus?.consecutive_losses === 1;

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Header com info do atendimento */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-medium">Atendimento em andamento</span>
                </div>
                {(dealTitle || clientName) && (
                  <p className="text-sm text-muted-foreground">
                    {clientName && <span className="font-medium">{clientName}</span>}
                    {dealTitle && clientName && ' - '}
                    {dealTitle}
                  </p>
                )}
              </div>
              
              {/* Aviso de penalidade */}
              {myStatus?.consecutive_losses === 1 && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  1 perda
                </Badge>
              )}
            </div>

            {/* Timer grande */}
            <div className="text-center py-4">
              <div className={cn("text-5xl font-mono font-bold", timerColor)}>
                {formattedTime}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Tempo de atendimento
              </p>
            </div>

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleFinish('PERDIDO')}
                disabled={isFinishingAttendance}
              >
                {isFinishingAttendance ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                Não Fechado
              </Button>

              <Button
                variant="default"
                size="lg"
                className="gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleFinish('FECHADO')}
                disabled={isFinishingAttendance}
              >
                {isFinishingAttendance ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Negócio Fechado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {showConfirmDialog === 'FECHADO' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Confirmar Fechamento
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Confirmar Não Fechamento
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {showConfirmDialog === 'FECHADO' ? (
                <p>
                  🎉 Parabéns! Você está confirmando que fechou esta negociação.
                  O tempo de atendimento foi de <strong>{formattedTime}</strong>.
                </p>
              ) : (
                <>
                  <p>
                    Você está confirmando que esta negociação não foi fechada.
                    O tempo de atendimento foi de <strong>{formattedTime}</strong>.
                  </p>
                  
                  {willApplyPenalty && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Atenção: Penalidade será aplicada!</p>
                        <p className="text-sm">
                          Esta é sua 2ª perda consecutiva. Você pulará 1 rodada na fila.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFinish}
              className={cn(
                showConfirmDialog === 'FECHADO' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-destructive hover:bg-destructive/90'
              )}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
