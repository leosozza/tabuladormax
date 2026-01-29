import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppNotification {
  id: string;
  operator_id: string;
  type: string;
  title: string;
  message: string | null;
  phone_number: string | null;
  bitrix_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const useWhatsAppNotifications = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-notifications'],
    queryFn: async () => {
      // Tentar obter usuário atual
      let { data: { user } } = await supabase.auth.getUser();
      
      // Se não tem usuário, tentar refresh da sessão
      if (!user) {
        console.warn('[Notifications] No authenticated user, attempting session refresh...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData?.session?.user) {
          console.error('[Notifications] Session refresh failed - notifications will not load', refreshError);
          return [];
        }
        
        user = refreshData.session.user;
        console.log('[Notifications] Session refreshed successfully for:', user.id);
      }

      const { data, error } = await supabase
        .from('whatsapp_operator_notifications' as any)
        .select('*')
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Notifications] Error fetching notifications:', error);
        throw error;
      }
      
      return (data || []) as unknown as WhatsAppNotification[];
    },
    staleTime: 30000,
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('whatsapp-notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whatsapp_operator_notifications',
            filter: `operator_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-notifications'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
  };
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('whatsapp_operator_notifications' as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('whatsapp_operator_notifications' as any)
        .update({ read_at: new Date().toISOString() })
        .eq('operator_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notifications'] });
    },
  });
};
