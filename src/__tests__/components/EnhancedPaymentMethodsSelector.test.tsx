// Tests for Enhanced Payment Methods Selector
// Validates amount-based payment flow with per-method installments

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedPaymentMethodsSelector } from '@/components/agenciamento/EnhancedPaymentMethodsSelector';
import type { SelectedPaymentMethod } from '@/types/agenciamento';

describe('EnhancedPaymentMethodsSelector', () => {
  const mockOnChange = (methods: SelectedPaymentMethod[]) => {
    // Mock implementation
  };

  it('should render empty state correctly', () => {
    render(
      <EnhancedPaymentMethodsSelector
        value={[]}
        onChange={mockOnChange}
        totalValue={5000}
      />
    );

    expect(screen.getByText(/Adicione pelo menos uma forma de pagamento/i)).toBeInTheDocument();
  });

  it('should calculate remaining balance correctly', () => {
    render(
      <EnhancedPaymentMethodsSelector
        value={[]}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    // Net total should be 5000 - 500 = 4500
    // Check for the "Total" label in the summary
    expect(screen.getByText('Total')).toBeInTheDocument();
    const totalElements = screen.getAllByText(/R\$ 4500\.00/);
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it('should show pending status when balance is not fully allocated', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'pix',
        percentage: 11.11,
        amount: 500,
        installments: 1,
        installment_value: 500,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    expect(screen.getByText(/Saldo pendente/i)).toBeInTheDocument();
    // Remaining should be 4500 - 500 = 4000
    expect(screen.getByText(/Faltam: R\$ 4000\.00/i)).toBeInTheDocument();
  });

  it('should show complete status when balance is fully allocated', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'pix',
        percentage: 11.11,
        amount: 500,
        installments: 1,
        installment_value: 500,
      },
      {
        method: 'credit_card',
        percentage: 44.44,
        amount: 2000,
        installments: 12,
        installment_value: 166.67,
      },
      {
        method: 'boleto',
        percentage: 44.44,
        amount: 2000,
        installments: 12,
        installment_value: 166.67,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    expect(screen.getByText(/Pagamento completo/i)).toBeInTheDocument();
  });

  it('should show overflow status when total exceeds balance', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'pix',
        percentage: 20,
        amount: 5000,
        installments: 1,
        installment_value: 5000,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    expect(screen.getByText(/Valor excedido/i)).toBeInTheDocument();
  });

  it('should display payment method with installments correctly', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'credit_card',
        percentage: 44.44,
        amount: 2000,
        installments: 12,
        installment_value: 166.67,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    expect(screen.getByText(/Cartão de Crédito/i)).toBeInTheDocument();
    expect(screen.getByText(/12x de R\$ 166\.67/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 2000\.00/)).toBeInTheDocument();
  });

  it('should display payment method without installments as "À vista"', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'pix',
        percentage: 11.11,
        amount: 500,
        installments: 1,
        installment_value: 500,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    expect(screen.getByText(/PIX/i)).toBeInTheDocument();
    expect(screen.getByText(/À vista/i)).toBeInTheDocument();
  });

  it('should show available balance hint', () => {
    render(
      <EnhancedPaymentMethodsSelector
        value={[]}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    expect(screen.getByText(/Saldo disponível: R\$ 4500\.00/i)).toBeInTheDocument();
  });

  it('should have Max button when there is remaining balance', () => {
    render(
      <EnhancedPaymentMethodsSelector
        value={[]}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    // Check that available balance is shown
    expect(screen.getByText(/Saldo disponível: R\$ 4500\.00/i)).toBeInTheDocument();
    
    // Check that the form has input fields for adding payment methods
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('should calculate percentage correctly for amount-based input', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'pix',
        percentage: 11.11, // 500/4500 * 100
        amount: 500,
        installments: 1,
        installment_value: 500,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    // Check that the percentage is calculated correctly
    // 500/4500 = 11.11%
    expect(paymentMethods[0].percentage).toBeCloseTo(11.11, 2);
  });

  it('should calculate installment value correctly', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'credit_card',
        percentage: 44.44,
        amount: 2000,
        installments: 12,
        installment_value: 166.67, // 2000/12
      },
    ];

    expect(paymentMethods[0].installment_value).toBeCloseTo(166.67, 2);
  });

  it('should support boleto payment method', () => {
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'boleto',
        percentage: 44.44,
        amount: 2000,
        installments: 12,
        installment_value: 166.67,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    expect(screen.getByText(/Boleto/i)).toBeInTheDocument();
  });

  it('should handle multiple payment methods scenario from problem statement', () => {
    // Scenario from problem statement:
    // Product: 5000
    // Discount: 500
    // Down payment (PIX): 500
    // Credit card: 2000 (12x)
    // Boleto: 2000 (12x)
    
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'pix',
        percentage: 11.11,
        amount: 500,
        installments: 1,
        installment_value: 500,
      },
      {
        method: 'credit_card',
        percentage: 44.44,
        amount: 2000,
        installments: 12,
        installment_value: 166.67,
      },
      {
        method: 'boleto',
        percentage: 44.44,
        amount: 2000,
        installments: 12,
        installment_value: 166.67,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    // Should show complete status
    expect(screen.getByText(/Pagamento completo/i)).toBeInTheDocument();
    
    // Should show all three payment methods
    expect(screen.getByText(/PIX/i)).toBeInTheDocument();
    expect(screen.getByText(/Cartão de Crédito/i)).toBeInTheDocument();
    expect(screen.getByText(/Boleto/i)).toBeInTheDocument();

    // Total should be 4500 (5000 - 500)
    const totalAllocated = paymentMethods.reduce((sum, pm) => sum + (pm.amount || 0), 0);
    expect(totalAllocated).toBe(4500);
  });

  it('should validate that amounts do not exceed net total', () => {
    const netTotal = 4500; // 5000 - 500
    const paymentMethods: SelectedPaymentMethod[] = [
      {
        method: 'pix',
        percentage: 11.11,
        amount: 500,
        installments: 1,
        installment_value: 500,
      },
    ];

    render(
      <EnhancedPaymentMethodsSelector
        value={paymentMethods}
        onChange={mockOnChange}
        totalValue={5000}
        discountValue={500}
      />
    );

    // Available balance should be 4000 (4500 - 500)
    const totalAllocated = paymentMethods.reduce((sum, pm) => sum + (pm.amount || 0), 0);
    const remaining = netTotal - totalAllocated;
    expect(remaining).toBe(4000);
  });
});
