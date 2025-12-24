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
}

export const useVoiceActivityDetection = (
  onSpeechStart?: () => void,
  onSpeechEnd?: (audioBlob: Blob) => void,
  config: VADConfig = {}
): UseVoiceActivityDetectionReturn => {
  const {
    silenceThreshold = 0.01,
    speechThreshold = 0.02,
    silenceDuration = 1500,
    minSpeechDuration = 500,
  } = config;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setStream(null);
    setIsListening(false);
    setIsSpeaking(false);
    setVoiceLevel(0);
    isSpeakingRef.current = false;
  }, [stream]);

  const startRecording = useCallback(() => {
    if (!stream || mediaRecorderRef.current?.state === 'recording') return;

    chunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const speechDuration = speechStartTimeRef.current 
        ? Date.now() - speechStartTimeRef.current 
        : 0;

      if (chunksRef.current.length > 0 && speechDuration >= minSpeechDuration) {
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        onSpeechEnd?.(audioBlob);
      }
      
      chunksRef.current = [];
      speechStartTimeRef.current = null;
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    speechStartTimeRef.current = Date.now();
    
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    onSpeechStart?.();
  }, [stream, minSpeechDuration, onSpeechEnd, onSpeechStart]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isListening) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume (normalized 0-1)
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
    setVoiceLevel(average);

    if (average > speechThreshold && !isSpeakingRef.current) {
      // Speech detected - start recording
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      startRecording();
    } else if (average < silenceThreshold && isSpeakingRef.current) {
      // Silence detected while speaking - start timer
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
          silenceTimerRef.current = null;
        }, silenceDuration);
      }
    } else if (average >= silenceThreshold && isSpeakingRef.current) {
      // Still speaking - clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, [isListening, speechThreshold, silenceThreshold, silenceDuration, startRecording, stopRecording]);

  const startListening = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      setStream(mediaStream);

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsListening(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }, []);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Start analyzing when listening begins
  useEffect(() => {
    if (isListening && analyserRef.current) {
      animationRef.current = requestAnimationFrame(analyzeAudio);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, analyzeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
  };
};
