import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, MessageSquare, Volume2, Pause, Play, Mic, AlertCircle } from 'lucide-react';
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
  assistantError?: string | null;
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
  assistantError,
  onSpeakingComplete,
}) => {
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const isSendingRef = useRef(false);

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
    // Prevent sending if already processing or sending
    if (isSendingRef.current || isProcessing) {
      console.log('[VoiceOverlay] Ignorando envio - já processando');
      return;
    }

    console.log('[VoiceOverlay] Speech ended - sending audio', audioBlob.size);
    if (audioBlob.size > 0) {
      isSendingRef.current = true;
      setLocalError(null);
      try {
        await onSendAudio(audioBlob);
      } catch (err) {
        console.error('[VoiceOverlay] Erro ao enviar áudio:', err);
        setLocalError(err instanceof Error ? err.message : 'Erro ao enviar áudio');
      } finally {
        isSendingRef.current = false;
      }
    }
  }, [onSendAudio, isProcessing]);

  const {
    isListening,
    isSpeaking: isUserSpeaking,
    voiceLevel,
    startListening,
    stopListening,
    stream,
    micError,
  } = useVoiceActivityDetection(handleSpeechStart, handleSpeechEnd, {
    silenceThreshold: 0.02,
    speechThreshold: 0.04,
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

  // Attempt to start listening with user gesture fallback
  const attemptStartListening = useCallback(async () => {
    try {
      setNeedsUserGesture(false);
      setLocalError(null);
      await startListening();
    } catch (err) {
      console.error('[VoiceOverlay] Erro ao iniciar escuta:', err);
      // Check if it's a permission/gesture error
      if (err instanceof Error && 
          (err.name === 'NotAllowedError' || 
           err.message.includes('permission') ||
           err.message.includes('gesture'))) {
        setNeedsUserGesture(true);
      } else {
        setLocalError(err instanceof Error ? err.message : 'Erro ao acessar microfone');
      }
    }
  }, [startListening]);

  // Start/stop listening based on overlay state
  useEffect(() => {
    if (isOpen && !isPaused && !isSpeaking && !isProcessing && !isListening && !needsUserGesture) {
      attemptStartListening();
    }

    // Cleanup when overlay closes
    return () => {
      if (!isOpen) {
        stopListening();
        cleanupVisualizer();
        isSendingRef.current = false;
      }
    };
  }, [isOpen, isPaused, isSpeaking, isProcessing, isListening, needsUserGesture, attemptStartListening, stopListening, cleanupVisualizer]);

  // Resume listening after speaking completes
  useEffect(() => {
    if (!isSpeaking && !isProcessing && isOpen && !isPaused && !isListening && !needsUserGesture) {
      const timer = setTimeout(() => {
        attemptStartListening();
        onSpeakingComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isProcessing, isOpen, isPaused, isListening, needsUserGesture, attemptStartListening, onSpeakingComplete]);

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
      attemptStartListening();
    } else {
      setIsPaused(true);
      stopListening();
    }
  }, [isPaused, attemptStartListening, stopListening]);

  const handleClose = useCallback(() => {
    stopListening();
    cleanupVisualizer();
    isSendingRef.current = false;
    onClose();
  }, [stopListening, cleanupVisualizer, onClose]);

  const handleActivateMic = useCallback(async () => {
    // This is called from a user gesture (button click)
    setNeedsUserGesture(false);
    setLocalError(null);
    try {
      await startListening();
    } catch (err) {
      console.error('[VoiceOverlay] Erro ao ativar microfone:', err);
      setLocalError(err instanceof Error ? err.message : 'Erro ao ativar microfone');
    }
  }, [startListening]);

  const getModeLabel = () => {
    if (needsUserGesture) return 'Clique para ativar';
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
    if (needsUserGesture) {
      return <Mic className="h-10 w-10" />;
    }
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
                transform: `scale(${1 + voiceLevel * 2})`,
              }}
            />
            <div 
              className="absolute inset-0 rounded-full bg-white/20"
              style={{
                transform: `scale(${1 + voiceLevel * 4})`,
                opacity: Math.min(voiceLevel * 5, 0.6),
              }}
            />
          </div>
        );
    }
  };

  // Combine errors
  const displayError = assistantError || localError || micError;

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
            displayError ? "bg-red-500" :
            needsUserGesture ? "bg-yellow-500" :
            isPaused ? "bg-yellow-500" :
            isListening ? "bg-green-500 animate-pulse" : 
            isProcessing ? "bg-amber-500 animate-pulse" :
            isSpeaking ? "bg-purple-500 animate-pulse" :
            "bg-gray-500"
          )}
        />
        <span className="text-white/60 text-sm">
          {displayError ? "Erro" :
           needsUserGesture ? "Aguardando ativação" :
           isPaused ? "Em pausa" : 
           isListening ? "Escuta ativa" : 
           isProcessing ? "Processando" :
           isSpeaking ? "Falando" : "Aguardando"}
        </span>
      </div>

      {/* Error display */}
      {displayError && (
        <div className="absolute top-32 max-w-md mx-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-200 text-sm">{displayError}</span>
        </div>
      )}

      {/* Visualizer Container */}
      <div className="w-full max-w-2xl px-8">
        <div className="relative">
          {/* Glow effect behind visualizer */}
          <div
            className={cn(
              'absolute inset-0 blur-3xl opacity-30 transition-colors duration-500',
              displayError && 'bg-red-500',
              !displayError && mode === 'listening' && 'bg-green-500',
              !displayError && mode === 'speaking' && 'bg-purple-500',
              !displayError && mode === 'processing' && 'bg-amber-500',
              !displayError && mode === 'idle' && isListening && 'bg-blue-500',
              !displayError && mode === 'idle' && !isListening && 'bg-gray-500'
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
            style={{ width: `${Math.min(voiceLevel * 500, 100)}%` }}
          />
        </div>
      )}

      {/* Status and Transcript */}
      <div className="mt-8 text-center max-w-lg px-4">
        <p className={cn(
          "text-lg font-medium mb-2 transition-colors",
          displayError ? "text-red-400" :
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

      {/* Main Visual Indicator / Activate Button */}
      <div className="mt-12">
        {needsUserGesture ? (
          <Button
            onClick={handleActivateMic}
            className="w-32 h-32 rounded-full bg-blue-500/20 border-2 border-blue-500/50 hover:bg-blue-500/30 hover:border-blue-500 transition-all"
          >
            <div className="text-center">
              <Mic className="h-10 w-10 mx-auto text-blue-400" />
              <span className="text-blue-300 text-xs mt-2 block">Ativar</span>
            </div>
          </Button>
        ) : (
          <div
            className={cn(
              'w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300',
              'focus:outline-none focus:ring-4 focus:ring-white/20',
              isUserSpeaking && 'scale-110',
              displayError ? 'bg-red-500/20 border-2 border-red-500/50' :
              isPaused ? 'bg-yellow-500/20 border-2 border-yellow-500/50' :
              isProcessing ? 'bg-amber-500/20 border-2 border-amber-500/50' :
              isSpeaking ? 'bg-purple-500/20 border-2 border-purple-500/50' :
              isListening ? 'bg-blue-500/20 border-2 border-blue-500/50' :
              'bg-white/10 border-2 border-white/30'
            )}
            style={{
              boxShadow: isUserSpeaking 
                ? `0 0 ${30 + voiceLevel * 100}px rgba(34, 197, 94, ${0.3 + voiceLevel * 0.5})`
                : undefined
            }}
          >
            <div className="text-white">
              {getModeIcon()}
            </div>
          </div>
        )}

        {isListening && !isPaused && !isProcessing && !isSpeaking && !needsUserGesture && (
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
          disabled={isProcessing || needsUserGesture}
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
