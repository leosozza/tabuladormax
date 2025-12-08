import { useState, useEffect, useRef } from "react";
import L from "leaflet";

interface UseWeatherLayerOptions {
  map: L.Map | null;
  enabled: boolean;
}

interface RainViewerRadarData {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: Array<{ time: number; path: string }>;
    nowcast: Array<{ time: number; path: string }>;
  };
}

interface UseWeatherLayerResult {
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useWeatherLayer({ map, enabled }: UseWeatherLayerOptions): UseWeatherLayerResult {
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!map) return;

    const removeLayer = () => {
      if (radarLayerRef.current) {
        try {
          map.removeLayer(radarLayerRef.current);
        } catch (e) { /* ignore */ }
        radarLayerRef.current = null;
      }
    };

    if (!enabled) {
      removeLayer();
      return;
    }

    const fetchRadarData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch available radar timestamps from RainViewer API
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        
        if (!response.ok) {
          throw new Error('Erro ao buscar dados do radar');
        }

        const data: RainViewerRadarData = await response.json();
        
        // Get the most recent radar frame
        const latestFrame = data.radar.past[data.radar.past.length - 1];
        
        if (!latestFrame) {
          throw new Error('Nenhum dado de radar disponível');
        }

        // Remove existing layer before adding new one
        removeLayer();

        // Create radar tile layer
        // RainViewer tile URL format: {host}{path}/256/{z}/{x}/{y}/2/1_1.png
        // 2 = color scheme (2 = Universal Blue)
        // 1_1 = smooth + snow
        const radarLayer = L.tileLayer(
          `${data.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
          {
            opacity: 0.6,
            maxZoom: 18,
            minZoom: 3,
            attribution: '© RainViewer',
            tileSize: 256,
          }
        );

        radarLayer.on('loading', () => setIsLoading(true));
        radarLayer.on('load', () => setIsLoading(false));
        radarLayer.on('tileerror', () => {
          setError('Erro ao carregar tiles do radar');
          setIsLoading(false);
        });

        radarLayer.addTo(map);
        radarLayerRef.current = radarLayer;
        setLastUpdate(new Date(latestFrame.time * 1000));

        console.log('RainViewer radar layer added:', new Date(latestFrame.time * 1000));
      } catch (err) {
        console.error('Error fetching radar data:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setIsLoading(false);
      }
    };

    fetchRadarData();

    // Refresh radar data every 5 minutes
    const intervalId = setInterval(fetchRadarData, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      removeLayer();
    };
  }, [map, enabled]);

  return { isLoading, error, lastUpdate };
}
