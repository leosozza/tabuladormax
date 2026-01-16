// Hook for viewing producer queue in agenciamento (admin/reception view)
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProducerInQueueView {
  producer_id: string;
  producer_name: string;
  producer_photo: string | null;
  status: 'DISPONIVEL' | 'EM_ATENDIMENTO' | 'PAUSA' | 'INDISPONIVEL';
  queue_pos: number | null;
  penalty_active: boolean;
  consecutive_losses: number;
  total_attendances: number;
  conversion_rate: number;
  average_time: number | null;
}

export interface QueueStats {
  total_online: number;
  available_count: number;
  attending_count: number;
  paused_count: number;
}

export function useProducerQueueView() {
  // Fetch all producers in queue
  const {
    data: queue = [],
    isLoading: isLoadingQueue,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['producer-queue-view'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_producer_queue');
      
      if (error) {
        console.error('Error fetching producer queue:', error);
        return [];
      }
      
      return (data || []) as ProducerInQueueView[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch waiting clients count (deals in reception stages)
  const {
    data: waitingClientsCount = 0,
    isLoading: isLoadingClients,
    refetch: refetchClients,
  } = useQuery({
    queryKey: ['waiting-clients-count'],
    queryFn: async () => {
      // Count deals in reception stages (recepcao_cadastro, ficha_preenchida)
      const { count, error } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .in('stage_id', [
          'C1:UC_MKIQ0S', // recepcao_cadastro
          'C1:NEW',       // ficha_preenchida (or similar stage)
        ]);
      
      if (error) {
        console.error('Error fetching waiting clients:', error);
        return 0;
      }
      
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Calculate stats
  const stats: QueueStats = {
    total_online: queue.filter(p => p.status !== 'INDISPONIVEL').length,
    available_count: queue.filter(p => p.status === 'DISPONIVEL').length,
    attending_count: queue.filter(p => p.status === 'EM_ATENDIMENTO').length,
    paused_count: queue.filter(p => p.status === 'PAUSA').length,
  };

  // Get sorted queue (only available producers, sorted by position)
  const sortedQueue: ProducerInQueueView[] = [...queue]
    .filter(p => p.status === 'DISPONIVEL' && p.queue_pos !== null)
    .sort((a, b) => (a.queue_pos || 0) - (b.queue_pos || 0));

  // Get next producer (first in queue without penalty)
  const nextProducer = sortedQueue.find(p => !p.penalty_active) || null;

  // Get producers currently attending
  const attendingProducers = queue.filter(p => p.status === 'EM_ATENDIMENTO');

  // Get producers on pause
  const pausedProducers = queue.filter(p => p.status === 'PAUSA');

  // Calculate estimated wait time
  const averageTime = queue.reduce((acc, p) => acc + (p.average_time || 15), 0) / Math.max(queue.length, 1);
  const estimatedWaitMinutes = stats.available_count > 0
    ? Math.round((waitingClientsCount / stats.available_count) * averageTime)
    : null;

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('producer-queue-view-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'producer_attendance_status',
        },
        () => {
          refetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchQueue]);

  const refetch = () => {
    refetchQueue();
    refetchClients();
  };

  return {
    queue,
    sortedQueue,
    stats,
    nextProducer,
    attendingProducers,
    pausedProducers,
    waitingClientsCount,
    estimatedWaitMinutes,
    isLoading: isLoadingQueue || isLoadingClients,
    refetch,
  };
}
