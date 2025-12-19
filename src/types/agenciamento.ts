// Agenciamento (Negotiations) Module Types
// Complete type definitions for commercial negotiations

// Status alinhados EXATAMENTE com Bitrix - Categoria 1 (Pinheiros)
export type NegotiationStatus =
  | 'recepcao_cadastro'      // C1:NEW - Recepção - Cadastro atendimento
  | 'ficha_preenchida'       // C1:UC_O2KDK6 - Ficha Preenchida
  | 'atendimento_produtor'   // C1:EXECUTING - Atendimento Produtor
  | 'negocios_fechados'      // C1:WON - Negócios Fechados
  | 'contrato_nao_fechado'   // C1:LOSE - Contrato não fechado
  | 'analisar';              // C1:UC_MKIQ0S - Analisar

export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'pix'
  | 'boleto'
  | 'check'
  | 'financing'
  | 'installments'
  | 'other';

export type PaymentFrequency = 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly';

export interface NegotiationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_percentage?: number;
  notes?: string;
}

export interface SelectedPaymentMethod {
  method: PaymentMethod;
  percentage: number; // Percentage of total to be paid with this method
  amount?: number; // Calculated amount
  notes?: string;
  // Enhanced properties for amount-based payment flow
  installments?: number; // Number of installments for this specific payment method
  installment_value?: number; // Value of each installment for this payment method
}

export interface Negotiation {
  id: string;

  // Deal reference
  deal_id?: string | null;

  // Bitrix24 Integration
  bitrix_deal_id?: number | null;
  bitrix_project_id?: string | null;
  bitrix_contact_id?: string | null;
  bitrix_company_id?: string | null;
  bitrix_product_id?: number | null;

  // Basic Information
  title: string;
  description?: string | null;
  status: NegotiationStatus;

  // Client Information
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_document?: string | null;

  // Commercial Conditions
  base_value: number;
  discount_percentage: number;
  discount_value: number;
  final_value: number;

  // Payment Conditions
  payment_methods: SelectedPaymentMethod[];
  installments_number: number;
  installment_value: number;
  first_payment_date?: string | null;
  payment_frequency: PaymentFrequency;

  // Additional Fees and Taxes
  additional_fees: number;
  tax_percentage: number;
  tax_value: number;
  total_value: number;

  // Dates
  negotiation_date: string;
  validity_date?: string | null;
  expected_closing_date?: string | null;
  actual_closing_date?: string | null;

  // Items
  items: NegotiationItem[];

  // Terms and Conditions
  terms_and_conditions?: string | null;
  special_conditions?: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;

  // Approval workflow
  approval_status?: 'pending' | 'approved' | 'rejected' | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  requires_approval?: boolean | null;

  // Notes and attachments
  internal_notes?: string | null;
  attachments?: string[] | null;
}

export interface NegotiationHistory {
  id: string;
  negotiation_id: string;
  action: string;
  old_status?: string;
  new_status?: string;
  changes?: Record<string, any>;
  notes?: string;
  performed_by?: string;
  performed_at: string;
}

export interface NegotiationAttachment {
  id: string;
  negotiation_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

// Summary type for lists
export interface NegotiationSummary {
  id: string;
  title: string;
  client_name: string;
  status: NegotiationStatus;
  total_value: number;
  negotiation_date: string;
  created_at: string;
  updated_at?: string;
}

// Form data types
export interface NegotiationFormData {
  // Basic Information
  title: string;
  description?: string;
  deal_id?: string;
  bitrix_deal_id?: number;
  bitrix_project_id?: string;
  bitrix_contact_id?: string;
  bitrix_company_id?: string;
  bitrix_product_id?: number;
  status?: NegotiationStatus;

  // Client Information
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;

  // Commercial Conditions
  base_value: number;
  discount_percentage: number;
  discount_value: number;

  // Payment Conditions
  payment_methods: SelectedPaymentMethod[];
  installments_number: number;
  installment_value: number;
  first_payment_date?: string;
  payment_frequency: PaymentFrequency;

  // Additional Fees and Taxes
  additional_fees: number;
  tax_percentage: number;

  // Dates
  negotiation_date: string;
  validity_date?: string;
  expected_closing_date?: string;

  // Items
  items: NegotiationItem[];

  // Terms and Conditions
  terms_and_conditions?: string;
  special_conditions?: string;
  internal_notes?: string;
  
  // Approval
  requires_approval?: boolean;
}

export interface NegotiationCalculation {
  base_value: number;
  discount_percentage: number;
  discount_value: number;
  final_value: number;
  additional_fees: number;
  tax_percentage: number;
  tax_value: number;
  total_value: number;
  installment_value: number;
  payment_methods_breakdown: Array<{
    method: PaymentMethod;
    percentage: number;
    amount: number;
  }>;
}

export interface NegotiationFilters {
  status?: NegotiationStatus[];
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  valueRange?: {
    min: number;
    max: number;
  };
  clientId?: string;
  createdBy?: string;
  created_by?: string;
}

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  bank_transfer: 'Transferência Bancária',
  pix: 'PIX',
  boleto: 'Boleto',
  check: 'Cheque',
  financing: 'Financiamento',
  installments: 'Parcelamento',
  other: 'Outro',
};

// Status labels with colors - Alinhado EXATAMENTE com Bitrix Categoria 1 (Pinheiros)
export const NEGOTIATION_STATUS_CONFIG: Record<
  NegotiationStatus,
  { label: string; color: string; icon?: string }
> = {
  recepcao_cadastro: { label: 'Recepção - Cadastro atendimento', color: 'slate' },
  ficha_preenchida: { label: 'Ficha Preenchida', color: 'blue' },
  atendimento_produtor: { label: 'Atendimento Produtor', color: 'amber' },
  negocios_fechados: { label: 'Negócios Fechados', color: 'green' },
  contrato_nao_fechado: { label: 'Contrato não fechado', color: 'orange' },
  analisar: { label: 'Analisar', color: 'purple' },
};

// Payment frequency labels
export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};
