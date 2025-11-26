import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface SyscallConfig {
  id: string;
  api_url: string;
  api_token: string | null;
  default_route: string;
  active: boolean;
}

export interface ConnectionLog {
  timestamp: string;
  success: boolean;
  url?: string;
  method?: string;
  duration_ms?: number;
  status_code?: number;
  response?: any;
  error?: string;
}

export function useSyscallConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>(() => {
    const saved = localStorage.getItem('syscall-connection-logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('syscall-connection-logs', JSON.stringify(connectionLogs));
  }, [connectionLogs]);

  const { data: config, isLoading } = useQuery({
    queryKey: ['syscall-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('syscall_config')
        .select('*')
        .single();

      if (error) throw error;
      return data as SyscallConfig;
    },
  });

  const saveConfig = useMutation({
    mutationFn: async (updates: Partial<SyscallConfig>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'save_config',
            ...updates,
            user_id: user?.id,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syscall-config'] });
      toast({
        title: 'Configuração salva',
        description: 'Configuração do Syscall atualizada com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: { action: 'test_connection' },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.log) {
        setConnectionLogs(prev => [
          {
            ...data.log,
            success: true,
          },
          ...prev.slice(0, 9) // Manter últimos 10
        ]);
      }
      
      toast({
        title: data.success ? 'Conexão OK' : 'Erro na conexão',
        description: data.success
          ? 'Conexão com Syscall estabelecida com sucesso'
          : 'Não foi possível conectar ao Syscall',
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      setConnectionLogs(prev => [
        {
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message,
        },
        ...prev.slice(0, 9)
      ]);
      
      toast({
        title: 'Erro na conexão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    config,
    isLoading,
    isConfigured: !!config?.api_token,
    saveConfig: saveConfig.mutate,
    isSaving: saveConfig.isPending,
    testConnection: testConnection.mutate,
    isTesting: testConnection.isPending,
    connectionLogs,
  };
}
