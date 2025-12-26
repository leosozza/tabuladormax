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
  Calculator, CreditCard, Loader2, Package, Check, X,
  CalendarIcon, FileText, ChevronDown, GitCompare, Mic, MessageSquare
} from 'lucide-react';
import { AgenciamentoAssistant } from '@/components/portal-produtor/AgenciamentoAssistant';
import { DocumentationPhase } from '@/components/portal-produtor/DocumentationPhase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { Deal } from './ProducerDealsTab';
import { Json } from '@/integrations/supabase/types';
import { listProductsBySection, BitrixProduct } from '@/lib/bitrix';
import { generateContractPDF } from '@/services/contractPDFService';
import { cn } from '@/lib/utils';
import { PaymentMethodData } from '@/hooks/useAgenciamentoAssistant';

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
  { value: 'cheque', label: 'Cheque' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
];

// Cores dos headers dos pacotes
const PACKAGE_HEADER_COLORS = [
  'bg-blue-500',
  'bg-yellow-500', 
  'bg-red-500',
  'bg-emerald-500',
  'bg-purple-500',
];

// Parsear descrição do produto para extrair features
const parseProductFeatures = (description: string | undefined): string[] => {
  if (!description) return [];
  
  // Separar por linhas, vírgulas ou ponto e vírgula
  const lines = description
    .split(/[\n\r;•●]+/)
    .map(line => line.trim())
    .filter(line => line.length > 2);
  
  return lines;
};

// Extrair valor numérico ou nível de uma feature
const extractFeatureValue = (featureText: string): { baseName: string; value: string | number | null } => {
  // Padrões para detectar quantidades: "10 Fotos Digitais", "2 Pencard"
  const quantityMatch = featureText.match(/^(\d+)\s+(.+)$/);
  if (quantityMatch) {
    return { baseName: quantityMatch[2].trim(), value: parseInt(quantityMatch[1]) };
  }
  
  // Padrões para níveis: "Plataforma Prada: Básico", "Plataforma Prada - Total"
  const levelMatch = featureText.match(/^(.+?)[\s]*[:–-][\s]*(Inicial|Básico|Basico|Total|Premium|VIP|Completo)$/i);
  if (levelMatch) {
    return { baseName: levelMatch[1].trim(), value: levelMatch[2].trim() };
  }
  
  return { baseName: featureText, value: null };
};

// Normalizar nome da feature para comparação (remove números e níveis)
const normalizeFeatureName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/^\d+\s+/, '') // Remove números no início
    .replace(/[\s]*[:–-][\s]*(inicial|básico|basico|total|premium|vip|completo)$/i, '') // Remove níveis no final
    .trim();
};

// Agrupar features de todos os produtos
const groupProductFeatures = (products: BitrixProduct[]): Map<string, { displayName: string; values: Map<string, string | number | boolean> }> => {
  const featureMap = new Map<string, { displayName: string; values: Map<string, string | number | boolean> }>();
  
  products.forEach(product => {
    const features = parseProductFeatures(product.DESCRIPTION);
    features.forEach(feature => {
      const { baseName, value } = extractFeatureValue(feature);
      const normalizedName = normalizeFeatureName(baseName);
      
      if (!featureMap.has(normalizedName)) {
        featureMap.set(normalizedName, { 
          displayName: baseName.charAt(0).toUpperCase() + baseName.slice(1), 
          values: new Map() 
        });
      }
      
      const entry = featureMap.get(normalizedName)!;
      entry.values.set(product.ID, value !== null ? value : true);
    });
  });
  
  return featureMap;
};

export const ProducerAgenciarForm = ({ deal, producerId, onSuccess }: ProducerAgenciarFormProps) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [baseValue, setBaseValue] = useState<number>(deal.opportunity || 0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | 'final'>('percent');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountFixed, setDiscountFixed] = useState<number>(0);
  const [finalValueInput, setFinalValueInput] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [status, setStatus] = useState<string>(deal.negotiation_status || 'inicial');
  const [isServicesOpen, setIsServicesOpen] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [showFullAssistant, setShowFullAssistant] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [currentNegotiationId, setCurrentNegotiationId] = useState<string | null>(null);

  // Handler para dados do assistente completo
  const handleFullAssistantComplete = (assistantData: {
    packageId: string;
    packageName: string;
    baseValue: number;
    finalValue: number;
    discountPercent: number;
    paymentMethods: PaymentMethodData[];
  }) => {
    // Set package
    setSelectedProductId(assistantData.packageId);
    setBaseValue(assistantData.baseValue);
    
    // Set value/discount
    if (assistantData.discountPercent > 0) {
      setDiscountType('final');
      setFinalValueInput(assistantData.finalValue);
      setDiscountPercent(assistantData.discountPercent);
    }
    
    // Map payment methods
    const newPayments: PaymentMethod[] = assistantData.paymentMethods.map(pm => ({
      id: crypto.randomUUID(),
      method: mapMethodType(pm.method),
      value: pm.amount,
      installments: pm.installments,
      firstDueDate: pm.dueDate,
    }));
    setPaymentMethods(newPayments);
    
    // Fechar o assistente e mostrar o formulário preenchido
    setShowFullAssistant(false);
    setIsServicesOpen(false);
    
    // Mostrar toast informando que os dados foram preenchidos
    toast.success('Dados preenchidos! Revise e clique em Gerar Contrato ou Finalizar.');
  };

  // Mapear tipos de método de pagamento do assistente de voz para o formato local
  const mapMethodType = (method: string): string => {
    const mapping: Record<string, string> = {
      'credit_card': 'cartao_credito',
      'debit_card': 'cartao_debito',
      'pix': 'pix',
      'boleto': 'boleto',
      'cash': 'dinheiro',
      'bank_transfer': 'transferencia',
      'financing': 'financiamento',
    };
    return mapping[method] || method;
  };


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

  // Calcular valores baseado no tipo de desconto
  const discountValue = useMemo(() => {
    switch (discountType) {
      case 'percent':
        return (baseValue * discountPercent) / 100;
      case 'fixed':
        return discountFixed;
      case 'final':
        return baseValue - finalValueInput;
      default:
        return 0;
    }
  }, [discountType, baseValue, discountPercent, discountFixed, finalValueInput]);
  
  const totalValue = discountType === 'final' ? finalValueInput : baseValue - discountValue;
  
  // Calcular percentual efetivo para exibição
  const effectiveDiscountPercent = baseValue > 0 ? (discountValue / baseValue) * 100 : 0;

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
    onSuccess: (data) => {
      setCurrentNegotiationId(data.negotiationId);
      
      // Se status é 'negocios_fechados', mostrar fase de documentação
      if (data.status === 'negocios_fechados') {
        toast.success('Negociação finalizada! Agora envie os documentos.');
        setShowDocumentation(true);
      } else {
        toast.success('Negociação salva!');
      }
      
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

  // Validar se boletos/cheques têm data de vencimento
  const validatePaymentMethodsDueDate = (): { valid: boolean; error?: string } => {
    const methodsRequiringDueDate = ['boleto', 'cheque'];
    
    for (const pm of paymentMethods) {
      if (methodsRequiringDueDate.includes(pm.method)) {
        if (!pm.firstDueDate) {
          const methodLabel = pm.method === 'boleto' ? 'Boleto' : 'Cheque';
          return {
            valid: false,
            error: `Informe a data de vencimento para o ${methodLabel}`
          };
        }
      }
    }
    
    return { valid: true };
  };

  // Finalizar negociação
  const handleFinalize = async () => {
    if (remainingValue > 0) {
      toast.error('O valor total das formas de pagamento não cobre o valor da negociação');
      return;
    }

    // Validar data de vencimento para boletos e cheques
    const dueDateValidation = validatePaymentMethodsDueDate();
    if (!dueDateValidation.valid) {
      toast.error(dueDateValidation.error);
      return;
    }

    saveMutation.mutate({
      base_value: baseValue,
      discount_percentage: discountPercent,
      discount_value: discountValue,
      total_value: totalValue,
      notes,
      payment_methods: paymentMethods,
      status: 'negocios_fechados',
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

  // Mostrar fase de documentação se ativa
  if (showDocumentation && currentNegotiationId) {
    return (
      <DocumentationPhase
        negotiationId={currentNegotiationId}
        clientName={deal.client_name || 'Cliente'}
        totalValue={totalValue}
        paymentMethods={paymentMethods}
        onComplete={() => {
          toast.success('Documentação concluída!');
          onSuccess();
        }}
        onBack={() => setShowDocumentation(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Botão Principal do Assistente */}
      <Button 
        onClick={() => setShowFullAssistant(true)}
        variant="outline"
        className="w-full gap-2 h-12 border-primary/30 hover:bg-primary/5"
      >
        <MessageSquare className="h-5 w-5 text-primary" />
        <span className="font-medium">Preencher com Assistente de Voz</span>
        <Mic className="h-4 w-4 text-muted-foreground" />
      </Button>

      {/* Sheet do Assistente Completo */}
      <Sheet open={showFullAssistant} onOpenChange={setShowFullAssistant}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          {products && (
            <AgenciamentoAssistant
              products={products}
              clientName={deal.client_name || undefined}
              dealTitle={deal.title}
              defaultPackage={
                selectedProductId 
                  ? products.find(p => p.ID === selectedProductId) || null
                  : products.find(p => p.PRICE === deal.opportunity) || null
              }
              defaultValue={
                selectedProductId 
                  ? products.find(p => p.ID === selectedProductId)?.PRICE 
                  : (deal.opportunity || undefined)
              }
              onComplete={handleFullAssistantComplete}
              onCancel={() => setShowFullAssistant(false)}
            />
          )}
        </SheetContent>
      </Sheet>

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

      {/* Modal de Comparação de Pacotes */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparar Pacotes
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-x-auto p-6">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              // Filtrar produtos de renovação
              const productsForComparison = products?.filter(p => 
                !p.NAME.toLowerCase().includes('renovação') &&
                !p.NAME.toLowerCase().includes('renovacao')
              ) || [];

              if (productsForComparison.length === 0) {
                return (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum pacote disponível para comparação
                  </p>
                );
              }

              // Agrupar features de todos os produtos com seus valores
              const featureMap = groupProductFeatures(productsForComparison);
              const featureEntries = Array.from(featureMap.entries());

              return (
                <div 
                  className="grid gap-0" 
                  style={{ 
                    gridTemplateColumns: `minmax(200px, 1.5fr) repeat(${productsForComparison.length}, minmax(140px, 1fr))` 
                  }}
                >
                  {/* Headers dos pacotes */}
                  <div className="p-3 font-semibold text-sm border-b bg-muted/30">
                    Recursos
                  </div>
                  {productsForComparison.map((product, idx) => (
                    <div 
                      key={`header-${product.ID}`}
                      className={cn(
                        "p-4 text-center text-white font-bold text-sm rounded-t-lg",
                        PACKAGE_HEADER_COLORS[idx % PACKAGE_HEADER_COLORS.length]
                      )}
                    >
                      {product.NAME}
                    </div>
                  ))}
                  
                  {/* Linhas de features com quantidades e níveis */}
                  {featureEntries.map(([normalizedName, featureData], fIdx) => (
                    <>
                      <div key={`feature-${fIdx}`} className="p-3 border-b bg-muted/10">
                        <p className="font-medium text-sm">{featureData.displayName}</p>
                      </div>
                      {productsForComparison.map((product) => {
                        const productValue = featureData.values.get(product.ID);
                        
                        return (
                          <div 
                            key={`feature-${fIdx}-${product.ID}`} 
                            className="flex items-center justify-center p-3 border-b text-center"
                          >
                            {productValue === undefined ? (
                              <X className="h-5 w-5 text-muted-foreground/30" />
                            ) : productValue === true ? (
                              <Check className="h-5 w-5 text-primary" />
                            ) : typeof productValue === 'number' ? (
                              <span className="font-bold text-lg text-primary">{productValue}</span>
                            ) : (
                              <Badge variant="outline" className="text-xs font-medium">
                                {productValue}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ))}
                  
                  {/* Linha de preços */}
                  <div className="p-4 font-bold text-sm bg-muted/30">
                    Preço
                  </div>
                  {productsForComparison.map((product) => (
                    <div key={`price-${product.ID}`} className="p-4 text-center bg-muted/10">
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(product.PRICE)}
                      </span>
                    </div>
                  ))}
                  
                  {/* Linha de botões */}
                  <div className="p-4" />
                  {productsForComparison.map((product) => (
                    <div key={`button-${product.ID}`} className="p-4 text-center">
                      <Button 
                        className="w-full"
                        variant={selectedProductId === product.ID ? "default" : "outline"}
                        onClick={() => {
                          handleSelectProduct(product);
                          setShowComparison(false);
                        }}
                      >
                        {selectedProductId === product.ID ? 'Selecionado' : 'Selecionar'}
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label className="text-xs">Tipo de Desconto</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percent' | 'fixed' | 'final')}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor do Desconto (R$)</SelectItem>
                  <SelectItem value="final">Valor Final (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">
              {discountType === 'percent' && 'Desconto (%)'}
              {discountType === 'fixed' && 'Valor do Desconto (R$)'}
              {discountType === 'final' && 'Valor Final com Desconto (R$)'}
            </Label>
            {discountType === 'percent' && (
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                placeholder="0"
                className="h-10"
              />
            )}
            {discountType === 'fixed' && (
              <Input
                type="number"
                min={0}
                max={baseValue}
                value={discountFixed}
                onChange={(e) => setDiscountFixed(Number(e.target.value))}
                placeholder="0,00"
                className="h-10"
              />
            )}
            {discountType === 'final' && (
              <Input
                type="number"
                min={0}
                max={baseValue}
                value={finalValueInput}
                onChange={(e) => setFinalValueInput(Number(e.target.value))}
                placeholder="0,00"
                className="h-10"
              />
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Valor Final</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
            {effectiveDiscountPercent > 0 && (
              <Badge variant="secondary" className="text-xs">
                -{effectiveDiscountPercent.toFixed(1)}%
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

                {/* Campos adicionais para Boleto e Cheque */}
                {(pm.method === 'boleto' || pm.method === 'cheque') && (
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
          disabled={saveMutation.isPending || status === 'negocios_fechados'}
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
