// Enhanced Payment Configuration Component
// Supports down payment (entrada) and multiple installment methods
// Mobile-friendly design with real-time validation

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, AlertCircle, CheckCircle2, DollarSign, CreditCard, Smartphone } from 'lucide-react';
import type { PaymentMethod, SelectedPaymentMethod } from '@/types/agenciamento';
import { PAYMENT_METHOD_LABELS } from '@/types/agenciamento';
import { Switch } from '@/components/ui/switch';

interface EnhancedPaymentConfigProps {
  value: SelectedPaymentMethod[];
  onChange: (methods: SelectedPaymentMethod[]) => void;
  totalValue: number;
}

export function EnhancedPaymentConfig({
  value,
  onChange,
  totalValue,
}: EnhancedPaymentConfigProps) {
  // Estado para entrada (PIX ou outro método)
  const [hasDownPayment, setHasDownPayment] = useState(false);
  const [downPaymentAmount, setDownPaymentAmount] = useState<string>('');
  const [downPaymentMethod, setDownPaymentMethod] = useState<PaymentMethod>('pix');

  // Estado para adicionar método de pagamento
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [methodAmount, setMethodAmount] = useState<string>('');

  // Calcular valores
  const downPayment = parseFloat(downPaymentAmount) || 0;
  const remainingAmount = totalValue - downPayment;
  const paidAmount = value.reduce((sum, pm) => sum + (pm.amount || 0), 0);
  const totalPaid = downPayment + paidAmount;
  const balance = totalValue - totalPaid;
  const isComplete = Math.abs(balance) < 0.01;

  // Atualizar métodos quando entrada muda
  useEffect(() => {
    if (hasDownPayment && downPayment > 0) {
      // Filtrar método de entrada dos métodos de pagamento (que não é um PaymentMethod válido)
      const filteredMethods = value;
      
      // Adicionar ou atualizar entrada
      const downPaymentEntry: SelectedPaymentMethod = {
        method: downPaymentMethod,
        percentage: (downPayment / totalValue) * 100,
        amount: downPayment,
        notes: 'Entrada',
      };
      
      onChange([downPaymentEntry, ...filteredMethods]);
    } else {
      // Remover entrada se desabilitada
      const filteredMethods = value.filter(m => m.notes !== 'Entrada');
      onChange(filteredMethods);
    }
  }, [hasDownPayment, downPayment, downPaymentMethod, totalValue]);

  const addPaymentMethod = () => {
    if (!selectedMethod || !methodAmount) return;

    const amount = parseFloat(methodAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newMethod: SelectedPaymentMethod = {
      method: selectedMethod,
      percentage: (amount / totalValue) * 100,
      amount: amount,
    };

    // Filtrar entrada para não duplicar
    const otherMethods = value.filter(m => m.notes !== 'Entrada');
    const downPaymentEntry = value.find(m => m.notes === 'Entrada');
    
    onChange(downPaymentEntry ? [downPaymentEntry, ...otherMethods, newMethod] : [...otherMethods, newMethod]);
    setSelectedMethod('');
    setMethodAmount('');
  };

  const removePaymentMethod = (index: number) => {
    const newMethods = value.filter((_, i) => i !== index);
    onChange(newMethods);
  };

  const updateMethodAmount = (index: number, newAmount: string) => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount)) return;

    const newMethods = [...value];
    newMethods[index] = {
      ...newMethods[index],
      amount: amount,
      percentage: (amount / totalValue) * 100,
    };
    onChange(newMethods);
  };

  const distributeRemaining = () => {
    if (balance <= 0) return;
    
    const otherMethods = value.filter(m => m.notes !== 'Entrada');
    if (otherMethods.length === 0) return;

    const amountPerMethod = balance / otherMethods.length;
    const downPaymentEntry = value.find(m => m.notes === 'Entrada');
    
    const updatedMethods = otherMethods.map(method => ({
      ...method,
      amount: (method.amount || 0) + amountPerMethod,
      percentage: ((method.amount || 0) + amountPerMethod) / totalValue * 100,
    }));

    onChange(downPaymentEntry ? [downPaymentEntry, ...updatedMethods] : updatedMethods);
  };

  return (
    <div className="space-y-6">
      {/* Total Value Display */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              R$ {totalValue.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Down Payment (Entrada) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle className="text-base">Entrada (PIX ou Dinheiro)</CardTitle>
            </div>
            <Switch
              checked={hasDownPayment}
              onCheckedChange={setHasDownPayment}
            />
          </div>
          <CardDescription>
            Defina um valor de entrada para pagamento à vista
          </CardDescription>
        </CardHeader>
        {hasDownPayment && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="down-payment-method">Método</Label>
                <Select
                  value={downPaymentMethod}
                  onValueChange={(v) => setDownPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger id="down-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="down-payment-amount">Valor da Entrada</Label>
                <Input
                  id="down-payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalValue}
                  placeholder="0.00"
                  value={downPaymentAmount}
                  onChange={(e) => setDownPaymentAmount(e.target.value)}
                />
              </div>
            </div>
            {downPayment > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>Entrada:</strong> R$ {downPayment.toFixed(2)} ({PAYMENT_METHOD_LABELS[downPaymentMethod]})
                </p>
                <p className="text-sm text-green-600 mt-1">
                  <strong>Saldo restante:</strong> R$ {remainingAmount.toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Additional Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle className="text-base">Métodos de Pagamento Adicionais</CardTitle>
          </div>
          <CardDescription>
            Adicione formas de pagamento para o saldo {hasDownPayment ? 'restante' : 'total'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Method */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS)
                    .filter(([key]) => key !== downPaymentMethod || !hasDownPayment)
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-32">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor"
                value={methodAmount}
                onChange={(e) => setMethodAmount(e.target.value)}
              />
            </div>
            <Button type="button" onClick={addPaymentMethod} size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* List of Methods */}
          {value.filter(m => m.notes !== 'Entrada').length > 0 && (
            <div className="space-y-2">
              <Separator />
              {value.filter(m => m.notes !== 'Entrada').map((method, index) => {
                const actualIndex = value.findIndex(m => m === method);
                return (
                  <Card key={actualIndex} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {PAYMENT_METHOD_LABELS[method.method]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {method.percentage.toFixed(1)}% do total
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28"
                          value={method.amount?.toFixed(2) || '0.00'}
                          onChange={(e) => updateMethodAmount(actualIndex, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePaymentMethod(actualIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary and Validation */}
      <Card className={isComplete ? 'border-green-200 bg-green-50' : balance < 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Pago:</span>
              <span className="text-lg font-bold">R$ {totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Saldo:</span>
              <span className={`text-lg font-bold ${balance < 0 ? 'text-red-600' : balance > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                R$ {Math.abs(balance).toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              {isComplete ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Configuração de pagamento completa
                  </span>
                </>
              ) : balance > 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Faltam R$ {balance.toFixed(2)} para completar o valor total
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">
                    Valor excede o total em R$ {Math.abs(balance).toFixed(2)}
                  </span>
                </>
              )}
            </div>
            {balance > 0 && value.filter(m => m.notes !== 'Entrada').length > 0 && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={distributeRemaining}
                className="w-full"
              >
                Distribuir saldo restante automaticamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {hasDownPayment 
            ? 'Adicione métodos de pagamento para o saldo restante' 
            : 'Configure pelo menos uma forma de pagamento'}
        </p>
      )}
    </div>
  );
}
