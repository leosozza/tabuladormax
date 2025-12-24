import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, MessageSquare, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './AudioVisualizer';
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
}) => {
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isInitialized,
    initializeContext,
    connectMicrophone,
    getFrequencyData,
    cleanup,
  } = useAudioVisualizer();

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeContext();
    }
  }, [isOpen, isInitialized, initializeContext]);

  useEffect(() => {
    if (isSpeaking) {
      setMode('speaking');
    } else if (isProcessing) {
      setMode('processing');
    } else if (isRecording) {
      setMode('listening');
    } else {
      setMode('idle');
    }
  }, [isSpeaking, isProcessing, isRecording]);

  useEffect(() => {
    return () => {
      stopRecording();
      cleanup();
    };
  }, [cleanup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      connectMicrophone(stream);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          await onSendAudio(audioBlob);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log('[VoiceOverlay] Recording started');
    } catch (error) {
      console.error('[VoiceOverlay] Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
    console.log('[VoiceOverlay] Recording stopped');
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'listening':
        return 'Ouvindo...';
      case 'processing':
        return 'Processando...';
      case 'speaking':
        return 'Respondendo...';
      default:
        return 'Toque para falar';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'speaking':
        return <Volume2 className="h-6 w-6 animate-pulse" />;
      case 'listening':
        return <Mic className="h-6 w-6 animate-pulse" />;
      default:
        return <Mic className="h-6 w-6" />;
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
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Title */}
      <div className="absolute top-8 text-center">
        <h2 className="text-2xl font-semibold text-white">Assistente de Voz</h2>
        <p className="text-white/60 text-sm mt-1">Agenciamento Inteligente</p>
      </div>

      {/* Visualizer Container */}
      <div className="w-full max-w-2xl px-8">
        <div className="relative">
          {/* Glow effect behind visualizer */}
          <div
            className={cn(
              'absolute inset-0 blur-3xl opacity-30 transition-colors duration-500',
              mode === 'listening' && 'bg-blue-500',
              mode === 'speaking' && 'bg-purple-500',
              mode === 'processing' && 'bg-amber-500',
              mode === 'idle' && 'bg-gray-500'
            )}
          />
          
          <AudioVisualizer
            isActive={isRecording || isSpeaking || isProcessing}
            mode={mode}
            getFrequencyData={getFrequencyData}
            className="relative z-10"
          />
        </div>
      </div>

      {/* Status and Transcript */}
      <div className="mt-8 text-center max-w-lg px-4">
        <p className="text-lg font-medium text-white mb-2">{getModeLabel()}</p>
        
        {isRecording && (
          <p className="text-white/60 text-sm">{formatTime(recordingTime)}</p>
        )}

        {currentTranscript && mode === 'processing' && (
          <p className="text-white/80 text-sm mt-4 italic">"{currentTranscript}"</p>
        )}

        {assistantResponse && mode === 'speaking' && (
          <p className="text-white/80 text-sm mt-4">{assistantResponse}</p>
        )}
      </div>

      {/* Main Control Button */}
      <div className="mt-12">
        <button
          onClick={handleMicClick}
          disabled={isProcessing || isSpeaking}
          className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300',
            'focus:outline-none focus:ring-4 focus:ring-white/20',
            isRecording
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : 'bg-white/10 hover:bg-white/20 border-2 border-white/30',
            (isProcessing || isSpeaking) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="text-white">
            {isRecording ? (
              <MicOff className="h-10 w-10" />
            ) : (
              getModeIcon()
            )}
          </div>
        </button>

        {isRecording && (
          <p className="text-center text-red-400 text-sm mt-3 animate-pulse">
            Toque para parar
          </p>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-8 flex gap-4">
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
