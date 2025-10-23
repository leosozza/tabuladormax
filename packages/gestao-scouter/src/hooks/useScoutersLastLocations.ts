// @ts-nocheck
/**
 * Hook para buscar últimas localizações dos scouters
 * Inclui suporte a Realtime updates
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ScouterLocation {
  scouter: string;
  tier: string | null;
  lat: number;
  lng: number;
  at: string;
}

export function useScoutersLastLocations() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scouters-last-locations'],
    queryFn: async (): Promise<ScouterLocation[]> => {
      const { data, error } = await supabase
        .rpc('get_scouters_last_locations');

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('scouter_locations_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scouter_locations'
        },
        () => {
          // Refetch when new location is inserted
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    locations: data || [],
    isLoading,
    error,
    refetch,
  };
}
