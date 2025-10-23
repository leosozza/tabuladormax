import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppSettings, saveAppSettings } from '@/repositories/settingsRepo';
import type { AppSettings } from '@/repositories/types';
import { toast } from 'sonner';

const SETTINGS_QUERY_KEY = ['app-settings'];

/**
 * Unified hook for managing application settings with real-time updates.
 * Uses React Query for caching, automatic refetching, and optimistic updates.
 */
export function useAppSettings() {
  const queryClient = useQueryClient();

  // Fetch settings with React Query
  const {
    data: settings,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getAppSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Mutation for saving settings
  const mutation = useMutation({
    mutationFn: (newSettings: Omit<AppSettings, 'id' | 'updated_at'>) => 
      saveAppSettings(newSettings),
    onSuccess: (data) => {
      // Update the cache with new data
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data);
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  return {
    settings,
    isLoading,
    error,
    isSaving: mutation.isPending,
    saveSettings: mutation.mutate,
    saveSettingsAsync: mutation.mutateAsync,
    refetch,
  };
}
