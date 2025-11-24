import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, CheckCircle2, Users, DollarSign, Calendar, Clock, FileDown, CalendarIcon, RotateCcw, X } from "lucide-react";
import { HourlyProductivityChart } from "./HourlyProductivityChart";
import { useScouterTimesheet } from "@/hooks/useScouterTimesheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Scouter {
  id: string;
  name: string;
  total_leads: number;
  leads_last_30_days: number;
}

interface PerformanceData {
  total_leads: number;
  confirmed_leads: number;
  attended_leads: number;
  total_value: number;
  conversion_rate: number;
  leads_by_month: Record<string, number>;
  top_projects: Array<{ project: string; count: number }>;
}

interface ScouterPerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scouter: Scouter | null;
}

export function ScouterPerformanceDialog({
  open,
  onOpenChange,
  scouter,
}: ScouterPerformanceDialogProps) {
  console.log("🎯 [DEBUG] Dialog render - open:", open, "scouter:", scouter?.name, "scouterId:", scouter?.id);
  
  const { toast } = useToast();
  
  // Date filters for timesheet
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [startDate, setStartDate] = useState<Date | undefined>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const formattedStartDate = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
  const formattedEndDate = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
  
  const handleResetDates = () => {
    const newThirtyDaysAgo = new Date();
    newThirtyDaysAgo.setDate(newThirtyDaysAgo.getDate() - 30);
    setStartDate(newThirtyDaysAgo);
    setEndDate(new Date());
  };
  
  const { data: performance, isLoading, error: performanceError } = useQuery<PerformanceData | null>({
    queryKey: ["scouter-performance", scouter?.id],
    queryFn: async () => {
      if (!scouter) return null;

      const { data, error } = await supabase.rpc("get_scouter_performance_detail", {
        p_scouter_id: scouter.id,
      });

      if (error) {
        console.error("❌ [ERROR] Erro ao buscar performance:", error);
        throw error;
      }
      return data as unknown as PerformanceData;
    },
    enabled: !!scouter?.id && open,
    retry: 1,
  });

  const { data: timesheet, isLoading: timesheetLoading, error: timesheetError } = useScouterTimesheet(
    scouter?.name || null,
    formattedStartDate,
    formattedEndDate,
    1000 // Large limit to get all records in range
  );

  console.log("📊 [DEBUG] Performance query:", { 
    data: performance, 
    isLoading, 
    error: performanceError,
    scouterId: scouter?.id 
  });
  
  console.log("⏰ [DEBUG] Timesheet query:", { 
    data: timesheet, 
    isLoading: timesheetLoading, 
    error: timesheetError,
    scouterName: scouter?.name,
    timesheetLength: timesheet?.length 
  });

  const handleExportTimesheet = () => {
    if (!scouter || !timesheet || timesheet.length === 0) {
      toast({
        title: "Não foi possível exportar",
        description: "Não há dados de ponto disponíveis para exportar",
        variant: "destructive",
      });
      return;
    }

    try {

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text(`Relatório de Ponto - ${scouter.name}`, 14, 22);

    doc.setFontSize(11);
    const periodText = startDate && endDate 
      ? `Período: ${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}`
      : "Período: Últimos 30 dias";
    doc.text(periodText, 14, 32);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 38);

    // Resumo
    const totalDays = timesheet.length;
    const totalLeads = timesheet.reduce((sum, e) => sum + e.total_leads, 0);
    const totalHours = timesheet.reduce((sum, e) => sum + e.hours_worked, 0);
    const avgHours = totalDays > 0 ? (totalHours / totalDays).toFixed(2) : "0";

    doc.setFontSize(10);
    doc.text(`Dias trabalhados: ${totalDays}`, 14, 48);
    doc.text(`Total de fichas: ${totalLeads}`, 14, 54);
    doc.text(`Total de horas: ${totalHours.toFixed(2)}h`, 14, 60);
    doc.text(`Média de horas/dia: ${avgHours}h`, 14, 66);

    // Tabela
    autoTable(doc, {
      startY: 75,
      head: [["Data", "Entrada", "Saída", "Fichas", "Horas"]],
      body: timesheet.map((entry) => [
        new Date(entry.work_date).toLocaleDateString("pt-BR"),
        entry.clock_in,
        entry.clock_out,
        entry.total_leads.toString(),
        `${entry.hours_worked.toFixed(2)}h`,
      ]),
      foot: [[
        "TOTAL",
        "",
        "",
        totalLeads.toString(),
        `${totalHours.toFixed(2)}h`,
      ]],
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0] },
    });

      doc.save(`ponto_${scouter.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`);

      toast({
        title: "PDF gerado com sucesso",
        description: "O relatório de ponto foi baixado",
      });
    } catch (error) {
      console.error("❌ [ERROR] Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao tentar gerar o relatório",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {scouter ? `Performance de ${scouter.name}` : "Selecione um scouter"}
          </DialogTitle>
          <DialogDescription>
            {scouter 
              ? "Análise detalhada de performance e estatísticas"
              : "Nenhum scouter selecionado"
            }
          </DialogDescription>
        </DialogHeader>

        {!scouter ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Por favor, selecione um scouter para visualizar os dados</p>
          </div>
        ) : performanceError ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-destructive font-semibold">Erro ao carregar dados de performance</p>
            <p className="text-sm text-muted-foreground">
              {performanceError instanceof Error ? performanceError.message : "Erro desconhecido"}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Recarregar página
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total de Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{performance?.total_leads || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {performance?.confirmed_leads || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Taxa de Conversão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {performance?.conversion_rate || 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {(performance?.total_value || 0).toLocaleString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Leads by Month */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leads por Mês (últimos 6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performance?.leads_by_month &&
                Object.keys(performance.leads_by_month).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(performance.leads_by_month)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([month, count]) => {
                        const [year, monthNum] = month.split("-");
                        const monthName = new Date(
                          parseInt(year),
                          parseInt(monthNum) - 1
                        ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

                        return (
                          <div key={month} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-40 capitalize">
                              {monthName}
                            </span>
                            <div className="flex-1 bg-secondary rounded-full h-8 overflow-hidden">
                              <div
                                className="bg-primary h-full flex items-center justify-end px-3 text-xs font-semibold text-primary-foreground"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (Number(count) / (performance?.total_leads || 1)) * 100
                                  )}%`,
                                }}
                              >
                                {count}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum dado disponível
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Projetos</CardTitle>
              </CardHeader>
              <CardContent>
                {performance?.top_projects && performance.top_projects.length > 0 ? (
                  <div className="space-y-2">
                    {performance.top_projects.map((project: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                      >
                        <span className="font-medium">
                          {project.project || "Sem projeto"}
                        </span>
                        <Badge variant="secondary">{project.count} leads</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum projeto encontrado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Controle de Ponto */}
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Controle de Ponto
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportTimesheet}
                    disabled={!timesheet || timesheet.length === 0}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
                
                {/* Date Filters */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-sm font-medium mb-2 block">Data Inicial</label>
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
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="text-sm font-medium mb-2 block">Data Final</label>
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
                          {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => 
                            date > new Date() || (startDate ? date < startDate : false)
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleResetDates}
                    title="Resetar para últimos 30 dias"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                
                {startDate && endDate && (
                  <p className="text-sm text-muted-foreground">
                    Exibindo {timesheet?.length || 0} dia(s) de trabalho no período selecionado
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {timesheetLoading ? (
                  <Skeleton className="h-64" />
                ) : timesheetError ? (
                  <div className="text-center py-8">
                    <p className="text-destructive font-semibold mb-2">Erro ao carregar dados de ponto</p>
                    <p className="text-sm text-muted-foreground">
                      {timesheetError instanceof Error ? timesheetError.message : "Erro desconhecido"}
                    </p>
                  </div>
                ) : timesheet && timesheet.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">Data</th>
                          <th className="text-left p-2 font-semibold">Entrada</th>
                          <th className="text-left p-2 font-semibold">Saída</th>
                          <th className="text-center p-2 font-semibold">Fichas</th>
                          <th className="text-right p-2 font-semibold">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timesheet.map((entry) => (
                          <tr 
                            key={entry.work_date} 
                            className={cn(
                              "border-b hover:bg-muted/50 cursor-pointer transition-colors",
                              selectedDate === entry.work_date && "bg-primary/10"
                            )}
                            onClick={() => setSelectedDate(entry.work_date)}
                          >
                            <td className="p-2">
                              {new Date(entry.work_date).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="p-2 font-mono text-green-600">
                              {entry.clock_in}
                            </td>
                            <td className="p-2 font-mono text-red-600">
                              {entry.clock_out}
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="secondary">{entry.total_leads}</Badge>
                            </td>
                            <td className="p-2 text-right font-semibold">
                              {entry.hours_worked.toFixed(2)}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-muted">
                          <td colSpan={3} className="p-2">Total</td>
                          <td className="p-2 text-center">
                            {timesheet.reduce((sum, e) => sum + e.total_leads, 0)}
                          </td>
                          <td className="p-2 text-right">
                            {timesheet.reduce((sum, e) => sum + e.hours_worked, 0).toFixed(2)}h
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum registro de ponto encontrado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Produtividade por Horário */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Análise Detalhada do Dia</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(selectedDate).toLocaleDateString("pt-BR", { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDate(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <HourlyProductivityContent 
                    scouterName={scouter.name} 
                    date={selectedDate}
                    timesheetEntry={timesheet?.find(e => e.work_date === selectedDate)}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface HourlyProductivityContentProps {
  scouterName: string;
  date: string;
  timesheetEntry?: {
    clock_in: string;
    clock_out: string;
  };
}

function HourlyProductivityContent({ scouterName, date, timesheetEntry }: HourlyProductivityContentProps) {
  const { data: hourlyData, isLoading } = useQuery({
    queryKey: ["scouter-hourly-leads", scouterName, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_scouter_hourly_leads", {
        p_scouter_name: scouterName,
        p_date: date,
      });

      if (error) {
        console.error("Erro ao buscar dados por hora:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!scouterName && !!date,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (!hourlyData || hourlyData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma ficha encontrada neste dia
      </div>
    );
  }

  return (
    <HourlyProductivityChart 
      data={hourlyData}
      clockIn={timesheetEntry?.clock_in}
      clockOut={timesheetEntry?.clock_out}
    />
  );
}
