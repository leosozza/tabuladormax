import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GupshupStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  pendingMessages: number;
  deliveryRate: number;
  messagesLast24h: number;
  templatesApproved: number;
  templatesTotal: number;
}

export function useGupshupStats() {
  return useQuery({
    queryKey: ['gupshup-stats'],
    queryFn: async (): Promise<GupshupStats> => {
      // Get message stats
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('direction, status, created_at');

      if (messagesError) throw messagesError;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const totalMessages = messages?.length || 0;
      const sentMessages = messages?.filter(m => m.direction === 'outbound').length || 0;
      const receivedMessages = messages?.filter(m => m.direction === 'inbound').length || 0;
      const deliveredMessages = messages?.filter(m => m.status === 'delivered' || m.status === 'read').length || 0;
      const failedMessages = messages?.filter(m => m.status === 'failed').length || 0;
      const pendingMessages = messages?.filter(m => m.status === 'pending' || m.status === 'sent').length || 0;
      const messagesLast24h = messages?.filter(m => new Date(m.created_at) > last24h).length || 0;

      const deliveryRate = sentMessages > 0 
        ? Math.round((deliveredMessages / sentMessages) * 100) 
        : 0;

      // Get template stats
      const { data: templates, error: templatesError } = await supabase
        .from('gupshup_templates')
        .select('status');

      if (templatesError) throw templatesError;

      const templatesTotal = templates?.length || 0;
      const templatesApproved = templates?.filter(t => t.status === 'APPROVED').length || 0;

      return {
        totalMessages,
        sentMessages,
        receivedMessages,
        deliveredMessages,
        failedMessages,
        pendingMessages,
        deliveryRate,
        messagesLast24h,
        templatesApproved,
        templatesTotal,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useGupshupMessages(limit = 50) {
  return useQuery({
    queryKey: ['gupshup-messages', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function useGupshupConnection() {
  return useQuery({
    queryKey: ['gupshup-connection'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('sync-gupshup-templates', {
          body: { action: 'test_connection' }
        });

        if (error) {
          return { connected: false, error: error.message };
        }

        return { 
          connected: data?.success || false, 
          sourceNumber: data?.sourceNumber || null,
          error: data?.error || null 
        };
      } catch (err: any) {
        return { connected: false, error: err.message };
      }
    },
    staleTime: 60000, // Cache for 1 minute
  });
}
