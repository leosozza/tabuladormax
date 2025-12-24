import { useState, useRef, useCallback, useEffect } from 'react';

interface VADConfig {
  silenceThreshold?: number;
  speechThreshold?: number;
  silenceDuration?: number;
  minSpeechDuration?: number;
}

interface UseVoiceActivityDetectionReturn {
  isListening: boolean;
  isSpeaking: boolean;
  voiceLevel: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  stream: MediaStream | null;
  micError: string | null;
}

export const useVoiceActivityDetection = (
  onSpeechStart?: () => void,
  onSpeechEnd?: (audioBlob: Blob) => void,
  config: VADConfig = {}
): UseVoiceActivityDetectionReturn => {
  const {
    silenceThreshold = 0.02,
    speechThreshold = 0.04,
    silenceDuration = 1500,
    minSpeechDuration = 500,
  } = config;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    console.log('[VAD] Cleanup iniciado');

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('[VAD] Erro ao parar MediaRecorder:', e);
      }
    }
    mediaRecorderRef.current = null;

    // Stop all tracks
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('[VAD] Track parada:', track.kind);
      });
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.warn);
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    chunksRef.current = [];
    speechStartTimeRef.current = null;

    setStream(null);
    setIsListening(false);
    setIsSpeaking(false);
    setVoiceLevel(0);
    isSpeakingRef.current = false;

    isCleaningUpRef.current = false;
    console.log('[VAD] Cleanup concluído');
  }, [stream]);

  const startRecording = useCallback(() => {
    if (!stream || mediaRecorderRef.current?.state === 'recording') {
      console.log('[VAD] Não pode iniciar gravação - stream:', !!stream, 'recording:', mediaRecorderRef.current?.state);
      return;
    }

    chunksRef.current = [];
    
    // Try WebM first, fallback to mp4
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';

    console.log('[VAD] Iniciando gravação com mimeType:', mimeType);

    const mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        console.log('[VAD] Chunk recebido:', e.data.size, 'bytes');
      }
    };

    mediaRecorder.onstop = () => {
      const speechDuration = speechStartTimeRef.current 
        ? Date.now() - speechStartTimeRef.current 
        : 0;

      console.log('[VAD] Gravação parou - chunks:', chunksRef.current.length, 'duração:', speechDuration, 'ms');

      if (chunksRef.current.length > 0 && speechDuration >= minSpeechDuration) {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        console.log('[VAD] Blob criado:', audioBlob.size, 'bytes, tipo:', audioBlob.type);
        onSpeechEnd?.(audioBlob);
      } else {
        console.log('[VAD] Gravação muito curta ou vazia, descartando');
      }
      
      chunksRef.current = [];
      speechStartTimeRef.current = null;
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // Collect data every 100ms
    speechStartTimeRef.current = Date.now();
    
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    onSpeechStart?.();
    console.log('[VAD] Gravação iniciada');
  }, [stream, minSpeechDuration, onSpeechEnd, onSpeechStart]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[VAD] Parando gravação');
      mediaRecorderRef.current.stop();
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isListening || isCleaningUpRef.current) return;

    // Use time domain data for RMS calculation (more reliable for voice)
    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Calculate RMS (Root Mean Square) for voice level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
      sum += value * value;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    setVoiceLevel(rms);

    if (rms > speechThreshold && !isSpeakingRef.current) {
      // Speech detected - start recording
      console.log('[VAD] Fala detectada, RMS:', rms.toFixed(4));
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      startRecording();
    } else if (rms < silenceThreshold && isSpeakingRef.current) {
      // Silence detected while speaking - start timer
      if (!silenceTimerRef.current) {
        console.log('[VAD] Silêncio detectado, iniciando timer');
        silenceTimerRef.current = setTimeout(() => {
          console.log('[VAD] Silêncio confirmado, parando gravação');
          stopRecording();
          silenceTimerRef.current = null;
        }, silenceDuration);
      }
    } else if (rms >= silenceThreshold && isSpeakingRef.current) {
      // Still speaking - clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, [isListening, speechThreshold, silenceThreshold, silenceDuration, startRecording, stopRecording]);

  const startListening = useCallback(async () => {
    if (isListening) {
      console.log('[VAD] Já está ouvindo');
      return;
    }

    setMicError(null);

    try {
      console.log('[VAD] Solicitando acesso ao microfone...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      console.log('[VAD] Microfone obtido, tracks:', mediaStream.getAudioTracks().length);
      setStream(mediaStream);

      const audioContext = new AudioContext();
      
      // Resume AudioContext if suspended (required for user gesture)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[VAD] AudioContext resumed');
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsListening(true);
      console.log('[VAD] Escuta iniciada com sucesso');
    } catch (error) {
      console.error('[VAD] Erro ao acessar microfone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMicError(errorMessage);
      throw error;
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    console.log('[VAD] stopListening chamado');
    cleanup();
  }, [cleanup]);

  // Start analyzing when listening begins
  useEffect(() => {
    if (isListening && analyserRef.current && !animationRef.current) {
      console.log('[VAD] Iniciando análise de áudio');
      animationRef.current = requestAnimationFrame(analyzeAudio);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isListening, analyzeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[VAD] Unmount - cleanup');
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    isSpeaking,
    voiceLevel,
    startListening,
    stopListening,
    stream,
    micError,
  };
};
