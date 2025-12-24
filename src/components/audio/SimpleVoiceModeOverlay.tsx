import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mic, MicOff, Loader2, MessageSquare, Volume2, VolumeX, Check, Edit3, RotateCcw, Package, DollarSign, CreditCard, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';

export interface NegotiationSummary {
  packageName?: string;
  packagePrice?: number;
  finalValue?: number;
  discountPercent?: number;
  paymentMethods?: { method: string; amount: number; installments: number }[];
}

export interface PendingBoletoInfo {
  method: string;
  amount: number;
  installments: number;
}

interface SimpleVoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSendAudio: (audioBlob: Blob) => Promise<void>;
  onSwitchToText: () => void;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  currentTranscript?: string;
  assistantResponse?: string;
  assistantError?: string;
  onSpeakingComplete?: () => void;
  voiceResponseEnabled?: boolean;
  onVoiceResponseToggle?: () => void;
  // ManyChat-style confirmation buttons
  showConfirmationButtons?: boolean;
  onConfirm?: () => void;
  onCorrect?: () => void;
  onRestart?: () => void;
  negotiationSummary?: NegotiationSummary;
  // Date picker for boleto
  showDatePicker?: boolean;
  pendingBoletoData?: PendingBoletoInfo | null;
  onSelectDueDate?: (date: Date) => void;
  onCancelDatePicker?: () => void;
}

export function SimpleVoiceModeOverlay({
  isOpen,
  onClose,
  onSendAudio,
  onSwitchToText,
  isSpeaking = false,
  isProcessing = false,
  currentTranscript,
  assistantResponse,
  assistantError,
  voiceResponseEnabled = true,
  onVoiceResponseToggle,
  showConfirmationButtons = false,
  onConfirm,
  onCorrect,
  onRestart,
  negotiationSummary,
  showDatePicker = false,
  pendingBoletoData,
  onSelectDueDate,
  onCancelDatePicker,
}: SimpleVoiceModeOverlayProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external states
  useEffect(() => {
    if (isSpeaking) {
      setState('speaking');
    } else if (isProcessing) {
      setState('processing');
    } else if (state === 'speaking' || state === 'processing') {
      setState('idle');
    }
  }, [isSpeaking, isProcessing, state]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopRecording(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopRecording(false);
      setState('idle');
      setRecordingTime(0);
      setMicError(null);
    }
  }, [isOpen]);

  const startRecording = useCallback(async () => {
    try {
      setMicError(null);
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.start(100);
      setState('recording');
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Microphone error:', err);
      setMicError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, []);

  const stopRecording = useCallback(async (sendAudio: boolean = true) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const mediaRecorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      return new Promise<void>((resolve) => {
        mediaRecorder.onstop = async () => {
          if (sendAudio && chunksRef.current.length > 0) {
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(chunksRef.current, { type: mimeType });
            
            if (audioBlob.size > 0) {
              setState('processing');
              try {
                await onSendAudio(audioBlob);
              } catch (err) {
                console.error('Error sending audio:', err);
                setState('idle');
              }
            }
          }
          
          chunksRef.current = [];
          resolve();
        };
        
        mediaRecorder.stop();
      }).finally(() => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
      });
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (!sendAudio) {
      setState('idle');
    }
  }, [onSendAudio]);

  const handleMicPress = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording(true);
    }
  }, [state, startRecording, stopRecording]);

  const handleClose = useCallback(() => {
    stopRecording(false);
    onClose();
  }, [stopRecording, onClose]);

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

  const getStateLabel = () => {
    if (showDatePicker) {
      return 'Selecione a data do primeiro vencimento';
    }
    if (showConfirmationButtons) {
      return 'Confirme a negociação';
    }
    switch (state) {
      case 'recording':
        return 'Gravando...';
      case 'processing':
        return 'Processando...';
      case 'speaking':
        return 'Assistente falando...';
      default:
        return 'Toque para falar';
    }
  };

  const handleSelectDate = () => {
    if (selectedDate && onSelectDueDate) {
      onSelectDueDate(selectedDate);
      setSelectedDate(undefined);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Modo Voz
        </h2>
        <div className="flex items-center gap-2">
          {/* Voice Response Toggle */}
          <Button
            variant={voiceResponseEnabled ? "default" : "ghost"}
            size="sm"
            onClick={onVoiceResponseToggle}
            className="gap-1.5"
            title={voiceResponseEnabled ? "Desativar resposta por voz" : "Ativar resposta por voz"}
          >
            {voiceResponseEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            <span className="text-xs">Voz</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {/* Error */}
        {(micError || assistantError) && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm max-w-sm text-center">
            {micError || assistantError}
          </div>
        )}

        {/* Transcript / Response */}
        <div className="text-center max-w-md space-y-4">
          {currentTranscript && (
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Você disse:</p>
              <p className="text-foreground">{currentTranscript}</p>
            </div>
          )}
          
          {assistantResponse && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Assistente:</p>
              <p className="text-foreground">{assistantResponse}</p>
            </div>
          )}
        </div>

        {/* Recording Time */}
        {state === 'recording' && !showConfirmationButtons && (
          <div className="text-2xl font-mono text-primary animate-pulse">
            {formatTime(recordingTime)}
          </div>
        )}

        {/* Date Picker for Boleto */}
        {showDatePicker && pendingBoletoData ? (
          <div className="w-full max-w-sm space-y-6">
            {/* Boleto Info Card */}
            <div className="bg-card border rounded-xl p-4 shadow-lg space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Data do Primeiro Vencimento
                </h3>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <CreditCard className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Boleto Parcelado</p>
                  <p className="font-medium">
                    {formatCurrency(pendingBoletoData.amount)} em {pendingBoletoData.installments}x
                  </p>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                disabled={(date) => date < new Date()}
                className="rounded-md border bg-card pointer-events-auto"
              />
            </div>

            {/* Selected Date Display */}
            {selectedDate && (
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Data selecionada:</p>
                <p className="font-semibold text-lg text-primary">
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancelDatePicker}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95"
              >
                <X className="h-6 w-6" />
                <span className="font-semibold text-sm">Cancelar</span>
              </button>
              
              <button
                onClick={handleSelectDate}
                disabled={!selectedDate}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 shadow-lg",
                  selectedDate 
                    ? "bg-green-500 hover:bg-green-600 text-white hover:shadow-xl" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Check className="h-6 w-6" />
                <span className="font-semibold text-sm">Confirmar</span>
              </button>
            </div>
          </div>
        ) : showConfirmationButtons ? (
          <div className="w-full max-w-sm space-y-6">
            {/* Negotiation Summary Card */}
            {negotiationSummary && (
              <div className="bg-card border rounded-xl p-4 shadow-lg space-y-3">
                <div className="text-center">
                  <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                    📋 Resumo da Negociação
                  </h3>
                </div>
                
                {negotiationSummary.packageName && (
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pacote</p>
                      <p className="font-medium">{negotiationSummary.packageName}</p>
                    </div>
                  </div>
                )}
                
                {negotiationSummary.finalValue !== undefined && negotiationSummary.finalValue > 0 && (
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Valor Final</p>
                      <p className="font-medium text-green-600">{formatCurrency(negotiationSummary.finalValue)}</p>
                    </div>
                    {negotiationSummary.discountPercent !== undefined && negotiationSummary.discountPercent > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                        -{negotiationSummary.discountPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
                
                {negotiationSummary.paymentMethods && negotiationSummary.paymentMethods.length > 0 && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <p className="text-xs text-muted-foreground">Formas de Pagamento</p>
                    </div>
                    <div className="space-y-1.5 pl-7">
                      {negotiationSummary.paymentMethods.map((pm, idx) => (
                        <p key={idx} className="text-sm">
                          <span className="font-medium">{pm.method}</span>: {formatCurrency(pm.amount)}
                          {pm.installments > 1 && ` (${pm.installments}x)`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons - ManyChat Style */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={onConfirm}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white transition-all active:scale-95 shadow-lg hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="h-6 w-6" />
                </div>
                <span className="font-semibold text-sm">Confirmar</span>
              </button>
              
              <button
                onClick={onCorrect}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white transition-all active:scale-95 shadow-lg hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Edit3 className="h-6 w-6" />
                </div>
                <span className="font-semibold text-sm">Corrigir</span>
              </button>
              
              <button
                onClick={onRestart}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 shadow-lg hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <span className="font-semibold text-sm">Reiniciar</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Main Button */}
            <button
              onClick={handleMicPress}
              disabled={state === 'processing' || state === 'speaking'}
              className={cn(
                "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                "focus:outline-none focus:ring-4 focus:ring-primary/30",
                state === 'idle' && "bg-primary hover:bg-primary/90 active:scale-95",
                state === 'recording' && "bg-red-500 hover:bg-red-600",
                (state === 'processing' || state === 'speaking') && "bg-muted cursor-not-allowed"
              )}
            >
              {/* Pulse animation for recording */}
              {state === 'recording' && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-500/50 animate-ping" />
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
                </>
              )}
              
              {/* Speaking animation */}
              {state === 'speaking' && (
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse" />
              )}
              
              {/* Icon */}
              {state === 'processing' ? (
                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
              ) : state === 'recording' ? (
                <MicOff className="h-12 w-12 text-white relative z-10" />
              ) : state === 'speaking' ? (
                <Volume2 className="h-12 w-12 text-primary relative z-10" />
              ) : (
                <Mic className="h-12 w-12 text-primary-foreground" />
              )}
            </button>
          </>
        )}

        {/* State Label */}
        <p className="text-muted-foreground text-sm">
          {getStateLabel()}
        </p>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-center">
        <Button
          variant="outline"
          onClick={() => {
            handleClose();
            onSwitchToText();
          }}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Modo Texto
        </Button>
      </div>
    </div>
  );
}
