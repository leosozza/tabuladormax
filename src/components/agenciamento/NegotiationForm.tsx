// Negotiation Form Component
// Complete form with two-column layout, validation, and automatic calculations

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save, Calculator, AlertCircle } from 'lucide-react';
import type { NegotiationFormData, SelectedPaymentMethod, PaymentMethod } from '@/types/agenciamento';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from '@/types/agenciamento';
import {
  calculateNegotiationValues,
  validatePaymentMethods,
} from '@/services/agenciamentoService';
import { CommercialProjectBitrixSelector } from '@/components/CommercialProjectBitrixSelector';
import { PaymentMethodsSelector } from './PaymentMethodsSelector';
import { NegotiationSummaryPanel } from './NegotiationSummaryPanel';

// Validation schema
const negotiationSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  client_name: z.string().min(3, 'Nome do cliente é obrigatório'),
  client_email: z.string().email('Email inválido').optional().or(z.literal('')),
  client_phone: z.string().optional(),
  client_document: z.string().optional(),
  bitrix_project_id: z.string().optional(),
  base_value: z.coerce.number().min(0, 'Valor base deve ser maior ou igual a zero'),
  discount_percentage: z.coerce.number().min(0).max(100, 'Desconto deve estar entre 0 e 100%').optional(),
  additional_fees: z.coerce.number().min(0, 'Taxas devem ser maior ou igual a zero').optional(),
  tax_percentage: z.coerce.number().min(0).max(100, 'Imposto deve estar entre 0 e 100%').optional(),
  installments_number: z.coerce.number().int().min(1, 'Número de parcelas deve ser pelo menos 1').optional(),
  first_payment_date: z.string().optional(),
  payment_frequency: z.enum(['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly']).optional(),
  negotiation_date: z.string().optional(),
  validity_date: z.string().optional(),
  expected_closing_date: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  special_conditions: z.string().optional(),
  internal_notes: z.string().optional(),
  requires_approval: z.boolean().optional(),
});

type NegotiationFormValues = z.infer<typeof negotiationSchema>;

interface NegotiationFormProps {
  initialData?: Partial<NegotiationFormData>;
  onSubmit: (data: NegotiationFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function NegotiationForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: NegotiationFormProps) {
  const [paymentMethods, setPaymentMethods] = useState<SelectedPaymentMethod[]>(
    initialData?.payment_methods || []
  );
  const [calculatedValues, setCalculatedValues] = useState<ReturnType<
    typeof calculateNegotiationValues
  > | null>(null);
  const [pendingProjectName, setPendingProjectName] = useState<string | null>(null);

  const form = useForm<NegotiationFormValues>({
    resolver: zodResolver(negotiationSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      client_name: initialData?.client_name || '',
      client_email: initialData?.client_email || '',
      client_phone: initialData?.client_phone || '',
      client_document: initialData?.client_document || '',
      bitrix_project_id: initialData?.bitrix_project_id || '',
      base_value: initialData?.base_value || 0,
      discount_percentage: initialData?.discount_percentage || 0,
      additional_fees: initialData?.additional_fees || 0,
      tax_percentage: initialData?.tax_percentage || 0,
      installments_number: initialData?.installments_number || 1,
      first_payment_date: initialData?.first_payment_date || '',
      payment_frequency: initialData?.payment_frequency || 'monthly',
      negotiation_date:
        initialData?.negotiation_date || new Date().toISOString().split('T')[0],
      validity_date: initialData?.validity_date || '',
      expected_closing_date: initialData?.expected_closing_date || '',
      terms_and_conditions: initialData?.terms_and_conditions || '',
      special_conditions: initialData?.special_conditions || '',
      internal_notes: initialData?.internal_notes || '',
      requires_approval: initialData?.requires_approval || false,
    },
  });

  const watchedValues = form.watch([
    'base_value',
    'discount_percentage',
    'additional_fees',
    'tax_percentage',
    'installments_number',
  ]);

  // Auto-calculate values when inputs change
  useEffect(() => {
    const [base_value, discount_percentage, additional_fees, tax_percentage, installments_number] =
      watchedValues;

    if (base_value >= 0) {
      try {
        const calculated = calculateNegotiationValues({
          base_value: Number(base_value) || 0,
          discount_percentage: Number(discount_percentage) || 0,
          additional_fees: Number(additional_fees) || 0,
          tax_percentage: Number(tax_percentage) || 0,
          installments_number: Number(installments_number) || 1,
          payment_methods: paymentMethods,
        });
        setCalculatedValues(calculated);
      } catch (error) {
        console.error('Error calculating values:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues[0], watchedValues[1], watchedValues[2], watchedValues[3], watchedValues[4], paymentMethods]);

  const handleFormSubmit = async (values: NegotiationFormValues) => {
    // Validate payment methods
    const validation = validatePaymentMethods(paymentMethods);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    try {
      const formData: NegotiationFormData = {
        ...values,
        payment_methods: paymentMethods,
        discount_percentage: values.discount_percentage || 0,
        additional_fees: values.additional_fees || 0,
        tax_percentage: values.tax_percentage || 0,
        installments_number: values.installments_number || 1,
        payment_frequency: values.payment_frequency || 'monthly',
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Erro ao salvar negociação');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Main Information */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados principais da negociação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título da Negociação *</Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Ex: Proposta Comercial - Cliente XYZ"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Descrição detalhada da negociação..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="bitrix_project_id">Projeto Comercial (Bitrix24)</Label>
                <CommercialProjectBitrixSelector
                  value={form.watch('bitrix_project_id')}
                  onChange={(value) => form.setValue('bitrix_project_id', value)}
                  onPendingCreate={setPendingProjectName}
                  defaultSearchValue={pendingProjectName || ''}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
              <CardDescription>Informações do cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client_name">Nome do Cliente *</Label>
                <Input
                  id="client_name"
                  {...form.register('client_name')}
                  placeholder="Nome completo ou razão social"
                />
                {form.formState.errors.client_name && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.client_name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    {...form.register('client_email')}
                    placeholder="email@exemplo.com"
                  />
                  {form.formState.errors.client_email && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.client_email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="client_phone">Telefone</Label>
                  <Input
                    id="client_phone"
                    {...form.register('client_phone')}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="client_document">CPF/CNPJ</Label>
                <Input
                  id="client_document"
                  {...form.register('client_document')}
                  placeholder="000.000.000-00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Datas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="negotiation_date">Data da Negociação</Label>
                  <Input id="negotiation_date" type="date" {...form.register('negotiation_date')} />
                </div>

                <div>
                  <Label htmlFor="validity_date">Validade da Proposta</Label>
                  <Input id="validity_date" type="date" {...form.register('validity_date')} />
                </div>
              </div>

              <div>
                <Label htmlFor="expected_closing_date">Previsão de Fechamento</Label>
                <Input
                  id="expected_closing_date"
                  type="date"
                  {...form.register('expected_closing_date')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Terms and Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Observações e Condições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="terms_and_conditions">Termos e Condições</Label>
                <Textarea
                  id="terms_and_conditions"
                  {...form.register('terms_and_conditions')}
                  placeholder="Condições gerais do contrato..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="special_conditions">Condições Especiais</Label>
                <Textarea
                  id="special_conditions"
                  {...form.register('special_conditions')}
                  placeholder="Condições específicas desta negociação..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="internal_notes">Notas Internas</Label>
                <Textarea
                  id="internal_notes"
                  {...form.register('internal_notes')}
                  placeholder="Observações internas (não visível ao cliente)..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Financial */}
        <div className="space-y-6">
          {/* Commercial Values */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Valores Comerciais
              </CardTitle>
              <CardDescription>Defina os valores e descontos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="base_value">Valor Base *</Label>
                <Input
                  id="base_value"
                  type="number"
                  step="0.01"
                  {...form.register('base_value')}
                  placeholder="0.00"
                />
                {form.formState.errors.base_value && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.base_value.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="discount_percentage">Desconto (%)</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  step="0.01"
                  max="100"
                  {...form.register('discount_percentage')}
                  placeholder="0.00"
                />
                {calculatedValues && calculatedValues.discount_value > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Desconto: R$ {calculatedValues.discount_value.toFixed(2)}
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <Label htmlFor="additional_fees">Taxas Adicionais</Label>
                <Input
                  id="additional_fees"
                  type="number"
                  step="0.01"
                  {...form.register('additional_fees')}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="tax_percentage">Impostos (%)</Label>
                <Input
                  id="tax_percentage"
                  type="number"
                  step="0.01"
                  max="100"
                  {...form.register('tax_percentage')}
                  placeholder="0.00"
                />
                {calculatedValues && calculatedValues.tax_value > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Imposto: R$ {calculatedValues.tax_value.toFixed(2)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Formas de Pagamento</CardTitle>
              <CardDescription>Selecione as formas de pagamento e percentuais</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodsSelector
                value={paymentMethods}
                onChange={setPaymentMethods}
                totalValue={calculatedValues?.total_value || 0}
              />
            </CardContent>
          </Card>

          {/* Installments */}
          <Card>
            <CardHeader>
              <CardTitle>Parcelamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="installments_number">Número de Parcelas</Label>
                  <Input
                    id="installments_number"
                    type="number"
                    min="1"
                    {...form.register('installments_number')}
                  />
                </div>

                <div>
                  <Label htmlFor="payment_frequency">Frequência</Label>
                  <Select
                    value={form.watch('payment_frequency')}
                    onValueChange={(value) =>
                      form.setValue('payment_frequency', value as 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="first_payment_date">Data do Primeiro Pagamento</Label>
                <Input
                  id="first_payment_date"
                  type="date"
                  {...form.register('first_payment_date')}
                />
              </div>

              {calculatedValues && calculatedValues.installment_value > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">
                    Valor da Parcela: R$ {calculatedValues.installment_value.toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Panel */}
          {calculatedValues && (
            <NegotiationSummaryPanel calculation={calculatedValues} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Negociação
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
