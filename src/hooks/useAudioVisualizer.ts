import { useRef, useCallback, useState } from 'react';

export interface UseAudioVisualizerReturn {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  isInitialized: boolean;
  initializeContext: () => Promise<void>;
  connectMicrophone: (stream: MediaStream) => void;
  connectAudioElement: (audioElement: HTMLAudioElement) => void;
  getFrequencyData: () => Uint8Array;
  getWaveformData: () => Uint8Array;
  cleanup: () => void;
}

export const useAudioVisualizer = (): UseAudioVisualizerReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeContext = useCallback(async () => {
    if (audioContextRef.current) return;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      setIsInitialized(true);
      console.log('[AudioVisualizer] Context initialized');
    } catch (error) {
      console.error('[AudioVisualizer] Failed to initialize:', error);
    }
  }, []);

  const connectMicrophone = useCallback((stream: MediaStream) => {
    if (!audioContextRef.current || !analyserRef.current) {
      console.warn('[AudioVisualizer] Context not initialized');
      return;
    }

    // Disconnect previous source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    try {
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      console.log('[AudioVisualizer] Microphone connected');
    } catch (error) {
      console.error('[AudioVisualizer] Failed to connect microphone:', error);
    }
  }, []);

  const connectAudioElement = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioContextRef.current || !analyserRef.current) {
      console.warn('[AudioVisualizer] Context not initialized');
      return;
    }

    // Disconnect previous source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    try {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      console.log('[AudioVisualizer] Audio element connected');
    } catch (error) {
      console.error('[AudioVisualizer] Failed to connect audio element:', error);
    }
  }, []);

  const getFrequencyData = useCallback((): Uint8Array => {
    if (!analyserRef.current) {
      return new Uint8Array(128);
    }
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  const getWaveformData = useCallback((): Uint8Array => {
    if (!analyserRef.current) {
      return new Uint8Array(128);
    }
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);
    return dataArray;
  }, []);

  const cleanup = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsInitialized(false);
    console.log('[AudioVisualizer] Cleaned up');
  }, []);

  return {
    audioContext: audioContextRef.current,
    analyser: analyserRef.current,
    isInitialized,
    initializeContext,
    connectMicrophone,
    connectAudioElement,
    getFrequencyData,
    getWaveformData,
    cleanup,
  };
};
