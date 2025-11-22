import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePaymentsByScouter } from "@/hooks/usePaymentsByScouter";
import { generatePaymentPDF } from "@/services/paymentPDFService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, FileText, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";

interface PaymentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  scouter: string;
  startDate: Date;
  endDate: Date;
}

export function PaymentDetailModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  scouter,
  startDate,
  endDate,
}: PaymentDetailModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data, isLoading } = usePaymentsByScouter(
    projectId,
    scouter,
    startDate,
    endDate,
    true // onlyUnpaid
  );

  const handleGeneratePDF = () => {
    if (!data) return;

    const fileName = generatePaymentPDF({
      projectName,
      scouterName: scouter,
      startDate,
      endDate,
      dailySummary: data.dailySummary,
      totalLeads: data.total.leads,
      totalValue: data.total.value,
    });

    toast({
      title: "PDF Gerado",
      description: `Arquivo ${fileName} foi baixado com sucesso.`,
    });
  };

  const handleApprovePayment = async () => {
    if (!data || !data.leadIds || data.leadIds.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum lead encontrado para processar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Atualizar leads como pagos
      const { error } = await supabase
        .from('leads')
        .update({
          ficha_paga: true,
          data_pagamento: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', data.leadIds);

      if (error) throw error;

      toast({
        title: "Pagamento Aprovado",
        description: `${data.leadIds.length} leads foram marcados como pagos.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao aprovar pagamento:', error);
      toast({
        title: "Erro ao Aprovar Pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhamento de Pagamento</DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Projeto: {projectName}</p>
            <p>Scouter: {scouter}</p>
            <p>
              Período: {format(startDate, 'dd/MM/yyyy', { locale: ptBR })} a{' '}
              {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.dailySummary.length > 0 ? (
          <div className="space-y-6">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Qtd Leads</TableHead>
                    <TableHead className="text-right">Vlr Unitário</TableHead>
                    <TableHead className="text-right">Total Dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dailySummary.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>
                        {format(new Date(day.date), 'dd/MM/yyyy (EEEE)', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {day.leadCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(day.unitValue)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(day.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell className="text-right font-bold">
                      {data.total.leads}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-primary text-lg">
                      {formatCurrency(data.total.value)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum lead pendente encontrado para este scouter no período.
          </p>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={!data || data.dailySummary.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar PDF
          </Button>
          <Button
            onClick={handleApprovePayment}
            disabled={!data || data.dailySummary.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Aprovar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
