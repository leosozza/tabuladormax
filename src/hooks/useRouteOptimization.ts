import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Waypoint {
  lat: number;
  lon: number;
  id?: string | number;
  name?: string;
}

export interface OptimizedRoute {
  optimizedOrder: (Waypoint & { order: number })[];
  totalDistance: number;
  totalTime: number;
  totalTimeWithTraffic: number;
  trafficDelay: number;
  polyline: { lat: number; lon: number }[];
  isOptimized?: boolean;
}

interface UseRouteOptimizationOptions {
  travelMode?: 'car' | 'pedestrian' | 'bicycle';
}

export function useRouteOptimization(options: UseRouteOptimizationOptions = {}) {
  const { travelMode = 'car' } = options;

  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimizeRoute = useCallback(async (
    origin: Waypoint,
    destinations: Waypoint[]
  ) => {
    if (destinations.length === 0) {
      setError('Selecione pelo menos um destino');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('tomtom-optimize-route', {
        body: { origin, destinations, travelMode },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setRoute(data);
      return data as OptimizedRoute;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao otimizar rota';
      setError(message);
      console.error('Error optimizing route:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [travelMode]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
  }, []);

  return {
    route,
    isLoading,
    error,
    optimizeRoute,
    clearRoute,
  };
}

// Utility functions
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}
