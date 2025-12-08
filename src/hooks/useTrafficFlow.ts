import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrafficFlowData {
  currentSpeed: number | null;
  freeFlowSpeed: number | null;
  currentTravelTime?: number;
  freeFlowTravelTime?: number;
  confidence: number;
  roadClosure: boolean;
  congestionLevel: 'free' | 'light' | 'moderate' | 'heavy' | 'severe' | 'closed' | 'unknown';
  speedRatio: number;
  coordinates?: { latitude: number; longitude: number }[];
  error?: string;
}

export function useTrafficFlow() {
  const [trafficData, setTrafficData] = useState<TrafficFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrafficFlow = useCallback(async (lat: number, lon: number, zoom: number = 10) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('tomtom-traffic-flow', {
        body: { lat, lon, zoom },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error && !data?.currentSpeed) {
        throw new Error(data.error);
      }

      setTrafficData(data);
      return data as TrafficFlowData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados de trânsito';
      setError(message);
      console.error('Error fetching traffic flow:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearTrafficData = useCallback(() => {
    setTrafficData(null);
    setError(null);
  }, []);

  return {
    trafficData,
    isLoading,
    error,
    fetchTrafficFlow,
    clearTrafficData,
  };
}

// Congestion level configuration
export const CONGESTION_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  free: { color: '#22c55e', label: 'Livre', icon: '🟢' },
  light: { color: '#84cc16', label: 'Leve', icon: '🟡' },
  moderate: { color: '#eab308', label: 'Moderado', icon: '🟠' },
  heavy: { color: '#f97316', label: 'Intenso', icon: '🔴' },
  severe: { color: '#ef4444', label: 'Severo', icon: '⛔' },
  closed: { color: '#7f1d1d', label: 'Fechado', icon: '🚫' },
  unknown: { color: '#6b7280', label: 'Desconhecido', icon: '❓' },
};

export function getCongestionConfig(level: string) {
  return CONGESTION_CONFIG[level] || CONGESTION_CONFIG.unknown;
}
