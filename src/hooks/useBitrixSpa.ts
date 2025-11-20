import { useQuery } from '@tanstack/react-query';
import { resolveSpaEntities, getEntityTypeFromField } from '@/lib/bitrixSpaResolver';

interface SpaRequest {
  bitrixField: string;
  bitrixItemId: number;
}

export function useBitrixSpa(requests: SpaRequest[]) {
  return useQuery({
    queryKey: ['bitrix-spa', requests],
    queryFn: async () => {
      // Converter requests para formato com entityTypeId
      const resolveRequests = requests
        .map(req => {
          const entityTypeId = getEntityTypeFromField(req.bitrixField);
          if (!entityTypeId) return null;
          return { entityTypeId, bitrixItemId: req.bitrixItemId };
        })
        .filter((req): req is { entityTypeId: number; bitrixItemId: number } => req !== null);

      const resolutions = await resolveSpaEntities(resolveRequests);

      // Converter Map para objeto indexado por "field-id"
      const result: Record<string, { name: string; id: number }> = {};
      for (const req of requests) {
        const entityTypeId = getEntityTypeFromField(req.bitrixField);
        if (!entityTypeId) continue;
        
        const key = `${entityTypeId}-${req.bitrixItemId}`;
        const resolution = resolutions.get(key);
        if (resolution) {
          result[`${req.bitrixField}-${req.bitrixItemId}`] = resolution;
        }
      }

      return result;
    },
    enabled: requests.length > 0,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}
