import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mic, MicOff, Loader2, MessageSquare, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';

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
}: SimpleVoiceModeOverlayProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  
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

  const getStateLabel = () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Modo Voz
        </h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
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
        {state === 'recording' && (
          <div className="text-2xl font-mono text-primary animate-pulse">
            {formatTime(recordingTime)}
          </div>
        )}

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
