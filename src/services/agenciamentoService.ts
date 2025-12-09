// Agenciamento Service
// Business logic and API integration for negotiations

import { supabase } from '@/integrations/supabase/client';
import type {
  Negotiation,
  NegotiationFormData,
  NegotiationCalculation,
  NegotiationFilters,
  NegotiationSummary,
  NegotiationHistory,
  SelectedPaymentMethod,
} from '@/types/agenciamento';

/**
 * Calculate negotiation values based on inputs
 */
export function calculateNegotiationValues(data: {
  base_value: number;
  discount_percentage: number;
  additional_fees: number;
  tax_percentage: number;
  installments_number: number;
  payment_methods: SelectedPaymentMethod[];
}): NegotiationCalculation {
  const {
    base_value,
    discount_percentage,
    additional_fees,
    tax_percentage,
    installments_number,
    payment_methods,
  } = data;

  // Calculate discount
  const discount_value = (base_value * discount_percentage) / 100;
  const final_value = base_value - discount_value;

  // Calculate tax
  const tax_value = (final_value * tax_percentage) / 100;

  // Calculate total
  const total_value = final_value + additional_fees + tax_value;

  // Calculate installment
  const installment_value = installments_number > 0 ? total_value / installments_number : total_value;

  // Calculate payment methods breakdown
  const payment_methods_breakdown = payment_methods.map((pm) => ({
    method: pm.method,
    percentage: pm.percentage,
    amount: (total_value * pm.percentage) / 100,
  }));

  return {
    base_value,
    discount_percentage,
    discount_value,
    final_value,
    additional_fees,
    tax_percentage,
    tax_value,
    total_value,
    installment_value,
    payment_methods_breakdown,
  };
}

/**
 * Validate payment methods total percentage
 */
export function validatePaymentMethods(methods: SelectedPaymentMethod[]): {
  valid: boolean;
  message?: string;
} {
  if (methods.length === 0) {
    return { valid: false, message: 'Selecione pelo menos uma forma de pagamento' };
  }

  const totalPercentage = methods.reduce((sum, pm) => sum + pm.percentage, 0);

  if (Math.abs(totalPercentage - 100) > 0.01) {
    return {
      valid: false,
      message: `A soma das porcentagens deve ser 100%. Atual: ${totalPercentage.toFixed(2)}%`,
    };
  }

  return { valid: true };
}

/**
 * Create a new negotiation
 */
export async function createNegotiation(data: NegotiationFormData): Promise<Negotiation> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('User not authenticated');
  }

  // Validate payment methods
  const validation = validatePaymentMethods(data.payment_methods);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Calculate values
  const calculation = calculateNegotiationValues({
    base_value: data.base_value,
    discount_percentage: data.discount_percentage || 0,
    additional_fees: data.additional_fees || 0,
    tax_percentage: data.tax_percentage || 0,
    installments_number: data.installments_number || 1,
    payment_methods: data.payment_methods,
  });

  const negotiationData = {
    deal_id: data.deal_id || null,
    bitrix_deal_id: data.bitrix_deal_id || null,
    bitrix_product_id: data.bitrix_product_id ? parseInt(String(data.bitrix_product_id)) : null,
    title: data.title,
    status: data.status || 'draft',
    client_name: data.client_name,
    client_phone: data.client_phone || null,
    client_email: data.client_email || null,
    client_document: data.client_document || null,
    base_value: calculation.base_value,
    discount_percentage: calculation.discount_percentage,
    discount_value: calculation.discount_value,
    additional_fee_percentage: data.additional_fees || 0,
    additional_fee_value: calculation.additional_fees,
    tax_percentage: calculation.tax_percentage,
    tax_value: calculation.tax_value,
    total_value: calculation.total_value,
    payment_methods: data.payment_methods as unknown as any,
    installments_count: data.installments_number || 1,
    first_installment_date: data.first_payment_date || null,
    payment_frequency: data.payment_frequency || 'monthly',
    start_date: data.negotiation_date || null,
    end_date: data.validity_date || null,
    terms: data.terms_and_conditions || null,
    notes: data.internal_notes || null,
    created_by: userData.user.id,
  };

  const { data: created, error } = await supabase
    .from('negotiations')
    .insert([negotiationData])
    .select()
    .single();

  if (error) {
    console.error('Error creating negotiation:', error);
    throw new Error('Erro ao criar negociação');
  }

  // If has deal, sync status to Bitrix
  if (created.bitrix_deal_id) {
    try {
      await supabase.functions.invoke('sync-deal-to-bitrix', {
        body: {
          negotiation_id: created.id,
          status: created.status,
        },
      });
    } catch (e) {
      console.warn('Failed to sync to Bitrix:', e);
    }
  }

  // Transform to Negotiation type
  return transformDbToNegotiation(created);
}

/**
 * Update an existing negotiation
 */
export async function updateNegotiation(
  id: string,
  data: Partial<NegotiationFormData>
): Promise<Negotiation> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('User not authenticated');
  }

  // If payment methods are being updated, validate them
  if (data.payment_methods) {
    const validation = validatePaymentMethods(data.payment_methods);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
  }

  // Get current negotiation for recalculation if needed
  const { data: current } = await supabase
    .from('negotiations')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) {
    throw new Error('Negociação não encontrada');
  }

  // Prepare update data
  const updateData: any = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.client_name !== undefined) updateData.client_name = data.client_name;
  if (data.client_phone !== undefined) updateData.client_phone = data.client_phone;
  if (data.client_email !== undefined) updateData.client_email = data.client_email;
  if (data.client_document !== undefined) updateData.client_document = data.client_document;
  if (data.payment_methods !== undefined) updateData.payment_methods = data.payment_methods;
  if (data.installments_number !== undefined) updateData.installments_count = data.installments_number;
  if (data.first_payment_date !== undefined) updateData.first_installment_date = data.first_payment_date;
  if (data.payment_frequency !== undefined) updateData.payment_frequency = data.payment_frequency;
  if (data.terms_and_conditions !== undefined) updateData.terms = data.terms_and_conditions;
  if (data.internal_notes !== undefined) updateData.notes = data.internal_notes;

  // Recalculate values if any value field changed
  if (
    data.base_value !== undefined ||
    data.discount_percentage !== undefined ||
    data.additional_fees !== undefined ||
    data.tax_percentage !== undefined
  ) {
    const calculation = calculateNegotiationValues({
      base_value: data.base_value ?? current.base_value,
      discount_percentage: data.discount_percentage ?? current.discount_percentage ?? 0,
      additional_fees: data.additional_fees ?? current.additional_fee_value ?? 0,
      tax_percentage: data.tax_percentage ?? current.tax_percentage ?? 0,
      installments_number: data.installments_number ?? current.installments_count ?? 1,
      payment_methods: data.payment_methods ?? (Array.isArray(current.payment_methods) ? current.payment_methods as unknown as SelectedPaymentMethod[] : []),
    });

    updateData.base_value = calculation.base_value;
    updateData.discount_percentage = calculation.discount_percentage;
    updateData.discount_value = calculation.discount_value;
    updateData.tax_percentage = calculation.tax_percentage;
    updateData.tax_value = calculation.tax_value;
    updateData.total_value = calculation.total_value;
    updateData.additional_fee_value = calculation.additional_fees;
  }

  const { data: updated, error } = await supabase
    .from('negotiations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating negotiation:', error);
    throw new Error('Erro ao atualizar negociação');
  }

  // Sync status change to Bitrix
  if (data.status && updated.bitrix_deal_id) {
    try {
      await supabase.functions.invoke('sync-deal-to-bitrix', {
        body: {
          negotiation_id: updated.id,
          status: updated.status,
        },
      });
    } catch (e) {
      console.warn('Failed to sync to Bitrix:', e);
    }
  }

  return transformDbToNegotiation(updated);
}

/**
 * Get a single negotiation by ID
 */
export async function getNegotiation(id: string): Promise<Negotiation | null> {
  const { data, error } = await supabase
    .from('negotiations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Erro ao buscar negociação');
  }

  return transformDbToNegotiation(data);
}

/**
 * List negotiations with filters
 */
export async function listNegotiations(filters?: NegotiationFilters): Promise<Negotiation[]> {
  let query = supabase
    .from('negotiations')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
  }

  if (filters?.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing negotiations:', error);
    throw new Error('Erro ao listar negociações');
  }

  return (data || []).map(transformDbToNegotiation);
}

/**
 * Get negotiation history
 */
export async function getNegotiationHistory(negotiationId: string): Promise<NegotiationHistory[]> {
  const { data, error } = await supabase
    .from('negotiation_history')
    .select('*')
    .eq('negotiation_id', negotiationId)
    .order('performed_at', { ascending: false });

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }

  return (data || []).map((h: any): NegotiationHistory => ({
    id: h.id,
    negotiation_id: h.negotiation_id,
    action: h.action,
    changes: h.changes,
    performed_by: h.performed_by,
    performed_at: h.performed_at,
    notes: h.notes,
  }));
}

/**
 * Delete a negotiation
 */
export async function deleteNegotiation(id: string): Promise<void> {
  const { error } = await supabase.from('negotiations').delete().eq('id', id);

  if (error) {
    console.error('Error deleting negotiation:', error);
    throw new Error('Erro ao excluir negociação');
  }
}

/**
 * Approve a negotiation
 */
export async function approveNegotiation(id: string, notes?: string): Promise<Negotiation | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('negotiations')
    .update({
      status: 'approved',
      approved_by: userData.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Erro ao aprovar negociação');

  // Sync to Bitrix
  if (data.bitrix_deal_id) {
    await supabase.functions.invoke('sync-deal-to-bitrix', {
      body: { negotiation_id: id, status: 'approved' },
    });
  }

  return transformDbToNegotiation(data);
}

/**
 * Reject a negotiation
 */
export async function rejectNegotiation(id: string, reason?: string): Promise<Negotiation | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('negotiations')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Erro ao rejeitar negociação');

  if (data.bitrix_deal_id) {
    await supabase.functions.invoke('sync-deal-to-bitrix', {
      body: { negotiation_id: id, status: 'rejected' },
    });
  }

  return transformDbToNegotiation(data);
}

/**
 * Complete a negotiation
 */
export async function completeNegotiation(id: string): Promise<Negotiation | null> {
  const { data, error } = await supabase
    .from('negotiations')
    .update({ status: 'completed' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Erro ao concluir negociação');

  if (data.bitrix_deal_id) {
    await supabase.functions.invoke('sync-deal-to-bitrix', {
      body: { negotiation_id: id, status: 'completed' },
    });
  }

  return transformDbToNegotiation(data);
}

/**
 * Cancel a negotiation
 */
export async function cancelNegotiation(id: string, reason?: string): Promise<Negotiation | null> {
  const { data, error } = await supabase
    .from('negotiations')
    .update({
      status: 'cancelled',
      rejection_reason: reason || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Erro ao cancelar negociação');

  if (data.bitrix_deal_id) {
    await supabase.functions.invoke('sync-deal-to-bitrix', {
      body: { negotiation_id: id, status: 'cancelled' },
    });
  }

  return transformDbToNegotiation(data);
}

/**
 * Get negotiation summary (placeholder for reporting)
 */
export async function getNegotiationSummary(id: string): Promise<NegotiationSummary | null> {
  const negotiation = await getNegotiation(id);
  if (!negotiation) return null;

  return {
    id: negotiation.id,
    title: negotiation.title,
    client_name: negotiation.client_name,
    status: negotiation.status,
    total_value: negotiation.total_value,
    created_at: negotiation.created_at,
    updated_at: negotiation.updated_at,
  };
}

// Helper function to transform DB record to Negotiation type
function transformDbToNegotiation(data: any): Negotiation {
  return {
    id: data.id,
    deal_id: data.deal_id,
    bitrix_deal_id: data.bitrix_deal_id,
    title: data.title,
    description: data.notes,
    status: data.status,
    client_name: data.client_name,
    client_email: data.client_email,
    client_phone: data.client_phone,
    client_document: data.client_document,
    bitrix_project_id: null,
    bitrix_product_id: data.bitrix_product_id,
    base_value: data.base_value || 0,
    discount_percentage: data.discount_percentage || 0,
    discount_value: data.discount_value || 0,
    final_value: (data.base_value || 0) - (data.discount_value || 0),
    payment_methods: data.payment_methods || [],
    installments_number: data.installments_count || 1,
    installment_value: data.installments_count > 0 ? (data.total_value || 0) / data.installments_count : data.total_value || 0,
    first_payment_date: data.first_installment_date,
    payment_frequency: data.payment_frequency || 'monthly',
    additional_fees: data.additional_fee_value || 0,
    tax_percentage: data.tax_percentage || 0,
    tax_value: data.tax_value || 0,
    total_value: data.total_value || 0,
    negotiation_date: data.start_date || data.created_at?.split('T')[0],
    validity_date: data.end_date,
    expected_closing_date: data.close_date,
    items: [],
    terms_and_conditions: data.terms,
    special_conditions: null,
    internal_notes: data.notes,
    requires_approval: false,
    approved_by: data.approved_by,
    approved_at: data.approved_at,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: data.rejection_reason,
    created_by: data.created_by,
    updated_by: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
