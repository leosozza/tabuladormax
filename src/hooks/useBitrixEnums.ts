/**
 * React Hook for Bitrix Enum Resolution
 * 
 * Provides efficient caching and resolution of Bitrix enum values
 * with React Query integration.
 */

import { useQuery } from '@tanstack/react-query';
import { resolveBitrixEnumValues } from '@/lib/bitrixEnumResolver';

interface EnumResolution {
  id: string;
  label: string;
  formatted: string;
}

interface EnumRequest {
  bitrixField: string;
  value: unknown;
  bitrixFieldType?: string;
}

/**
 * Hook para resolver valores de enum do Bitrix
 * @param requests - Array de campos e valores a resolver
 * @returns Map com resoluções e estados de loading/error
 */
export function useBitrixEnums(requests: EnumRequest[]) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bitrix-enums', ...requests.map(r => `${r.bitrixField}:${r.value}`)],
    queryFn: async () => {
      return await resolveBitrixEnumValues(requests);
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    enabled: requests.length > 0,
  });

  return {
    resolutions: data || new Map<string, EnumResolution | null>(),
    isLoading,
    error,
    getResolution: (bitrixField: string, value: unknown): EnumResolution | null => {
      const key = `${bitrixField}:${value}`;
      return data?.get(key) || null;
    }
  };
}
