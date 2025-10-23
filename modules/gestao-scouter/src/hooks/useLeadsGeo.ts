// @ts-nocheck
/**
 * Hook para buscar dados de geolocalização dos leads (heatmap)
 * Inclui suporte a Realtime updates
 * 
 * ⚠️ ATENÇÃO: Usa EXCLUSIVAMENTE a tabela 'leads' (fonte única de verdade)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-helper';
import { useEffect } from 'react';

export interface FichaGeo {
  id: number;
  lat: number;
  lng: number;
  created_at: string;
  projeto: string | null;
  scouter: string | null;
}

interface LeadsGeoParams {
  startDate: string;
  endDate: string;
  project?: string | null;
  scouter?: string | null;
}

export function useLeadsGeo(params: LeadsGeoParams) {
  const { startDate, endDate, project, scouter } = params;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fichas-geo', startDate, endDate, project, scouter],
    queryFn: async (): Promise<FichaGeo[]> => {
      // Direct query on public.leads table
      let query = supabase
        .from('leads')
        .select('id, latitude, longitude, created_at, criado, projeto, scouter')
        .or('deleted.is.false,deleted.is.null');

      // Apply date filters using criado (fallback to created_at if needed)
      if (startDate) {
        query = query.gte('criado', startDate);
      }
      if (endDate) {
        query = query.lte('criado', endDate);
      }

      // Apply optional filters
      if (project) {
        query = query.eq('commercial_project_id', project);
      }
      if (scouter) {
        query = query.eq('scouter', scouter);
      }

      // Filter for records with valid coordinates
      query = query.not('latitude', 'is', null).not('longitude', 'is', null);

      const { data: queryData, error: queryError } = await query;

      if (queryError) throw queryError;

      // Transform to expected format, using latitude/longitude as lat/lng
      const transformed: FichaGeo[] = (queryData || []).map((record: any) => ({
        id: record.id,
        lat: parseFloat(record.latitude),
        lng: parseFloat(record.longitude),
        created_at: record.created_at || record.criado,
        projeto: record.projeto,
        scouter: record.scouter,
      }));

      return transformed;
    },
    staleTime: 60000, // 1 minute
    enabled: !!startDate && !!endDate,
  });

  // Subscribe to realtime updates on leads table
  useEffect(() => {
    const channel = supabase
      .channel('leads_geo_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: 'latitude=not.is.null'
        },
        () => {
          // Refetch when leads with geo data are inserted/updated
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    leadsGeo: data || [],
    fichasGeo: data || [], // alias para compatibilidade
    isLoading,
    error,
    refetch,
  };
}
