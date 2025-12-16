import { useState, useRef, useCallback } from 'react';
import AudioRecorder from 'audio-recorder-polyfill';
import mpegEncoder from 'audio-recorder-polyfill/mpeg-encoder';

// Configure MP3 encoder
AudioRecorder.encoder = mpegEncoder;
AudioRecorder.prototype.mimeType = 'audio/mpeg';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  cancelRecording: () => void;
  clearRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<InstanceType<typeof AudioRecorder> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const isCancelledRef = useRef(false);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingTime(0);
    setError(null);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    recorderRef.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [stopTimer]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      isCancelledRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;

      const recorder = new AudioRecorder(stream);
      recorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (e: BlobEvent) => {
        if (!isCancelledRef.current && e.data && e.data.size > 0) {
          // The blob is already in MP3 format
          setAudioBlob(e.data);
        }
      });

      recorder.addEventListener('error', (e: Event) => {
        console.error('[useAudioRecorder] Recorder error:', e);
        setError('Erro durante a gravação');
        cleanup();
        setIsRecording(false);
      });

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      console.error('[useAudioRecorder] Error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Permissão do microfone negada');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('Nenhum microfone encontrado');
      } else {
        setError('Erro ao iniciar gravação');
      }
      return false;
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !recorderRef.current) return;
    
    stopTimer();
    
    if (recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
  }, [isRecording, stopTimer]);

  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    cleanup();
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
  }, [cleanup]);

  return {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
    error,
  };
}
