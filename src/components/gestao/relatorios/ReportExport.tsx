import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateCSVReport, generateXLSXReport, downloadFile, downloadBlob, formatLeadsForExport } from "@/lib/gestao/reportGenerator";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { generateScouterReportPDF, type ScouterStats } from "@/services/scouterReportPDFService";
import type { FilterValues } from "./ReportFilters";

interface ReportExportProps {
  filters: FilterValues;
}

export default function ReportExport({ filters }: ReportExportProps) {
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads-for-export", filters],
    queryFn: async () => {
      const data = await fetchAllLeads(
        supabase,
        "*",
        (query) => {
          if (filters.startDate) {
            query = query.gte("criado", filters.startDate);
          }
          if (filters.endDate) {
            query = query.lte("criado", filters.endDate);
          }
          if (filters.scouter) {
            query = query.eq("scouter", filters.scouter);
          }
          if (filters.area) {
            query = query.ilike("local_abordagem", `%${filters.area}%`);
          }
          if (filters.projectId) {
            query = query.eq("commercial_project_id", filters.projectId);
          }
          if (filters.fonte) {
            query = query.eq("fonte_normalizada", filters.fonte);
          }
          return query.order("criado", { ascending: false });
        }
      );
      
      return data;
    },
  });

  const handleExportCSV = async () => {
    if (!leadsData || leadsData.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Ajuste os filtros para obter resultados",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const formattedData = formatLeadsForExport(leadsData);
      const csvContent = await generateCSVReport(formattedData);
      const filename = `relatorio-leads-${new Date().toISOString().split("T")[0]}.csv`;
      downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
      
      toast({
        title: "Exportação concluída!",
        description: `${leadsData.length} leads exportados com sucesso`,
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!leadsData || leadsData.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Ajuste os filtros para obter resultados",
        variant: "destructive",
      });
      return;
    }

    setExportingExcel(true);
    try {
      const formattedData = formatLeadsForExport(leadsData);
      const xlsxBlob = await generateXLSXReport(formattedData, "Leads");
      const filename = `relatorio-leads-${new Date().toISOString().split("T")[0]}.xlsx`;
      downloadBlob(xlsxBlob, filename);
      
      toast({
        title: "Exportação concluída!",
        description: `${leadsData.length} leads exportados para Excel`,
      });
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o arquivo Excel",
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (!leadsData || leadsData.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Ajuste os filtros para obter resultados",
        variant: "destructive",
      });
      return;
    }

    setExportingPDF(true);
    try {
      // Agregar dados por scouter
      const scouterMap = new Map<string, ScouterStats>();
      
      leadsData.forEach((lead: any) => {
        const scouter = lead.scouter || 'Sem scouter';
        
        if (!scouterMap.has(scouter)) {
          scouterMap.set(scouter, {
            scouter,
            total_fichas: 0,
            confirmadas: 0,
            com_foto: 0,
            agendadas: 0,
            compareceram: 0,
          });
        }
        
        const stats = scouterMap.get(scouter)!;
        stats.total_fichas++;
        if (lead.ficha_confirmada) stats.confirmadas++;
        if (lead.cadastro_existe_foto) stats.com_foto++;
        if (lead.data_agendamento) stats.agendadas++;
        if (lead.compareceu) stats.compareceram++;
      });

      // Converter para array e ordenar por total de fichas
      const scouterStats = Array.from(scouterMap.values())
        .sort((a, b) => b.total_fichas - a.total_fichas);

      // Formatar datas para exibição
      const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      };

      // Gerar PDF
      const fileName = generateScouterReportPDF({
        projectName: filters.projectName || null,
        fonteName: filters.fonte || null,
        startDate: formatDate(filters.startDate),
        endDate: formatDate(filters.endDate),
        scouterStats,
      });

      toast({
        title: "PDF gerado com sucesso!",
        description: `Arquivo ${fileName} baixado`,
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  const totalLeads = leadsData?.length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5" />
            CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Exportar dados em formato CSV para análise em planilhas
          </p>
          <div className="text-2xl font-bold text-primary">
            {isLoading ? "..." : `${totalLeads} leads`}
          </div>
          <Button 
            onClick={handleExportCSV} 
            className="w-full"
            disabled={exporting || isLoading || totalLeads === 0}
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar CSV
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-5 h-5" />
            Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Planilha formatada com gráficos e tabelas
          </p>
          <div className="text-2xl font-bold text-primary">
            {isLoading ? "..." : `${totalLeads} leads`}
          </div>
          <Button 
            onClick={handleExportExcel} 
            className="w-full"
            variant="secondary"
            disabled={exportingExcel || isLoading || totalLeads === 0}
          >
            {exportingExcel ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-primary" />
            PDF - Relatório Scouters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Relatório completo com estatísticas por scouter (fichas, confirmadas, fotos, agendadas, comparecidas)
          </p>
          <div className="text-2xl font-bold text-primary">
            {isLoading ? "..." : `${totalLeads} leads`}
          </div>
          <Button 
            onClick={handleExportPDF} 
            className="w-full"
            disabled={exportingPDF || isLoading || totalLeads === 0}
          >
            {exportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Gerar Relatório PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
