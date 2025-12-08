import { useState, useEffect, useRef } from "react";
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
    // Remove existing layer first
    if (layerRef.current && map) {
      try {
        map.removeLayer(layerRef.current);
      } catch (e) {
        // Layer might already be removed
      }
      layerRef.current = null;
    }

    if (!map || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Get the Supabase URL for the edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    console.log('Adding traffic layer to map...');
    
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

    trafficLayer.on('loading', () => {
      console.log('Traffic tiles loading...');
      setIsLoading(true);
    });
    
    trafficLayer.on('load', () => {
      console.log('Traffic tiles loaded');
      setIsLoading(false);
    });
    
    trafficLayer.on('tileerror', (e) => {
      console.error('Traffic tile error:', e);
      setError('Erro ao carregar camada de trânsito');
      setIsLoading(false);
    });

    trafficLayer.addTo(map);
    layerRef.current = trafficLayer;

    console.log('Traffic layer added to map');

    return () => {
      if (layerRef.current && map) {
        try {
          map.removeLayer(layerRef.current);
          console.log('Traffic layer removed from map');
        } catch (e) {
          // Map might be destroyed
        }
        layerRef.current = null;
      }
    };
  }, [map, enabled]);

  return { isLoading, error };
}
