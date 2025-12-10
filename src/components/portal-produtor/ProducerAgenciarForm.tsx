import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Save, CheckCircle, 
  Calculator, CreditCard, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Deal } from './ProducerDealsTab';
import { Json } from '@/integrations/supabase/types';

interface ProducerAgenciarFormProps {
  deal: Deal;
  producerId: string;
  onSuccess: () => void;
}

interface PaymentMethod {
  id: string;
  method: string;
  value: number;
  installments?: number;
}

export const ProducerAgenciarForm = ({ deal, producerId, onSuccess }: ProducerAgenciarFormProps) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [baseValue, setBaseValue] = useState<number>(deal.opportunity || 0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [status, setStatus] = useState<string>(deal.negotiation_status || 'inicial');

  // Buscar negociação existente
  const { data: existingNegotiation, isLoading: loadingNegotiation } = useQuery({
    queryKey: ['negotiation', deal.deal_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('negotiations')
        .select('*')
        .eq('deal_id', deal.deal_id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        // Preencher form com dados existentes
        setBaseValue(data.base_value || deal.opportunity || 0);
        setDiscountPercent(data.discount_percentage || 0);
        setNotes(data.notes || '');
        setStatus(data.status || 'inicial');
        if (data.payment_methods && Array.isArray(data.payment_methods)) {
          setPaymentMethods(data.payment_methods as unknown as PaymentMethod[]);
        }
      }
      
      return data;
    }
  });

  // Calcular valores
  const discountValue = (baseValue * discountPercent) / 100;
  const totalValue = baseValue - discountValue;

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (formData: { 
      base_value: number;
      discount_percentage: number;
      discount_value: number;
      total_value: number;
      notes: string;
      payment_methods: PaymentMethod[];
      status: string;
    }) => {
      const negotiationData = {
        deal_id: deal.deal_id,
        bitrix_deal_id: deal.bitrix_deal_id,
        client_name: deal.client_name || 'Cliente',
        client_phone: deal.client_phone,
        title: deal.title,
        base_value: formData.base_value,
        discount_percentage: formData.discount_percentage,
        discount_value: formData.discount_value,
        total_value: formData.total_value,
        notes: formData.notes,
        payment_methods: formData.payment_methods as unknown as Json,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      let negotiationId: string;

      if (existingNegotiation) {
        const { error } = await supabase
          .from('negotiations')
          .update(negotiationData)
          .eq('id', existingNegotiation.id);
        
        if (error) throw error;
        negotiationId = existingNegotiation.id;
      } else {
        const { data, error } = await supabase
          .from('negotiations')
          .insert({
            ...negotiationData,
            created_by: producerId
          })
          .select('id')
          .single();
        
        if (error) throw error;
        negotiationId = data.id;
      }

      // Sincronizar com Bitrix
      if (deal.bitrix_deal_id) {
        console.log('Sincronizando com Bitrix:', {
          negotiation_id: negotiationId,
          deal_id: deal.deal_id,
          status: formData.status,
          bitrix_deal_id: deal.bitrix_deal_id
        });

        const { error: syncError } = await supabase.functions.invoke('sync-deal-to-bitrix', {
          body: {
            negotiation_id: negotiationId,
            deal_id: deal.deal_id,
            status: formData.status,
          },
        });

        if (syncError) {
          console.error('Erro ao sincronizar com Bitrix:', syncError);
          // Não bloqueia o salvamento, apenas loga o erro
        } else {
          console.log('Sincronização com Bitrix concluída');
        }
      }

      return { negotiationId, status: formData.status };
    },
    onSuccess: (data) => {
      toast.success('Negociação salva e sincronizada com Bitrix!');
      queryClient.invalidateQueries({ queryKey: ['negotiation', deal.deal_id] });
      queryClient.invalidateQueries({ queryKey: ['producer-deals'] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar negociação');
    }
  });

  // Adicionar forma de pagamento
  const addPaymentMethod = () => {
    setPaymentMethods([
      ...paymentMethods,
      { id: crypto.randomUUID(), method: 'pix', value: 0 }
    ]);
  };

  // Remover forma de pagamento
  const removePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
  };

  // Atualizar forma de pagamento
  const updatePaymentMethod = (id: string, field: string, value: string | number) => {
    setPaymentMethods(paymentMethods.map(pm => 
      pm.id === id ? { ...pm, [field]: value } as PaymentMethod : pm
    ));
  };

  // Calcular total das formas de pagamento
  const paymentTotal = paymentMethods.reduce((sum, pm) => sum + (pm.value || 0), 0);
  const remainingValue = totalValue - paymentTotal;

  // Salvar
  const handleSave = () => {
    saveMutation.mutate({
      base_value: baseValue,
      discount_percentage: discountPercent,
      discount_value: discountValue,
      total_value: totalValue,
      notes,
      payment_methods: paymentMethods,
      status
    });
  };

  // Finalizar negociação
  const handleFinalize = async () => {
    if (remainingValue > 0) {
      toast.error('O valor total das formas de pagamento não cobre o valor da negociação');
      return;
    }

    saveMutation.mutate({
      base_value: baseValue,
      discount_percentage: discountPercent,
      discount_value: discountValue,
      total_value: totalValue,
      notes,
      payment_methods: paymentMethods,
      status: 'realizado'
    });
  };

  if (loadingNegotiation) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Valores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor Base (R$)</Label>
              <Input
                type="number"
                value={baseValue}
                onChange={(e) => setBaseValue(Number(e.target.value))}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Valor Final</p>
              <p className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(totalValue)}
              </p>
            </div>
            {discountPercent > 0 && (
              <Badge variant="secondary">
                -{discountPercent}% (R$ {discountValue.toFixed(2)})
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formas de Pagamento */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Formas de Pagamento
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addPaymentMethod} className="gap-1">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma forma de pagamento adicionada
            </p>
          ) : (
            paymentMethods.map((pm) => (
              <div key={pm.id} className="flex items-end gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-xs">Método</Label>
                  <Select 
                    value={pm.method} 
                    onValueChange={(v) => updatePaymentMethod(pm.id, 'method', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    value={pm.value}
                    onChange={(e) => updatePaymentMethod(pm.id, 'value', Number(e.target.value))}
                    placeholder="0,00"
                  />
                </div>
                {pm.method === 'cartao_credito' && (
                  <div className="w-20">
                    <Label className="text-xs">Parcelas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={pm.installments || 1}
                      onChange={(e) => updatePaymentMethod(pm.id, 'installments', Number(e.target.value))}
                    />
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removePaymentMethod(pm.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}

          {paymentMethods.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm">Total em Pagamentos:</span>
              <span className="font-medium">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(paymentTotal)}
              </span>
            </div>
          )}

          {remainingValue > 0 && paymentMethods.length > 0 && (
            <div className="flex items-center justify-between text-destructive">
              <span className="text-sm">Valor Restante:</span>
              <span className="font-medium">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(remainingValue)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione observações sobre a negociação..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 gap-2"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Rascunho
        </Button>
        <Button 
          className="flex-1 gap-2"
          onClick={handleFinalize}
          disabled={saveMutation.isPending || status === 'realizado'}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Finalizar Negociação
        </Button>
      </div>
    </div>
  );
};
