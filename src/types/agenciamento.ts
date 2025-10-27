// Agenciamento (Negotiations) Module Types
// Complete type definitions for commercial negotiations

export type NegotiationStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'pix'
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
}

export interface Negotiation {
  id: string;

  // Bitrix24 Integration
  bitrix_deal_id?: string | null;
  bitrix_project_id?: string | null;
  bitrix_contact_id?: string | null;
  bitrix_company_id?: string | null;
  bitrix_product_id?: string | null; // ID do produto selecionado do Bitrix24

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
  internal_notes?: string | null;

  // Approval Workflow
  requires_approval: boolean;
  approved_by?: string | null;
  approval_date?: string | null;
  approval_notes?: string | null;

  // Tracking
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;

  // Metadata
  metadata?: Record<string, any>;
}

export interface NegotiationHistory {
  id: string;
  negotiation_id: string;
  action: string;
  changes?: Record<string, any> | null;
  performed_by: string;
  performed_at: string;
  notes?: string | null;
}

export interface NegotiationAttachment {
  id: string;
  negotiation_id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  uploaded_by: string;
  uploaded_at: string;
  description?: string | null;
}

export interface NegotiationSummary {
  id: string;
  title: string;
  client_name: string;
  status: NegotiationStatus;
  base_value: number;
  discount_percentage: number;
  discount_value: number;
  final_value: number;
  additional_fees: number;
  tax_value: number;
  total_value: number;
  installments_number: number;
  installment_value: number;
  payment_methods: SelectedPaymentMethod[];
  negotiation_date: string;
  expected_closing_date?: string | null;
  created_at: string;
  creator_email?: string;
  creator_name?: string;
}

// Form types for creation/editing
export interface NegotiationFormData {
  // Basic Information
  title: string;
  description?: string;
  status?: NegotiationStatus;

  // Client Information
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;

  // Bitrix24 Integration
  bitrix_project_id?: string;
  bitrix_product_id?: string; // ID do produto selecionado do Bitrix24

  // Commercial Conditions
  base_value: number;
  discount_percentage?: number;
  discount_value?: number;

  // Payment Conditions
  payment_methods: SelectedPaymentMethod[];
  installments_number?: number;
  first_payment_date?: string;
  payment_frequency?: PaymentFrequency;

  // Additional Fees and Taxes
  additional_fees?: number;
  tax_percentage?: number;

  // Dates
  negotiation_date?: string;
  validity_date?: string;
  expected_closing_date?: string;

  // Items
  items?: NegotiationItem[];

  // Terms and Conditions
  terms_and_conditions?: string;
  special_conditions?: string;
  internal_notes?: string;

  // Approval
  requires_approval?: boolean;
}

// Calculation results
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

// Filter and search options
export interface NegotiationFilters {
  status?: NegotiationStatus[];
  client_name?: string;
  date_from?: string;
  date_to?: string;
  min_value?: number;
  max_value?: number;
  created_by?: string;
}

// Payment method options with labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  bank_transfer: 'Transferência Bancária',
  pix: 'PIX',
  check: 'Cheque',
  financing: 'Financiamento',
  installments: 'Parcelamento',
  other: 'Outro',
};

// Status labels with colors
export const NEGOTIATION_STATUS_CONFIG: Record<
  NegotiationStatus,
  { label: string; color: string; icon?: string }
> = {
  draft: { label: 'Rascunho', color: 'gray' },
  in_progress: { label: 'Em Andamento', color: 'blue' },
  pending_approval: { label: 'Aguardando Aprovação', color: 'yellow' },
  approved: { label: 'Aprovado', color: 'green' },
  rejected: { label: 'Rejeitado', color: 'red' },
  completed: { label: 'Concluído', color: 'teal' },
  cancelled: { label: 'Cancelado', color: 'gray' },
};

// Payment frequency labels
export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};
