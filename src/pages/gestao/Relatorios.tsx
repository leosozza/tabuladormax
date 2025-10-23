import GestaoSidebar from "@/components/gestao/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

export default function GestaoRelatorios() {
  const handleExport = (format: string) => {
    toast.success(`Exportação ${format} será implementada em breve`);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
          <p className="text-muted-foreground">Exportação e análise de dados</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Relatório PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Relatório completo com gráficos e análises formatadas
              </p>
              <Button onClick={() => handleExport("PDF")} className="w-full">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Planilha Excel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Dados tabulados completos para análise externa
              </p>
              <Button onClick={() => handleExport("Excel")} className="w-full">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Arquivo CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Dados brutos em formato CSV para importação
              </p>
              <Button onClick={() => handleExport("CSV")} className="w-full">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
