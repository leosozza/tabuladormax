import { useState, useEffect, useRef } from "react";
import L from "leaflet";

interface UseTrafficLayerOptions {
  map: L.Map | null;
  enabled: boolean;
}

interface UseTrafficLayerResult {
  isLoading: boolean;
  error: string | null;
  isTomTomMapActive: boolean;
}

export function useTrafficLayer({ map, enabled }: UseTrafficLayerOptions): UseTrafficLayerResult {
  const trafficLayerRef = useRef<L.TileLayer | null>(null);
  const tomtomBaseLayerRef = useRef<L.TileLayer | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTomTomMapActive, setIsTomTomMapActive] = useState(false);

  useEffect(() => {
    if (!map) return;

    // Store reference to OSM layer (first tile layer added to map)
    if (!osmLayerRef.current) {
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer && !osmLayerRef.current) {
          osmLayerRef.current = layer;
        }
      });
    }

    // Cleanup function to remove layers
    const removeLayers = () => {
      if (trafficLayerRef.current) {
        try {
          map.removeLayer(trafficLayerRef.current);
        } catch (e) { /* ignore */ }
        trafficLayerRef.current = null;
      }
      if (tomtomBaseLayerRef.current) {
        try {
          map.removeLayer(tomtomBaseLayerRef.current);
        } catch (e) { /* ignore */ }
        tomtomBaseLayerRef.current = null;
      }
    };

    if (!enabled) {
      removeLayers();
      // Show OSM layer again
      if (osmLayerRef.current && !map.hasLayer(osmLayerRef.current)) {
        osmLayerRef.current.addTo(map);
      }
      setIsTomTomMapActive(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Hide OSM layer
    if (osmLayerRef.current && map.hasLayer(osmLayerRef.current)) {
      map.removeLayer(osmLayerRef.current);
    }

    // Add TomTom base map layer
    const tomtomBaseLayer = L.tileLayer(
      `${supabaseUrl}/functions/v1/get-tomtom-map-tiles?z={z}&x={x}&y={y}`,
      {
        maxZoom: 18,
        minZoom: 6,
        attribution: '© TomTom',
      }
    );

    // Add TomTom traffic layer on top
    const trafficLayer = L.tileLayer(
      `${supabaseUrl}/functions/v1/get-traffic-tiles?z={z}&x={x}&y={y}`,
      {
        opacity: 0.7,
        maxZoom: 18,
        minZoom: 6,
        attribution: '© TomTom Traffic',
      }
    );

    trafficLayer.on('loading', () => setIsLoading(true));
    trafficLayer.on('load', () => setIsLoading(false));
    trafficLayer.on('tileerror', () => {
      setError('Erro ao carregar camada de trânsito');
      setIsLoading(false);
    });

    // Add base layer first, then traffic on top
    tomtomBaseLayer.addTo(map);
    trafficLayer.addTo(map);

    tomtomBaseLayerRef.current = tomtomBaseLayer;
    trafficLayerRef.current = trafficLayer;
    setIsTomTomMapActive(true);

    console.log('TomTom map + traffic layers added');

    return () => {
      removeLayers();
      // Restore OSM layer on cleanup
      if (osmLayerRef.current && map && !map.hasLayer(osmLayerRef.current)) {
        try {
          osmLayerRef.current.addTo(map);
        } catch (e) { /* map might be destroyed */ }
      }
      setIsTomTomMapActive(false);
    };
  }, [map, enabled]);

  return { isLoading, error, isTomTomMapActive };
}
