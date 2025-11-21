import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GupshupTemplate {
  id: string;
  template_id: string;
  element_name: string;
  display_name: string;
  language_code: string;
  category: string;
  status: string;
  template_body: string;
  variables: Array<{
    index: number;
    name: string;
    example: string;
  }>;
  preview_url?: string;
  metadata?: any;
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UseGupshupTemplatesOptions {
  userId?: string;
  enabled?: boolean;
}

export function useGupshupTemplates(options: UseGupshupTemplatesOptions = {}) {
  const { userId, enabled = true } = options;

  return useQuery({
    queryKey: ['gupshup-templates', userId],
    enabled,
    queryFn: async () => {
      if (userId) {
        // Buscar templates permitidos para o usuário específico
        const { data, error } = await supabase
          .from('gupshup_templates')
          .select(`
            *,
            agent_template_permissions!inner(user_id)
          `)
          .eq('agent_template_permissions.user_id', userId)
          .eq('status', 'APPROVED')
          .order('display_name');

        if (error) throw error;
        return (data || []) as unknown as GupshupTemplate[];
      } else {
        // Buscar todos os templates aprovados (para admin)
        const { data, error } = await supabase
          .from('gupshup_templates')
          .select('*')
          .eq('status', 'APPROVED')
          .order('display_name');

        if (error) throw error;
        return (data || []) as unknown as GupshupTemplate[];
      }
    }
  });
}

export function useAllGupshupTemplates() {
  return useQuery({
    queryKey: ['all-gupshup-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gupshup_templates')
        .select('*')
        .order('display_name');

      if (error) throw error;
      return (data || []) as unknown as GupshupTemplate[];
    }
  });
}

export function useSyncGupshupTemplates() {
  return async () => {
    const { data, error } = await supabase.functions.invoke('sync-gupshup-templates');
    
    if (error) throw error;
    return data;
  };
}