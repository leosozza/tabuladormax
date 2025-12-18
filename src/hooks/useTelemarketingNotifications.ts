import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface TelemarketingNotification {
  id: string;
  bitrix_telemarketing_id: number;
  commercial_project_id: string | null;
  type: 'new_message' | 'bot_transfer' | 'urgent' | 'window_closing' | 'cliente_compareceu';
  title: string;
  message: string | null;
  lead_id: number | null;
  phone_number: string | null;
  conversation_id: number | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown> & {
    nome_modelo?: string;
    projeto?: string;
    data_agendamento?: string;
  };
  created_at: string;
}

export interface NotificationSettings {
  sound_enabled: boolean;
  sound_volume: number;
  push_enabled: boolean;
  show_preview: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  sound_enabled: true,
  sound_volume: 70,
  push_enabled: true,
  show_preview: true,
};

// Hook para buscar notificações
export const useNotifications = (bitrixTelemarketingId: number | null) => {
  return useQuery({
    queryKey: ['telemarketing-notifications', bitrixTelemarketingId],
    queryFn: async () => {
      if (!bitrixTelemarketingId) return [];
      
      const { data, error } = await supabase
        .from('telemarketing_notifications')
        .select('*')
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as TelemarketingNotification[];
    },
    enabled: !!bitrixTelemarketingId,
  });
};

// Hook para notificações não lidas
export const useUnreadNotifications = (bitrixTelemarketingId: number | null) => {
  return useQuery({
    queryKey: ['telemarketing-notifications-unread', bitrixTelemarketingId],
    queryFn: async () => {
      if (!bitrixTelemarketingId) return [];
      
      const { data, error } = await supabase
        .from('telemarketing_notifications')
        .select('*')
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TelemarketingNotification[];
    },
    enabled: !!bitrixTelemarketingId,
  });
};

// Hook para marcar como lida
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('telemarketing_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications-unread'] });
    },
  });
};

// Hook para marcar todas como lidas
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bitrixTelemarketingId: number) => {
      const { error } = await supabase
        .from('telemarketing_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('bitrix_telemarketing_id', bitrixTelemarketingId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications-unread'] });
    },
  });
};

// Hook para configurações de notificação
export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const stored = localStorage.getItem('notification_settings');
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('notification_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { settings, updateSettings };
};

// Hook para som de notificação
export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useNotificationSettings();

  const playSound = useCallback((type: TelemarketingNotification['type'] = 'new_message') => {
    if (!settings.sound_enabled) return;

    try {
      // Criar audio element se não existir
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Diferentes sons para diferentes tipos
      const soundMap: Record<string, string> = {
        new_message: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVg1telemarketing8+dUVGBq0+dUVGBqvJlzWSQ8W4aes5hqR0BYe5u0qH9jUktpjq62pXFRQERwlrOyooJdUEdsmrKvmXZWS0Vsm7OvnXtbT0humrKsmXRTSEJmla+qkmlMPkBciaeicE8/OkpcgZqjdE0/OUZYfJSfcEg7N0NUeI6ZakMzMz9Qc4mUY0AwLjpLb4OQXzosKjZHaH2LWjYnJjJDYniFVDIkIy4+XHN/TiwfHik4VWp5RiYaGSQxT2NyPiEUFR8qRVtqNxwPEhsgPVJjLhgMDhcbNklZJxQJCxMXL0FQIQ8GCA8TJzlFGwsEBQsQHzE8FAgCAggNGCk0EQUBAgYKEyItDAMAAQQIDxokCAIAAQMGCxQdBQEAAQIECA8XAwAAAQEDBgsPAQAAAQECBAcLAQAAAQEBAwYIAQAAAQEBAgQGAQAAAQEBAgMEAQAAAQEBAQMDAQAAAQEBAQICAQAAAQEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAAAAAEBAQAAAAAAAAEBAQ==',
        bot_transfer: 'data:audio/wav;base64,UklGRl9EAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTtEAAD//wEAAQABAP//AQABAP//AQD//wEA//8BAP//AQD//wEAAQD//wEA//8BAAEA//8BAAEA//8BAAIAAQACAAIAAQACAAEAAQABAP//AQABAP//AQABAP//AQD//wEAAQD//wEA//8BAP//AQD//wEA//8BAAEA//8BAAEA//8BAAIAAQACAAIAAQACAAEAAQABAP//AQABAP//AQABAP//AQD//wEAAQD//wEA//8BAP//AQD//wEA//8BAAEA//8BAAEA//8BAAIA',
        urgent: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDdUVGBq0+dUVGBqvJlzWSQ8W4aes5hqR0BYe5u0qH9jUktpjq62pXFRQERwlrOyooJdUEdsmrKvmXZWS0Vsm7OvnXtbT0humrKsmXRTSEJmla+qkmlMPkBciaeicE8/OkpcgZqjdE0/OUZYfJSfcEg7N0NUeI6ZakMzMz9Qc4mUY0AwLjpLb4OQXzosKjZHaH2LWjYnJjJDYniFVDIkIy4+XHN/TiwfHik4VWp5RiYaGSQxT2NyPiEUFR8qRVtqNxwPEhsgPVJjLhgMDhcbNklZJxQJCxMXL0FQIQ8GCA8TJzlFGwsEBQsQHzE8FAgCAggNGCk0EQUBAgYKEyItDAMAAQQIDxokCAIAAQMGCxQdBQEAAQIECA8XAwAAAQEDBgsPAQAAAQECBAcLAQAAAQEBAwYIAQAAAQEBAgQGAQAAAQEBAgMEAQAAAQEBAQMDAQAAAQEBAQICAQAAAQEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAAAAAEBAQAAAAAAAAEBAQ==',
        window_closing: 'data:audio/wav;base64,UklGRl9EAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTtEAAD//wEAAQABAP//AQABAP//AQD//wEA//8BAP//AQD//wEAAQD//wEA//8BAAEA//8BAAEA//8BAAIAAQACAAIAAQACAAEAAQABAP//AQABAP//AQABAP//AQD//wEAAQD//wEA//8BAP//AQD//wEA//8BAAEA//8BAAEA//8BAAIAAQACAAIAAQACAAEAAQABAP//AQABAP//AQABAP//AQD//wEAAQD//wEA//8BAP//AQD//wEA//8BAAEA//8BAAEA//8BAAIA',
        // Som de celebração/fanfarra para cliente compareceu
        cliente_compareceu: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDdUVGBq0+dUVGBqvJlzWSQ8W4aes5hqR0BYe5u0qH9jUktpjq62pXFRQERwlrOyooJdUEdsmrKvmXZWS0Vsm7OvnXtbT0humrKsmXRTSEJmla+qkmlMPkBciaeicE8/OkpcgZqjdE0/OUZYfJSfcEg7N0NUeI6ZakMzMz9Qc4mUY0AwLjpLb4OQXzosKjZHaH2LWjYnJjJDYniFVDIkIy4+XHN/TiwfHik4VWp5RiYaGSQxT2NyPiEUFR8qRVtqNxwPEhsgPVJjLhgMDhcbNklZJxQJCxMXL0FQIQ8GCA8TJzlFGwsEBQsQHzE8FAgCAggNGCk0EQUBAgYKEyItDAMAAQQIDxokCAIAAQMGCxQdBQEAAQIECA8XAwAAAQEDBgsPAQAAAQECBAcLAQAAAQEBAwYIAQAAAQEBAgQGAQAAAQEBAgMEAQAAAQEBAQMDAQAAAQEBAQICAQAAAQEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAEBAQEBAQAAAAAAAAEBAQAAAAAAAAEBAQ==',
      };

      audioRef.current.src = soundMap[type] || soundMap.new_message;
      audioRef.current.volume = settings.sound_volume / 100;
      audioRef.current.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [settings.sound_enabled, settings.sound_volume]);

  return { playSound };
};

// Hook para Web Push Notifications
export const useBrowserNotification = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { settings } = useNotificationSettings();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!settings.push_enabled || permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [permission, settings.push_enabled]);

  return { permission, requestPermission, showNotification };
};

// Hook principal para realtime notifications
export const useRealtimeNotifications = (bitrixTelemarketingId: number | null) => {
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const { showNotification } = useBrowserNotification();
  const { settings } = useNotificationSettings();
  const { toast } = useToast();

  useEffect(() => {
    if (!bitrixTelemarketingId) return;

    const channel = supabase
      .channel(`notifications-${bitrixTelemarketingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemarketing_notifications',
          filter: `bitrix_telemarketing_id=eq.${bitrixTelemarketingId}`,
        },
        (payload) => {
          const notification = payload.new as TelemarketingNotification;
          console.log('New notification received:', notification);

          // Invalidar queries
          queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications-unread'] });

          // Tocar som
          playSound(notification.type);

          // Mostrar notificação do navegador
          if (settings.show_preview) {
            showNotification(notification.title, {
              body: notification.message || undefined,
              tag: notification.id,
            });
          }

          // Mostrar toast
          toast({
            title: notification.title,
            description: notification.message || undefined,
            variant: notification.type === 'urgent' || notification.type === 'bot_transfer' ? 'destructive' : 'default',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bitrixTelemarketingId, queryClient, playSound, showNotification, settings.show_preview, toast]);
};

// Hook para criar notificação (usado pelo sistema)
export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      bitrix_telemarketing_id: number;
      commercial_project_id?: string | null;
      type: 'new_message' | 'bot_transfer' | 'urgent' | 'window_closing' | 'cliente_compareceu';
      title: string;
      message?: string | null;
      lead_id?: number | null;
      phone_number?: string | null;
      conversation_id?: number | null;
      metadata?: Record<string, unknown>;
    }) => {
      const insertData = {
        bitrix_telemarketing_id: notification.bitrix_telemarketing_id,
        commercial_project_id: notification.commercial_project_id ?? null,
        type: notification.type,
        title: notification.title,
        message: notification.message ?? null,
        lead_id: notification.lead_id ?? null,
        phone_number: notification.phone_number ?? null,
        conversation_id: notification.conversation_id ?? null,
        metadata: notification.metadata ?? {},
      };

      const { data, error } = await supabase
        .from('telemarketing_notifications')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['telemarketing-notifications-unread'] });
    },
  });
};
