import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export type POICategory = 'shopping' | 'school' | 'hospital' | 'park' | 'metro' | 'mall' | 'university' | 'gym' | 'restaurant' | 'bank';

interface UsePOIsOptions {
  defaultCategories?: POICategory[];
  defaultRadius?: number;
}

export function usePOIs(options: UsePOIsOptions = {}) {
  const { 
    defaultCategories = ['shopping', 'school', 'hospital', 'park', 'metro'],
    defaultRadius = 2000 
  } = options;

  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPOIs = useCallback(async (
    lat: number, 
    lon: number, 
    categories: POICategory[] = defaultCategories,
    radius: number = defaultRadius
  ) => {
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

      setPois(data?.pois || []);
      return data?.pois || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar POIs';
      setError(message);
      console.error('Error fetching POIs:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [defaultCategories, defaultRadius]);

  const clearPOIs = useCallback(() => {
    setPois([]);
    setError(null);
  }, []);

  return {
    pois,
    isLoading,
    error,
    fetchPOIs,
    clearPOIs,
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
};

export function getPOICategoryConfig(categoryId: string) {
  return POI_CATEGORY_CONFIG[categoryId] || { icon: '📍', color: '#6b7280', label: 'Outro' };
}
