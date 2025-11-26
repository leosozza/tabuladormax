import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AgentStatus = 'offline' | 'online' | 'paused';

export function useSyscallAgent() {
  const { toast } = useToast();
  const [status, setStatus] = useState<AgentStatus>('offline');

  const { data: agentMapping } = useQuery({
    queryKey: ['syscall-agent-mapping'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('syscall_agent_mappings')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const login = useMutation({
    mutationFn: async () => {
      if (!agentMapping) throw new Error('Mapeamento de agente não encontrado');

      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'login',
            agent_code: agentMapping.agent_code,
            ramal: agentMapping.ramal,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setStatus('online');
      toast({ title: 'Login realizado', description: 'Você está online' });
    },
    onError: (error) => {
      toast({
        title: 'Erro no login',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      if (!agentMapping) throw new Error('Mapeamento de agente não encontrado');

      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'logout',
            agent_code: agentMapping.agent_code,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setStatus('offline');
      toast({ title: 'Logout realizado' });
    },
  });

  const pause = useMutation({
    mutationFn: async () => {
      if (!agentMapping) throw new Error('Mapeamento de agente não encontrado');

      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'pause',
            agent_code: agentMapping.agent_code,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setStatus('paused');
      toast({ title: 'Pausado' });
    },
  });

  const unpause = useMutation({
    mutationFn: async () => {
      if (!agentMapping) throw new Error('Mapeamento de agente não encontrado');

      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'unpause',
            agent_code: agentMapping.agent_code,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setStatus('online');
      toast({ title: 'Retomado' });
    },
  });

  return {
    status,
    agentMapping,
    isConfigured: !!agentMapping,
    login: login.mutate,
    logout: logout.mutate,
    pause: pause.mutate,
    unpause: unpause.mutate,
    isLoading:
      login.isPending || logout.isPending || pause.isPending || unpause.isPending,
  };
}
