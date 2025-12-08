import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";

interface UseTrafficLayerOptions {
  map: L.Map | null;
  enabled: boolean;
}

export function useTrafficLayer({ map, enabled }: UseTrafficLayerOptions) {
  const layerRef = useRef<L.TileLayer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;

    if (enabled) {
      setIsLoading(true);
      setError(null);

      // Get the Supabase URL for the edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Create TomTom traffic layer using our edge function as proxy
      const trafficLayer = L.tileLayer(
        `${supabaseUrl}/functions/v1/get-traffic-tiles?z={z}&x={x}&y={y}`,
        {
          opacity: 0.7,
          maxZoom: 18,
          minZoom: 6,
          attribution: '© TomTom',
        }
      );

      trafficLayer.on('loading', () => setIsLoading(true));
      trafficLayer.on('load', () => setIsLoading(false));
      trafficLayer.on('tileerror', (e) => {
        console.error('Traffic tile error:', e);
        setError('Erro ao carregar camada de trânsito');
        setIsLoading(false);
      });

      trafficLayer.addTo(map);
      layerRef.current = trafficLayer;

      console.log('Traffic layer added to map');
    } else {
      // Remove layer when disabled
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
        console.log('Traffic layer removed from map');
      }
    }

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, enabled]);

  return { isLoading, error };
}
