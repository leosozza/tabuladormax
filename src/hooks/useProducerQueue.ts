import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ProducerStatus = 'DISPONIVEL' | 'EM_ATENDIMENTO' | 'PAUSA' | 'INDISPONIVEL';

export interface ProducerQueueStatus {
  producer_id: string;
  status: ProducerStatus;
  queue_position: number | null;
  joined_queue_at: string | null;
  current_deal_id: string | null;
  consecutive_losses: number;
  penalty_active: boolean;
  penalty_skips_remaining: number;
  total_attendances: number;
  total_closed: number;
  total_lost: number;
  average_attendance_time: number | null;
}

export interface QueueWaitTime {
  queue_pos: number | null;
  producers_ahead: number;
  estimated_minutes: number | null;
  clients_waiting: number;
  producers_available: number;
}

export interface ProducerInQueue {
  producer_id: string;
  producer_name: string | null;
  producer_photo: string | null;
  status: string;
  queue_pos: number | null;
  penalty_active: boolean;
  consecutive_losses: number;
  average_time: number | null;
  total_attendances: number;
  conversion_rate: number;
}

export function useProducerQueue(producerId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRealtime, setIsRealtime] = useState(false);

  // Buscar status atual do produtor
  const { data: myStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['producer-queue-status', producerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producer_attendance_status')
        .select('*')
        .eq('producer_id', producerId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ProducerQueueStatus | null;
    },
    enabled: !!producerId,
  });

  // Buscar tempo estimado de espera
  const { data: waitTime, refetch: refetchWaitTime } = useQuery({
    queryKey: ['producer-wait-time', producerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('fn_calculate_queue_wait_time', { p_producer_id: producerId });
      
      if (error) throw error;
      return (data as QueueWaitTime[])?.[0] || null;
    },
    enabled: !!producerId && myStatus?.status === 'DISPONIVEL',
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Buscar fila completa
  const { data: queue, refetch: refetchQueue } = useQuery({
    queryKey: ['producer-queue-list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_producer_queue');
      if (error) throw error;
      return data as ProducerInQueue[];
    },
    refetchInterval: 15000,
  });

  // Mutation: Entrar na fila (ficar disponível)
  const joinQueueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('fn_producer_join_queue', { p_producer_id: producerId });
      
      if (error) throw error;
      const result = (data as { success: boolean; message: string; new_position: number }[])?.[0];
      if (!result?.success) throw new Error(result?.message || 'Erro ao entrar na fila');
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: 'Status: Disponível',
        description: `Você está na posição ${data.new_position} da fila`,
      });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-list'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation: Sair da fila (pausar)
  const leaveQueueMutation = useMutation({
    mutationFn: async (reason: 'PAUSA' | 'INDISPONIVEL' = 'PAUSA') => {
      const { data, error } = await supabase
        .rpc('fn_producer_leave_queue', { 
          p_producer_id: producerId,
          p_reason: reason 
        });
      
      if (error) throw error;
      const result = (data as { success: boolean; message: string }[])?.[0];
      if (!result?.success) throw new Error(result?.message || 'Erro ao sair da fila');
      return result;
    },
    onSuccess: (_, reason) => {
      toast({
        title: reason === 'PAUSA' ? 'Status: Pausa' : 'Status: Indisponível',
        description: 'Você saiu da fila de atendimento',
      });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-list'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation: Iniciar atendimento
  const startAttendanceMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { data, error } = await supabase
        .rpc('fn_producer_start_attendance', { 
          p_producer_id: producerId,
          p_deal_id: dealId 
        });
      
      if (error) throw error;
      const result = (data as { success: boolean; message: string }[])?.[0];
      if (!result?.success) throw new Error(result?.message || 'Erro ao iniciar atendimento');
      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Atendimento Iniciado',
        description: 'Cronômetro iniciado. Boa negociação!',
      });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-list'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation: Finalizar atendimento
  const finishAttendanceMutation = useMutation({
    mutationFn: async (result: 'FECHADO' | 'PERDIDO') => {
      const { data, error } = await supabase
        .rpc('fn_producer_finish_attendance', { 
          p_producer_id: producerId,
          p_result: result 
        });
      
      if (error) throw error;
      const res = (data as { success: boolean; message: string; penalty_applied: boolean; new_position: number }[])?.[0];
      if (!res?.success) throw new Error(res?.message || 'Erro ao finalizar atendimento');
      return res;
    },
    onSuccess: (data, result) => {
      toast({
        title: result === 'FECHADO' ? '🎉 Negócio Fechado!' : 'Negociação Finalizada',
        description: data.penalty_applied 
          ? `⚠️ Penalidade aplicada: você pulará 1 rodada. Nova posição: ${data.new_position}`
          : `Você voltou para a fila na posição ${data.new_position}`,
        variant: data.penalty_applied ? 'destructive' : 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['producer-queue-list'] });
      queryClient.invalidateQueries({ queryKey: ['producer-deals'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Configurar Realtime
  useEffect(() => {
    if (!producerId) return;

    const channel = supabase
      .channel('producer-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'producer_attendance_status',
        },
        (payload) => {
          console.log('[ProducerQueue] Realtime update:', payload);
          refetchStatus();
          refetchQueue();
          refetchWaitTime();
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [producerId, refetchStatus, refetchQueue, refetchWaitTime]);

  // Helpers
  const isAvailable = myStatus?.status === 'DISPONIVEL';
  const isInAttendance = myStatus?.status === 'EM_ATENDIMENTO';
  const isPaused = myStatus?.status === 'PAUSA';
  const isUnavailable = !myStatus || myStatus.status === 'INDISPONIVEL';
  const hasPenalty = myStatus?.penalty_active || false;
  const conversionRate = myStatus?.total_attendances 
    ? Math.round((myStatus.total_closed / myStatus.total_attendances) * 100) 
    : 0;

  return {
    // Estado
    myStatus,
    waitTime,
    queue,
    isLoadingStatus,
    isRealtime,
    
    // Status helpers
    isAvailable,
    isInAttendance,
    isPaused,
    isUnavailable,
    hasPenalty,
    conversionRate,
    
    // Actions
    joinQueue: joinQueueMutation.mutate,
    leaveQueue: leaveQueueMutation.mutate,
    startAttendance: startAttendanceMutation.mutate,
    finishAttendance: finishAttendanceMutation.mutate,
    
    // Loading states
    isJoiningQueue: joinQueueMutation.isPending,
    isLeavingQueue: leaveQueueMutation.isPending,
    isStartingAttendance: startAttendanceMutation.isPending,
    isFinishingAttendance: finishAttendanceMutation.isPending,
    
    // Refetch
    refetch: useCallback(() => {
      refetchStatus();
      refetchQueue();
      refetchWaitTime();
    }, [refetchStatus, refetchQueue, refetchWaitTime]),
  };
}
