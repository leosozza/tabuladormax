import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as turf from "@turf/turf";
import L from "leaflet";

export interface POI {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  address: string;
  lat: number;
  lon: number;
  distance: number;
  phone?: string;
}

export type POICategory = 'shopping' | 'school' | 'hospital' | 'park' | 'metro' | 'mall' | 'university' | 'gym' | 'restaurant' | 'bank' | 'pedestrian';

// Configuração das categorias de POI com labels e ícones
export const POI_CATEGORIES: { id: POICategory; label: string; icon: string; description: string }[] = [
  { id: 'shopping', label: 'Shopping', icon: '🛒', description: 'Centros comerciais' },
  { id: 'mall', label: 'Shopping Mall', icon: '🏬', description: 'Grandes shoppings' },
  { id: 'school', label: 'Escolas', icon: '🏫', description: 'Escolas e colégios' },
  { id: 'university', label: 'Universidades', icon: '🎓', description: 'Universidades e faculdades' },
  { id: 'park', label: 'Parques', icon: '🌳', description: 'Parques e praças' },
  { id: 'pedestrian', label: 'Calçadões', icon: '🚶', description: 'Zonas de pedestres' },
  { id: 'metro', label: 'Metrô/Transporte', icon: '🚇', description: 'Estações de transporte' },
  { id: 'gym', label: 'Academias', icon: '🏋️', description: 'Academias e centros esportivos' },
  { id: 'hospital', label: 'Hospitais', icon: '🏥', description: 'Hospitais e clínicas' },
  { id: 'restaurant', label: 'Restaurantes', icon: '🍽️', description: 'Restaurantes e lanchonetes' },
  { id: 'bank', label: 'Bancos', icon: '🏦', description: 'Agências bancárias' },
];

interface UsePOIsOptions {
  defaultCategories?: POICategory[];
  defaultRadius?: number;
}

// Cache para evitar requisições duplicadas
const poiCache = new Map<string, { pois: POI[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function usePOIs(options: UsePOIsOptions = {}) {
  const { 
    defaultCategories = ['shopping', 'school', 'hospital', 'park', 'metro'],
    defaultRadius = 2000 
  } = options;

  const [pois, setPois] = useState<POI[]>([]);
  const [areaPOIs, setAreaPOIs] = useState<Map<string, POI[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<{ lat: number; lon: number; time: number } | null>(null);

  const fetchPOIs = useCallback(async (
    lat: number, 
    lon: number, 
    categories: POICategory[] = defaultCategories,
    radius: number = defaultRadius
  ) => {
    // Debounce: evita requisições muito frequentes (mínimo 3 segundos entre chamadas)
    const now = Date.now();
    if (lastFetchRef.current) {
      const timeSinceLastFetch = now - lastFetchRef.current.time;
      const distanceMoved = Math.abs(lat - lastFetchRef.current.lat) + Math.abs(lon - lastFetchRef.current.lon);
      
      // Se moveu menos de 0.001 graus (~100m) e passou menos de 3 segundos, ignora
      if (distanceMoved < 0.001 && timeSinceLastFetch < 3000) {
        return pois;
      }
    }

    // Verifica cache
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${radius},${categories.sort().join(',')}`;
    const cached = poiCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      setPois(cached.pois);
      return cached.pois;
    }

    lastFetchRef.current = { lat, lon, time: now };
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('tomtom-search-pois', {
        body: { lat, lon, radius, categories },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const fetchedPois = data?.pois || [];
      
      // Salva no cache
      poiCache.set(cacheKey, { pois: fetchedPois, timestamp: now });
      
      setPois(fetchedPois);
      return fetchedPois;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar POIs';
      setError(message);
      console.error('Error fetching POIs:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [defaultCategories, defaultRadius, pois]);

  // Nova função para buscar POIs dentro de uma área desenhada
  const fetchPOIsInArea = useCallback(async (
    areaId: string,
    bounds: L.LatLng[],
    categories: POICategory[]
  ): Promise<POI[]> => {
    if (bounds.length < 3 || categories.length === 0) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // Criar polígono com Turf.js
      const coords = bounds.map(p => [p.lng, p.lat]);
      coords.push([bounds[0].lng, bounds[0].lat]); // Fechar polígono
      const polygon = turf.polygon([coords]);
      
      // Calcular centro e bounding box
      const center = turf.center(polygon);
      const bbox = turf.bbox(polygon);
      
      // Calcular raio que cubra toda a área (diagonal / 2)
      const diagonal = turf.distance(
        turf.point([bbox[0], bbox[1]]), 
        turf.point([bbox[2], bbox[3]]), 
        { units: 'meters' }
      );
      const radius = Math.ceil(diagonal / 2) + 200; // +200m margem

      const centerLat = center.geometry.coordinates[1];
      const centerLon = center.geometry.coordinates[0];

      // Verificar cache
      const cacheKey = `area-${areaId}-${categories.sort().join(',')}`;
      const now = Date.now();
      const cached = poiCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL) {
        setAreaPOIs(prev => new Map(prev).set(areaId, cached.pois));
        return cached.pois;
      }

      console.log(`🔍 Buscando POIs na área ${areaId}:`, { centerLat, centerLon, radius, categories });

      const { data, error: fnError } = await supabase.functions.invoke('tomtom-search-pois', {
        body: { lat: centerLat, lon: centerLon, radius, categories },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const fetchedPois: POI[] = data?.pois || [];
      
      // Filtrar apenas POIs que estão dentro do polígono desenhado
      const poisInPolygon = fetchedPois.filter(poi => {
        const point = turf.point([poi.lon, poi.lat]);
        return turf.booleanPointInPolygon(point, polygon);
      });

      console.log(`✅ ${poisInPolygon.length} POIs encontrados dentro da área (de ${fetchedPois.length} total)`);

      // Salvar no cache e estado
      poiCache.set(cacheKey, { pois: poisInPolygon, timestamp: now });
      setAreaPOIs(prev => new Map(prev).set(areaId, poisInPolygon));
      
      return poisInPolygon;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar POIs na área';
      setError(message);
      console.error('Error fetching POIs in area:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPOIs = useCallback(() => {
    setPois([]);
    setError(null);
  }, []);

  const clearAreaPOIs = useCallback((areaId?: string) => {
    if (areaId) {
      setAreaPOIs(prev => {
        const newMap = new Map(prev);
        newMap.delete(areaId);
        return newMap;
      });
    } else {
      setAreaPOIs(new Map());
    }
  }, []);

  // Combinar todos os POIs de todas as áreas
  const allAreaPOIs = Array.from(areaPOIs.values()).flat();

  return {
    pois,
    areaPOIs,
    allAreaPOIs,
    isLoading,
    error,
    fetchPOIs,
    fetchPOIsInArea,
    clearPOIs,
    clearAreaPOIs,
  };
}

// Category icons and colors mapping
export const POI_CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  '7373': { icon: '🛒', color: '#10b981', label: 'Shopping' },
  '7373007': { icon: '🏬', color: '#10b981', label: 'Shopping Mall' },
  '7372': { icon: '🏫', color: '#3b82f6', label: 'Escola' },
  '7372002': { icon: '🎓', color: '#3b82f6', label: 'Universidade' },
  '7321': { icon: '🏥', color: '#ef4444', label: 'Hospital' },
  '9362': { icon: '🌳', color: '#22c55e', label: 'Parque' },
  '7380': { icon: '🚇', color: '#8b5cf6', label: 'Transporte' },
  '7320': { icon: '🏋️', color: '#f59e0b', label: 'Academia' },
  '7315': { icon: '🍽️', color: '#ec4899', label: 'Restaurante' },
  '7328': { icon: '🏦', color: '#6366f1', label: 'Banco' },
  '9376': { icon: '🚶', color: '#14b8a6', label: 'Calçadão' },
  '7376': { icon: '🚶', color: '#14b8a6', label: 'Zona Comercial' },
};

export function getPOICategoryConfig(categoryId: string) {
  return POI_CATEGORY_CONFIG[categoryId] || { icon: '📍', color: '#6b7280', label: 'Outro' };
}
