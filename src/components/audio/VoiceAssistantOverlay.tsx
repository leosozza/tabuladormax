import React, { useEffect, useState, useCallback } from 'react';
import { X, MessageSquare, Volume2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './AudioVisualizer';
import { useVoiceActivityDetection } from '@/hooks/useVoiceActivityDetection';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';
import { cn } from '@/lib/utils';

type VoiceMode = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceAssistantOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSendAudio: (audioBlob: Blob) => Promise<void>;
  onSwitchToText: () => void;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentTranscript?: string;
  assistantResponse?: string;
  onSpeakingComplete?: () => void;
}

export const VoiceAssistantOverlay: React.FC<VoiceAssistantOverlayProps> = ({
  isOpen,
  onClose,
  onSendAudio,
  onSwitchToText,
  isSpeaking,
  isProcessing,
  currentTranscript,
  assistantResponse,
  onSpeakingComplete,
}) => {
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const {
    initializeContext,
    connectMicrophone,
    getFrequencyData,
    cleanup: cleanupVisualizer,
  } = useAudioVisualizer();

  const handleSpeechStart = useCallback(() => {
    console.log('[VoiceOverlay] Speech detected - recording started');
  }, []);

  const handleSpeechEnd = useCallback(async (audioBlob: Blob) => {
    console.log('[VoiceOverlay] Speech ended - sending audio', audioBlob.size);
    if (audioBlob.size > 0) {
      await onSendAudio(audioBlob);
    }
  }, [onSendAudio]);

  const {
    isListening,
    isSpeaking: isUserSpeaking,
    voiceLevel,
    startListening,
    stopListening,
    stream,
  } = useVoiceActivityDetection(handleSpeechStart, handleSpeechEnd, {
    silenceThreshold: 0.015,
    speechThreshold: 0.025,
    silenceDuration: 1500,
    minSpeechDuration: 500,
  });

  // Connect microphone to visualizer when stream is available
  useEffect(() => {
    if (stream) {
      initializeContext().then(() => {
        connectMicrophone(stream);
      });
    }
  }, [stream, initializeContext, connectMicrophone]);

  // Start listening when overlay opens (unless paused or speaking)
  useEffect(() => {
    if (isOpen && !isPaused && !isSpeaking && !isProcessing) {
      startListening().catch(console.error);
    }
    
    return () => {
      if (!isOpen) {
        stopListening();
        cleanupVisualizer();
      }
    };
  }, [isOpen, isPaused, isSpeaking, isProcessing, startListening, stopListening, cleanupVisualizer]);

  // Resume listening after speaking completes
  useEffect(() => {
    if (!isSpeaking && !isProcessing && isOpen && !isPaused && !isListening) {
      const timer = setTimeout(() => {
        startListening().catch(console.error);
        onSpeakingComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isProcessing, isOpen, isPaused, isListening, startListening, onSpeakingComplete]);

  // Update mode based on current state
  useEffect(() => {
    if (isSpeaking) {
      setMode('speaking');
    } else if (isProcessing) {
      setMode('processing');
    } else if (isListening && isUserSpeaking) {
      setMode('listening');
    } else if (isListening) {
      setMode('idle');
    } else {
      setMode('idle');
    }
  }, [isSpeaking, isProcessing, isListening, isUserSpeaking]);

  // Update last transcript
  useEffect(() => {
    if (currentTranscript) {
      setLastTranscript(currentTranscript);
    }
  }, [currentTranscript]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      startListening().catch(console.error);
    } else {
      setIsPaused(true);
      stopListening();
    }
  }, [isPaused, startListening, stopListening]);

  const handleClose = useCallback(() => {
    stopListening();
    cleanupVisualizer();
    onClose();
  }, [stopListening, cleanupVisualizer, onClose]);

  const getModeLabel = () => {
    if (isPaused) return 'Pausado';
    switch (mode) {
      case 'listening':
        return 'Ouvindo...';
      case 'processing':
        return 'Processando...';
      case 'speaking':
        return 'Respondendo...';
      default:
        return isListening ? 'Pode falar...' : 'Iniciando...';
    }
  };

  const getModeIcon = () => {
    if (isPaused) {
      return <Play className="h-10 w-10" />;
    }
    switch (mode) {
      case 'speaking':
        return <Volume2 className="h-10 w-10 animate-pulse" />;
      default:
        return (
          <div className="relative">
            <div 
              className={cn(
                "w-16 h-16 rounded-full transition-all duration-150",
                isUserSpeaking ? "bg-green-500 scale-110" : "bg-blue-500",
                isListening && "animate-pulse"
              )}
              style={{
                transform: `scale(${1 + voiceLevel * 0.5})`,
              }}
            />
            <div 
              className="absolute inset-0 rounded-full bg-white/20"
              style={{
                transform: `scale(${1 + voiceLevel * 1.5})`,
                opacity: voiceLevel * 2,
              }}
            />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
        onClick={handleClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Title */}
      <div className="absolute top-8 text-center">
        <h2 className="text-2xl font-semibold text-white">Assistente de Voz</h2>
        <p className="text-white/60 text-sm mt-1">Conversa Contínua</p>
      </div>

      {/* Status indicator */}
      <div className="absolute top-24 flex items-center gap-2">
        <div 
          className={cn(
            "w-3 h-3 rounded-full transition-colors",
            isPaused ? "bg-yellow-500" :
            isListening ? "bg-green-500 animate-pulse" : 
            isProcessing ? "bg-amber-500 animate-pulse" :
            isSpeaking ? "bg-purple-500 animate-pulse" :
            "bg-gray-500"
          )}
        />
        <span className="text-white/60 text-sm">
          {isPaused ? "Em pausa" : 
           isListening ? "Escuta ativa" : 
           isProcessing ? "Processando" :
           isSpeaking ? "Falando" : "Aguardando"}
        </span>
      </div>

      {/* Visualizer Container */}
      <div className="w-full max-w-2xl px-8">
        <div className="relative">
          {/* Glow effect behind visualizer */}
          <div
            className={cn(
              'absolute inset-0 blur-3xl opacity-30 transition-colors duration-500',
              mode === 'listening' && 'bg-green-500',
              mode === 'speaking' && 'bg-purple-500',
              mode === 'processing' && 'bg-amber-500',
              mode === 'idle' && isListening && 'bg-blue-500',
              mode === 'idle' && !isListening && 'bg-gray-500'
            )}
          />
          
          <AudioVisualizer
            isActive={isListening || isSpeaking || isProcessing}
            mode={mode}
            getFrequencyData={getFrequencyData}
            voiceLevel={voiceLevel}
            className="relative z-10"
          />
        </div>
      </div>

      {/* Voice level indicator */}
      {isListening && !isPaused && (
        <div className="mt-4 w-64 h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-75 rounded-full",
              isUserSpeaking ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${Math.min(voiceLevel * 300, 100)}%` }}
          />
        </div>
      )}

      {/* Status and Transcript */}
      <div className="mt-8 text-center max-w-lg px-4">
        <p className={cn(
          "text-lg font-medium mb-2 transition-colors",
          isUserSpeaking ? "text-green-400" : "text-white"
        )}>
          {getModeLabel()}
        </p>

        {lastTranscript && (mode === 'processing' || mode === 'speaking') && (
          <p className="text-white/80 text-sm mt-4 italic">"{lastTranscript}"</p>
        )}

        {assistantResponse && mode === 'speaking' && (
          <p className="text-white/80 text-sm mt-4">{assistantResponse}</p>
        )}
      </div>

      {/* Main Visual Indicator */}
      <div className="mt-12">
        <div
          className={cn(
            'w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300',
            'focus:outline-none focus:ring-4 focus:ring-white/20',
            isUserSpeaking && 'scale-110',
            isPaused ? 'bg-yellow-500/20 border-2 border-yellow-500/50' :
            isProcessing ? 'bg-amber-500/20 border-2 border-amber-500/50' :
            isSpeaking ? 'bg-purple-500/20 border-2 border-purple-500/50' :
            isListening ? 'bg-blue-500/20 border-2 border-blue-500/50' :
            'bg-white/10 border-2 border-white/30'
          )}
          style={{
            boxShadow: isUserSpeaking 
              ? `0 0 ${30 + voiceLevel * 50}px rgba(34, 197, 94, ${0.3 + voiceLevel * 0.3})`
              : undefined
          }}
        >
          <div className="text-white">
            {getModeIcon()}
          </div>
        </div>

        {isListening && !isPaused && !isProcessing && !isSpeaking && (
          <p className="text-center text-blue-400 text-sm mt-4">
            {isUserSpeaking ? "Gravando sua fala..." : "Aguardando você falar..."}
          </p>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-8 flex gap-4">
        <Button
          variant="outline"
          className={cn(
            "bg-transparent border-white/20 text-white hover:bg-white/10",
            isPaused && "border-yellow-500/50 text-yellow-400"
          )}
          onClick={handlePauseResume}
          disabled={isProcessing}
        >
          {isPaused ? (
            <>
              <Play className="h-4 w-4 mr-2" />
              Continuar
            </>
          ) : (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
          onClick={onSwitchToText}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Modo Texto
        </Button>
      </div>
    </div>
  );
};
