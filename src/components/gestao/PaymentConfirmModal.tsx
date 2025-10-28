/**
 * PaymentConfirmModal Component
 * Modal dialog for confirming batch payment operations
 * Shows summary of payments to be processed grouped by scouter
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import type { PaymentItem } from "@/services/paymentsCoordinator";

interface PaymentSummaryByScouter {
  scouter: string;
  totalLeads: number;
  totalFichas: number;
  valorFichas: number;
  ajudaCusto: number;
  descontoFaltas: number;
  valorLiquido: number;
}

interface PaymentConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: PaymentItem[];
  onConfirm: () => Promise<void>;
  isProcessing?: boolean;
}

/**
 * Group payments by scouter for summary display
 */
function groupPaymentsByScouter(payments: PaymentItem[]): PaymentSummaryByScouter[] {
  const grouped = new Map<string, PaymentSummaryByScouter>();

  payments.forEach((payment) => {
    const existing = grouped.get(payment.scouter);
    
    if (existing) {
      existing.totalLeads += 1;
      existing.totalFichas += payment.num_fichas;
      existing.valorFichas += payment.valor_fichas_total;
      existing.ajudaCusto += payment.ajuda_custo_total;
      existing.descontoFaltas += payment.desconto_faltas_total;
      existing.valorLiquido += payment.valor_liquido;
    } else {
      grouped.set(payment.scouter, {
        scouter: payment.scouter,
        totalLeads: 1,
        totalFichas: payment.num_fichas,
        valorFichas: payment.valor_fichas_total,
        ajudaCusto: payment.ajuda_custo_total,
        descontoFaltas: payment.desconto_faltas_total,
        valorLiquido: payment.valor_liquido,
      });
    }
  });

  return Array.from(grouped.values()).sort((a, b) => 
    a.scouter.localeCompare(b.scouter)
  );
}

export default function PaymentConfirmModal({
  open,
  onOpenChange,
  payments,
  onConfirm,
  isProcessing = false,
}: PaymentConfirmModalProps) {
  const [localProcessing, setLocalProcessing] = useState(false);
  
  const processing = isProcessing || localProcessing;
  const summary = groupPaymentsByScouter(payments);
  
  // Calculate totals
  const totals = summary.reduce(
    (acc, item) => ({
      leads: acc.leads + item.totalLeads,
      fichas: acc.fichas + item.totalFichas,
      valorFichas: acc.valorFichas + item.valorFichas,
      ajudaCusto: acc.ajudaCusto + item.ajudaCusto,
      descontoFaltas: acc.descontoFaltas + item.descontoFaltas,
      valorLiquido: acc.valorLiquido + item.valorLiquido,
    }),
    { leads: 0, fichas: 0, valorFichas: 0, ajudaCusto: 0, descontoFaltas: 0, valorLiquido: 0 }
  );

  const handleConfirm = async () => {
    setLocalProcessing(true);
    try {
      await onConfirm();
    } finally {
      setLocalProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Confirmar Pagamento em Lote
          </DialogTitle>
          <DialogDescription>
            Revise os detalhes dos pagamentos antes de confirmar.
            Esta ação marcará todas as fichas como pagas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary by Scouter */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Resumo por Scouter
            </h3>
            <div className="border rounded-lg divide-y">
              {summary.map((item) => (
                <div
                  key={item.scouter}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.scouter}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.totalLeads} lead{item.totalLeads !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fichas:</span>{" "}
                      <span className="font-medium">{item.totalFichas}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">Valor:</span>{" "}
                      <span className="font-medium">
                        {formatCurrency(item.valorFichas)}
                      </span>
                    </div>
                    
                    {item.ajudaCusto > 0 && (
                      <>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Ajuda de Custo:</span>{" "}
                          <span className="font-medium text-green-600">
                            +{formatCurrency(item.ajudaCusto)}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {item.descontoFaltas > 0 && (
                      <>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Desconto Faltas:</span>{" "}
                          <span className="font-medium text-red-600">
                            -{formatCurrency(item.descontoFaltas)}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="col-span-2 pt-1 border-t mt-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Valor Líquido:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(item.valorLiquido)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Grand Totals */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              Total Geral
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Total de Leads:</span>
                <div className="text-xl font-bold">{totals.leads}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total de Fichas:</span>
                <div className="text-xl font-bold">{totals.fichas}</div>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor Fichas:</span>
                <span className="font-semibold">
                  {formatCurrency(totals.valorFichas)}
                </span>
              </div>
              
              {totals.ajudaCusto > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Ajuda de Custo:</span>
                  <span className="font-semibold">
                    +{formatCurrency(totals.ajudaCusto)}
                  </span>
                </div>
              )}
              
              {totals.descontoFaltas > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Desconto Faltas:</span>
                  <span className="font-semibold">
                    -{formatCurrency(totals.descontoFaltas)}
                  </span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold">Valor Líquido Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals.valorLiquido)}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          {payments.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Atenção:</p>
                <p>Esta ação não pode ser desfeita. As fichas serão marcadas como confirmadas/pagas.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing || payments.length === 0}
            className="min-w-[120px]"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
