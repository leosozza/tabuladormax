import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, Trash2, Save, CheckCircle, 
  Calculator, CreditCard, Loader2, Package, Check, 
  CalendarIcon, FileText, ChevronDown, GitCompare
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Deal } from './ProducerDealsTab';
import { Json } from '@/integrations/supabase/types';
import { listProductsBySection, BitrixProduct } from '@/lib/bitrix';
import { generateContractPDF } from '@/services/contractPDFService';
import { cn } from '@/lib/utils';

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
  firstDueDate?: string;
  dueDates?: string[];
}

// ID da seção "SERVIÇOS E PROJETOS" no Bitrix
const SERVICES_SECTION_ID = 296;

const PAYMENT_METHOD_OPTIONS = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
];

export const ProducerAgenciarForm = ({ deal, producerId, onSuccess }: ProducerAgenciarFormProps) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [baseValue, setBaseValue] = useState<number>(deal.opportunity || 0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [status, setStatus] = useState<string>(deal.negotiation_status || 'inicial');
  const [isServicesOpen, setIsServicesOpen] = useState(true);
  const [showComparison, setShowComparison] = useState(false);

  // Buscar produtos da seção SERVIÇOS E PROJETOS
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['bitrix-products-section', SERVICES_SECTION_ID],
    queryFn: async () => {
      const products = await listProductsBySection(SERVICES_SECTION_ID, 100);
      return products.filter(p => p.ACTIVE !== 'N');
    },
    staleTime: 5 * 60 * 1000,
  });

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
        setSelectedProductId(data.bitrix_product_id?.toString() || null);
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

  // Produto selecionado
  const selectedProduct = products?.find(p => p.ID === selectedProductId);

  // Selecionar produto
  const handleSelectProduct = (product: BitrixProduct) => {
    setSelectedProductId(product.ID);
    setBaseValue(product.PRICE);
  };

  // Calcular valores
  const discountValue = (baseValue * discountPercent) / 100;
  const totalValue = baseValue - discountValue;

  // Calcular total das formas de pagamento
  const paymentTotal = paymentMethods.reduce((sum, pm) => sum + (pm.value || 0), 0);
  const remainingValue = totalValue - paymentTotal;

  // Calcular datas de boleto automaticamente
  const calculateBoletooDates = (firstDate: Date, installments: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < installments; i++) {
      const date = addMonths(firstDate, i);
      dates.push(date.toISOString());
    }
    return dates;
  };

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
      bitrix_product_id: number | null;
    }) => {
      const negotiationData = {
        deal_id: deal.deal_id,
        bitrix_deal_id: deal.bitrix_deal_id,
        bitrix_product_id: formData.bitrix_product_id,
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
        const { error: syncError } = await supabase.functions.invoke('sync-deal-to-bitrix', {
          body: {
            negotiation_id: negotiationId,
            deal_id: deal.deal_id,
            status: formData.status,
          },
        });

        if (syncError) {
          console.error('Erro ao sincronizar com Bitrix:', syncError);
        }
      }

      return { negotiationId, status: formData.status };
    },
    onSuccess: () => {
      toast.success('Negociação salva!');
      queryClient.invalidateQueries({ queryKey: ['negotiation', deal.deal_id] });
      queryClient.invalidateQueries({ queryKey: ['producer-deals'] });
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
  const updatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
    setPaymentMethods(paymentMethods.map(pm => {
      if (pm.id !== id) return pm;
      
      const updated = { ...pm, ...updates };
      
      // Se mudou método para boleto, inicializar campos
      if (updates.method === 'boleto' && !pm.firstDueDate) {
        updated.installments = 1;
        updated.firstDueDate = new Date().toISOString();
        updated.dueDates = [new Date().toISOString()];
      }
      
      // Se atualizou data ou parcelas do boleto, recalcular datas
      if (updated.method === 'boleto' && updated.firstDueDate && updated.installments) {
        updated.dueDates = calculateBoletooDates(
          new Date(updated.firstDueDate), 
          updated.installments
        );
      }
      
      return updated;
    }));
  };

  // Salvar
  const handleSave = () => {
    saveMutation.mutate({
      base_value: baseValue,
      discount_percentage: discountPercent,
      discount_value: discountValue,
      total_value: totalValue,
      notes,
      payment_methods: paymentMethods,
      status,
      bitrix_product_id: selectedProductId ? parseInt(selectedProductId) : null
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
      status: 'realizado',
      bitrix_product_id: selectedProductId ? parseInt(selectedProductId) : null
    });
  };

  // Gerar contrato PDF
  const handleGenerateContract = () => {
    if (paymentMethods.length === 0) {
      toast.error('Adicione pelo menos uma forma de pagamento');
      return;
    }

    try {
      const fileName = generateContractPDF({
        clientName: deal.client_name || 'Cliente',
        clientPhone: deal.client_phone || undefined,
        productName: selectedProduct?.NAME,
        baseValue,
        discountPercentage: discountPercent,
        discountValue,
        totalValue,
        paymentMethods: paymentMethods.map(pm => ({
          method: pm.method,
          value: pm.value,
          installments: pm.installments,
          firstDueDate: pm.firstDueDate,
          dueDates: pm.dueDates
        })),
        notes: notes || undefined
      });
      toast.success(`Contrato gerado: ${fileName}`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar contrato');
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
      {/* Seleção de Serviço - Colapsável */}
      <Collapsible open={isServicesOpen} onOpenChange={setIsServicesOpen}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Selecione o Serviço
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowComparison(true)}
                  className="h-8 gap-1"
                >
                  <GitCompare className="h-3 w-3" />
                  <span className="hidden sm:inline">Comparar</span>
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isServicesOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            {selectedProduct && !isServicesOpen && (
              <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">✓ {selectedProduct.NAME} - {formatCurrency(selectedProduct.PRICE)}</p>
              </div>
            )}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : products && products.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {products.map((product) => (
                    <AccordionItem key={product.ID} value={product.ID} className="border-b-0">
                      <div 
                        className={cn(
                          "flex items-center rounded-lg border mb-2 transition-all",
                          selectedProductId === product.ID 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div 
                          className="flex-1 flex items-center justify-between p-3 cursor-pointer"
                          onClick={() => handleSelectProduct(product)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate pr-2">{product.NAME}</p>
                            <p className="text-lg font-bold text-primary">
                              {formatCurrency(product.PRICE)}
                            </p>
                          </div>
                          {selectedProductId === product.ID && (
                            <Check className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                        {product.DESCRIPTION && (
                          <AccordionTrigger className="px-3 py-0 hover:no-underline [&[data-state=open]>svg]:rotate-180" />
                        )}
                      </div>
                      {product.DESCRIPTION && (
                        <AccordionContent className="px-3 pb-3 pt-0">
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            {product.DESCRIPTION}
                          </p>
                        </AccordionContent>
                      )}
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum serviço disponível
                </p>
              )}

              {selectedProduct && (
                <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">✓ {selectedProduct.NAME}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Modal de Comparação de Serviços */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparar Serviços
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : products && products.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Serviço</th>
                    <th className="text-left p-3 font-medium">Preço</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Descrição</th>
                    <th className="p-3 font-medium text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr 
                      key={product.ID} 
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors",
                        selectedProductId === product.ID && "bg-primary/10"
                      )}
                    >
                      <td className="p-3 font-medium">{product.NAME}</td>
                      <td className="p-3 text-primary font-bold whitespace-nowrap">
                        {formatCurrency(product.PRICE)}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {product.DESCRIPTION || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Button 
                          size="sm" 
                          variant={selectedProductId === product.ID ? "default" : "outline"}
                          onClick={() => {
                            handleSelectProduct(product);
                            setShowComparison(false);
                          }}
                        >
                          {selectedProductId === product.ID ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum serviço disponível
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Valores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor Base (R$)</Label>
              <Input
                type="number"
                value={baseValue}
                onChange={(e) => setBaseValue(Number(e.target.value))}
                placeholder="0,00"
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs">Desconto (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                placeholder="0"
                className="h-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Valor Final</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
            {discountPercent > 0 && (
              <Badge variant="secondary" className="text-xs">
                -{discountPercent}%
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formas de Pagamento */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Formas de Pagamento
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addPaymentMethod} className="h-8 gap-1">
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma forma de pagamento
            </p>
          ) : (
            paymentMethods.map((pm) => (
              <div key={pm.id} className="p-3 border rounded-lg space-y-3">
                {/* Linha principal - Responsivo */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Método</Label>
                    <Select 
                      value={pm.method} 
                      onValueChange={(v) => updatePaymentMethod(pm.id, { method: v })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-32">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      value={pm.value}
                      onChange={(e) => updatePaymentMethod(pm.id, { value: Number(e.target.value) })}
                      placeholder="0,00"
                      className="h-10"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removePaymentMethod(pm.id)}
                      className="h-10 w-10 text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Campos adicionais para Cartão de Crédito */}
                {pm.method === 'cartao_credito' && (
                  <div className="pt-2 border-t">
                    <div className="w-full sm:w-32">
                      <Label className="text-xs">Parcelas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={pm.installments || 1}
                        onChange={(e) => updatePaymentMethod(pm.id, { installments: Number(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                    {pm.installments && pm.installments > 1 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {pm.installments}x de {formatCurrency(pm.value / pm.installments)}
                      </p>
                    )}
                  </div>
                )}

                {/* Campos adicionais para Boleto */}
                {pm.method === 'boleto' && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">1º Vencimento</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-10 justify-start text-left font-normal",
                                !pm.firstDueDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {pm.firstDueDate 
                                ? format(new Date(pm.firstDueDate), 'dd/MM/yyyy')
                                : 'Selecionar'
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={pm.firstDueDate ? new Date(pm.firstDueDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  updatePaymentMethod(pm.id, { firstDueDate: date.toISOString() });
                                }
                              }}
                              locale={ptBR}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Parcelas</Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={pm.installments || 1}
                          onChange={(e) => updatePaymentMethod(pm.id, { installments: Number(e.target.value) })}
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    {/* Preview das datas calculadas */}
                    {pm.dueDates && pm.dueDates.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs font-medium mb-1">Vencimentos:</p>
                        <div className="flex flex-wrap gap-1">
                          {pm.dueDates.map((date, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {format(new Date(date), 'dd/MM/yy')}
                            </Badge>
                          ))}
                        </div>
                        {pm.installments && pm.installments > 1 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {pm.installments}x de {formatCurrency(pm.value / pm.installments)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {paymentMethods.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Total:</span>
                <span className="font-medium">{formatCurrency(paymentTotal)}</span>
              </div>
              {remainingValue > 0 && (
                <div className="flex items-center justify-between text-destructive">
                  <span className="text-sm">Restante:</span>
                  <span className="font-medium">{formatCurrency(remainingValue)}</span>
                </div>
              )}
              {remainingValue <= 0 && remainingValue !== 0 && (
                <div className="flex items-center justify-between text-amber-600">
                  <span className="text-sm">Excedente:</span>
                  <span className="font-medium">{formatCurrency(Math.abs(remainingValue))}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione observações..."
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Ações - Layout Mobile Otimizado */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline" 
          className="flex-1 h-12 sm:h-10 gap-2"
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
          variant="outline"
          className="flex-1 h-12 sm:h-10 gap-2"
          onClick={handleGenerateContract}
          disabled={paymentMethods.length === 0}
        >
          <FileText className="h-4 w-4" />
          Gerar Contrato
        </Button>
        <Button 
          className="flex-1 h-12 sm:h-10 gap-2"
          onClick={handleFinalize}
          disabled={saveMutation.isPending || status === 'realizado'}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Finalizar
        </Button>
      </div>
    </div>
  );
};
