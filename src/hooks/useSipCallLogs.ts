import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CallResult = 'atendida' | 'nao_atendeu' | 'ocupado' | 'caixa_postal' | 'numero_invalido' | 'outro';

export interface SipCallLog {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  contact_name: string | null;
  operator_id: string | null;
  operator_name: string | null;
  call_result: CallResult;
  notes: string | null;
  call_duration_seconds: number | null;
  created_at: string;
}

export interface CreateSipCallLogData {
  phone_number: string;
  bitrix_id?: string;
  contact_name?: string;
  call_result: CallResult;
  notes?: string;
  call_duration_seconds?: number;
}

export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  atendida: 'Atendida',
  nao_atendeu: 'Não Atendeu',
  ocupado: 'Ocupado',
  caixa_postal: 'Caixa Postal',
  numero_invalido: 'Número Inválido',
  outro: 'Outro'
};

export const CALL_RESULT_COLORS: Record<CallResult, string> = {
  atendida: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  nao_atendeu: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ocupado: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  caixa_postal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  numero_invalido: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  outro: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

// Buscar logs de chamadas por telefone
export function useSipCallLogsByPhone(phoneNumber?: string) {
  return useQuery({
    queryKey: ['sip-call-logs', 'phone', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];
      
      const { data, error } = await supabase
        .from('sip_call_logs')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SipCallLog[];
    },
    enabled: !!phoneNumber
  });
}

// Buscar logs de chamadas do operador atual
export function useMySipCallLogs(limit = 20) {
  return useQuery({
    queryKey: ['sip-call-logs', 'my', limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('sip_call_logs')
        .select('*')
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SipCallLog[];
    }
  });
}

// Criar log de chamada
export function useCreateSipCallLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSipCallLogData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar nome do operador do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const { data: result, error } = await supabase
        .from('sip_call_logs')
        .insert({
          phone_number: data.phone_number,
          bitrix_id: data.bitrix_id || null,
          contact_name: data.contact_name || null,
          operator_id: user.id,
          operator_name: profile?.display_name || user.email,
          call_result: data.call_result,
          notes: data.notes || null,
          call_duration_seconds: data.call_duration_seconds || null
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sip-call-logs'] });
      toast.success('Resultado da chamada registrado!');
    },
    onError: (error) => {
      console.error('Erro ao registrar chamada:', error);
      toast.error('Erro ao registrar resultado da chamada');
    }
  });
}
