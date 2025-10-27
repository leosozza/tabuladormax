// Payment Methods Selector Component
// Allows selecting multiple payment methods with percentage distribution

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
import { Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PaymentMethod, SelectedPaymentMethod } from '@/types/agenciamento';
import { PAYMENT_METHOD_LABELS } from '@/types/agenciamento';

interface PaymentMethodsSelectorProps {
  value: SelectedPaymentMethod[];
  onChange: (methods: SelectedPaymentMethod[]) => void;
  totalValue: number;
}

export function PaymentMethodsSelector({
  value,
  onChange,
  totalValue,
}: PaymentMethodsSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [percentage, setPercentage] = useState<string>('');

  const totalPercentage = value.reduce((sum, pm) => sum + pm.percentage, 0);
  const remainingPercentage = 100 - totalPercentage;
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const addPaymentMethod = () => {
    if (!selectedMethod || !percentage) return;

    const newPercentage = parseFloat(percentage);
    if (isNaN(newPercentage) || newPercentage <= 0 || newPercentage > 100) return;

    const newMethod: SelectedPaymentMethod = {
      method: selectedMethod,
      percentage: newPercentage,
      amount: (totalValue * newPercentage) / 100,
    };

    onChange([...value, newMethod]);
    setSelectedMethod('');
    setPercentage('');
  };

  const removePaymentMethod = (index: number) => {
    const newMethods = value.filter((_, i) => i !== index);
    onChange(newMethods);
  };

  const updatePercentage = (index: number, newPercentage: string) => {
    const percentageValue = parseFloat(newPercentage);
    if (isNaN(percentageValue)) return;

    const newMethods = [...value];
    newMethods[index] = {
      ...newMethods[index],
      percentage: percentageValue,
      amount: (totalValue * percentageValue) / 100,
    };
    onChange(newMethods);
  };

  return (
    <div className="space-y-4">
      {/* Add new payment method */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
            <SelectTrigger>
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

        <div className="w-24">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="%"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
          />
        </div>

        <Button type="button" onClick={addPaymentMethod} size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected payment methods list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((method, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {PAYMENT_METHOD_LABELS[method.method]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    R$ {((totalValue * method.percentage) / 100).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-20"
                    value={method.percentage}
                    onChange={(e) => updatePercentage(index, e.target.value)}
                  />
                  <span className="text-sm">%</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePaymentMethod(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Validation feedback */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <span className="text-sm font-medium">
            Total: {totalPercentage.toFixed(2)}%
          </span>
        </div>

        {!isValid && (
          <span className="text-sm text-muted-foreground">
            Restante: {remainingPercentage.toFixed(2)}%
          </span>
        )}
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Adicione pelo menos uma forma de pagamento
        </p>
      )}
    </div>
  );
}
