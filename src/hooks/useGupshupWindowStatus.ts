import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WindowStatus } from '@/lib/whatsappWindow';

interface GupshupWindowResponse {
  is_open: boolean;
  hours_remaining: number | null;
  minutes_remaining: number | null;
  last_customer_message_at: string | null;
  source: 'gupshup_webhook';
}

interface UseGupshupWindowStatusParams {
  phoneNumber?: string;
  bitrixId?: string;
  enabled?: boolean;
}

/**
 * Hook para consultar o status da janela de 24h do WhatsApp
 * baseado APENAS nos dados do webhook do Gupshup
 */
export function useGupshupWindowStatus({ 
  phoneNumber, 
  bitrixId, 
  enabled = true 
}: UseGupshupWindowStatusParams) {
  return useQuery({
    queryKey: ['gupshup-window-status', phoneNumber, bitrixId],
    queryFn: async (): Promise<WindowStatus> => {
      const { data, error } = await supabase.functions.invoke('gupshup-check-window', {
        body: { phone_number: phoneNumber, bitrix_id: bitrixId }
      });

      if (error) {
        console.error('[useGupshupWindowStatus] Error:', error);
        throw error;
      }

      const response = data as GupshupWindowResponse;

      // Converter para o formato WindowStatus usado no frontend
      return {
        isOpen: response.is_open,
        hoursRemaining: response.hours_remaining,
        minutesRemaining: response.minutes_remaining,
        closedSince: response.is_open ? null : 
          response.last_customer_message_at ? 
            new Date(new Date(response.last_customer_message_at).getTime() + 24 * 60 * 60 * 1000) : 
            null,
        lastCustomerMessage: response.last_customer_message_at ? 
          new Date(response.last_customer_message_at) : 
          null
      };
    },
    enabled: enabled && !!(phoneNumber || bitrixId),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 15000, // Considerar stale após 15 segundos
  });
}
