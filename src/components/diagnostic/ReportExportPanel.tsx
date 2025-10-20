/**
 * Painel de Exportação de Relatórios
 * Permite gerar e exportar relatórios de diagnóstico
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileText, CalendarIcon, FileJson, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { downloadReport } from "@/lib/diagnostic/reportExportService";
import type { ReportExportOptions } from "@/types/diagnostic";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ReportExportPanel() {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('csv');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 dias atrás
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Erro na exportação",
        description: "Selecione as datas de início e fim",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const options: ReportExportOptions = {
        format: exportFormat,
        includeCharts: true,
        includeLogs: true,
        period: {
          start: startDate,
          end: endDate,
        },
      };

      await downloadReport('admin', options);

      toast({
        title: "Relatório exportado",
        description: `Relatório em formato ${exportFormat.toUpperCase()} foi baixado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickExport = async (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    setStartDate(start);
    setEndDate(end);
    
    setTimeout(() => handleExport(), 100);
  };

  return (
    <div className="space-y-6">
      {/* Opções Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Exportação Rápida</CardTitle>
          <CardDescription>
            Exporte relatórios de períodos pré-definidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => handleQuickExport(1)}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Últimas 24 horas
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickExport(7)}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Últimos 7 dias
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickExport(30)}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Últimos 30 dias
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickExport(90)}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Últimos 90 dias
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuração Personalizada */}
      <Card>
        <CardHeader>
          <CardTitle>Exportação Personalizada</CardTitle>
          <CardDescription>
            Configure o período e formato do relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Seleção de Formato */}
            <div className="space-y-3">
              <Label>Formato de Exportação</Label>
              <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV (Planilha)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                    <FileJson className="w-4 h-4" />
                    JSON (Dados Estruturados)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" />
                    PDF (Relatório Formatado)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Seleção de Período */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data de Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Botão de Exportação */}
            <Button
              className="w-full"
              onClick={handleExport}
              disabled={loading || !startDate || !endDate}
            >
              <Download className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Exportando...' : 'Exportar Relatório'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre o Relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do Relatório</CardTitle>
          <CardDescription>
            O relatório inclui as seguintes informações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Status geral do sistema
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Métricas de desempenho (leads, sincronizações, etc.)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Resultados de health checks
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Problemas detectados e corrigidos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Histórico de alertas
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Estatísticas e resumo do período
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
