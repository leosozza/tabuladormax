import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateCSVReport, downloadFile, formatLeadsForExport } from "@/lib/gestao/reportGenerator";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import type { FilterValues } from "./ReportFilters";

interface ReportExportProps {
  filters: FilterValues;
}

export default function ReportExport({ filters }: ReportExportProps) {
  const [exporting, setExporting] = useState(false);

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

  const handleExportExcel = () => {
    toast({
      title: "Exportação Excel",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exportação PDF",
      description: "Funcionalidade em desenvolvimento",
    });
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
            disabled={isLoading || totalLeads === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5" />
            PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Relatório completo com visualizações e análises
          </p>
          <div className="text-2xl font-bold text-primary">
            {isLoading ? "..." : `${totalLeads} leads`}
          </div>
          <Button 
            onClick={handleExportPDF} 
            className="w-full"
            variant="outline"
            disabled={isLoading || totalLeads === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
