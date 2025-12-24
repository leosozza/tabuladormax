import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Loader2, Check, X, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePaymentVoiceExtraction } from '@/hooks/usePaymentVoiceExtraction';
import { SelectedPaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/agenciamento';
import { cn } from '@/lib/utils';

interface PaymentVoiceAssistantProps {
  totalValue: number;
  onPaymentsExtracted: (payments: SelectedPaymentMethod[]) => void;
  onClose: () => void;
}

type AssistantState = 'idle' | 'recording' | 'processing' | 'preview' | 'error';

export function PaymentVoiceAssistant({ 
  totalValue, 
  onPaymentsExtracted, 
  onClose 
}: PaymentVoiceAssistantProps) {
  const [state, setState] = useState<AssistantState>('idle');
  
  const {
    isRecording,
    recordingTime,
    audioBlob,
    isExtracting,
    extractedPayments,
    transcription,
    reasoning,
    extractionError,
    startRecording,
    stopRecording,
    cancelRecording,
    extractPayments,
    reset,
  } = usePaymentVoiceExtraction();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleStartRecording = useCallback(async () => {
    const success = await startRecording();
    if (success) {
      setState('recording');
    } else {
      setState('error');
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    stopRecording();
    setState('processing');
    
    // Small delay to ensure audio blob is ready
    setTimeout(async () => {
      const success = await extractPayments(totalValue);
      if (success) {
        setState('preview');
      } else {
        setState('error');
      }
    }, 500);
  }, [stopRecording, extractPayments, totalValue]);

  const handleCancel = useCallback(() => {
    cancelRecording();
    reset();
    onClose();
  }, [cancelRecording, reset, onClose]);

  const handleRetry = useCallback(() => {
    reset();
    setState('idle');
  }, [reset]);

  const handleConfirm = useCallback(() => {
    if (extractedPayments && extractedPayments.length > 0) {
      onPaymentsExtracted(extractedPayments);
      reset();
      onClose();
    }
  }, [extractedPayments, onPaymentsExtracted, reset, onClose]);

  const totalExtracted = extractedPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const difference = totalValue - totalExtracted;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Volume2 className="h-4 w-4 text-primary" />
          Assistente de Pagamento por Voz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Idle State */}
        {state === 'idle' && (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Grave um áudio explicando as formas de pagamento
            </p>
            <p className="text-xs text-muted-foreground">
              Exemplo: "5 mil no PIX de entrada, depois 3x de 2 mil no cartão, e o resto em 6x no boleto"
            </p>
            <div className="flex justify-center gap-2">
              <Button
                onClick={handleStartRecording}
                className="gap-2"
              >
                <Mic className="h-4 w-4" />
                Iniciar Gravação
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Recording State */}
        {state === 'recording' && (
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                <div className="relative bg-red-500 text-white p-4 rounded-full">
                  <Mic className="h-6 w-6" />
                </div>
              </div>
              <p className="text-lg font-mono text-red-500">{formatTime(recordingTime)}</p>
              <p className="text-sm text-muted-foreground">Gravando... Fale as formas de pagamento</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button
                onClick={handleStopRecording}
                variant="default"
                className="gap-2"
              >
                <MicOff className="h-4 w-4" />
                Parar e Processar
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Transcrevendo e extraindo pagamentos...
            </p>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="text-center space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">
                {extractionError || 'Erro ao processar o áudio'}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={handleRetry} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Tentar Novamente
              </Button>
              <Button variant="ghost" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Preview State */}
        {state === 'preview' && extractedPayments && (
          <div className="space-y-4">
            {/* Transcription */}
            {transcription && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Você disse:</p>
                <p className="text-sm italic">"{transcription}"</p>
              </div>
            )}

            {/* Extracted Payments */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Pagamentos identificados:</p>
              {extractedPayments.map((payment, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {PAYMENT_METHOD_LABELS[payment.method] || payment.method}
                    </Badge>
                    {(payment.installments || 1) > 1 && (
                      <span className="text-xs text-muted-foreground">
                        {payment.installments}x de {formatCurrency(payment.installment_value || (payment.amount || 0) / (payment.installments || 1))}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-sm">
                    {formatCurrency(payment.amount || 0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className={cn(
              "p-3 rounded-lg",
              Math.abs(difference) < 0.01 ? "bg-green-500/10" : 
              difference > 0 ? "bg-yellow-500/10" : "bg-red-500/10"
            )}>
              <div className="flex justify-between text-sm">
                <span>Total identificado:</span>
                <span className="font-medium">{formatCurrency(totalExtracted)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Valor da negociação:</span>
                <span className="font-medium">{formatCurrency(totalValue)}</span>
              </div>
              {Math.abs(difference) >= 0.01 && (
                <div className={cn(
                  "flex justify-between text-sm font-medium mt-1 pt-1 border-t",
                  difference > 0 ? "text-yellow-600" : "text-red-600"
                )}>
                  <span>{difference > 0 ? 'Faltando:' : 'Excedente:'}</span>
                  <span>{formatCurrency(Math.abs(difference))}</span>
                </div>
              )}
            </div>

            {/* Reasoning */}
            {reasoning && (
              <p className="text-xs text-muted-foreground italic">
                💡 {reasoning}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleRetry} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Regravar
              </Button>
              <Button variant="ghost" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} className="gap-2">
                <Check className="h-4 w-4" />
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
