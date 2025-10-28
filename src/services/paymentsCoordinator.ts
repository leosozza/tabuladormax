/**
 * Payment Coordinator Service
 * Handles payment calculation logic and batch payment execution for scouters/leads
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Payment item representing a single payment to be processed
 */
export interface PaymentItem {
  lead_id: number;
  scouter: string;
  commercial_project_id: string | null;
  num_fichas: number;
  valor_ficha: number;
  valor_fichas_total: number;
  dias_trabalhados: number;
  ajuda_custo_por_dia: number;
  ajuda_custo_total: number;
  num_faltas: number;
  desconto_falta_unitario: number;
  desconto_faltas_total: number;
  valor_bruto: number;
  valor_descontos: number;
  valor_liquido: number;
  observacoes?: string;
  status?: string;
}

/**
 * Project payment settings
 */
export interface ProjectPaymentSettings {
  valor_ficha_base: number;
  ajuda_custo_valor: number;
  ajuda_custo_enabled: boolean;
  desconto_falta_valor: number;
  desconto_falta_enabled: boolean;
}

/**
 * Lead data for payment calculation
 */
export interface LeadForPayment {
  id: number;
  scouter: string;
  commercial_project_id: string | null;
  valor_ficha: number | null;
  ficha_confirmada: boolean | null;
  data_confirmacao_ficha: string | null;
  data_criacao_ficha: string | null;
  // Add any other fields needed for calculation
}

/**
 * Calculate days worked based on date range
 * @param startDate - Start date (ISO string or Date)
 * @param endDate - End date (ISO string or Date), defaults to today
 * @returns Number of days worked
 */
export function calculateDaysWorked(
  startDate: string | Date | null,
  endDate: string | Date | null = new Date()
): number {
  if (!startDate) return 0;

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Calculate difference in milliseconds
  const diffTime = Math.abs(end.getTime() - start.getTime());
  
  // Convert to days and round up
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calculate ajuda de custo (cost assistance) for a scouter
 * @param lead - Lead data
 * @param projectSettings - Project payment settings
 * @returns Object with calculation details
 */
export function calculateAjudaCustoForScouter(
  lead: LeadForPayment,
  projectSettings: ProjectPaymentSettings | null
): {
  dias_trabalhados: number;
  ajuda_custo_por_dia: number;
  ajuda_custo_total: number;
} {
  // Default values
  const result = {
    dias_trabalhados: 0,
    ajuda_custo_por_dia: 0,
    ajuda_custo_total: 0,
  };

  // Check if ajuda de custo is enabled
  if (!projectSettings?.ajuda_custo_enabled) {
    return result;
  }

  // Calculate days worked
  const diasTrabalhados = calculateDaysWorked(
    lead.data_criacao_ficha,
    lead.data_confirmacao_ficha || new Date()
  );

  result.dias_trabalhados = diasTrabalhados;
  result.ajuda_custo_por_dia = projectSettings.ajuda_custo_valor || 0;
  result.ajuda_custo_total = diasTrabalhados * result.ajuda_custo_por_dia;

  return result;
}

/**
 * Calculate faltas (absences) deduction
 * Note: This is a placeholder. In a real implementation, you would need to:
 * - Track attendance records
 * - Calculate expected vs actual days worked
 * - Apply deductions based on project settings
 * 
 * @param lead - Lead data
 * @param projectSettings - Project payment settings
 * @returns Object with calculation details
 */
export function calculateFaltasForScouter(
  lead: LeadForPayment,
  projectSettings: ProjectPaymentSettings | null
): {
  num_faltas: number;
  desconto_falta_unitario: number;
  desconto_faltas_total: number;
} {
  // Default values
  const result = {
    num_faltas: 0,
    desconto_falta_unitario: 0,
    desconto_faltas_total: 0,
  };

  // Check if falta deduction is enabled
  if (!projectSettings?.desconto_falta_enabled) {
    return result;
  }

  // TODO: Implement actual falta detection logic
  // This would require additional data about:
  // - Expected work days
  // - Actual attendance records
  // - Absence tracking
  
  // For now, we return zero faltas
  // In production, you would query attendance records or use other business logic
  
  result.desconto_falta_unitario = projectSettings.desconto_falta_valor || 0;
  result.desconto_faltas_total = result.num_faltas * result.desconto_falta_unitario;

  return result;
}

/**
 * Execute batch payment transaction
 * Attempts to use RPC function first, falls back to individual operations if RPC fails
 * 
 * @param payments - Array of payment items to process
 * @param batchId - UUID for the batch (generated if not provided)
 * @returns Result object with success status and details
 */
export async function executeBatchPayment(
  payments: PaymentItem[],
  batchId?: string
): Promise<{
  success: boolean;
  batch_id: string;
  total_payments: number;
  success_count: number;
  error_count: number;
  errors: Array<{ error: string; lead_id?: number; payment?: PaymentItem }>;
  method: 'rpc' | 'fallback';
}> {
  // Generate batch ID if not provided
  const batch_id = batchId || crypto.randomUUID();

  // Get current user ID if available
  const { data: userData } = await supabase.auth.getUser();
  const created_by = userData?.user?.id || null;

  try {
    // Attempt to use RPC function
    const { data, error } = await supabase.rpc('pay_fichas_transaction', {
      p_batch_id: batch_id,
      p_payments: payments,
      p_created_by: created_by,
    });

    if (error) {
      console.warn('RPC call failed, falling back to batch operations:', error);
      // Fall through to fallback method
      throw error;
    }

    return {
      ...data,
      method: 'rpc' as const,
    };
  } catch (rpcError) {
    // Fallback: Process payments individually
    console.log('Using fallback method for batch payment');
    
    let success_count = 0;
    let error_count = 0;
    const errors: Array<{ error: string; lead_id?: number; payment?: PaymentItem }> = [];

    for (const payment of payments) {
      try {
        // Update lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            ficha_confirmada: true,
            data_confirmacao_ficha: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.lead_id);

        if (updateError) throw updateError;

        // Insert payment record
        const { error: insertError } = await supabase
          .from('payments_records')
          .insert({
            batch_id,
            payment_date: new Date().toISOString(),
            lead_id: payment.lead_id,
            scouter: payment.scouter,
            commercial_project_id: payment.commercial_project_id,
            num_fichas: payment.num_fichas,
            valor_ficha: payment.valor_ficha,
            valor_fichas_total: payment.valor_fichas_total,
            dias_trabalhados: payment.dias_trabalhados,
            ajuda_custo_por_dia: payment.ajuda_custo_por_dia,
            ajuda_custo_total: payment.ajuda_custo_total,
            num_faltas: payment.num_faltas,
            desconto_falta_unitario: payment.desconto_falta_unitario,
            desconto_faltas_total: payment.desconto_faltas_total,
            valor_bruto: payment.valor_bruto,
            valor_descontos: payment.valor_descontos,
            valor_liquido: payment.valor_liquido,
            created_by,
            observacoes: payment.observacoes,
            status: payment.status || 'paid',
          });

        if (insertError) throw insertError;

        success_count++;
      } catch (err) {
        error_count++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({
          error: errorMessage,
          lead_id: payment.lead_id,
          payment,
        });
        console.error('Error processing payment for lead', payment.lead_id, err);
      }
    }

    return {
      success: error_count === 0,
      batch_id,
      total_payments: payments.length,
      success_count,
      error_count,
      errors,
      method: 'fallback' as const,
    };
  }
}
