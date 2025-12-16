import { useState, useRef, useCallback } from 'react';
import lamejs from 'lamejs';

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

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
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
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [stopTimer]);

  const encodeToMp3 = useCallback((samples: Float32Array[], sampleRate: number): Blob => {
    // Combine all samples into one array
    const totalLength = samples.reduce((acc, s) => acc + s.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const s of samples) {
      combined.set(s, offset);
      offset += s.length;
    }

    // Convert Float32 to Int16
    const int16Samples = new Int16Array(combined.length);
    for (let i = 0; i < combined.length; i++) {
      const s = Math.max(-1, Math.min(1, combined[i]));
      int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Encode to MP3 using lamejs
    const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // mono, sampleRate, 128kbps
    const mp3Chunks: number[][] = [];
    
    const blockSize = 1152;
    for (let i = 0; i < int16Samples.length; i += blockSize) {
      const chunk = int16Samples.subarray(i, i + blockSize);
      const mp3buf = mp3Encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(Array.from(mp3buf));
      }
    }
    
    const end = mp3Encoder.flush();
    if (end.length > 0) {
      mp3Chunks.push(Array.from(end));
    }

    const mp3Data = new Uint8Array(mp3Chunks.flat());
    return new Blob([mp3Data], { type: 'audio/mpeg' });
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      samplesRef.current = [];
      isCancelledRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode to capture raw PCM data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isCancelledRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

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
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const samples = [...samplesRef.current];
    
    cleanup();
    setIsRecording(false);

    if (!isCancelledRef.current && samples.length > 0) {
      try {
        const mp3Blob = encodeToMp3(samples, sampleRate);
        setAudioBlob(mp3Blob);
      } catch (err) {
        console.error('[useAudioRecorder] Encoding error:', err);
        setError('Erro ao processar áudio');
      }
    }
    
    samplesRef.current = [];
  }, [isRecording, cleanup, encodeToMp3]);

  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    cleanup();
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
    samplesRef.current = [];
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
