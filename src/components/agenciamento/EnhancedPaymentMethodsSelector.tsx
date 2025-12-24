// Enhanced Payment Methods Selector Component
// Allows selecting multiple payment methods with specific amounts and per-method installments
// Mobile-first responsive design with real-time validation and feedback

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, AlertCircle, CheckCircle2, DollarSign, CreditCard, Mic } from 'lucide-react';
import type { PaymentMethod, SelectedPaymentMethod } from '@/types/agenciamento';
import { PAYMENT_METHOD_LABELS } from '@/types/agenciamento';
import { PaymentVoiceAssistant } from './PaymentVoiceAssistant';

interface EnhancedPaymentMethodsSelectorProps {
  value: SelectedPaymentMethod[];
  onChange: (methods: SelectedPaymentMethod[]) => void;
  totalValue: number;
  discountValue?: number;
  downPaymentLabel?: string;
}

export function EnhancedPaymentMethodsSelector({
  value,
  onChange,
  totalValue,
  discountValue = 0,
  downPaymentLabel = 'Entrada',
}: EnhancedPaymentMethodsSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [amount, setAmount] = useState<string>('');
  const [installments, setInstallments] = useState<string>('1');
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  // Handler for adding payments from voice assistant
  const handleVoicePaymentsExtracted = (payments: SelectedPaymentMethod[]) => {
    // Add all extracted payments to existing ones
    onChange([...value, ...payments]);
    setShowVoiceAssistant(false);
  };

  // Calculate the net total after discount
  const netTotal = totalValue - discountValue;
  
  // Calculate total allocated and remaining
  const totalAllocated = value.reduce((sum, pm) => sum + (pm.amount || 0), 0);
  const remainingBalance = netTotal - totalAllocated;
  const isValid = Math.abs(remainingBalance) < 0.01 && totalAllocated > 0;
  const hasOverflow = remainingBalance < -0.01;

  const addPaymentMethod = () => {
    if (!selectedMethod || !amount) return;

    const amountValue = parseFloat(amount);
    const installmentsValue = parseInt(installments, 10);
    
    if (isNaN(amountValue) || amountValue <= 0) return;
    if (isNaN(installmentsValue) || installmentsValue < 1) return;

    // Check if adding this amount would exceed the remaining balance
    if (amountValue > remainingBalance + 0.01) {
      return; // Silently reject amounts that would exceed the balance
    }

    const installmentValue = installmentsValue > 1 ? amountValue / installmentsValue : amountValue;

    const newMethod: SelectedPaymentMethod = {
      method: selectedMethod,
      percentage: netTotal > 0 ? (amountValue / netTotal) * 100 : 0,
      amount: amountValue,
      installments: installmentsValue,
      installment_value: installmentValue,
    };

    onChange([...value, newMethod]);
    setSelectedMethod('');
    setAmount('');
    setInstallments('1');
  };

  const removePaymentMethod = (index: number) => {
    const newMethods = value.filter((_, i) => i !== index);
    onChange(newMethods);
  };

  const updatePaymentMethod = (index: number, updates: Partial<SelectedPaymentMethod>) => {
    const newMethods = [...value];
    const currentMethod = newMethods[index];
    
    // If amount is being updated
    if (updates.amount !== undefined) {
      const newAmount = updates.amount;
      updates.percentage = netTotal > 0 ? (newAmount / netTotal) * 100 : 0;
      
      // Recalculate installment value if installments exist
      if (currentMethod.installments && currentMethod.installments > 1) {
        updates.installment_value = newAmount / currentMethod.installments;
      } else {
        updates.installment_value = newAmount;
      }
    }
    
    // If installments is being updated
    if (updates.installments !== undefined) {
      const newInstallments = updates.installments;
      if (newInstallments > 0 && currentMethod.amount) {
        updates.installment_value = currentMethod.amount / newInstallments;
      }
    }

    newMethods[index] = { ...currentMethod, ...updates };
    onChange(newMethods);
  };

  const fillRemainingBalance = () => {
    if (remainingBalance > 0.01 && selectedMethod) {
      setAmount(remainingBalance.toFixed(2));
    }
  };

  const getInstallmentOptions = () => {
    // Common installment options
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48];
  };

  return (
    <div className="space-y-4">
      {/* Add new payment method */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs mb-1 block">Forma de Pagamento</Label>
              <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-32">
              <Label className="text-xs mb-1 block">Valor (R$)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingBalance}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 pr-8"
                />
                {remainingBalance > 0.01 && selectedMethod && (
                  <button
                    type="button"
                    onClick={fillRemainingBalance}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80 bg-background px-1 rounded"
                    title="Preencher com saldo restante"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>

            <div className="w-full sm:w-24">
              <Label className="text-xs mb-1 block">Parcelas</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getInstallmentOptions().map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button 
                type="button" 
                onClick={addPaymentMethod} 
                size="sm"
                className="h-9 flex-1 sm:flex-initial"
                disabled={!selectedMethod || !amount || parseFloat(amount) <= 0}
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Adicionar</span>
              </Button>
              <Button
                type="button"
                onClick={() => setShowVoiceAssistant(true)}
                size="sm"
                variant="outline"
                className="h-9"
                title="Falar formas de pagamento"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Voice Assistant Panel */}
          {showVoiceAssistant && (
            <div className="mt-4">
              <PaymentVoiceAssistant
                totalValue={netTotal}
                onPaymentsExtracted={handleVoicePaymentsExtracted}
                onClose={() => setShowVoiceAssistant(false)}
              />
            </div>
          )}

          {remainingBalance > 0.01 && (
            <p className="text-xs text-muted-foreground">
              💡 Saldo disponível: R$ {remainingBalance.toFixed(2)}
            </p>
          )}
        </div>
      </Card>

      {/* Selected payment methods list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((method, index) => (
            <Card key={index} className="p-3 hover:bg-muted/50 transition-colors">
              <div className="space-y-3">
                {/* Method header - mobile friendly */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="font-medium text-sm truncate">
                        {PAYMENT_METHOD_LABELS[method.method]}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {method.installments && method.installments > 1
                        ? `${method.installments}x de R$ ${method.installment_value?.toFixed(2) || '0.00'}`
                        : 'À vista'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-primary">
                      R$ {method.amount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[100px]">
                    <Label className="text-xs mb-1 block">Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-sm"
                      value={method.amount || 0}
                      onChange={(e) => updatePaymentMethod(index, { amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="w-24">
                    <Label className="text-xs mb-1 block">Parcelas</Label>
                    <Select
                      value={String(method.installments || 1)}
                      onValueChange={(value) => updatePaymentMethod(index, { installments: parseInt(value, 10) })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getInstallmentOptions().map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            {num}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removePaymentMethod(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Validation feedback */}
      <Card className={`p-4 ${isValid ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : hasOverflow ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isValid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Pagamento completo
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Total alocado: R$ {totalAllocated.toFixed(2)}
                  </p>
                </div>
              </>
            ) : hasOverflow ? (
              <>
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Valor excedido
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Excesso: R$ {Math.abs(remainingBalance).toFixed(2)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    {value.length === 0 ? 'Adicione formas de pagamento' : 'Saldo pendente'}
                  </p>
                  {value.length > 0 && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Faltam: R$ {remainingBalance.toFixed(2)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-lg font-bold">
              R$ {netTotal.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {value.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Adicione pelo menos uma forma de pagamento</p>
          <p className="text-xs mt-1">Escolha o método, valor e número de parcelas</p>
        </div>
      )}
    </div>
  );
}
