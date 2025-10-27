// Negotiation Summary Panel Component
// Visual summary of calculated values

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingDown, Plus, Calculator } from 'lucide-react';
import type { NegotiationCalculation } from '@/types/agenciamento';
import { PAYMENT_METHOD_LABELS } from '@/types/agenciamento';

interface NegotiationSummaryPanelProps {
  calculation: NegotiationCalculation;
}

export function NegotiationSummaryPanel({ calculation }: NegotiationSummaryPanelProps) {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Resumo da Negociação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base Value */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Valor Base</span>
          </div>
          <span className="font-medium">
            R$ {calculation.base_value.toFixed(2)}
          </span>
        </div>

        {/* Discount */}
        {calculation.discount_value > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">
                Desconto ({calculation.discount_percentage}%)
              </span>
            </div>
            <span className="font-medium">
              - R$ {calculation.discount_value.toFixed(2)}
            </span>
          </div>
        )}

        <Separator />

        {/* Final Value (after discount) */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Valor após Desconto</span>
          <span className="font-semibold">
            R$ {calculation.final_value.toFixed(2)}
          </span>
        </div>

        {/* Additional Fees */}
        {calculation.additional_fees > 0 && (
          <div className="flex justify-between items-center text-orange-600">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="text-sm">Taxas Adicionais</span>
            </div>
            <span className="font-medium">
              + R$ {calculation.additional_fees.toFixed(2)}
            </span>
          </div>
        )}

        {/* Taxes */}
        {calculation.tax_value > 0 && (
          <div className="flex justify-between items-center text-orange-600">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="text-sm">
                Impostos ({calculation.tax_percentage}%)
              </span>
            </div>
            <span className="font-medium">
              + R$ {calculation.tax_value.toFixed(2)}
            </span>
          </div>
        )}

        <Separator className="my-4" />

        {/* Total Value */}
        <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
          <span className="font-bold text-lg">Valor Total</span>
          <span className="font-bold text-xl text-primary">
            R$ {calculation.total_value.toFixed(2)}
          </span>
        </div>

        {/* Installment Value */}
        {calculation.installment_value > 0 && calculation.installment_value !== calculation.total_value && (
          <div className="flex justify-between items-center p-2 bg-muted rounded-md">
            <span className="text-sm">Valor da Parcela</span>
            <span className="font-semibold">
              R$ {calculation.installment_value.toFixed(2)}
            </span>
          </div>
        )}

        {/* Payment Methods Breakdown */}
        {calculation.payment_methods_breakdown.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Distribuição de Pagamento:
              </p>
              {calculation.payment_methods_breakdown.map((pm, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[pm.method]} ({pm.percentage.toFixed(1)}%)
                  </span>
                  <span className="font-medium">
                    R$ {pm.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
