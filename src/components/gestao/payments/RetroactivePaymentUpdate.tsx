import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/formatters";

export function RetroactivePaymentUpdate() {
  const { toast } = useToast();
  const [cutoffDate, setCutoffDate] = useState("2025-11-16");
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    count: number;
    totalValue: number;
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_retroactive_payment_preview', {
        p_cutoff_date: cutoffDate,
        p_project_id: null,
        p_scouter: null,
      });

      if (error) throw error;

      const result = data as { count: number; total_value: number };
      setPreviewData({ 
        count: result.count, 
        totalValue: result.total_value 
      });

      toast({
        title: "Prévia Carregada",
        description: `Encontrados ${result.count} leads para marcar como pagos.`,
      });
    } catch (error: any) {
      console.error('Erro ao buscar prévia:', error);
      toast({
        title: "Erro ao Carregar Prévia",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-retroactive-payments', {
        body: { cutoffDate }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido ao processar pagamentos');
      }

      toast({
        title: "✅ Atualização Concluída",
        description: `${data.totalProcessed} leads marcados como pagos até ${cutoffDate} em ${data.durationSeconds}s`,
      });

      setPreviewData(null);
      setShowConfirmDialog(false);
    } catch (error: any) {
      console.error('Erro ao executar atualização:', error);
      toast({
        title: "Erro na Atualização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            Atualização Retroativa de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cutoff-date">Data Limite</Label>
            <Input
              id="cutoff-date"
              type="date"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              Filtro: Leads com Scouter | Status = Não Pago (independente de valor)
            </p>
          </div>

          <div className="rounded-lg bg-orange-100 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-900">
                  Esta ação marcará TODOS os leads até {cutoffDate} como PAGOS
                </p>
                <p className="text-xs text-orange-700">
                  Esta operação não pode ser desfeita. Certifique-se de visualizar os
                  leads antes de confirmar.
                </p>
              </div>
            </div>
          </div>

          {previewData && (
            <div className="rounded-lg bg-primary/5 p-4 space-y-2 border border-primary/20">
              <p className="text-sm font-medium">Prévia da Atualização:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total de Leads</p>
                  <p className="text-2xl font-bold">{previewData.count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(previewData.totalValue)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isLoading || !cutoffDate}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Visualizar Leads"
              )}
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!previewData || isLoading}
              className="flex-1"
              variant="default"
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar como Pagos
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Atualização Retroativa</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a marcar <strong>{previewData?.count} leads</strong> como
                pagos, totalizando{' '}
                <strong>{formatCurrency(previewData?.totalValue || 0)}</strong>.
              </p>
              <p className="text-orange-600 font-medium">
                Esta ação é irreversível. Deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
