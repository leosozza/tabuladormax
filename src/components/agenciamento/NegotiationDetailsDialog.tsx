// Negotiation Details Dialog Component
// Full view of negotiation with history

import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  Clock,
  Building2,
  History,
} from 'lucide-react';
import type { Negotiation } from '@/types/agenciamento';
import {
  NEGOTIATION_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from '@/types/agenciamento';
import { getNegotiationHistory } from '@/services/agenciamentoService';

interface NegotiationDetailsDialogProps {
  negotiation: Negotiation;
  open: boolean;
  onClose: () => void;
}

export function NegotiationDetailsDialog({
  negotiation,
  open,
  onClose,
}: NegotiationDetailsDialogProps) {
  const statusConfig = NEGOTIATION_STATUS_CONFIG[negotiation.status];

  // Fetch history
  const { data: history = [] } = useQuery({
    queryKey: ['negotiation-history', negotiation.id],
    queryFn: () => getNegotiationHistory(negotiation.id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{negotiation.title}</DialogTitle>
          <DialogDescription>
            <Badge
              variant="outline"
              className="w-fit mt-2"
              style={{
                borderColor: statusConfig.color,
                color: statusConfig.color,
              }}
            >
              {statusConfig.label}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{negotiation.client_name}</span>
                </div>
                {negotiation.client_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{negotiation.client_email}</span>
                  </div>
                )}
                {negotiation.client_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{negotiation.client_phone}</span>
                  </div>
                )}
                {negotiation.client_document && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{negotiation.client_document}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Base</p>
                    <p className="font-medium">R$ {negotiation.base_value.toFixed(2)}</p>
                  </div>
                  {negotiation.discount_value > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Desconto ({negotiation.discount_percentage}%)
                      </p>
                      <p className="font-medium text-green-600">
                        - R$ {negotiation.discount_value.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {negotiation.additional_fees > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Taxas Adicionais</p>
                      <p className="font-medium text-orange-600">
                        + R$ {negotiation.additional_fees.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {negotiation.tax_value > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Impostos ({negotiation.tax_percentage}%)
                      </p>
                      <p className="font-medium text-orange-600">
                        + R$ {negotiation.tax_value.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {negotiation.total_value.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Condições de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {negotiation.payment_methods && negotiation.payment_methods.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Formas de Pagamento:</p>
                    <div className="space-y-2">
                      {negotiation.payment_methods.map((pm, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm">{PAYMENT_METHOD_LABELS[pm.method]}</span>
                          <span className="font-medium">
                            {pm.percentage.toFixed(1)}% (R${' '}
                            {((negotiation.total_value * pm.percentage) / 100).toFixed(2)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {negotiation.installments_number > 1 && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Número de Parcelas</p>
                        <p className="font-medium">{negotiation.installments_number}x</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                        <p className="font-medium">
                          R$ {negotiation.installment_value.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Frequência</p>
                        <p className="font-medium">
                          {PAYMENT_FREQUENCY_LABELS[negotiation.payment_frequency]}
                        </p>
                      </div>
                      {negotiation.first_payment_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Primeiro Pagamento</p>
                          <p className="font-medium">
                            {new Date(negotiation.first_payment_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Datas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Negociação</p>
                    <p className="font-medium">
                      {new Date(negotiation.negotiation_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {negotiation.validity_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Validade</p>
                      <p className="font-medium">
                        {new Date(negotiation.validity_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {negotiation.expected_closing_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Previsão de Fechamento</p>
                      <p className="font-medium">
                        {new Date(negotiation.expected_closing_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {negotiation.actual_closing_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Conclusão</p>
                      <p className="font-medium">
                        {new Date(negotiation.actual_closing_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description and Notes */}
            {(negotiation.description ||
              negotiation.terms_and_conditions ||
              negotiation.special_conditions) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Descrição e Condições
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {negotiation.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                      <p className="text-sm whitespace-pre-wrap">{negotiation.description}</p>
                    </div>
                  )}
                  {negotiation.terms_and_conditions && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Termos e Condições</p>
                      <p className="text-sm whitespace-pre-wrap">
                        {negotiation.terms_and_conditions}
                      </p>
                    </div>
                  )}
                  {negotiation.special_conditions && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Condições Especiais</p>
                      <p className="text-sm whitespace-pre-wrap">
                        {negotiation.special_conditions}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* History */}
            {history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{item.action}</p>
                          {item.notes && (
                            <p className="text-muted-foreground">{item.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.performed_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
