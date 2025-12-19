import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 60000; // 1 minuto

/**
 * Hook que envia heartbeat para atualizar last_activity_at do operador de telemarketing
 * Isso permite rastrear quais operadores estão online/ativos
 */
export function useTelemarketingHeartbeat(bitrixId: number | null) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!bitrixId) return;

    const sendHeartbeat = async () => {
      try {
        const { error } = await supabase
          .from('telemarketing_operators')
          .update({ 
            last_activity_at: new Date().toISOString(),
            status: 'ativo'
          })
          .eq('bitrix_id', bitrixId);
        
        if (error) {
          console.warn('[Heartbeat] Error updating:', error.message);
        }
      } catch (err) {
        console.warn('[Heartbeat] Failed:', err);
      }
    };

    // Enviar heartbeat imediatamente ao montar
    sendHeartbeat();

    // Configurar intervalo para heartbeats periódicos
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [bitrixId]);
}
