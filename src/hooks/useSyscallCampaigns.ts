import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  syscall_campaign_id: number;
  nome: string;
  rota: string;
  agressividade: number;
  status: string;
  operadores: string[];
  leads_enviados: number;
  leads_discados: number;
  leads_atendidos: number;
  created_at: string;
}

export function useSyscallCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['syscall-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('syscall_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (params: {
      nome: string;
      rota?: string;
      agressividade?: number;
      operadores?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'create_campaign',
            user_id: user?.id,
            ...params,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syscall-campaigns'] });
      toast({
        title: 'Campanha criada',
        description: 'Campanha criada com sucesso',
      });
    },
  });

  const changeCampaignStatus = useMutation({
    mutationFn: async (params: {
      syscall_campaign_id: number;
      status: 'play' | 'pause' | 'stop';
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'campaign_status',
            ...params,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syscall-campaigns'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const uploadLeads = useMutation({
    mutationFn: async (params: {
      campaign_id: string;
      syscall_campaign_id: number;
      leads: Array<{ lead_id: number; telefone: string; nome?: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'syscall-integration',
        {
          body: {
            action: 'upload_leads',
            ...params,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syscall-campaigns'] });
      toast({
        title: 'Leads enviados',
        description: 'Leads enviados para a campanha',
      });
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createCampaign.mutate,
    isCreating: createCampaign.isPending,
    changeCampaignStatus: changeCampaignStatus.mutate,
    uploadLeads: uploadLeads.mutate,
    isUploading: uploadLeads.isPending,
  };
}
