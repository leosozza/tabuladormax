import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseUtils";
import type { Database } from "@/integrations/supabase/types";
import GestaoSidebar from "@/components/gestao/Sidebar";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { createDateFilter } from "@/lib/dateUtils";
import type { GestaoFilters as FilterType } from "@/types/filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, CheckCircle, Clock, AlertCircle, Wallet } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import PaymentConfirmModal from "@/components/gestao/PaymentConfirmModal";
import { formatCurrency, stripTagFromName, parseBrazilianCurrency } from "@/utils/formatters";
import {
  executeBatchPayment,
  calculateAjudaCustoForScouter,
  calculateFaltasForScouter,
  type PaymentItem,
  type ProjectPaymentSettings,
  type LeadForPayment,
} from "@/services/paymentsCoordinator";

export default function GestaoPagamentos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [filters, setFilters] = useState<FilterType>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null,
  });
  
  type LeadRow = Database['public']['Tables']['leads']['Row'];
  
  const { data: payments, isLoading } = useQuery({
    queryKey: ["gestao-payments", searchTerm, filters, showPaidOnly],
    queryFn: async () => {
      // Usar fetchAllRecords para buscar TODOS os pagamentos sem limite de 1000
      const data = await fetchAllRecords<LeadRow>(
        supabase,
        "leads",
        "*",
        (query) => {
          query = query.not("valor_ficha", "is", null);
          
          // Filtro de busca por nome ou scouter
          if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,scouter.ilike.%${searchTerm}%`);
          }
          
          // Aplicar filtros de data
          query = query
            .gte("criado", filters.dateFilter.startDate.toISOString())
            .lte("criado", filters.dateFilter.endDate.toISOString());
          
          // Aplicar filtro de projeto
          if (filters.projectId) {
            query = query.eq("commercial_project_id", filters.projectId);
          }
          
          // Aplicar filtro de scouter
          if (filters.scouterId) {
            query = query.eq("scouter", filters.scouterId);
          }
          
          // Filtro de ficha paga
          if (showPaidOnly) {
            query = query.eq("ficha_confirmada", true);
          }
          
          return query;
        }
      );
      
      // Ordenar por data de confirmação
      return data.sort((a, b) => {
        const dateA = a.data_confirmacao_ficha ? new Date(a.data_confirmacao_ficha as string).getTime() : 0;
        const dateB = b.data_confirmacao_ficha ? new Date(b.data_confirmacao_ficha as string).getTime() : 0;
        return dateB - dateA;
      });
    },
  });

  // Get project settings for payment calculations (tabela projects não existe ainda)
  const projectSettings: ProjectPaymentSettings | null = null;

  const totalValue = payments?.reduce((sum, p) => sum + parseBrazilianCurrency(p.valor_ficha), 0) || 0;
  const paidCount = payments?.filter(p => p.ficha_confirmada).length || 0;
  const pendingCount = (payments?.length || 0) - paidCount;

  // Filter pending payments only for selection
  const pendingPayments = payments?.filter(p => !p.ficha_confirmada) || [];
  const selectedPayments = pendingPayments.filter(p => selectedLeadIds.has(p.id));

  // Toggle individual selection
  const toggleSelection = (leadId: number) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Toggle select all pending
  const toggleSelectAll = () => {
    if (selectedLeadIds.size === pendingPayments.length && pendingPayments.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(pendingPayments.map(p => p.id)));
    }
  };

  const isAllSelected = pendingPayments.length > 0 && selectedLeadIds.size === pendingPayments.length;
  const isSomeSelected = selectedLeadIds.size > 0 && !isAllSelected;

  // Prepare payment items for batch processing
  const preparePaymentItems = (): PaymentItem[] => {
    return selectedPayments.map(lead => {
      const scouter = stripTagFromName(lead.scouter) || "Não informado";
      const valorFicha = parseBrazilianCurrency(lead.valor_ficha);
      const numFichas = Number(lead.num_fichas) || 1;
      const valorFichasTotal = valorFicha * numFichas;

      // Calculate ajuda de custo
      const ajudaCusto = calculateAjudaCustoForScouter(
        lead as LeadForPayment,
        projectSettings
      );

      // Calculate faltas
      const faltas = calculateFaltasForScouter(
        lead as LeadForPayment,
        projectSettings
      );

      // Calculate totals
      const valorBruto = valorFichasTotal + ajudaCusto.ajuda_custo_total;
      const valorDescontos = faltas.desconto_faltas_total;
      const valorLiquido = valorBruto - valorDescontos;

      return {
        lead_id: lead.id,
        scouter: scouter,
        commercial_project_id: lead.commercial_project_id,
        num_fichas: numFichas,
        valor_ficha: valorFicha,
        valor_fichas_total: valorFichasTotal,
        dias_trabalhados: ajudaCusto.dias_trabalhados,
        ajuda_custo_por_dia: ajudaCusto.ajuda_custo_por_dia,
        ajuda_custo_total: ajudaCusto.ajuda_custo_total,
        num_faltas: faltas.num_faltas,
        desconto_falta_unitario: faltas.desconto_falta_unitario,
        desconto_faltas_total: faltas.desconto_faltas_total,
        valor_bruto: valorBruto,
        valor_descontos: valorDescontos,
        valor_liquido: valorLiquido,
        status: "paid",
      };
    });
  };

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    const paymentItems = preparePaymentItems();
    
    if (paymentItems.length === 0) {
      toast.error("Nenhum pagamento selecionado");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const result = await executeBatchPayment(paymentItems);

      if (result.success) {
        toast.success(
          `Pagamento realizado com sucesso! ${result.success_count} fichas processadas.`,
          {
            description: `Método: ${result.method === 'rpc' ? 'RPC' : 'Fallback'}`,
          }
        );

        // Clear selections
        setSelectedLeadIds(new Set());
        
        // Refetch payments data
        await queryClient.invalidateQueries({ queryKey: ["gestao-payments"] });
        
        // Close modal
        setIsPaymentModalOpen(false);
      } else {
        toast.error(
          `Erro ao processar pagamentos. ${result.error_count} falhas.`,
          {
            description: "Verifique o console para detalhes.",
          }
        );
        console.error("Payment errors:", result.errors);
      }
    } catch (error) {
      console.error("Error processing batch payment:", error);
      const errorMessage = error instanceof Error ? error.message : "Tente novamente mais tarde.";
      toast.error("Erro ao processar pagamento", {
        description: errorMessage,
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Pagamentos</h1>
          <p className="text-muted-foreground">Controle financeiro de fichas</p>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <GestaoFiltersComponent 
            filters={filters}
            onChange={setFilters}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
              <DollarSign className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Confirmados
              </CardTitle>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{paidCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
              <Clock className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>Histórico de Pagamentos</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="Buscar por nome ou scouter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[300px]"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-paid"
                    checked={showPaidOnly}
                    onCheckedChange={(checked) => setShowPaidOnly(checked === true)}
                  />
                  <label htmlFor="show-paid" className="text-sm font-medium cursor-pointer">
                    Apenas Pagas
                  </label>
                </div>
                {selectedLeadIds.size > 0 && (
                  <Button
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={selectedLeadIds.size === 0}
                    className="gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Pagar Selecionados ({selectedLeadIds.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">Carregando pagamentos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos os pendentes"
                        disabled={pendingPayments.length === 0}
                        className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                      />
                    </TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Scouter</TableHead>
                    <TableHead>Qtd. Fichas</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Confirmação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {!payment.ficha_confirmada && (
                            <Checkbox
                              checked={selectedLeadIds.has(payment.id)}
                              onCheckedChange={() => toggleSelection(payment.id)}
                              aria-label={`Selecionar ${payment.name}`}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{payment.name || "-"}</TableCell>
                        <TableCell>{stripTagFromName(payment.scouter) || "-"}</TableCell>
                        <TableCell>{payment.num_fichas || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.valor_ficha)}
                        </TableCell>
                        <TableCell>
                          {payment.ficha_confirmada ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Confirmado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-600">
                              <AlertCircle className="w-4 h-4" />
                              Pendente
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.data_confirmacao_ficha
                            ? format(new Date(payment.data_confirmacao_ficha), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        payments={preparePaymentItems()}
        onConfirm={handleConfirmPayment}
        isProcessing={isProcessingPayment}
      />
    </div>
  );
}
