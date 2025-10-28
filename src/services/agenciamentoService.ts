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

  // Prepare negotiation data
  const negotiationData = {
    title: data.title,
    description: data.description,
    status: data.status || 'draft',
    client_name: data.client_name,
    client_email: data.client_email,
    client_phone: data.client_phone,
    client_document: data.client_document,
    bitrix_project_id: data.bitrix_project_id,
    bitrix_product_id: data.bitrix_product_id,
    base_value: calculation.base_value,
    discount_percentage: calculation.discount_percentage,
    discount_value: calculation.discount_value,
    final_value: calculation.final_value,
    payment_methods: data.payment_methods,
    installments_number: data.installments_number || 1,
    installment_value: calculation.installment_value,
    first_payment_date: data.first_payment_date,
    payment_frequency: data.payment_frequency || 'monthly',
    additional_fees: calculation.additional_fees,
    tax_percentage: calculation.tax_percentage,
    tax_value: calculation.tax_value,
    total_value: calculation.total_value,
    negotiation_date: data.negotiation_date || new Date().toISOString().split('T')[0],
    validity_date: data.validity_date,
    expected_closing_date: data.expected_closing_date,
    items: data.items || [],
    terms_and_conditions: data.terms_and_conditions,
    special_conditions: data.special_conditions,
    internal_notes: data.internal_notes,
    requires_approval: data.requires_approval || false,
    created_by: userData.user.id,
  };

  // NOTA: A tabela 'negotiations' ainda não foi criada no banco de dados
  // Por enquanto, retornamos um objeto mock
  console.warn('Tabela negotiations não existe ainda. Retornando mock data.');
  
  const mockNegotiation: Negotiation = {
    id: crypto.randomUUID(),
    ...negotiationData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return mockNegotiation;
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

  // Prepare update data
  const updateData: any = {
    ...data,
    updated_by: userData.user.id,
  };

  // If any value-related fields are updated, recalculate
  if (
    data.base_value !== undefined ||
    data.discount_percentage !== undefined ||
    data.additional_fees !== undefined ||
    data.tax_percentage !== undefined
  ) {
    // NOTA: A tabela 'negotiations' ainda não foi criada no banco de dados
    // Não podemos recalcular sem acessar a tabela
    console.warn('updateNegotiation: Tabela negotiations não existe ainda - recálculo desabilitado');
  }
  
  // NOTA: A tabela 'negotiations' ainda não foi criada no banco de dados
  // Essa função não pode ser executada até que a migration seja feita
  console.warn('updateNegotiation: Tabela negotiations não existe ainda');
  throw new Error('Funcionalidade de negociações ainda não está disponível - tabela não criada');
}

/**
 * Get a single negotiation by ID
 */
export async function getNegotiation(id: string): Promise<Negotiation | null> {
  console.warn('getNegotiation: Tabela negotiations não existe ainda');
  return null;
}

/**
 * List negotiations with filters
 */
export async function listNegotiations(filters?: NegotiationFilters): Promise<Negotiation[]> {
  console.warn('listNegotiations: Tabela negotiations não existe ainda');
  return [];
}

/**
 * Get negotiation summary
 */
export async function getNegotiationSummary(id: string): Promise<NegotiationSummary | null> {
  console.warn('getNegotiationSummary: Tabela negotiation_summary não existe ainda');
  return null;
}

/**
 * Get negotiation history
 */
export async function getNegotiationHistory(negotiationId: string): Promise<NegotiationHistory[]> {
  console.warn('getNegotiationHistory: Tabela negotiation_history não existe ainda');
  return [];
}

/**
 * Delete a negotiation
 */
export async function deleteNegotiation(id: string): Promise<void> {
  console.warn('deleteNegotiation: Tabela negotiations não existe ainda');
  throw new Error('Funcionalidade de negociações ainda não está disponível - tabela não criada');
}

/**
 * Approve a negotiation
 */
export async function approveNegotiation(id: string, notes?: string): Promise<Negotiation | null> {
  console.warn('approveNegotiation: Tabela negotiations não existe ainda');
  return null;
}

/**
 * Reject a negotiation
 */
export async function rejectNegotiation(id: string, notes?: string): Promise<Negotiation | null> {
  console.warn('rejectNegotiation: Tabela negotiations não existe ainda');
  return null;
}

/**
 * Complete a negotiation
 */
export async function completeNegotiation(id: string): Promise<Negotiation | null> {
  console.warn('completeNegotiation: Tabela negotiations não existe ainda');
  return null;
}

/**
 * Cancel a negotiation
 */
export async function cancelNegotiation(id: string, reason?: string): Promise<Negotiation | null> {
  console.warn('cancelNegotiation: Tabela negotiations não existe ainda');
  return null;
}
