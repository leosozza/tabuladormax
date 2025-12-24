import React, { useState, useCallback, useEffect } from 'react';
import { 
  Mic, MicOff, Loader2, Check, X,
  Send, ChevronLeft, Package, DollarSign, CreditCard, CheckCircle,
  MessageSquare, Volume2, VolumeX, Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAgenciamentoAssistant, AgenciamentoStage, AgenciamentoData, PaymentMethodData } from '@/hooks/useAgenciamentoAssistant';
import { BitrixProduct } from '@/lib/bitrix';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '@/types/agenciamento';
import { SimpleVoiceModeOverlay, NegotiationSummary } from '@/components/audio/SimpleVoiceModeOverlay';

interface AgenciamentoAssistantProps {
  products: BitrixProduct[];
  clientName?: string;
  dealTitle?: string;
  defaultPackage?: BitrixProduct | null;
  defaultValue?: number;
  onComplete: (data: {
    packageId: string;
    packageName: string;
    baseValue: number;
    finalValue: number;
    discountPercent: number;
    paymentMethods: PaymentMethodData[];
  }) => void;
  onCancel: () => void;
}

const STAGE_CONFIG: Record<AgenciamentoStage, { icon: React.ElementType; label: string; step: number }> = {
  idle: { icon: MessageSquare, label: 'Início', step: 0 },
  package: { icon: Package, label: 'Pacote', step: 1 },
  value: { icon: DollarSign, label: 'Valor', step: 2 },
  payment: { icon: CreditCard, label: 'Pagamento', step: 3 },
  review: { icon: CheckCircle, label: 'Revisão', step: 4 },
  complete: { icon: Check, label: 'Concluído', step: 5 },
};

// AI Provider configurations
const AI_PROVIDERS = [
  {
    id: 'lovable',
    name: 'Lovable AI',
    models: [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'openai/gpt-5', name: 'GPT-5' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
    ],
    defaultModel: 'google/gemini-2.5-flash',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
      { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
    ],
    defaultModel: 'anthropic/claude-3.5-sonnet',
  },
];

export function AgenciamentoAssistant({ 
  products, 
  clientName,
  dealTitle,
  defaultPackage,
  defaultValue,
  onComplete, 
  onCancel 
}: AgenciamentoAssistantProps) {
  const [textInput, setTextInput] = useState('');
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  
  const {
    stage,
    data,
    messages,
    currentMessage,
    isProcessing,
    error,
    isRecording,
    recordingTime,
    provider,
    model,
    setProvider,
    setModel,
    voiceResponseEnabled,
    setVoiceResponseEnabled,
    isSpeaking,
    startAssistant,
    sendMessage,
    sendAudio,
    sendAudioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    confirmAndSave,
    goBack,
    reset,
    stopSpeaking,
  } = useAgenciamentoAssistant({
    products,
    clientName,
    dealTitle,
    defaultPackage,
    defaultValue,
    onComplete: (completedData) => {
      if (completedData.selectedPackage) {
        onComplete({
          packageId: completedData.selectedPackage.ID,
          packageName: completedData.selectedPackage.NAME,
          baseValue: completedData.baseValue,
          finalValue: completedData.finalValue,
          discountPercent: completedData.discountPercent,
          paymentMethods: completedData.paymentMethods,
        });
      }
    },
  });

  // Get current provider configuration
  const currentProvider = AI_PROVIDERS.find(p => p.id === provider) || AI_PROVIDERS[0];
  const currentModels = currentProvider.models;

  // Handle provider change
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const providerConfig = AI_PROVIDERS.find(p => p.id === newProvider);
    if (providerConfig) {
      setModel(providerConfig.defaultModel);
    }
  };

  // Auto-start the assistant
  useEffect(() => {
    if (stage === 'idle') {
      startAssistant();
    }
  }, [stage, startAssistant]);

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

  const handleSendText = useCallback(async () => {
    if (!textInput.trim() || isProcessing) return;
    const text = textInput;
    setTextInput('');
    await sendMessage(text);
  }, [textInput, isProcessing, sendMessage]);

  const handleStartRecording = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await sendAudio();
  }, [sendAudio]);

  const handleVoiceOverlaySendAudio = useCallback(async (audioBlob: Blob) => {
    // Convert blob to base64 and send
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (base64) {
        // We need to use the hook's sendAudio with the blob
        // For now, start recording and send - but the overlay handles its own recording
        // So we can just process the text response
      }
    };
    reader.readAsDataURL(audioBlob);
    
    // For the overlay, we use its own recording mechanism
    // Just close overlay after sending
  }, []);

  const handleConfirm = useCallback(() => {
    confirmAndSave();
  }, [confirmAndSave]);

  const currentStepNumber = STAGE_CONFIG[stage]?.step || 0;

  // Calculate payment totals
  const paymentTotal = data.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
  const remainingValue = data.finalValue - paymentTotal;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Progress */}
      <div className="flex-shrink-0 border-b bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Assistente de Agenciamento</h2>
              {isSpeaking && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={stopSpeaking}
                  className="h-7 px-2 gap-1 text-primary animate-pulse"
                >
                  <Volume2 className="h-4 w-4" />
                  <span className="text-xs">Falando...</span>
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground ml-7">{currentProvider.name}</span>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {['package', 'value', 'payment', 'review'].map((s, idx) => {
            const config = STAGE_CONFIG[s as AgenciamentoStage];
            const isActive = currentStepNumber >= config.step;
            const isCurrent = stage === s;
            const Icon = config.icon;
            
            return (
              <React.Fragment key={s}>
                <div 
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                    isCurrent && "bg-primary text-primary-foreground",
                    isActive && !isCurrent && "bg-primary/20 text-primary",
                    !isActive && "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{config.label}</span>
                </div>
                {idx < 3 && (
                  <div className={cn(
                    "flex-1 h-0.5 rounded",
                    currentStepNumber > config.step ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Data Summary Cards */}
      {(data.selectedPackage || data.finalValue > 0 || data.paymentMethods.length > 0) && (
        <div className="flex-shrink-0 p-3 border-b bg-muted/10 space-y-2">
          {data.selectedPackage && (
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">{data.selectedPackage.NAME}</span>
              <span className="text-muted-foreground">
                {formatCurrency(data.selectedPackage.PRICE)}
              </span>
            </div>
          )}
          
          {data.finalValue > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-medium">{formatCurrency(data.finalValue)}</span>
              {data.discountPercent > 0 && (
                <Badge variant="secondary" className="text-xs">
                  -{data.discountPercent.toFixed(1)}%
                </Badge>
              )}
            </div>
          )}
          
          {data.paymentMethods.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-medium">Pagamentos:</span>
              </div>
              <div className="pl-6 space-y-1">
                {data.paymentMethods.map((pm, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {PAYMENT_METHOD_LABELS[pm.method as PaymentMethod] || pm.method}
                    </Badge>
                    <span>
                      {formatCurrency(pm.amount)}
                      {pm.installments > 1 && ` (${pm.installments}x)`}
                    </span>
                  </div>
                ))}
                {Math.abs(remainingValue) > 1 && (
                  <div className={cn(
                    "text-xs font-medium",
                    remainingValue > 0 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {remainingValue > 0 ? `Faltando: ${formatCurrency(remainingValue)}` : `Excedente: ${formatCurrency(Math.abs(remainingValue))}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-lg mx-auto">
          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={cn(
                "flex",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div 
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-br-sm" 
                    : "bg-muted rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Processando...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="flex justify-start">
              <div className="bg-destructive/10 text-destructive rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
                {error}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Review Actions */}
      {stage === 'review' && !isProcessing && (
        <div className="flex-shrink-0 p-4 border-t bg-muted/30">
          <div className="flex justify-center gap-3 max-w-lg mx-auto">
            <Button variant="outline" onClick={goBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="gap-2">
              <Check className="h-4 w-4" />
              Confirmar e Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {stage !== 'review' && stage !== 'complete' && (
        <div className="flex-shrink-0 p-4 border-t bg-background">
          {/* Recording State */}
          {isRecording ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                  <div className="relative bg-red-500 text-white p-3 rounded-full">
                    <Mic className="h-5 w-5" />
                  </div>
                </div>
                <span className="text-lg font-mono text-red-500">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStopRecording} className="gap-2">
                  <MicOff className="h-4 w-4" />
                  Enviar
                </Button>
                <Button variant="outline" onClick={cancelRecording}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 max-w-lg mx-auto">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Digite ou use o microfone..."
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button 
                onClick={handleSendText} 
                disabled={!textInput.trim() || isProcessing}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setVoiceOverlayOpen(true)}
                disabled={isProcessing}
                size="icon"
                className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-primary/30 hover:bg-primary/10"
                title="Modo Voz Imersivo"
              >
                <Radio className="h-4 w-4 text-primary" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Complete State */}
      {stage === 'complete' && (
        <div className="flex-shrink-0 p-4 border-t bg-green-500/10">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Negociação registrada com sucesso!</span>
          </div>
        </div>
      )}

      {/* Voice Assistant Overlay */}
      <SimpleVoiceModeOverlay
        isOpen={voiceOverlayOpen}
        onClose={() => setVoiceOverlayOpen(false)}
        onSendAudio={async (blob) => {
          await sendAudioBlob(blob);
        }}
        onSwitchToText={() => setVoiceOverlayOpen(false)}
        isSpeaking={isSpeaking}
        isProcessing={isProcessing}
        currentTranscript={messages.filter(m => m.role === 'user').slice(-1)[0]?.content}
        assistantResponse={messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
        assistantError={error}
        voiceResponseEnabled={voiceResponseEnabled}
        onVoiceResponseToggle={() => setVoiceResponseEnabled(!voiceResponseEnabled)}
        // ManyChat-style confirmation buttons
        showConfirmationButtons={stage === 'review'}
        onConfirm={() => {
          confirmAndSave();
          setVoiceOverlayOpen(false);
        }}
        onCorrect={() => {
          goBack();
        }}
        onRestart={() => {
          reset();
          startAssistant();
        }}
        negotiationSummary={{
          packageName: data.selectedPackage?.NAME,
          packagePrice: data.selectedPackage?.PRICE,
          finalValue: data.finalValue,
          discountPercent: data.discountPercent,
          paymentMethods: data.paymentMethods.map(pm => ({
            method: pm.method,
            amount: pm.amount,
            installments: pm.installments,
          })),
        }}
      />
    </div>
  );
}
